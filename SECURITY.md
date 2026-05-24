# Security policy

## Reporting a vulnerability

If you find a security issue — in the smart contracts, the API, the browser
extension, or anywhere else in this codebase — please email
**therayyn16@gmail.com** with the subject line `[SECURITY] PhishBlockk`.

Please do **not** open a public GitHub issue for security-sensitive reports.

For severe issues affecting deployed contracts on testnet, include the
network, contract address, and a proof-of-concept transaction hash.

## ⚠️ Past incident — leaked secrets in git history (2026-05)

An earlier commit of this repository accidentally committed `.env` files
containing:

- A Pinata IPFS API key + secret
- Hardhat test private key (publicly known — not actually a secret)
- Mock contract addresses (all `0x5FbD…aa3`, the canonical Hardhat first
  deployment address — not real deployed contracts)

**What was done:**
- The secrets have been removed from the working tree and `.gitignore` updated.
- `.env`, `.env.local`, `prisma/dev.db` are now excluded from version control.
- A new `.env.example` documents every variable with instructions on how to
  obtain a real value.

**What you should do if you have a fork or local clone with the old `.env`:**

1. **Rotate the Pinata keys** at https://app.pinata.cloud/keys —
   revoke the leaked key and generate a new one.
2. Delete your local `.env` and `.env.local` files.
3. Copy `.env.example` to `.env` and fill in fresh values.

**Why we did not rewrite git history:**
Rewriting history (via `git filter-branch` or BFG) breaks every fork and
clone of the repo and is rarely worth the disruption for keys that can be
rotated trivially. Rotating > rewriting.

## Smart contract risks

The Solidity contracts in `contracts/` are **prototype-grade**. They have
not been audited by a professional smart-contract auditor. Do not deploy
them to mainnet with real value at stake without:

- A formal audit by a reputable firm (Trail of Bits, OpenZeppelin, etc.)
- Comprehensive test coverage (currently below the 95%+ bar real audits expect)
- A bug bounty program with clear scope and payout terms
- An emergency-pause mechanism wired to a multisig

## Dependencies

This project uses `npm audit` and Dependabot to surface known
vulnerabilities in its npm and Solidity dependencies. PRs that bump
dependencies for security fixes will be merged on priority.
