import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import solc from 'solc';
import { BrowserProvider, ContractFactory, formatEther, id, parseEther } from 'ethers';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function compileContract() {
  const source = fs.readFileSync(path.join(projectRoot, 'contracts/PatchPledge.sol'), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'PatchPledge.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((issue) => issue.severity === 'error');
  if (errors.length) throw new Error(errors.map((issue) => issue.formattedMessage).join('\n'));
  const artifact = output.contracts['PatchPledge.sol'].PatchPledge;
  return { abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` };
}

export async function createChain() {
  const rpc = ganache.provider({
    chain: { chainId: 1337 },
    wallet: { totalAccounts: 5, defaultBalance: 100 },
    logging: { quiet: true }
  });
  const provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  const signers = await Promise.all([0, 1, 2, 3, 4].map((index) => provider.getSigner(index)));
  const { abi, bytecode } = compileContract();
  const contract = await new ContractFactory(abi, bytecode, signers[0]).deploy();
  await contract.waitForDeployment();
  const roles = {
    sponsor: await signers[0].getAddress(),
    worker: await signers[1].getAddress(),
    reviewerA: await signers[2].getAddress(),
    reviewerB: await signers[3].getAddress(),
    outsider: await signers[4].getAddress()
  };
  const activity = [];

  async function settle(tx, label) {
    const receipt = await tx.wait();
    activity.unshift({ label, transactionHash: receipt.hash, blockNumber: receipt.blockNumber });
    return receipt;
  }

  async function state() {
    const count = Number(await contract.nextId());
    const bounties = [];
    for (let index = 0; index < count; index += 1) {
      const bounty = await contract.bounties(index);
      bounties.push({
        id: index,
        sponsor: bounty.sponsor,
        worker: bounty.worker,
        reviewerA: bounty.reviewerA,
        reviewerB: bounty.reviewerB,
        taskHash: bounty.taskHash,
        proofHash: bounty.proofHash,
        amountEth: formatEther(bounty.amount),
        deadline: Number(bounty.deadline),
        approvals: Number(bounty.approvals),
        submitted: bounty.submitted,
        paid: bounty.paid,
        refunded: bounty.refunded
      });
    }
    const balances = {};
    for (const [name, address] of Object.entries(roles)) {
      balances[name] = formatEther(await provider.getBalance(address));
    }
    const block = await provider.getBlock('latest');
    return {
      network: 'Ephemeral local EVM — chain ID 1337, no public deployment',
      chainId: 1337,
      contract: await contract.getAddress(),
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      roles,
      balances,
      contractBalanceEth: formatEther(await provider.getBalance(await contract.getAddress())),
      bounties,
      activity
    };
  }

  return {
    provider, rpc, signers, contract, roles, state,
    async open(task, amountEth, deadlineSeconds = 600) {
      if (typeof task !== 'string' || !task.trim() || task.length > 300) throw new Error('Task must be 1–300 characters');
      if (typeof amountEth !== 'string' || !/^0\.\d{1,6}$/.test(amountEth) || parseEther(amountEth) === 0n) {
        throw new Error('Use a small positive ETH amount below 1');
      }
      const seconds = Number(deadlineSeconds);
      if (!Number.isInteger(seconds) || seconds < 30 || seconds > 3600) throw new Error('Deadline must be 30–3600 seconds');
      const block = await provider.getBlock('latest');
      await settle(await contract.connect(signers[0]).openBounty(
        id(task.trim()), roles.reviewerA, roles.reviewerB, block.timestamp + seconds,
        { value: parseEther(amountEth) }
      ), 'Sponsor opened bounty');
      return state();
    },
    async submit(bountyId, proof) {
      if (typeof proof !== 'string' || !proof.trim() || proof.length > 300) throw new Error('Proof must be 1–300 characters');
      await settle(await contract.connect(signers[1]).submitEvidence(bountyId, id(proof.trim())),
        'Worker submitted evidence hash');
      return state();
    },
    async approve(bountyId, reviewer) {
      const signer = reviewer === 'A' ? signers[2] : reviewer === 'B' ? signers[3] : null;
      if (!signer) throw new Error('Reviewer must be A or B');
      await settle(await contract.connect(signer).approve(bountyId), `Reviewer ${reviewer} approved`);
      return state();
    },
    async refund(bountyId) {
      await settle(await contract.connect(signers[0]).refund(bountyId), 'Sponsor refunded expired bounty');
      return state();
    },
    async advanceLocalTime(seconds) {
      const value = Number(seconds);
      if (!Number.isInteger(value) || value < 1 || value > 3600) throw new Error('Local time advance must be 1–3600 seconds');
      await rpc.request({ method: 'evm_increaseTime', params: [value] });
      await rpc.request({ method: 'evm_mine', params: [] });
      activity.unshift({ label: `Local demo clock advanced ${value}s`, transactionHash: null, blockNumber: await provider.getBlockNumber() });
      return state();
    }
  };
}
