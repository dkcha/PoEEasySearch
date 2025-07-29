// PoE Easy Search - Background Service Worker
console.log('🚀 Background script starting...');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Extension installed:', details.reason);
    
    if (details.reason === 'install') {
        console.log('✅ First time installation - initializing...');
        
        // Initialize storage with default settings (with error handling)
        const defaultSettings = {
            extensionVersion: '1.0.0',
            firstInstall: true,
            installDate: Date.now(),
            searchHistory: []
        };
        
        chrome.storage.local.set(defaultSettings)
            .then(() => {
                console.log('✅ Default settings saved successfully');
            })
            .catch((error) => {
                console.error('❌ Error saving default settings:', error);
                // Continue anyway - this isn't critical
            });
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Background received message:', message.action);
    
    if (message.action === 'openTradeTab') {
        console.log('🌐 Opening new trade tab...');
        handleOpenTradeTab(message.config)
            .then(result => {
                console.log('✅ Trade tab opened successfully');
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.error('❌ Error opening trade tab:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        // Return true to indicate we'll respond asynchronously
        return true;
    }
    
    if (message.action === 'autoFillCurrentTab') {
        console.log('📝 Auto-filling current tab...');
        handleAutoFillCurrentTab(message.config)
            .then(result => {
                console.log('✅ Current tab auto-filled successfully');
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.error('❌ Error auto-filling current tab:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true;
    }
    
    // Default response for unknown actions
    console.log('⚠️ Unknown action:', message.action);
    sendResponse({ success: false, error: 'Unknown action: ' + message.action });
});

// Handle opening new trade tab
async function handleOpenTradeTab(config) {
    console.log('🌐 Creating new trade tab with config:', config);
    
    try {
        // Create new tab with PoE trade site
        const tab = await chrome.tabs.create({
            url: 'https://www.pathofexile.com/trade/search/Settlers',
            active: true
        });
        
        console.log('✅ Created new tab:', tab.id);
        
        // Wait for the tab to load, then send auto-fill message
        return new Promise((resolve, reject) => {
            let timeoutId;
            
            const tabUpdateListener = (tabId, changeInfo, updatedTab) => {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    console.log('📄 Tab loaded, sending auto-fill message...');
                    
                    // Remove the listener and timeout
                    chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                    if (timeoutId) clearTimeout(timeoutId);
                    
                    // Small delay to ensure page is fully loaded
                    setTimeout(() => {
                        // Send auto-fill message to the content script
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'autoFill',
                            config: config
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('❌ Error sending auto-fill message:', chrome.runtime.lastError.message);
                                resolve({ 
                                    success: false, 
                                    message: 'Tab opened but auto-fill failed: ' + chrome.runtime.lastError.message 
                                });
                            } else {
                                console.log('✅ Auto-fill response:', response);
                                resolve(response || { success: true, message: 'Tab opened and auto-fill attempted' });
                            }
                        });
                    }, 1000);
                }
            };
            
            // Add listener for tab updates
            chrome.tabs.onUpdated.addListener(tabUpdateListener);
            
            // Timeout after 10 seconds
            timeoutId = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                console.log('⏰ Timeout waiting for tab to load');
                resolve({ 
                    success: true, 
                    message: 'Tab opened but auto-fill timed out - try manually' 
                });
            }, 10000);
        });
        
    } catch (error) {
        console.error('❌ Error creating tab:', error);
        throw new Error('Failed to create new tab: ' + error.message);
    }
}

// Handle auto-filling current tab
async function handleAutoFillCurrentTab(config) {
    console.log('📝 Auto-filling current tab with config:', config);
    
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        console.log('📄 Current tab:', tab.url);
        
        // Check if it's a PoE trade site tab
        if (!tab.url || !tab.url.includes('pathofexile.com/trade')) {
            throw new Error('Current tab is not the PoE trade site. Please navigate to pathofexile.com/trade first.');
        }
        
        // Send auto-fill message to content script
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'autoFill',
                config: config
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error sending auto-fill message:', chrome.runtime.lastError.message);
                    reject(new Error('Could not communicate with trade site: ' + chrome.runtime.lastError.message));
                } else {
                    console.log('✅ Auto-fill response:', response);
                    resolve(response || { success: true, message: 'Auto-fill attempted' });
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error auto-filling current tab:', error);
        throw error;
    }
}

// Handle tab updates for debugging
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('pathofexile.com/trade')) {
        console.log('🎯 PoE trade tab loaded:', tabId, tab.url);
    }
});

// Test chrome.storage access on startup
chrome.storage.local.get(['extensionVersion'])
    .then((result) => {
        console.log('📊 Storage test successful:', result);
    })
    .catch((error) => {
        console.error('❌ Storage test failed:', error);
    });

console.log('✅ Background script loaded successfully');