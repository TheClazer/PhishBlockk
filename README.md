<div align="center">

# PhishBlockk

**A decentralized scam reporting platform — Next.js dashboard + on-chain anchoring + browser extension.**

Community-curated phishing intelligence: reports live off-chain in PostgreSQL for speed, deterministic hashes get anchored on-chain for immutability, and a reputation-weighted voting system filters signal from noise. A companion browser extension blocks known-bad URLs in real time.

[![CI](https://github.com/TheClazer/PhishBlockk/actions/workflows/ci.yml/badge.svg)](https://github.com/TheClazer/PhishBlockk/actions/workflows/ci.yml)
[![Next.js 15](https://img.shields.io/badge/next.js-15-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/solidity-0.8.20-363636?style=flat-square&logo=solidity&logoColor=white)](https://docs.soliditylang.org/)
[![Prisma](https://img.shields.io/badge/prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Hardhat](https://img.shields.io/badge/hardhat-3.x-FFF100?style=flat-square&logo=ethereum&logoColor=black)](https://hardhat.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-d4bbff?style=flat-square)](LICENSE)

</div>

---

> ⚠️ **Status: prototype.** Contracts have NOT been professionally audited. Do not deploy to mainnet with real value at stake. See [SECURITY.md](SECURITY.md) for details, the past key-leak incident, and how to rotate compromised secrets.

## What it is

PhishBlockk is built around the idea that **anti-phishing intelligence is more credible when it's hard to forge and easy to verify**. The system has three loosely-coupled layers:

| Layer | Stack | Purpose |
|---|---|---|
| **Web app** | Next.js 15 (App Router) + Prisma + better-auth | Report submission, browsable feed, vote UI, account/profile dashboard |
| **On-chain** | Solidity 0.8 + OpenZeppelin + Hardhat | Stake-based reporting, reputation-weighted voting, DAO governance, badge NFTs |
| **Browser extension** | Vanilla JS Manifest V3 | Real-time URL checking against the on-chain blacklist, in-page warnings |

Reports flow through the system as:

```
user submits → web app validates → SHA-256 anchor hash → on-chain transaction
                                                              ↓
                                              reputation-weighted voting opens
                                                              ↓
                                       enough YES votes → URL added to blacklist
                                                              ↓
                                            extension blocks the URL globally
```

## The contracts

There are 9 Solidity contracts in `contracts/`, organized around three concerns:

**Reporting**
- `PhishBlockRegistry.sol` — the main report registry with vote tracking
- `ReportRegistry.sol` — legacy simpler registry (kept for backward compat)
- `StakeBasedReportRegistry.sol` — variant requiring stake to submit (anti-spam)
- `EvidenceValidator.sol` — validates IPFS-anchored evidence packages

**Identity + reputation**
- `ReputationSystem.sol` — accrues, decays, slashes reputation per address
- `ReputationBadgeNFT.sol` — Bronze/Silver/Gold tier badges (ERC-721)
- `PHBToken.sol` — governance + staking token (ERC-20)

**Governance**
- `PhishDAO.sol` — proposal + vote contract for system parameters
- `TimelockController.sol` — execution delay for passed proposals

## Quick start

Requires **Node 20+** and (optionally) **MetaMask** for on-chain features.

### 1. Clone and install

```bash
git clone https://github.com/TheClazer/PhishBlockk.git
cd PhishBlockk
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
cp .env.example .env
# Open .env and fill in real values — see SECURITY.md for guidance on each.
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

This creates `prisma/dev.db` (SQLite). For production, swap `DATABASE_URL` in `.env` to a Postgres URL and re-run `prisma migrate deploy`.

### 4. Run a local Hardhat node + deploy contracts

In one terminal:
```bash
npx hardhat node
```

In another:
```bash
npm run deploy:local
```

The deploy script writes the deployed addresses back into `.env` (the `NEXT_PUBLIC_*_ADDRESS` variables).

### 5. Start the web app

```bash
npm run dev
# → http://localhost:3000
```

### 6. (Optional) Load the browser extension

```bash
npm run build:extension
# Then in Chrome: chrome://extensions → "Load unpacked" → select dist/extension/
```

## Project structure

```
.
├── contracts/                  # 9 Solidity contracts
├── prisma/
│   ├── schema.prisma           # Database schema (User, Report, Vote, Badge, Proposal, ProposalVote)
│   └── migrations/             # Auto-generated migration history
├── scripts/                    # Hardhat deployment scripts (sepolia, mumbai, stake-registry)
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React UI (built on Radix + shadcn/ui)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Shared utilities (prisma client, helpers)
│   └── visual-edits/           # Design-system primitives
├── extension/                  # Manifest V3 browser extension
│   ├── manifest.json
│   ├── background.js           # Service worker
│   ├── content.js + content.css  # In-page warnings
│   ├── popup.html + popup.js   # Toolbar dropdown
│   ├── contract-integration.js # ethers.js client
│   └── ipfs-integration.js     # Pinata uploader
├── test/                       # Hardhat contract tests
├── hardhat.config.ts
├── next.config.ts
├── middleware.ts               # better-auth route protection
├── SECURITY.md                 # Vulnerability disclosure + past-incident notes
└── .github/workflows/ci.yml    # Lint + typecheck + build + contract compile
```

## npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier over `src/` |
| `npm run compile` | Hardhat compile all contracts |
| `npm test` | Hardhat contract tests |
| `npm run test:coverage` | Solidity coverage report |
| `npm run deploy:local` | Deploy to localhost Hardhat node |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run deploy:mumbai` | Deploy to Polygon Mumbai |
| `npm run verify:sepolia` | Etherscan source verification |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio (GUI for the DB) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run node` | Start a local Hardhat node |
| `npm run build:extension` | Bundle the browser extension into `dist/extension/` |
| `npm run package:chrome` | Build + zip for Chrome Web Store submission |
| `npm run package:firefox` | Build + zip for addons.mozilla.org submission |

## Security

This project has a **leaked-secret incident in its history** (see [SECURITY.md](SECURITY.md)). If you forked or cloned before commit `4b52ed2`, rotate the Pinata keys that were in the old `.env`. Going forward:

- `.env` and `.env.local` are git-ignored
- `prisma/dev.db` is git-ignored (regenerated locally with `prisma migrate dev`)
- The Hardhat private key in older commits is the canonical test key #0 — not a real secret, but never use it for any non-localhost deployment

To report a new vulnerability: **therayyn16@gmail.com** with subject `[SECURITY] PhishBlockk`.

## Roadmap

- [ ] Professional smart-contract audit before any mainnet deployment
- [ ] Migrate browser extension to a real bundler (currently raw Manifest V3)
- [ ] Per-report comment threads with optimistic UI
- [ ] Off-chain reputation snapshots for cheaper voting
- [ ] CI-driven contract verification on every release
- [ ] Sub-graph (The Graph) for richer queryability

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Built by [Rayyan Ahmed Shaikh](https://github.com/TheClazer) at R.V. College of Engineering, Bangalore. PRs and audit findings welcome.</sub>
