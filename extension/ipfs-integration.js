// PhishBlock Browser Extension - IPFS Integration
// Handles evidence storage and retrieval using Pinata and web3.storage

class PhishBlockIPFSIntegration {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecret = process.env.PINATA_SECRET;
    this.web3StorageToken = process.env.WEB3STORAGE_TOKEN;
    this.pinataEndpoint = 'https://api.pinata.cloud';
    this.web3StorageEndpoint = 'https://api.web3.storage';
    
    this.init();
  }

  async init() {
    console.log('PhishBlock IPFS Integration initialized');
    
    // Test connection
    await this.testConnection();
  }

  async testConnection() {
    try {
      if (this.pinataApiKey && this.pinataSecret) {
        const response = await this.pinataTest();
        console.log('Pinata connection:', response ? 'Success' : 'Failed');
      }
      
      if (this.web3StorageToken) {
        const response = await this.web3StorageTest();
        console.log('Web3.Storage connection:', response ? 'Success' : 'Failed');
      }
    } catch (error) {
      console.error('IPFS connection test failed:', error);
    }
  }

  // Pinata Integration

  async pinataTest() {
    try {
      const response = await fetch(`${this.pinataEndpoint}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecret
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Pinata test failed:', error);
      return false;
    }
  }

  async uploadToPinata(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata
      const pinataMetadata = {
        name: metadata.name || 'phishblock-evidence',
        keyvalues: {
          type: metadata.type || 'evidence',
          timestamp: Date.now().toString(),
          url: metadata.url || '',
          description: metadata.description || ''
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
      
      // Add options
      const pinataOptions = {
        cidVersion: 1,
        wrapWithDirectory: false
      };
      
      formData.append('pinataOptions', JSON.stringify(pinataOptions));
      
      const response = await fetch(`${this.pinataEndpoint}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecret
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
        provider: 'pinata'
      };
      
    } catch (error) {
      console.error('Error uploading to Pinata:', error);
      throw error;
    }
  }

  async pinJSONToPinata(jsonData, metadata = {}) {
    try {
      const pinataMetadata = {
        name: metadata.name || 'phishblock-report',
        keyvalues: {
          type: metadata.type || 'report',
          timestamp: Date.now().toString(),
          url: metadata.url || '',
          description: metadata.description || ''
        }
      };
      
      const pinataOptions = {
        cidVersion: 1
      };
      
      const body = {
        pinataContent: jsonData,
        pinataMetadata: pinataMetadata,
        pinataOptions: pinataOptions
      };
      
      const response = await fetch(`${this.pinataEndpoint}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecret
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Pinata JSON upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
        provider: 'pinata'
      };
      
    } catch (error) {
      console.error('Error uploading JSON to Pinata:', error);
      throw error;
    }
  }

  // Web3.Storage Integration

  async web3StorageTest() {
    try {
      const response = await fetch(`${this.web3StorageEndpoint}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.web3StorageToken}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Web3.Storage test failed:', error);
      return false;
    }
  }

  async uploadToWeb3Storage(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata as headers
      if (metadata.name) formData.append('name', metadata.name);
      if (metadata.type) formData.append('type', metadata.type);
      if (metadata.url) formData.append('url', metadata.url);
      if (metadata.description) formData.append('description', metadata.description);
      
      const response = await fetch(`${this.web3StorageEndpoint}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.web3StorageToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        ipfsHash: result.cid,
        size: result.size,
        provider: 'web3.storage'
      };
      
    } catch (error) {
      console.error('Error uploading to Web3.Storage:', error);
      throw error;
    }
  }

  // Unified Upload Methods

  async uploadEvidence(evidence, options = {}) {
    try {
      const {
        usePinata = true,
        useWeb3Storage = false,
        metadata = {}
      } = options;
      
      let result = null;
      
      // Try Pinata first if available
      if (usePinata && this.pinataApiKey && this.pinataSecret) {
        try {
          if (evidence instanceof File) {
            result = await this.uploadToPinata(evidence, metadata);
          } else {
            result = await this.pinJSONToPinata(evidence, metadata);
          }
        } catch (error) {
          console.warn('Pinata upload failed, trying Web3.Storage:', error);
        }
      }
      
      // Fallback to Web3.Storage if Pinata failed or not preferred
      if (!result && useWeb3Storage && this.web3StorageToken) {
        try {
          if (evidence instanceof File) {
            result = await this.uploadToWeb3Storage(evidence, metadata);
          } else {
            // Convert JSON to file for Web3.Storage
            const file = new File([JSON.stringify(evidence)], 'evidence.json', {
              type: 'application/json'
            });
            result = await this.uploadToWeb3Storage(file, metadata);
          }
        } catch (error) {
          console.error('Web3.Storage upload failed:', error);
        }
      }
      
      if (!result) {
        throw new Error('All IPFS upload methods failed');
      }
      
      return result;
      
    } catch (error) {
      console.error('Error uploading evidence:', error);
      throw error;
    }
  }

  async uploadScreenshot(canvas, metadata = {}) {
    try {
      return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          try {
            const file = new File([blob], 'screenshot.png', {
              type: 'image/png'
            });
            
            const result = await this.uploadEvidence(file, {
              metadata: {
                ...metadata,
                type: 'screenshot',
                mimeType: 'image/png'
              }
            });
            
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, 'image/png', 0.8);
      });
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      throw error;
    }
  }

  async uploadReportData(reportData, metadata = {}) {
    try {
      const result = await this.uploadEvidence(reportData, {
        metadata: {
          ...metadata,
          type: 'report',
          mimeType: 'application/json'
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error uploading report data:', error);
      throw error;
    }
  }

  // IPFS Content Retrieval

  async getIPFSContent(ipfsHash, provider = 'auto') {
    try {
      let content = null;
      
      if (provider === 'auto' || provider === 'pinata') {
        try {
          content = await this.getFromPinata(ipfsHash);
          if (content) return { content, provider: 'pinata' };
        } catch (error) {
          console.warn('Failed to get content from Pinata:', error);
        }
      }
      
      if (provider === 'auto' || provider === 'web3.storage') {
        try {
          content = await this.getFromWeb3Storage(ipfsHash);
          if (content) return { content, provider: 'web3.storage' };
        } catch (error) {
          console.warn('Failed to get content from Web3.Storage:', error);
        }
      }
      
      // Fallback to public IPFS gateway
      try {
        content = await this.getFromPublicGateway(ipfsHash);
        if (content) return { content, provider: 'public' };
      } catch (error) {
        console.warn('Failed to get content from public gateway:', error);
      }
      
      throw new Error('Failed to retrieve content from all sources');
      
    } catch (error) {
      console.error('Error getting IPFS content:', error);
      throw error;
    }
  }

  async getFromPinata(ipfsHash) {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error(`Pinata gateway failed: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error getting from Pinata:', error);
      throw error;
    }
  }

  async getFromWeb3Storage(ipfsHash) {
    try {
      const response = await fetch(`https://${ipfsHash}.ipfs.w3s.link/`);
      
      if (!response.ok) {
        throw new Error(`Web3.Storage gateway failed: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error getting from Web3.Storage:', error);
      throw error;
    }
  }

  async getFromPublicGateway(ipfsHash) {
    try {
      const gateways = [
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://gateway.ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
      ];
      
      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway);
          if (response.ok) {
            return await response.text();
          }
        } catch (error) {
          console.warn(`Gateway ${gateway} failed:`, error);
        }
      }
      
      throw new Error('All public gateways failed');
    } catch (error) {
      console.error('Error getting from public gateway:', error);
      throw error;
    }
  }

  // Utility Methods

  async validateIPFSHash(ipfsHash) {
    try {
      // Basic IPFS hash validation
      if (!ipfsHash || typeof ipfsHash !== 'string') {
        return false;
      }
      
      // Check if it's a valid IPFS hash format
      const ipfsHashRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafybei[a-z2-7]{52}$/;
      return ipfsHashRegex.test(ipfsHash);
    } catch (error) {
      console.error('Error validating IPFS hash:', error);
      return false;
    }
  }

  async getIPFSMetadata(ipfsHash) {
    try {
      const result = await this.getIPFSContent(ipfsHash);
      
      if (result.content) {
        try {
          return JSON.parse(result.content);
        } catch (error) {
          return {
            content: result.content,
            type: 'text',
            provider: result.provider
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting IPFS metadata:', error);
      return null;
    }
  }

  // Pin Management

  async listPins(provider = 'pinata') {
    try {
      if (provider === 'pinata' && this.pinataApiKey) {
        const response = await fetch(`${this.pinataEndpoint}/data/pinList`, {
          method: 'GET',
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecret
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to list pins: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.rows || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error listing pins:', error);
      return [];
    }
  }

  async unpinContent(ipfsHash, provider = 'pinata') {
    try {
      if (provider === 'pinata' && this.pinataApiKey) {
        const response = await fetch(`${this.pinataEndpoint}/pinning/unpin/${ipfsHash}`, {
          method: 'DELETE',
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecret
          }
        });
        
        return response.ok;
      }
      
      return false;
    } catch (error) {
      console.error('Error unpinning content:', error);
      return false;
    }
  }
}

// Export for use in other scripts
window.PhishBlockIPFSIntegration = PhishBlockIPFSIntegration;
