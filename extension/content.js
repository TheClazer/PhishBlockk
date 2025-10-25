// PhishBlock Browser Extension - Content Script
// Runs on every webpage to detect phishing and show warnings

class PhishBlockContentScript {
  constructor() {
    this.warningShown = false;
    this.suspiciousElements = [];
    this.init();
  }

  init() {
    console.log('PhishBlock Content Script initialized');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.analyzePage());
    } else {
      this.analyzePage();
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  analyzePage() {
    this.detectSuspiciousContent();
    this.detectPhishingForms();
    this.detectSuspiciousLinks();
    this.monitorPageChanges();
  }

  detectSuspiciousContent() {
    const suspiciousTexts = [
      'verify your account',
      'update your information',
      'confirm your identity',
      'secure your account',
      'urgent action required',
      'click here immediately',
      'limited time offer',
      'congratulations you won',
      'claim your prize',
      'free money',
      'crypto giveaway',
      'wallet verification'
    ];

    const pageText = document.body.innerText.toLowerCase();
    
    for (const text of suspiciousTexts) {
      if (pageText.includes(text)) {
        this.highlightSuspiciousText(text);
      }
    }
  }

  detectPhishingForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input');
      const hasPassword = Array.from(inputs).some(input => 
        input.type === 'password' || input.name.toLowerCase().includes('password')
      );
      
      const hasEmail = Array.from(inputs).some(input => 
        input.type === 'email' || input.name.toLowerCase().includes('email')
      );

      if (hasPassword && hasEmail) {
        this.analyzeForm(form);
      }
    });
  }

  analyzeForm(form) {
    const formData = this.extractFormData(form);
    
    // Check for suspicious form characteristics
    if (this.isSuspiciousForm(formData)) {
      this.showFormWarning(form);
    }
  }

  isSuspiciousForm(formData) {
    const suspiciousIndicators = [
      formData.action.includes('http://'), // Non-HTTPS
      formData.method === 'GET', // Password in URL
      formData.fields.some(field => field.name.includes('ssn')), // SSN request
      formData.fields.some(field => field.name.includes('card')), // Card info
      formData.fields.some(field => field.name.includes('pin')), // PIN request
      formData.fields.length > 5 // Too many fields
    ];

    return suspiciousIndicators.some(indicator => indicator);
  }

  extractFormData(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    const fields = Array.from(inputs).map(input => ({
      name: input.name || input.id,
      type: input.type,
      required: input.required
    }));

    return {
      action: form.action,
      method: form.method,
      fields: fields
    };
  }

  detectSuspiciousLinks() {
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
      const href = link.href;
      const text = link.textContent.toLowerCase();
      
      if (this.isSuspiciousLink(href, text)) {
        this.highlightSuspiciousLink(link);
      }
    });
  }

  isSuspiciousLink(href, text) {
    const suspiciousPatterns = [
      href.includes('bit.ly') || href.includes('tinyurl'),
      text.includes('click here'),
      text.includes('verify now'),
      text.includes('urgent'),
      href.includes('javascript:'),
      href.includes('data:')
    ];

    return suspiciousPatterns.some(pattern => pattern);
  }

  highlightSuspiciousText(text) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.toLowerCase().includes(text)) {
        const span = document.createElement('span');
        span.className = 'phishblock-suspicious-text';
        span.style.cssText = `
          background-color: #ffeb3b;
          border: 2px solid #ff9800;
          border-radius: 3px;
          padding: 2px 4px;
          margin: 0 2px;
          position: relative;
        `;
        
        const parent = node.parentNode;
        const textContent = node.textContent;
        const index = textContent.toLowerCase().indexOf(text);
        
        if (index !== -1) {
          const beforeText = textContent.substring(0, index);
          const suspiciousText = textContent.substring(index, index + text.length);
          const afterText = textContent.substring(index + text.length);
          
          span.textContent = suspiciousText;
          span.title = 'PhishBlock: Suspicious text detected';
          
          parent.replaceChild(span, node);
          if (beforeText) {
            parent.insertBefore(document.createTextNode(beforeText), span);
          }
          if (afterText) {
            parent.insertBefore(document.createTextNode(afterText), span);
          }
        }
      }
    }
  }

  highlightSuspiciousLink(link) {
    link.style.cssText = `
      border: 2px solid #f44336 !important;
      background-color: #ffebee !important;
      border-radius: 3px !important;
      position: relative !important;
    `;
    
    link.title = 'PhishBlock: Suspicious link detected';
    
    // Add warning icon
    const warningIcon = document.createElement('span');
    warningIcon.innerHTML = '⚠️';
    warningIcon.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: #f44336;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    link.style.position = 'relative';
    link.appendChild(warningIcon);
  }

  showFormWarning(form) {
    const warning = document.createElement('div');
    warning.className = 'phishblock-form-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    
    warning.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 20px; margin-right: 8px;">⚠️</span>
        <strong>PhishBlock Warning</strong>
      </div>
      <div style="margin-bottom: 10px;">
        This form appears suspicious. Be careful with your personal information.
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="phishblock-report" style="
          background: white;
          color: #f44336;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        ">Report</button>
        <button id="phishblock-dismiss" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Dismiss</button>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // Add event listeners
    warning.querySelector('#phishblock-report').addEventListener('click', () => {
      this.reportSuspiciousForm(form);
      warning.remove();
    });
    
    warning.querySelector('#phishblock-dismiss').addEventListener('click', () => {
      warning.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.remove();
      }
    }, 10000);
  }

  showWarning(message, type = 'warning') {
    if (this.warningShown) return;
    
    const warning = document.createElement('div');
    warning.className = 'phishblock-warning';
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: ${type === 'danger' ? '#f44336' : '#ff9800'};
      color: white;
      padding: 10px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    
    warning.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center;">
        <span style="margin-right: 8px;">⚠️</span>
        <span>${message}</span>
        <button id="phishblock-close" style="
          background: transparent;
          border: 1px solid white;
          color: white;
          margin-left: 15px;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
        ">×</button>
      </div>
    `;
    
    document.body.insertBefore(warning, document.body.firstChild);
    this.warningShown = true;
    
    // Add close event listener
    warning.querySelector('#phishblock-close').addEventListener('click', () => {
      warning.remove();
      this.warningShown = false;
    });
  }

  reportSuspiciousForm(form) {
    const formData = this.extractFormData(form);
    const evidence = {
      url: window.location.href,
      formData: formData,
      timestamp: Date.now(),
      screenshot: this.takeScreenshot()
    };
    
    chrome.runtime.sendMessage({
      action: 'reportPhishing',
      url: window.location.href,
      evidence: evidence
    });
  }

  takeScreenshot() {
    // This would take a screenshot of the form
    // For now, return mock data
    return 'data:image/png;base64,mock_screenshot_data';
  }

  monitorPageChanges() {
    // Monitor for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.analyzeNewContent(node);
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  analyzeNewContent(element) {
    // Analyze newly added content for phishing indicators
    const forms = element.querySelectorAll('form');
    forms.forEach(form => this.analyzeForm(form));
    
    const links = element.querySelectorAll('a[href]');
    links.forEach(link => {
      if (this.isSuspiciousLink(link.href, link.textContent.toLowerCase())) {
        this.highlightSuspiciousLink(link);
      }
    });
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'showWarning':
        this.showWarning(
          `Suspicious website detected: ${new URL(request.url).hostname}`,
          'danger'
        );
        sendResponse({ success: true });
        break;
        
      case 'checkPage':
        const result = this.analyzePage();
        sendResponse(result);
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize the content script
const phishBlockContentScript = new PhishBlockContentScript();
