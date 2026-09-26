import assert from 'node:assert/strict';
import test from 'node:test';
import { createChain } from '../src/chain.js';

test('two independent approvals release exactly the escrowed amount', async () => {
  const chain = await createChain();
  await chain.open('Fix keyboard navigation in issue #42', '0.5', 600);
  assert.equal((await chain.state()).contractBalanceEth, '0.5');
  await chain.submit(0, 'https://github.com/example/repo/commit/abc');
  await chain.approve(0, 'A');
  assert.equal((await chain.state()).contractBalanceEth, '0.5');
  const beforePayout = BigInt(await chain.provider.getBalance(chain.roles.worker));
  await assert.rejects(chain.contract.connect(chain.signers[2]).approve.staticCall(0), /revert|Already voted/i);
  await chain.approve(0, 'B');
  const after = await chain.state();
  assert.equal(after.bounties[0].paid, true);
  assert.equal(after.contractBalanceEth, '0.0');
  assert.equal(BigInt(await chain.provider.getBalance(chain.roles.worker)) - beforePayout, 500000000000000000n);
  await assert.rejects(chain.refund(0), /revert|Already settled/i);
});

test('only an expired, unsettled bounty can be refunded by sponsor', async () => {
  const chain = await createChain();
  await chain.open('Add a missing error message', '0.2', 30);
  await assert.rejects(chain.refund(0), /revert|Not expired/i);
  await chain.advanceLocalTime(31);
  await chain.refund(0);
  const after = await chain.state();
  assert.equal(after.bounties[0].refunded, true);
  assert.equal(after.contractBalanceEth, '0.0');
  await assert.rejects(chain.submit(0, 'late work'), /revert|Deadline passed/i);
});
