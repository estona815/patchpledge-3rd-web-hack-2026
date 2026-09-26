# PatchPledge pitch source

## Problem
Open-source issue boards describe valuable work, but willingness to pay and evidence of completion often live in separate conversations. Contributors cannot see a committed budget; sponsors cannot transparently verify the release condition.

## Solution
Escrow a bounty against a task hash. A contributor submits a work-evidence hash. Two named independent reviewers must approve; the contract pays automatically. If the deadline passes without settlement, the sponsor can recover the deposit.

## Demo proof
The local EVM prototype shows real transaction hashes, block numbers, escrow balance changes, and worker payout. Contract tests cover payment, duplicate vote rejection, expiration, and refund.

## Architecture
Node.js server starts an ephemeral Ganache chain and compiles/deploys PatchPledge.sol. ethers v6 signs demo transactions from isolated local accounts. Browser UI calls the local server and renders contract state. The chain ID is 1337; no mainnet or public deployment.

## Why Web3
The settlement condition and ledger are implemented in a smart contract, rather than a UI-only promise. Hash commitments establish an immutable link to a task and evidence; the two-reviewer rule and refund window are enforced on-chain.

## Next steps
Wallet-signed public testnet deployment, IPFS or similar durable content references, dispute resolution, reviewer reputation, external audit.

## Disclosure
Built with Codex assistance. No actual assets or production custody are involved. This is a local-chain MVP.
