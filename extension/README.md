# PhishBlock Browser Extension

A comprehensive browser extension that integrates with your PhishBlock decentralized phishing protection system. The extension provides real-time phishing detection, community reporting, and blockchain-based verification.

## 🚀 Features

### 🛡️ **Real-time Protection**
- **URL Monitoring**: Automatically checks every website you visit
- **Suspicious Pattern Detection**: Identifies phishing indicators in real-time
- **Form Analysis**: Detects suspicious login forms and data collection
- **Link Scanning**: Highlights potentially dangerous links

### 🔗 **Blockchain Integration**
- **Smart Contract Interaction**: Direct integration with PhishBlock contracts
- **Community Voting**: Vote on phishing reports using your reputation
- **Evidence Submission**: Submit evidence to IPFS and blockchain
- **Reputation System**: Earn reputation through good behavior

### 📊 **User Interface**
- **Popup Dashboard**: View your protection status and reputation
- **Activity Feed**: See recent protection actions and reports
- **Statistics**: Track your contributions to the community
- **Settings**: Customize protection levels and notifications

### 🔒 **Security Features**
- **MetaMask Integration**: Secure wallet connection
- **IPFS Storage**: Decentralized evidence storage via Pinata
- **Rate Limiting**: Prevents spam and abuse
- **Privacy Protection**: No personal data collection

## 📁 Extension Structure

```
extension/
├── manifest.json              # Extension manifest
├── background.js              # Background service worker
├── content.js                 # Content script for page analysis
├── content.css                # Styles for content script
├── popup.html                 # Extension popup interface
├── popup.js                   # Popup functionality
├── blocked.html               # Blocked page template
├── contract-integration.js    # Smart contract interactions
├── ipfs-integration.js        # IPFS/Pinata integration
└── icons/                     # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 Installation

### **Development Installation**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ashitha0409/phishblock-decentralized-report-anchoring.git
   cd phishblock-decentralized-report-anchoring
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.template .env
   # Edit .env with your actual values
   ```

4. **Deploy smart contracts**:
   ```bash
   npm run deploy:sepolia
   ```

5. **Load extension in browser**:
   - Open Chrome/Edge
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

### **Production Installation**

1. **Build the extension**:
   ```bash
   npm run build:extension
   ```

2. **Package for distribution**:
   ```bash
   npm run package:extension
   ```

3. **Submit to Chrome Web Store**:
   - Upload the packaged extension
   - Complete the store listing
   - Wait for review and approval

## ⚙️ Configuration

### **Environment Variables**

Create a `.env` file in the extension directory:

```env
# Smart Contract Addresses
NEXT_PUBLIC_PHISHBLOCK_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS=0x...
NEXT_PUBLIC_EVIDENCE_VALIDATOR_ADDRESS=0x...
NEXT_PUBLIC_MOCK_TOKEN_ADDRESS=0x...

# IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET=your_pinata_secret
WEB3STORAGE_TOKEN=your_web3storage_token

# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

### **Extension Settings**

The extension can be configured through the popup interface:

- **Protection Level**: Choose between Basic, Standard, and Advanced
- **Notifications**: Enable/disable different types of alerts
- **Auto-reporting**: Automatically report suspicious sites
- **Reputation Threshold**: Set minimum reputation for actions

## 🔌 Smart Contract Integration

### **Contract Addresses**

The extension integrates with three main contracts:

1. **PhishBlockRegistry**: Main registry for phishing reports
2. **ReputationSystem**: User reputation and staking
3. **EvidenceValidator**: Evidence validation and IPFS integration

### **Key Functions**

```javascript
// Submit a phishing report
await contractIntegration.submitReport(
  url,
  wallet,
  description,
  ipfsHash,
  evidenceType
);

// Vote on a report
await contractIntegration.voteOnReport(reportId, isUpvote);

// Check user reputation
const reputation = await contractIntegration.getUserReputation();

// Stake tokens for reputation
await contractIntegration.depositStake(amount, lockPeriod, stakeType);
```

## 📡 IPFS Integration

### **Pinata Integration**

The extension uses Pinata for IPFS storage:

```javascript
// Upload evidence to IPFS
const result = await ipfsIntegration.uploadEvidence(file, {
  metadata: {
    type: 'screenshot',
    url: currentUrl,
    description: 'Phishing site evidence'
  }
});

// Retrieve content from IPFS
const content = await ipfsIntegration.getIPFSContent(ipfsHash);
```

### **Supported File Types**

- **Screenshots**: PNG/JPEG images
- **Documents**: PDF files
- **Reports**: JSON data
- **Metadata**: Structured data

## 🎯 Usage Guide

### **Basic Usage**

1. **Install the extension** and connect your MetaMask wallet
2. **Browse normally** - the extension monitors all websites
3. **View warnings** when suspicious sites are detected
4. **Report phishing** sites through the popup interface
5. **Earn reputation** by contributing to the community

### **Advanced Features**

1. **Stake tokens** to increase your reputation multiplier
2. **Vote on reports** to help verify phishing sites
3. **Submit evidence** with screenshots and documentation
4. **Track statistics** in your personal dashboard

### **Reporting Process**

1. **Detect suspicious site** (automatic or manual)
2. **Take screenshot** of the suspicious content
3. **Submit report** with evidence to IPFS
4. **Community votes** on the report validity
5. **Site gets blacklisted** if confirmed malicious

## 🔒 Security Considerations

### **Privacy Protection**

- **No personal data collection** beyond what's necessary
- **Local storage only** for user preferences
- **Encrypted communication** with blockchain and IPFS
- **Optional reporting** - users control what they share

### **Security Measures**

- **Content Security Policy** prevents XSS attacks
- **Input validation** on all user inputs
- **Rate limiting** prevents spam and abuse
- **Secure storage** of sensitive data

### **Permission Management**

The extension requests minimal permissions:

- `activeTab`: Access current tab for analysis
- `storage`: Store user preferences locally
- `tabs`: Monitor tab changes
- `webRequest`: Block malicious requests
- `notifications`: Show security alerts

## 🧪 Testing

### **Unit Tests**

```bash
# Run extension tests
npm run test:extension

# Run with coverage
npm run test:extension:coverage
```

### **Integration Tests**

```bash
# Test with local blockchain
npm run test:integration

# Test with testnet
npm run test:integration:sepolia
```

### **Manual Testing**

1. **Load extension** in development mode
2. **Visit test sites** with known phishing patterns
3. **Submit reports** and verify blockchain interaction
4. **Test voting** and reputation changes
5. **Verify IPFS** uploads and retrievals

## 📊 Performance

### **Resource Usage**

- **Memory**: ~10-15MB typical usage
- **CPU**: Minimal impact during normal browsing
- **Network**: Only when submitting reports or checking blockchain
- **Storage**: <1MB for extension files

### **Optimization**

- **Lazy loading** of blockchain interactions
- **Caching** of frequently accessed data
- **Debounced** URL checking to prevent spam
- **Efficient** IPFS uploads with compression

## 🚀 Deployment

### **Chrome Web Store**

1. **Prepare store assets**:
   - Extension icons (16x16 to 128x128)
   - Store screenshots
   - Description and keywords
   - Privacy policy

2. **Package extension**:
   ```bash
   npm run package:chrome
   ```

3. **Submit for review**:
   - Upload package to Chrome Web Store
   - Complete store listing
   - Wait for approval (1-3 days)

### **Firefox Add-ons**

1. **Adapt manifest** for Firefox compatibility
2. **Package for Firefox**:
   ```bash
   npm run package:firefox
   ```

3. **Submit to Mozilla**:
   - Upload to addons.mozilla.org
   - Complete listing information
   - Wait for review

### **Edge Add-ons**

1. **Package for Edge**:
   ```bash
   npm run package:edge
   ```

2. **Submit to Microsoft Store**:
   - Upload to Partner Center
   - Complete store listing
   - Wait for certification

## 🔧 Development

### **Local Development**

1. **Start development server**:
   ```bash
   npm run dev:extension
   ```

2. **Load unpacked extension** in browser
3. **Make changes** and reload extension
4. **Test functionality** with local blockchain

### **Building**

```bash
# Build for production
npm run build:extension

# Build for specific browser
npm run build:chrome
npm run build:firefox
npm run build:edge
```

### **Debugging**

- **Chrome DevTools**: Use extension debugging tools
- **Console logs**: Check background script and content script logs
- **Network tab**: Monitor blockchain and IPFS requests
- **Storage tab**: Inspect local storage and cache

## 📈 Analytics

### **Usage Metrics**

The extension tracks anonymous usage metrics:

- **Protection events**: Sites blocked, warnings shown
- **User engagement**: Reports submitted, votes cast
- **Performance**: Response times, error rates
- **Feature usage**: Which features are most used

### **Privacy Compliance**

- **GDPR compliant**: No personal data collection
- **CCPA compliant**: Users can opt out of analytics
- **Anonymous data only**: No personally identifiable information
- **Local processing**: Data processed locally when possible

## 🤝 Contributing

### **Development Setup**

1. **Fork the repository**
2. **Create feature branch**:
   ```bash
   git checkout -b feature/new-feature
   ```

3. **Make changes** and test thoroughly
4. **Submit pull request** with detailed description

### **Code Standards**

- **ESLint**: Follow JavaScript best practices
- **TypeScript**: Use TypeScript for type safety
- **Comments**: Document complex functionality
- **Tests**: Write tests for new features

## 📞 Support

### **Documentation**

- **API Reference**: Complete function documentation
- **Tutorials**: Step-by-step guides
- **FAQ**: Common questions and answers
- **Troubleshooting**: Common issues and solutions

### **Community**

- **Discord**: Real-time chat support
- **GitHub Issues**: Bug reports and feature requests
- **Email**: Direct support for critical issues
- **Forum**: Community discussions and help

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin**: Smart contract security patterns
- **Ethers.js**: Ethereum interaction library
- **Pinata**: IPFS pinning service
- **MetaMask**: Wallet integration
- **Chrome Extensions API**: Browser extension framework

---

**Built with ❤️ by the PhishBlock Team**

For more information, visit [phishblock.com](https://phishblock.com) or join our [Discord community](https://discord.gg/phishblock).
