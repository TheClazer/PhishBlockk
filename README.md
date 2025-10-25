# PhishGuard - Decentralized Scam Reporting Platform

A community-powered platform for reporting and verifying phishing URLs and scam wallet addresses. Reports are stored off-chain in a trusted database (Prisma + Supabase) and can be anchored on-chain via deterministic bytes32 hashes. Community votes are recorded on-chain to help decentralize trust.

## 🌟 Features

- **Decentralized Reporting**: Submit phishing URLs and scam wallet addresses
- **On-Chain Anchoring**: Optionally anchor report hashes on the blockchain for immutable verification
- **Community Voting**: Upvote/downvote reports on-chain to validate entries
- **Hash Verification**: Cryptographic verification of report integrity using canonical hashing
- **Wallet Integration**: MetaMask wallet connection for Web3 functionality
- **Real-time Stats**: Track total reports, on-chain anchored reports, and community participation

## 🏗️ Architecture

### Smart Contract (Solidity)
- **ReportRegistry.sol**: Manages report registration and community voting
- Stores report hashes, vote scores, and timestamps on-chain
- Supports upvoting, downvoting, and vote changes

### Backend (Next.js API Routes + Prisma)
- **Database**: PostgreSQL with Prisma ORM
- **Models**: User (wallet addresses) and Report (detailed metadata)
- **API Routes**:
  - `POST /api/reports` - Create new report
  - `GET /api/reports` - List reports with pagination/filters
  - `GET /api/reports/[id]` - Get report details
  - `GET /api/reports/[id]/verify` - Verify report hash
  - `GET /api/reports/stats` - Get platform statistics

### Frontend (Next.js 15 + React)
- **Home Page**: Report submission form + browsable reports list
- **Report Detail Page**: Full verification, on-chain status, and voting UI
- **Wallet Connection**: MetaMask integration with account switching
- **Responsive Design**: Mobile-first UI with Tailwind CSS + shadcn/ui

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (local or Supabase)
- MetaMask browser extension
- Hardhat for local blockchain development

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd phishguard
npm install
# or
bun install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/phishing_reports?schema=public"

# Smart Contract (set after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."

# Supabase (optional - for production)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# NextAuth (optional - for future authentication)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Blockchain Configuration
NEXT_PUBLIC_NETWORK=goerli
RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_KEY
NFT_SIGNER_PRIVATE_KEY=your-private-key
DAO_SIGNER_PRIVATE_KEY=your-private-key
PHB_TOKEN_ADDRESS=0x...
REPUTATION_NFT_ADDRESS=0x...
PHISHDAO_ADDRESS=0x...
```

### 3. Database Setup

Initialize Prisma and create the database schema:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 4. Deploy Smart Contracts

Start a local Hardhat blockchain (in a separate terminal):

```bash
npx hardhat node
```

Deploy the new reputation and DAO contracts:

```bash
npx hardhat run scripts/deploy-reputation.ts --network localhost
```

Copy the deployed contract addresses and update your `.env` file:

```env
PHB_TOKEN_ADDRESS=0x...
REPUTATION_NFT_ADDRESS=0x...
PHISHDAO_ADDRESS=0x...
TIMELOCK_ADDRESS=0x...
```

Also deploy the original ReportRegistry if needed:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in your `.env` file.

### 5. Run Tests

Run smart contract tests:

```bash
npx hardhat test
```

Expected output: All tests should pass ✅

### 6. Start Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Connect MetaMask

1. Install MetaMask browser extension
2. Import a test account from Hardhat's local node (check terminal output for private keys)
3. Add the local network to MetaMask:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
4. Click "Connect Wallet" in the app

## 📖 Usage Guide

### Submitting a Report

1. Connect your MetaMask wallet
2. Fill out the report form:
   - **Report Type**: Choose "Phishing URL" or "Scam Wallet Address"
   - **Target**: Enter the malicious URL or wallet address
   - **Description**: Describe the scam or phishing attempt
   - **Anchor on Blockchain** (optional): Toggle to register the report hash on-chain
3. Click "Submit Report"
4. If anchoring on-chain, approve the transaction in MetaMask

### Viewing Reports

- Browse all reports on the home page
- Use filters to search by type (Phishing URLs / Scam Wallets)
- Click "View Details" to see full report information

### Verifying a Report

1. Click on any report to view details
2. Check the **Hash Verification** section:
   - ✅ Green checkmark = Hash verified (data integrity confirmed)
   - ❌ Red X = Hash mismatch (data may be tampered)
3. View **On-Chain Status** for anchored reports:
   - Reporter address
   - Timestamp
   - Current vote score

### Voting on Reports

1. Navigate to a report detail page (must be anchored on-chain)
2. Connect your wallet if not already connected
3. Click **Upvote** (report is legitimate) or **Downvote** (report is questionable)
4. Approve the transaction in MetaMask
5. Vote is recorded on-chain and reflected in the score

## 🔧 Project Structure

```
phishguard/
├── contracts/              # Solidity smart contracts
│   └── ReportRegistry.sol
├── scripts/                # Deployment scripts
│   └── deploy.ts
├── test/                   # Smart contract tests
│   └── ReportRegistry.test.ts
├── prisma/                 # Database schema
│   └── schema.prisma
├── src/
│   ├── app/               # Next.js app directory
│   │   ├── api/           # API routes
│   │   │   └── reports/   # Report CRUD endpoints
│   │   ├── reports/[id]/  # Report detail page
│   │   ├── layout.tsx
│   │   ├── page.tsx       # Home page
│   │   └── globals.css
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── WalletConnect.tsx
│   │   ├── ReportForm.tsx
│   │   ├── ReportsList.tsx
│   │   └── StatsCards.tsx
│   ├── hooks/             # Custom React hooks
│   │   └── use-toast.ts
│   └── lib/               # Utility functions
│       ├── canonicalize.ts  # Report hashing logic
│       ├── wallet.ts        # Web3 wallet utilities
│       ├── contract.ts      # Smart contract interactions
│       └── prisma.ts        # Database client
├── hardhat.config.ts
├── package.json
└── README.md
```

## 🧪 Testing

### Smart Contract Tests

```bash
npx hardhat test
```

Tests cover:
- Report registration
- Duplicate prevention
- Voting (upvote/downvote)
- Vote changes
- Multiple voters
- Getter functions

### Manual Testing Checklist

- [ ] Wallet connection/disconnection
- [ ] Submit report without on-chain anchoring
- [ ] Submit report with on-chain anchoring
- [ ] View all reports with pagination
- [ ] Filter reports by type
- [ ] Search reports
- [ ] View report details
- [ ] Verify report hash
- [ ] Upvote a report
- [ ] Downvote a report
- [ ] Change vote from upvote to downvote

## 🔐 Security Considerations

1. **Hash Verification**: All reports use deterministic canonical hashing to prevent tampering
2. **On-Chain Anchoring**: Optional blockchain registration provides immutable proof
3. **Community Voting**: Decentralized voting helps validate report legitimacy
4. **Wallet Signatures**: All on-chain actions require wallet signatures
5. **Input Validation**: Server-side validation prevents malicious data

## 🚀 Deployment

### Deploy to Production

1. **Deploy Smart Contract to Mainnet/Testnet**:
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

2. **Set up Production Database** (Supabase recommended):
   - Create a new Supabase project
   - Copy database URL to `DATABASE_URL`
   - Run migrations: `npx prisma migrate deploy`

3. **Deploy Frontend** (Vercel recommended):
   ```bash
   vercel deploy
   ```
   - Set environment variables in Vercel dashboard
   - Update `NEXTAUTH_URL` to production URL

4. **Update Contract Address**:
   - Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to deployed contract address

## 🛠️ Technologies Used

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Blockchain**: Ethereum, Solidity, Hardhat, ethers.js
- **Wallet**: MetaMask, Web3 Provider
- **Testing**: Chai, Hardhat Toolbox

## 🏆 Reputation NFTs & DAO Governance

The platform now includes advanced reputation and governance features:

### Reputation Badges (NFTs)
- **Dynamic NFTs**: ERC-721 badges that evolve based on user reputation
- **Tiers**: Bronze, Silver, Gold, Platinum, Diamond levels
- **On-Chain Metadata**: Badges are minted on-chain with updatable metadata
- **Admin Controls**: Server-side minting and level updates

### DAO Dispute Resolution
- **Governance Token**: PHB token for voting power
- **Proposal System**: Create proposals to resolve disputed reports
- **On-Chain Voting**: Weighted voting based on token balance
- **Timelock**: Secure execution with delay mechanisms

### Leaderboard
- **Top Reporters**: Ranked by validated reports
- **Top Validators**: Ranked by voting accuracy and participation
- **Time Filters**: 30d, 90d, all-time views

### New Pages
- **/badges**: View and mint reputation badges
- **/dao**: Participate in governance proposals
- **/leaderboard**: View top contributors

### New API Endpoints
- `POST /api/badges/mint` - Mint reputation badges
- `GET /api/badges/[userId]` - Get user badges
- `GET /api/dao/proposals` - List governance proposals
- `POST /api/dao/proposals` - Create new proposal
- `GET /api/leaderboard` - Get leaderboard data

## 📝 Future Enhancements

- [ ] User profiles with reputation scores
- [ ] Report categories and tags
- [ ] Email notifications for high-voted reports
- [ ] API key system for external integrations
- [ ] Mobile app (React Native)
- [ ] Multi-chain support (Polygon, BSC, etc.)
- [ ] IPFS integration for decentralized storage
- [ ] DAO governance for platform decisions

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the troubleshooting section below
3. Open a new issue with detailed information

### Troubleshooting

**Issue**: MetaMask not connecting
- **Solution**: Ensure MetaMask is installed and unlocked. Try refreshing the page.

**Issue**: Contract address not configured
- **Solution**: Deploy the smart contract and set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env`

**Issue**: Database connection error
- **Solution**: Verify `DATABASE_URL` is correct and PostgreSQL is running

**Issue**: "Module not found" errors
- **Solution**: Run `npm install` or `bun install` to install dependencies

**Issue**: Hardhat network errors
- **Solution**: Ensure Hardhat node is running with `npx hardhat node`

## 👏 Acknowledgments

- OpenZeppelin for smart contract patterns
- shadcn/ui for beautiful UI components
- Hardhat for Ethereum development tools
- Prisma for database ORM
- Next.js team for the amazing framework

---

Built with ❤️ for a safer Web3 ecosystem
