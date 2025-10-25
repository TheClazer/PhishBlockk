# Quick Setup Guide

This guide will help you get PhishGuard running in under 10 minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ or Bun installed
- [ ] PostgreSQL installed and running
- [ ] MetaMask browser extension installed
- [ ] Git installed

## Step-by-Step Setup

### 1. Install Dependencies (2 min)

```bash
npm install
# or
bun install
```

### 2. Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env` and set your database URL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/phishing_reports?schema=public"
```

### 3. Setup Database (2 min)

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
```

### 4. Deploy Smart Contract (3 min)

**Terminal 1** - Start local blockchain:
```bash
npx hardhat node
```

**Terminal 2** - Deploy contract:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Copy the contract address from the output and add to `.env`:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
```

### 5. Start Development Server (1 min)

```bash
npm run dev
# or
bun dev
```

Open http://localhost:3000

### 6. Configure MetaMask (2 min)

1. Click MetaMask extension
2. Add network:
   - Network Name: **Hardhat Local**
   - RPC URL: **http://127.0.0.1:8545**
   - Chain ID: **31337**
   - Currency: **ETH**
3. Import a test account using a private key from Terminal 1 (Hardhat node output)
4. Switch to Hardhat Local network

### 7. Test the Application

1. Click "Connect Wallet" in the app
2. Submit a test report (try both with and without on-chain anchoring)
3. View the report details and verify the hash
4. Try voting on an anchored report

## Common Commands

```bash
# Run smart contract tests
npx hardhat test

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma migrate reset

# Compile contracts
npx hardhat compile

# Check Next.js build
npm run build
```

## Troubleshooting

### "Contract address not configured"
- Make sure you deployed the contract and set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env`
- Restart the dev server after changing `.env`

### "Failed to connect wallet"
- Ensure MetaMask is installed and unlocked
- Check that you're on the Hardhat Local network (Chain ID 31337)
- Refresh the page

### "Database connection failed"
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format in `.env`
- Ensure database exists or create it: `createdb phishing_reports`

### "Transaction failed"
- Make sure Hardhat node is running in Terminal 1
- Check you have test ETH in your MetaMask account
- Try increasing gas limit in MetaMask

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore the code structure in `src/`
- Run the test suite: `npx hardhat test`
- Deploy to testnet (see README.md deployment section)

## Need Help?

- Check existing issues on GitHub
- Review the troubleshooting section in README.md
- Open a new issue with details about your problem

---

**Estimated Setup Time**: 10 minutes
**Difficulty**: Intermediate (requires basic blockchain knowledge)
