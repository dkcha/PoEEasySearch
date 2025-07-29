/**
 * Background Service Worker for PoE Trade Helper - Abyss Jewels
 * Handles extension lifecycle and communication between components
 */

class AbyssJewelBackgroundService {
    constructor() {
        this.version = '2.1.0';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Extension installation/update
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Extension startup
        chrome.runtime.onStartup.addListener(() => {
            console.log('🚀 PoE Trade Helper - Abyss Jewels started');
        });

        // Message passing between components
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Tab updates (for detecting navigation to trade site)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }

    handleInstallation(details) {
        console.log('📦 Extension installed/updated:', details.reason);
        
        if (details.reason === 'install') {
            this.onFirstInstall();
        } else if (details.reason === 'update') {
            this.onUpdate(details.previousVersion);
        }
    }

    onFirstInstall() {
        console.log('🎉 Welcome to PoE Trade Helper - Abyss Jewels!');
        
        // Set default settings
        chrome.storage.local.set({
            version: this.version,
            firstInstall: Date.now(),
            settings: {
                autoFillEnabled: true,
                debugMode: false,
                defaultSearchType: 'base'
            }
        });

        // Show welcome notification
        this.showNotification(
            'PoE Trade Helper Installed!',
            'Click the extension icon to start searching for Abyss Jewels.',
            'welcome'
        );
    }

    onUpdate(previousVersion) {
        console.log(`🔄 Updated from ${previousVersion} to ${this.version}`);
        
        // Update version in storage
        chrome.storage.local.set({ version: this.version });

        // Show update notification if major changes
        if (this.isMajorUpdate(previousVersion)) {
            this.showNotification(
                'PoE Trade Helper Updated!',
                'New features and improvements for Abyss Jewel trading.',
                'update'
            );
        }
    }

    isMajorUpdate(previousVersion) {
        const [prevMajor, prevMinor] = previousVersion.split('.').map(Number);
        const [currMajor, currMinor] = this.version.split('.').map(Number);
        
        return currMajor > prevMajor || (currMajor === prevMajor && currMinor > prevMinor);
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.type) {
            case 'GET_EXTENSION_INFO':
                sendResponse({
                    version: this.version,
                    isBackground: true,
                    timestamp: Date.now()
                });
                break;

            case 'OPEN_TRADE_URL':
                this.openTradeUrl(message.url, sendResponse);
                break;

            case 'LOG_SEARCH_ACTIVITY':
                this.logSearchActivity(message.data);
                sendResponse({ logged: true });
                break;

            case 'GET_SETTINGS':
                this.getSettings(sendResponse);
                break;

            case 'UPDATE_SETTINGS':
                this.updateSettings(message.settings, sendResponse);
                break;

            default:
                console.log('❓ Unknown message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    }

    async openTradeUrl(url, sendResponse) {
        try {
            const tab = await chrome.tabs.create({ url: url });
            console.log('🌐 Opened trade URL in new tab:', tab.id);
            sendResponse({ success: true, tabId: tab.id });
        } catch (error) {
            console.error('❌ Failed to open trade URL:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    logSearchActivity(data) {
        // Log search activity for analytics/debugging
        const activity = {
            timestamp: Date.now(),
            searchType: data.searchType,
            baseItem: data.baseItem,
            modCount: data.selectedMods?.length || 0,
            ...data
        };

        // Store in local storage (keep last 50 searches)
        chrome.storage.local.get(['searchHistory'], (result) => {
            const history = result.searchHistory || [];
            history.push(activity);
            
            // Keep only last 50 searches
            if (history.length > 50) {
                history.splice(0, history.length - 50);
            }
            
            chrome.storage.local.set({ searchHistory: history });
        });

        console.log('📊 Search activity logged:', activity);
    }

    async getSettings(sendResponse) {
        try {
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {
                autoFillEnabled: true,
                debugMode: false,
                defaultSearchType: 'base'
            };
            sendResponse({ settings });
        } catch (error) {
            console.error('❌ Failed to get settings:', error);
            sendResponse({ error: error.message });
        }
    }

    async updateSettings(newSettings, sendResponse) {
        try {
            await chrome.storage.local.set({ settings: newSettings });
            console.log('⚙️ Settings updated:', newSettings);
            sendResponse({ success: true });
        } catch (error) {
            console.error('❌ Failed to update settings:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        // Check if user navigated to PoE trade site
        if (changeInfo.status === 'complete' && tab.url?.includes('pathofexile.com/trade')) {
            console.log('🎯 User navigated to PoE trade site');
            
            // Inject content script if not already injected
            this.ensureContentScriptInjected(tabId);
        }
    }

    async ensureContentScriptInjected(tabId) {
        try {
            // Check if content script is already injected
            const results = await chrome.tabs.sendMessage(tabId, { type: 'CHECK_TRADE_SITE_STATUS' });
            if (results?.ready) {
                console.log('✅ Content script already active');
                return;
            }
        } catch (error) {
            // Content script not injected, inject it
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                console.log('✅ Content script injected successfully');
            } catch (injectError) {
                console.error('❌ Failed to inject content script:', injectError);
            }
        }
    }

    showNotification(title, message, type = 'info') {
        // Only show notifications if user has notifications enabled
        chrome.storage.local.get(['settings'], (result) => {
            const settings = result.settings || {};
            
            if (settings.notificationsEnabled !== false) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: title,
                    message: message
                });
            }
        });
    }

    // Utility method for debugging
    async getDebugInfo() {
        const tabs = await chrome.tabs.query({ url: '*://www.pathofexile.com/trade/*' });
        const storage = await chrome.storage.local.get();
        
        return {
            version: this.version,
            activeTradeTabs: tabs.length,
            storageUsed: JSON.stringify(storage).length,
            timestamp: Date.now()
        };
    }
}

// Initialize the background service
const backgroundService = new AbyssJewelBackgroundService();

// Export for debugging
self.backgroundService = backgroundService;
self.getDebugInfo = () => backgroundService.getDebugInfo();

console.log('🔧 PoE Trade Helper - Abyss Jewels background service initialized');