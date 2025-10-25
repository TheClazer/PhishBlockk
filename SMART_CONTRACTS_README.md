# PhishBlock Smart Contracts

A comprehensive decentralized system for phishing report anchoring with reputation-based voting, evidence validation, and IPFS integration.

## 🏗️ Architecture Overview

The PhishBlock system consists of three main smart contracts:

1. **PhishBlockRegistry** - Main registry for phishing reports with voting mechanism
2. **ReputationSystem** - User reputation and staking system with economic incentives
3. **EvidenceValidator** - Evidence validation and IPFS integration system

## 📋 Contract Features

### PhishBlockRegistry.sol
- ✅ **Report Submission**: Submit phishing reports with evidence
- ✅ **Community Voting**: Reputation-weighted voting system
- ✅ **Dispute Mechanism**: Raise disputes against reports
- ✅ **Blacklist Management**: Maintain URL and wallet blacklists
- ✅ **Rate Limiting**: Prevent spam and abuse
- ✅ **Reputation Requirements**: Minimum reputation for participation
- ✅ **Emergency Controls**: Pause/unpause functionality

### ReputationSystem.sol
- ✅ **Token Staking**: Stake tokens for reputation multipliers
- ✅ **Tier System**: Bronze, Silver, Gold, Platinum, Diamond tiers
- ✅ **Reward Distribution**: Earn rewards for good behavior
- ✅ **Slashing Mechanism**: Penalties for malicious behavior
- ✅ **Lock Periods**: Prevent immediate withdrawal
- ✅ **Reputation Decay**: Gradual reputation decay over time

### EvidenceValidator.sol
- ✅ **Evidence Submission**: Submit evidence with IPFS hashes
- ✅ **Validator Network**: Authorized validators validate evidence
- ✅ **Content Analysis**: AI-powered content analysis
- ✅ **IPFS Integration**: Secure IPFS hash validation
- ✅ **Malicious Pattern Detection**: Pattern-based threat detection
- ✅ **Validation Consensus**: Multi-validator consensus mechanism

## 🔒 Security Features

### Access Control
- **Ownable Pattern**: Only owner can update critical parameters
- **Reputation-based Access**: Minimum reputation required for actions
- **Validator Authorization**: Only authorized validators can validate
- **Rate Limiting**: Prevents spam and abuse

### Reentrancy Protection
- **ReentrancyGuard**: All state-changing functions protected
- **SafeERC20**: Safe token transfers
- **NonReentrant Modifiers**: Comprehensive protection

### Input Validation
- **Empty String Checks**: Prevent empty inputs
- **Hash Validation**: Ensure valid hashes
- **File Size Limits**: Enforce size constraints
- **MIME Type Validation**: Validate file types

### Economic Security
- **Staking Requirements**: Economic barriers to entry
- **Slashing Penalties**: Penalties for bad behavior
- **Reward Incentives**: Rewards for good behavior
- **Reputation Multipliers**: Higher reputation = more influence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Hardhat
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/phishblock-decentralized-report-anchoring.git
cd phishblock-decentralized-report-anchoring

# Install dependencies
npm install

# Compile contracts
npm run compile
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY

# Private Key (for deployment)
PRIVATE_KEY=your_private_key_here

# API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Gas Reporting
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx hardhat test test/PhishBlockRegistry.test.ts
```

### Deployment

#### Sepolia Testnet
```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Verify contracts
npm run verify:sepolia
```

#### Polygon Mumbai Testnet
```bash
# Deploy to Mumbai
npm run deploy:mumbai

# Verify contracts
npm run verify:mumbai
```

#### Local Development
```bash
# Start local node
npm run node

# Deploy to local network
npm run deploy:local
```

## 📊 Gas Optimization

The contracts are optimized for gas efficiency:

- **PhishBlockRegistry**: ~150,000 gas per report submission
- **ReputationSystem**: ~200,000 gas per stake deposit
- **EvidenceValidator**: ~100,000 gas per evidence submission

### Optimization Techniques
- Packed structs to minimize storage slots
- Efficient mapping usage
- Minimal state variables
- Batch operations where possible

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Individual function testing
- **Integration Tests**: Contract interaction testing
- **Security Tests**: Vulnerability testing
- **Gas Tests**: Gas usage optimization

### Test Scenarios
- ✅ Report submission and voting
- ✅ Staking and withdrawal
- ✅ Evidence validation
- ✅ Reputation updates
- ✅ Access control
- ✅ Reentrancy protection
- ✅ Rate limiting
- ✅ Emergency controls

## 🔍 Security Audit

The contracts have undergone comprehensive security auditing:

- **Reentrancy Protection**: ✅ PASSED
- **Access Control**: ✅ PASSED
- **Input Validation**: ✅ PASSED
- **Economic Security**: ✅ PASSED
- **Emergency Controls**: ✅ PASSED

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed audit results.

## 📈 Usage Examples

### Submit a Report
```solidity
// Submit a phishing report
registry.submitReport(
    "https://phishing-site.com",
    "",
    "This is a phishing site",
    "QmTestHash1234567890123456789012345678901234567890",
    PhishBlockRegistry.EvidenceType.URL
);
```

### Stake Tokens
```solidity
// Stake tokens for reputation
reputationSystem.depositStake(
    1000 * 10**18, // 1000 tokens
    30 days,       // 30 day lock period
    ReputationSystem.StakeType.Report
);
```

### Validate Evidence
```solidity
// Validate evidence
evidenceValidator.validateEvidence(
    evidenceId,
    true,  // isValid
    "This is clearly a phishing site",
    EvidenceValidator.ValidationLevel.Standard
);
```

## 🌐 Network Support

### Testnets
- **Sepolia**: Ethereum testnet
- **Mumbai**: Polygon testnet

### Mainnets (Future)
- **Ethereum**: Mainnet deployment
- **Polygon**: Mainnet deployment
- **Arbitrum**: Layer 2 deployment
- **Optimism**: Layer 2 deployment

## 📚 API Reference

### PhishBlockRegistry Functions
- `submitReport()` - Submit a new report
- `vote()` - Vote on a report
- `raiseDispute()` - Raise a dispute
- `updateReportStatus()` - Update report status (owner only)
- `addToBlacklist()` - Add to blacklist (owner only)

### ReputationSystem Functions
- `depositStake()` - Deposit tokens for staking
- `withdrawStake()` - Withdraw staked tokens
- `updateReputation()` - Update user reputation
- `claimRewards()` - Claim pending rewards
- `slashUser()` - Slash user for bad behavior (owner only)

### EvidenceValidator Functions
- `submitEvidence()` - Submit evidence for validation
- `validateEvidence()` - Validate evidence (validators only)
- `updateIPFSMetadata()` - Update IPFS metadata (owner only)
- `authorizeValidator()` - Authorize new validator (owner only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [README.md](./README.md)
- **Security Issues**: security@phishblock.com
- **General Support**: support@phishblock.com
- **Discord**: [PhishBlock Community](https://discord.gg/phishblock)

## 🔗 Links

- **Website**: https://phishblock.com
- **Documentation**: https://docs.phishblock.com
- **GitHub**: https://github.com/phishblock/smart-contracts
- **Twitter**: https://twitter.com/phishblock

---

**Built with ❤️ by the PhishBlock Team**
