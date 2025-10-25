// PhishBlock Browser Extension - Popup Script
// Handles user interactions in the extension popup

class PhishBlockPopup {
  constructor() {
    this.currentTab = null;
    this.userStats = {
      reputation: 50,
      reports: 12,
      votes: 8,
      blocks: 3,
      rewards: 25
    };
    
    this.init();
  }

  async init() {
    console.log('PhishBlock Popup initialized');
    
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
    
    // Load user data
    await this.loadUserData();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
  }

  setupEventListeners() {
    // Report button
    document.getElementById('report-btn').addEventListener('click', () => {
      this.reportCurrentSite();
    });

    // Check button
    document.getElementById('check-btn').addEventListener('click', () => {
      this.checkCurrentPage();
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  async loadUserData() {
    try {
      // Load from storage
      const result = await chrome.storage.local.get(['userStats', 'reputation']);
      
      if (result.userStats) {
        this.userStats = { ...this.userStats, ...result.userStats };
      }
      
      if (result.reputation) {
        this.userStats.reputation = result.reputation;
      }

      // Get fresh data from blockchain
      await this.updateFromBlockchain();
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async updateFromBlockchain() {
    try {
      // Get reputation from blockchain
      const reputation = await this.getUserReputation();
      if (reputation !== null) {
        this.userStats.reputation = reputation;
      }

      // Get user stats from blockchain
      const stats = await this.getUserStats();
      if (stats) {
        this.userStats = { ...this.userStats, ...stats };
      }

      // Save to storage
      await chrome.storage.local.set({
        userStats: this.userStats,
        reputation: this.userStats.reputation
      });

    } catch (error) {
      console.error('Error updating from blockchain:', error);
    }
  }

  async getUserReputation() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getUserReputation'
      });
      
      return response.reputation || 0;
    } catch (error) {
      console.error('Error getting user reputation:', error);
      return 0;
    }
  }

  async getUserStats() {
    try {
      // This would fetch from your smart contracts
      // For now, return mock data
      return {
        reports: 12,
        votes: 8,
        blocks: 3,
        rewards: 25
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  updateUI() {
    // Update reputation
    this.updateReputationDisplay();
    
    // Update stats
    this.updateStatsDisplay();
    
    // Update protection status
    this.updateProtectionStatus();
    
    // Update activity list
    this.updateActivityList();
  }

  updateReputationDisplay() {
    const reputation = this.userStats.reputation;
    const percentage = Math.min((reputation / 100) * 100, 100);
    
    // Update progress bar
    const fill = document.getElementById('reputation-fill');
    fill.style.width = `${percentage}%`;
    
    // Update text
    const text = document.getElementById('reputation-text');
    const tier = this.getReputationTier(reputation);
    text.textContent = `${reputation}/100 (${tier})`;
    
    // Update color based on tier
    if (reputation >= 80) {
      fill.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)';
    } else if (reputation >= 60) {
      fill.style.background = 'linear-gradient(90deg, #8bc34a, #ffeb3b)';
    } else if (reputation >= 40) {
      fill.style.background = 'linear-gradient(90deg, #ffeb3b, #ff9800)';
    } else {
      fill.style.background = 'linear-gradient(90deg, #ff9800, #f44336)';
    }
  }

  getReputationTier(reputation) {
    if (reputation >= 80) return 'Diamond';
    if (reputation >= 60) return 'Platinum';
    if (reputation >= 40) return 'Gold';
    if (reputation >= 20) return 'Silver';
    return 'Bronze';
  }

  updateStatsDisplay() {
    document.getElementById('reports-count').textContent = this.userStats.reports;
    document.getElementById('votes-count').textContent = this.userStats.votes;
    document.getElementById('blocks-count').textContent = this.userStats.blocks;
    document.getElementById('rewards-count').textContent = this.userStats.rewards;
  }

  updateProtectionStatus() {
    const statusIcon = document.getElementById('protection-status-icon');
    const statusText = document.getElementById('protection-status');
    const statusDesc = document.getElementById('protection-description');
    
    if (this.currentTab && this.currentTab.url) {
      const domain = new URL(this.currentTab.url).hostname;
      
      // Check if site is blacklisted
      chrome.storage.local.get(['blacklistedDomains'], (result) => {
        const blacklistedDomains = result.blacklistedDomains || [];
        
        if (blacklistedDomains.includes(domain)) {
          statusIcon.className = 'status-icon error';
          statusIcon.textContent = '✗';
          statusText.textContent = 'Site Blocked';
          statusDesc.textContent = 'This site is known for phishing';
        } else {
          statusIcon.className = 'status-icon active';
          statusIcon.textContent = '✓';
          statusText.textContent = 'Protection Active';
          statusDesc.textContent = `Monitoring ${domain}`;
        }
      });
    }
  }

  updateActivityList() {
    const activityList = document.getElementById('activity-list');
    
    // Get recent activity from storage
    chrome.storage.local.get(['recentActivity'], (result) => {
      const activities = result.recentActivity || [
        {
          type: 'block',
          text: 'Blocked phishing site',
          time: '2m ago',
          icon: '✓',
          color: '#4caf50'
        },
        {
          type: 'warning',
          text: 'Suspicious form detected',
          time: '5m ago',
          icon: '⚠',
          color: '#ff9800'
        },
        {
          type: 'vote',
          text: 'Voted on report',
          time: '1h ago',
          icon: '📊',
          color: '#2196f3'
        }
      ];
      
      activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon" style="background: ${activity.color};">${activity.icon}</div>
          <div class="activity-text">${activity.text}</div>
          <div class="activity-time">${activity.time}</div>
        </div>
      `).join('');
    });
  }

  async reportCurrentSite() {
    if (!this.currentTab) return;
    
    try {
      // Show loading state
      const reportBtn = document.getElementById('report-btn');
      const originalText = reportBtn.textContent;
      reportBtn.textContent = 'Reporting...';
      reportBtn.disabled = true;
      
      // Take screenshot
      const screenshot = await this.takeScreenshot();
      
      // Prepare evidence
      const evidence = {
        url: this.currentTab.url,
        title: this.currentTab.title,
        screenshot: screenshot,
        timestamp: Date.now(),
        domain: new URL(this.currentTab.url).hostname
      };
      
      // Send report to background script
      const response = await chrome.runtime.sendMessage({
        action: 'reportPhishing',
        url: this.currentTab.url,
        evidence: evidence
      });
      
      if (response.success) {
        // Update stats
        this.userStats.reports++;
        await chrome.storage.local.set({ userStats: this.userStats });
        
        // Add to activity
        this.addActivity({
          type: 'report',
          text: 'Reported suspicious site',
          time: 'now',
          icon: '📝',
          color: '#2196f3'
        });
        
        // Show success message
        this.showNotification('Report submitted successfully!', 'success');
        
        // Update UI
        this.updateUI();
      } else {
        throw new Error(response.error || 'Failed to submit report');
      }
      
    } catch (error) {
      console.error('Error reporting site:', error);
      this.showNotification('Failed to submit report', 'error');
    } finally {
      // Reset button
      const reportBtn = document.getElementById('report-btn');
      reportBtn.textContent = originalText;
      reportBtn.disabled = false;
    }
  }

  async checkCurrentPage() {
    if (!this.currentTab) return;
    
    try {
      // Show loading state
      const checkBtn = document.getElementById('check-btn');
      const originalText = checkBtn.textContent;
      checkBtn.textContent = 'Checking...';
      checkBtn.disabled = true;
      
      // Check with blockchain
      const response = await chrome.runtime.sendMessage({
        action: 'checkUrl',
        url: this.currentTab.url
      });
      
      if (response.isPhishing) {
        this.showNotification('⚠️ This site is flagged as phishing!', 'warning');
      } else if (response.confidence > 0.5) {
        this.showNotification('⚠️ This site appears suspicious', 'warning');
      } else {
        this.showNotification('✅ Site appears safe', 'success');
      }
      
    } catch (error) {
      console.error('Error checking page:', error);
      this.showNotification('Failed to check page', 'error');
    } finally {
      // Reset button
      const checkBtn = document.getElementById('check-btn');
      checkBtn.textContent = originalText;
      checkBtn.disabled = false;
    }
  }

  async takeScreenshot() {
    try {
      // This would take a screenshot of the current tab
      // For now, return mock data
      return 'data:image/png;base64,mock_screenshot_data';
    } catch (error) {
      console.error('Error taking screenshot:', error);
      return null;
    }
  }

  async addActivity(activity) {
    try {
      const result = await chrome.storage.local.get(['recentActivity']);
      const activities = result.recentActivity || [];
      
      // Add new activity at the beginning
      activities.unshift(activity);
      
      // Keep only last 10 activities
      if (activities.length > 10) {
        activities.splice(10);
      }
      
      await chrome.storage.local.set({ recentActivity: activities });
      this.updateActivityList();
      
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#f44336'};
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      text-align: center;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'updateStats':
        this.userStats = { ...this.userStats, ...request.stats };
        this.updateUI();
        sendResponse({ success: true });
        break;
        
      case 'updateReputation':
        this.userStats.reputation = request.reputation;
        this.updateUI();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  new PhishBlockPopup();
});
