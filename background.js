// Background service worker for PoE Trade Helper extension

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PoE Trade Helper installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default configuration on first install
    chrome.storage.local.set({
      'poe_trade_config': {
        baseItem: '',
        mods: [],
        preferences: {
          autoSubmit: false,
          showNotifications: true,
          defaultLeague: 'Settlers'
        }
      }
    });
    
    // Optional: Open welcome page
    // chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Handle extension icon click when popup is not available
chrome.action.onClicked.addListener((tab) => {
  // This will only fire if no popup is set
  // Open trade site if not already there
  if (!tab.url.includes('pathofexile.com/trade')) {
    chrome.tabs.create({
      url: 'https://www.pathofexile.com/trade/search/Settlers',
      active: true
    });
  }
});

// Context menu integration (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openTradeHelper',
    title: 'Open PoE Trade Helper',
    contexts: ['page', 'selection'],
    documentUrlPatterns: ['https://www.pathofexile.com/*']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openTradeHelper') {
    // Open the extension popup or redirect to trade site
    chrome.action.openPopup();
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStoredConfig':
      chrome.storage.local.get(['poe_trade_config'], (result) => {
        sendResponse(result.poe_trade_config || {});
      });
      return true; // Keep message channel open
      
    case 'saveConfig':
      chrome.storage.local.set({
        'poe_trade_config': request.config
      }, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'clearConfig':
      chrome.storage.local.remove(['poe_trade_config'], () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'openTradesite':
      chrome.tabs.create({
        url: request.url || 'https://www.pathofexile.com/trade/search/Settlers',
        active: true
      }, (tab) => {
        sendResponse({ tabId: tab.id });
      });
      return true;
      
    case 'notifyUser':
      if (request.notification) {
        showNotification(request.notification);
      }
      break;
      
    default:
      console.log('Unknown action:', request.action);
  }
});

// Notification system
function showNotification(options) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: options.title || 'PoE Trade Helper',
    message: options.message || 'Action completed',
    priority: 1
  });
}

// Tab management - inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('pathofexile.com/trade')) {
    
    // Ensure content script is injected
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Content script might already be injected
      console.log('Content script injection note:', err.message);
    });
  }
});

// Handle extension errors
chrome.runtime.onSuspend.addListener(() => {
  console.log('PoE Trade Helper background script suspending');
});

// Utility functions for data processing
class DataProcessor {
  static async loadRePoEData() {
    try {
      // This would load the actual RePoE JSON files
      // For now, return mock data structure
      return {
        baseItems: {},
        mods: {},
        tiers: {}
      };
    } catch (error) {
      console.error('Error loading RePoE data:', error);
      return null;
    }
  }
  
  static processModTiers(modData) {
    // Convert RePoE mod data to tier system
    const tiers = {};
    
    if (modData && modData.stats) {
      modData.stats.forEach((stat, index) => {
        const tierNum = index + 1;
        tiers[`T${tierNum}`] = {
          min: stat.min,
          max: stat.max,
          weight: stat.weight || 1000
        };
      });
    }
    
    return tiers;
  }
  
  static generateTradeURL(config) {
    // This would generate the actual trade site URL
    // Based on the configuration object
    const baseUrl = 'https://www.pathofexile.com/trade/search/Settlers';
    const params = new URLSearchParams();
    
    // Add configuration parameters
    if (config.baseItem) {
      params.append('name', config.baseItem);
    }
    
    // Add more parameters based on config...
    
    return `${baseUrl}?${params.toString()}`;
  }
}

// Export for use in other scripts if needed
self.DataProcessor = DataProcessor;

console.log('PoE Trade Helper background service worker initialized');