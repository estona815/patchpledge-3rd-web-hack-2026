const $ = (selector) => document.querySelector(selector);
let state;
let busy = false;
const compact = (value) => value ? `${value.slice(0, 7)}…${value.slice(-5)}` : '—';
const date = (seconds) => new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
function toast(message) { const box = $('#toast'); box.textContent = message; box.classList.add('show'); setTimeout(() => box.classList.remove('show'), 3600); }
async function call(endpoint, payload) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach((button) => button.disabled = true);
  try {
    const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Transaction failed');
    state = data; render(); toast(`Local chain transaction confirmed · block ${state.blockNumber}`);
  } catch (error) { toast(error.message); }
  finally { busy = false; render(); }
}
function render() {
  if (!state) return;
  $('#balance').innerHTML = `${Number(state.contractBalanceEth).toFixed(6)} <small>ETH</small>`;
  $('#contract').textContent = state.contract;
  $('#roles').replaceChildren(...Object.entries(state.roles).slice(0, 4).map(([name, address]) => {
    const row = document.createElement('div'); row.className = 'role';
    const label = document.createElement('span'); label.textContent = name.replace(/([A-Z])/g, ' $1');
    const code = document.createElement('code'); code.textContent = compact(address);
    row.append(label, code); return row;
  }));
  const activity = $('#activity'); activity.replaceChildren();
  if (!state.activity.length) activity.innerHTML = '<tr><td colspan="3">Transactions appear here.</td></tr>';
  for (const item of state.activity.slice(0, 12)) {
    const row = document.createElement('tr');
    for (const value of [compact(item.transactionHash), item.label, item.blockNumber]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
    activity.append(row);
  }
  const b = state.bounties.at(-1); $('#empty').hidden = !!b; $('#bounty').hidden = !b;
  if (!b) { $('#status-tag').textContent = 'WAITING'; return; }
  const note = state.notes[b.id] || {};
  $('#task-copy').textContent = note.task || 'Task commitment';
  $('#task-hash').textContent = b.taskHash; $('#task-hash').title = b.taskHash;
  $('#escrow').textContent = `${b.amountEth} demo ETH`;
  $('#due').textContent = date(b.deadline);
  $('#proof-hash').textContent = b.proofHash === `0x${'0'.repeat(64)}` ? 'Awaiting evidence' : b.proofHash;
  const stage = b.paid ? 5 : b.refunded ? 0 : b.approvals === 2 ? 4 : b.approvals === 1 ? 3 : b.submitted ? 2 : 1;
  $('#steps').replaceChildren(...['Opened', 'Evidence', 'Reviewer A', 'Reviewer B', 'Paid'].map((label, index) => {
    const step = document.createElement('div'); step.className = `step${index < stage ? ' done' : ''}`; step.textContent = label; return step;
  }));
  $('#status-tag').textContent = b.paid ? 'PAID' : b.refunded ? 'REFUNDED' : b.submitted ? `${b.approvals}/2 APPROVED` : 'OPEN';
  $('#proof').disabled = busy || b.submitted || b.refunded || b.paid;
  $('#submit-proof').disabled = busy || b.submitted || b.refunded || b.paid;
  $('#approve-a').disabled = busy || !b.submitted || b.paid || b.refunded || b.approvals >= 1;
  $('#approve-b').disabled = busy || !b.submitted || b.paid || b.refunded || b.approvals !== 1;
  $('#refund').disabled = busy || b.paid || b.refunded || state.blockTimestamp <= b.deadline;
  $('#advance').disabled = busy || b.paid || b.refunded;
  $('#open-form button').disabled = busy;
}
$('#open-form').addEventListener('submit', (event) => { event.preventDefault(); call('open', { task: $('#task').value, amountEth: $('#amount').value, deadlineSeconds: $('#deadline').value }); });
$('#submit-proof').addEventListener('click', () => call('submit', { id: state.bounties.at(-1).id, proof: $('#proof').value }));
$('#approve-a').addEventListener('click', () => call('approve', { id: state.bounties.at(-1).id, reviewer: 'A' }));
$('#approve-b').addEventListener('click', () => call('approve', { id: state.bounties.at(-1).id, reviewer: 'B' }));
$('#refund').addEventListener('click', () => call('refund', { id: state.bounties.at(-1).id }));
$('#advance').addEventListener('click', () => call('advance', { seconds: 601 }));
fetch('/api/state').then((response) => response.json()).then((data) => { state = data; render(); }).catch((error) => toast(error.message));
