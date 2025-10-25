// PhishBlock Browser Extension - Background Script
// Handles blockchain interactions and phishing detection

class PhishBlockExtension {
  constructor() {
    this.contractAddresses = {
      sepolia: {
        registry: process.env.NEXT_PUBLIC_PHISHBLOCK_REGISTRY_ADDRESS,
        reputation: process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS,
        validator: process.env.NEXT_PUBLIC_EVIDENCE_VALIDATOR_ADDRESS
      }
    };
    
    this.blacklistedDomains = new Set();
    this.suspiciousPatterns = [
      'phishing', 'scam', 'fake', 'steal', 'hack', 'crypto',
      'wallet', 'exchange', 'bank', 'login', 'verify'
    ];
    
    this.init();
  }

  async init() {
    console.log('PhishBlock Extension initialized');
    
    // Load blacklisted domains from blockchain
    await this.loadBlacklistedDomains();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize Web3 connection
    await this.initWeb3();
  }

  async initWeb3() {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        this.provider = window.ethereum;
        await this.provider.request({ method: 'eth_requestAccounts' });
        console.log('Web3 connected successfully');
      } else {
        console.log('MetaMask not installed');
      }
    } catch (error) {
      console.error('Web3 initialization failed:', error);
    }
  }

  setupEventListeners() {
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.checkUrl(tab.url, tabId);
      }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Listen for web requests
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        return this.checkRequest(details);
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );
  }

  async checkUrl(url, tabId) {
    try {
      const domain = new URL(url).hostname;
      
      // Check if domain is blacklisted
      if (this.blacklistedDomains.has(domain)) {
        await this.blockPage(tabId, url, 'blacklisted');
        return;
      }

      // Check for suspicious patterns
      const isSuspicious = this.detectSuspiciousPatterns(url);
      if (isSuspicious) {
        await this.showWarning(tabId, url, 'suspicious');
      }

      // Check with blockchain registry
      const blockchainResult = await this.checkBlockchain(url);
      if (blockchainResult.isPhishing) {
        await this.blockPage(tabId, url, 'blockchain_verified');
      }

    } catch (error) {
      console.error('Error checking URL:', error);
    }
  }

  detectSuspiciousPatterns(url) {
    const urlLower = url.toLowerCase();
    
    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (urlLower.includes(pattern)) {
        return true;
      }
    }

    // Check for typosquatting
    const domain = new URL(url).hostname;
    const commonTypos = this.generateTypos(domain);
    
    for (const typo of commonTypos) {
      if (this.blacklistedDomains.has(typo)) {
        return true;
      }
    }

    return false;
  }

  generateTypos(domain) {
    const typos = [];
    const parts = domain.split('.');
    const mainDomain = parts[0];
    
    // Common typosquatting patterns
    const patterns = [
      mainDomain + 's', // plurals
      mainDomain + '1', // numbers
      mainDomain + '-', // hyphens
      mainDomain.replace('o', '0'), // o to 0
      mainDomain.replace('l', '1'), // l to 1
      mainDomain.replace('e', '3'), // e to 3
    ];
    
    return patterns.map(typo => typo + '.' + parts.slice(1).join('.'));
  }

  async checkBlockchain(url) {
    try {
      if (!this.provider) {
        return { isPhishing: false, confidence: 0 };
      }

      // This would interact with your smart contracts
      // For now, return mock data
      return {
        isPhishing: false,
        confidence: 0.5,
        reportCount: 0,
        voteScore: 0
      };
    } catch (error) {
      console.error('Blockchain check failed:', error);
      return { isPhishing: false, confidence: 0 };
    }
  }

  async blockPage(tabId, url, reason) {
    try {
      // Redirect to blocked page
      await chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('blocked.html') + 
             '?url=' + encodeURIComponent(url) + 
             '&reason=' + reason
      });

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'PhishBlock Protection',
        message: `Blocked suspicious website: ${new URL(url).hostname}`
      });

    } catch (error) {
      console.error('Error blocking page:', error);
    }
  }

  async showWarning(tabId, url, reason) {
    try {
      // Send message to content script to show warning
      await chrome.tabs.sendMessage(tabId, {
        action: 'showWarning',
        url: url,
        reason: reason
      });

    } catch (error) {
      console.error('Error showing warning:', error);
    }
  }

  async loadBlacklistedDomains() {
    try {
      // Load from storage first
      const result = await chrome.storage.local.get(['blacklistedDomains']);
      if (result.blacklistedDomains) {
        this.blacklistedDomains = new Set(result.blacklistedDomains);
      }

      // Update from blockchain
      await this.updateBlacklistFromBlockchain();
    } catch (error) {
      console.error('Error loading blacklisted domains:', error);
    }
  }

  async updateBlacklistFromBlockchain() {
    try {
      // This would fetch from your smart contracts
      // For now, use mock data
      const mockBlacklist = [
        'phishing-site.com',
        'fake-bank.com',
        'scam-wallet.com',
        'fake-exchange.com'
      ];

      this.blacklistedDomains = new Set(mockBlacklist);
      
      // Save to storage
      await chrome.storage.local.set({
        blacklistedDomains: Array.from(this.blacklistedDomains)
      });

    } catch (error) {
      console.error('Error updating blacklist:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'reportPhishing':
          await this.reportPhishing(request.url, request.evidence);
          sendResponse({ success: true });
          break;

        case 'checkUrl':
          const result = await this.checkBlockchain(request.url);
          sendResponse(result);
          break;

        case 'getUserReputation':
          const reputation = await this.getUserReputation();
          sendResponse({ reputation });
          break;

        case 'voteOnReport':
          await this.voteOnReport(request.reportId, request.isUpvote);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async reportPhishing(url, evidence) {
    try {
      // This would interact with your smart contracts
      console.log('Reporting phishing URL:', url);
      
      // Upload evidence to IPFS
      const ipfsHash = await this.uploadToIPFS(evidence);
      
      // Submit to blockchain
      await this.submitToBlockchain(url, ipfsHash);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'PhishBlock Report',
        message: 'Phishing report submitted successfully!'
      });

    } catch (error) {
      console.error('Error reporting phishing:', error);
      throw error;
    }
  }

  async uploadToIPFS(evidence) {
    try {
      // This would upload to Pinata or web3.storage
      // For now, return mock hash
      return 'QmMockHash1234567890123456789012345678901234567890';
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  async submitToBlockchain(url, ipfsHash) {
    try {
      // This would interact with your PhishBlockRegistry contract
      console.log('Submitting to blockchain:', { url, ipfsHash });
      
      // Mock implementation
      return true;
    } catch (error) {
      console.error('Error submitting to blockchain:', error);
      throw error;
    }
  }

  async getUserReputation() {
    try {
      // This would fetch from your ReputationSystem contract
      // For now, return mock data
      return 50;
    } catch (error) {
      console.error('Error getting user reputation:', error);
      return 0;
    }
  }

  async voteOnReport(reportId, isUpvote) {
    try {
      // This would interact with your PhishBlockRegistry contract
      console.log('Voting on report:', { reportId, isUpvote });
      
      // Mock implementation
      return true;
    } catch (error) {
      console.error('Error voting on report:', error);
      throw error;
    }
  }

  checkRequest(details) {
    const url = details.url;
    const domain = new URL(url).hostname;
    
    if (this.blacklistedDomains.has(domain)) {
      return { cancel: true };
    }
    
    return { cancel: false };
  }
}

// Initialize the extension
const phishBlockExtension = new PhishBlockExtension();
