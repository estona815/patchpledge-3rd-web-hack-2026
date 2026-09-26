# PatchPledge

**Fund the fix. Prove the work.** A working Web3 prototype for open-source issue bounties.

PatchPledge runs a Solidity escrow contract on an **ephemeral local EVM chain**. A sponsor locks demo ETH against a task hash. A worker commits an evidence hash. Two distinct, preassigned reviewers must approve before the contract releases the escrow to the worker. After the deadline, an unsettled bounty can be refunded by its sponsor.

The UI displays real local transaction hashes, block numbers, contract balance, and workflow state. There is **no public-chain deployment, real asset, wallet connection, persistent database, or production security audit**. The local account roles and demo funds are created automatically when the server starts. Restarting the server resets the chain. Task and evidence text live only in server memory; the contract stores their Keccak-256 hashes.

## Run

Requires Node.js 20+ and pnpm.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm start
```

Open <http://127.0.0.1:4173>. Ganache may print a native-addon warning and use its JavaScript fallback; the tests still run.

## Demo flow

1. Enter an issue description, an amount below 1 demo ETH, and a deadline. Click **Lock bounty**.
2. Enter a work proof or commit URL. Click **Submit evidence**.
3. Click **Approve as A** and **Approve as B**. The escrow balance falls to zero and the worker receives the exact amount.
4. For the refund path, open another bounty, advance the local clock, and click **Refund after expiry**.

## Contract safeguards

- The two reviewers must differ and neither can be the sponsor.
- The worker cannot be the sponsor or either reviewer.
- One vote per reviewer; a second vote is rejected by the contract.
- Payout and refund are mutually exclusive and require the deadline conditions.
- ETH moves through actual contract calls on the local chain; the UI reads resulting chain state.

## Stack

Solidity, solc, ethers v6, Ganache, Node.js, semantic HTML/CSS/vanilla JavaScript. No external wallet or paid service required.

## Limitations and next steps

For a public deployment, use wallet-signed transactions and a supported public chain, persist human-readable task content separately, add dispute resolution and reviewer reputation, and commission a smart-contract audit. This demo intentionally confines all funds to an isolated local chain.

## AI use

The implementation and visual concept were developed with Codex assistance. Contract behavior and UI were checked with automated integration tests and browser interaction. The README and pitch disclose the prototype's local-chain scope.

## License

MIT. See [LICENSE](LICENSE).
