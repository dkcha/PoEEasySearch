/**
 * Content Script for PoE Trade Helper - Abyss Jewels
 * Handles auto-filling the pathofexile.com/trade website forms
 */

class PoETradeAutoFiller {
    constructor() {
        this.tradeUrl = 'https://www.pathofexile.com/trade';
        this.initialized = false;
        this.selectors = {
            // Base item type selection
            typeInput: 'input[placeholder*="type"]',
            typeDropdown: '.search-advanced-items',
            
            // Stat/mod filters
            statGroupAdd: '.search-advanced-add',
            statFilterInput: 'input[placeholder*="And"]',
            statMinInput: 'input[placeholder*="Min"]',
            statMaxInput: 'input[placeholder*="Max"]',
            
            // Item level filters
            itemLevelMin: 'input[data-field="ilvl.min"]',
            itemLevelMax: 'input[data-field="ilvl.max"]',
            
            // Price filters
            priceMin: 'input[data-field="price.min"]',
            priceMax: 'input[data-field="price.max"]',
            
            // Search button
            searchButton: '.btn-search'
        };
    }

    initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing PoE Trade Auto-Filler for Abyss Jewels...');
        
        // Check if we're on the trade site
        if (!window.location.href.includes(this.tradeUrl)) {
            return;
        }
        
        this.setupMessageListener();
        this.waitForPageLoad();
        
        this.initialized = true;
        console.log('✅ Auto-filler initialized successfully');
    }

    setupMessageListener() {
        // Listen for messages from the popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'FILL_TRADE_FORM') {
                this.fillTradeForm(message.data)
                    .then(() => sendResponse({ success: true }))
                    .catch(error => {
                        console.error('❌ Failed to fill trade form:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Keep message channel open for async response
            }
        });
    }

    waitForPageLoad() {
        // Wait for the trade site to fully load
        const checkInterval = setInterval(() => {
            const typeInput = document.querySelector(this.selectors.typeInput);
            if (typeInput) {
                clearInterval(checkInterval);
                console.log('📄 Trade site loaded, ready for auto-fill');
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    async fillTradeForm(searchConfig) {
        console.log('📝 Filling trade form with config:', searchConfig);
        
        try {
            // Reset form first
            await this.resetForm();
            
            // Fill base item type
            if (searchConfig.baseItem) {
                await this.fillBaseItemType(searchConfig.baseItem);
            }
            
            // Fill item level if specified
            if (searchConfig.itemLevel) {
                await this.fillItemLevel(searchConfig.itemLevel);
            }
            
            // Fill mod filters
            if (searchConfig.selectedMods && searchConfig.selectedMods.length > 0) {
                await this.fillModFilters(searchConfig.selectedMods);
            }
            
            // Fill price range if specified
            if (searchConfig.price) {
                await this.fillPriceRange(searchConfig.price);
            }
            
            console.log('✅ Trade form filled successfully');
            
        } catch (error) {
            console.error('❌ Error filling trade form:', error);
            throw error;
        }
    }

    async resetForm() {
        // Clear existing filters by clicking reset if available
        const resetButton = document.querySelector('.btn-reset, [data-action="reset"]');
        if (resetButton) {
            resetButton.click();
            await this.wait(500);
        }
    }

    async fillBaseItemType(baseItemKey) {
        console.log('🎯 Setting base item type:', baseItemKey);
        
        const typeInput = document.querySelector(this.selectors.typeInput);
        if (!typeInput) {
            throw new Error('Type input field not found');
        }
        
        // Map base item keys to display names
        const baseItemNames = {
            'Metadata/Items/Jewels/JewelAbyssMelee': 'Murderous Eye Jewel',
            'Metadata/Items/Jewels/JewelAbyssRanged': 'Searching Eye Jewel',
            'Metadata/Items/Jewels/JewelAbyssCaster': 'Hypnotic Eye Jewel',
            'Metadata/Items/Jewels/JewelAbyssSummoner': 'Ghastly Eye Jewel'
        };
        
        const itemName = baseItemNames[baseItemKey];
        if (!itemName) {
            throw new Error(`Unknown base item: ${baseItemKey}`);
        }
        
        // Focus and clear the input
        typeInput.focus();
        typeInput.value = '';
        
        // Type the item name
        await this.typeText(typeInput, itemName);
        await this.wait(300);
        
        // Look for dropdown and select the item
        await this.selectFromDropdown(itemName);
    }

    async selectFromDropdown(itemName) {
        // Wait for dropdown to appear
        await this.wait(200);
        
        const dropdownOptions = document.querySelectorAll('.dropdown-menu .dropdown-item, .search-advanced-items .item');
        
        for (const option of dropdownOptions) {
            if (option.textContent.trim().includes(itemName)) {
                option.click();
                await this.wait(300);
                return;
            }
        }
        
        // If exact match not found, try pressing Enter
        const typeInput = document.querySelector(this.selectors.typeInput);
        if (typeInput) {
            typeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await this.wait(300);
        }
    }

    async fillItemLevel(itemLevel) {
        console.log('📊 Setting item level range:', itemLevel);
        
        if (itemLevel.min) {
            const minInput = document.querySelector(this.selectors.itemLevelMin);
            if (minInput) {
                await this.fillInput(minInput, itemLevel.min.toString());
            }
        }
        
        if (itemLevel.max) {
            const maxInput = document.querySelector(this.selectors.itemLevelMax);
            if (maxInput) {
                await this.fillInput(maxInput, itemLevel.max.toString());
            }
        }
    }

    async fillModFilters(selectedMods) {
        console.log('🔮 Adding mod filters:', selectedMods.length);
        
        for (let i = 0; i < selectedMods.length; i++) {
            const mod = selectedMods[i];
            await this.addModFilter(mod, i);
            await this.wait(500); // Give time between adding filters
        }
    }

    async addModFilter(mod, index) {
        console.log(`📋 Adding mod filter ${index + 1}:`, mod.displayName);
        
        // Click "Add" button to add a new stat filter
        const addButton = document.querySelector(this.selectors.statGroupAdd);
        if (!addButton) {
            throw new Error('Could not find stat group add button');
        }
        
        addButton.click();
        await this.wait(500);
        
        // Find the newly added stat filter inputs
        const statGroups = document.querySelectorAll('.search-advanced-stat');
        const currentGroup = statGroups[statGroups.length - 1]; // Get the last added group
        
        if (!currentGroup) {
            throw new Error('Could not find stat group after adding');
        }
        
        // Fill the stat search input
        const statInput = currentGroup.querySelector('input[placeholder*="And"], .search-stat-input');
        if (statInput) {
            await this.typeText(statInput, mod.displayName);
            await this.wait(300);
            
            // Try to select from dropdown
            await this.selectStatFromDropdown(mod.displayName, currentGroup);
        }
        
        // Fill min/max values if available
        if (mod.values) {
            const minInput = currentGroup.querySelector('input[placeholder*="Min"]');
            const maxInput = currentGroup.querySelector('input[placeholder*="Max"]');
            
            if (minInput && mod.values.min !== null) {
                await this.fillInput(minInput, mod.values.min.toString());
            }
            
            if (maxInput && mod.values.max !== null) {
                await this.fillInput(maxInput, mod.values.max.toString());
            }
        }
    }

    async selectStatFromDropdown(statName, container) {
        await this.wait(200);
        
        const dropdownOptions = container.querySelectorAll('.dropdown-menu .dropdown-item, .stat-dropdown .stat-option');
        
        for (const option of dropdownOptions) {
            const optionText = option.textContent.trim().toLowerCase();
            const searchText = statName.toLowerCase();
            
            if (optionText.includes(searchText) || searchText.includes(optionText)) {
                option.click();
                await this.wait(300);
                return;
            }
        }
        
        // If no dropdown match, try pressing Enter
        const statInput = container.querySelector('input[placeholder*="And"], .search-stat-input');
        if (statInput) {
            statInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await this.wait(300);
        }
    }

    async fillPriceRange(price) {
        console.log('💰 Setting price range:', price);
        
        if (price.min) {
            const minInput = document.querySelector(this.selectors.priceMin);
            if (minInput) {
                await this.fillInput(minInput, price.min.toString());
            }
        }
        
        if (price.max) {
            const maxInput = document.querySelector(this.selectors.priceMax);
            if (maxInput) {
                await this.fillInput(maxInput, price.max.toString());
            }
        }
    }

    async fillInput(input, value) {
        if (!input) return;
        
        input.focus();
        input.select();
        input.value = value;
        
        // Trigger input events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        await this.wait(100);
    }

    async typeText(input, text) {
        if (!input) return;
        
        input.focus();
        input.value = '';
        
        // Type character by character for better compatibility
        for (let i = 0; i < text.length; i++) {
            input.value += text[i];
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await this.wait(50);
        }
        
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility method to check if element is visible and interactable
    isElementInteractable(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            !element.disabled
        );
    }

    // Debug method to log current page state
    debugPageState() {
        console.log('🔍 Debug: Current page state');
        console.log('URL:', window.location.href);
        console.log('Type input found:', !!document.querySelector(this.selectors.typeInput));
        console.log('Add button found:', !!document.querySelector(this.selectors.statGroupAdd));
        console.log('Search button found:', !!document.querySelector(this.selectors.searchButton));
    }
}

// Enhanced error handling and communication with popup
class TradeFormCommunicator {
    constructor(autoFiller) {
        this.autoFiller = autoFiller;
        this.setupAdvancedMessageHandling();
    }

    setupAdvancedMessageHandling() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'CHECK_TRADE_SITE_STATUS':
                    sendResponse({
                        isTradesite: window.location.href.includes('pathofexile.com/trade'),
                        ready: this.autoFiller.initialized
                    });
                    break;
                    
                case 'DEBUG_PAGE_STATE':
                    this.autoFiller.debugPageState();
                    sendResponse({ success: true });
                    break;
                    
                case 'TEST_AUTO_FILL':
                    this.testAutoFill()
                        .then(result => sendResponse(result))
                        .catch(error => sendResponse({ success: false, error: error.message }));
                    return true;
                    
                default:
                    // Let the autoFiller handle other messages
                    break;
            }
        });
    }

    async testAutoFill() {
        console.log('🧪 Testing auto-fill functionality...');
        
        const testConfig = {
            baseItem: 'Metadata/Items/Jewels/JewelAbyssMelee',
            selectedMods: [{
                displayName: 'Life',
                values: { min: 30, max: 50 }
            }],
            itemLevel: { min: 1, max: 100 }
        };
        
        try {
            await this.autoFiller.fillTradeForm(testConfig);
            return { success: true, message: 'Auto-fill test completed successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Initialize when the script loads
const autoFiller = new PoETradeAutoFiller();
const communicator = new TradeFormCommunicator(autoFiller);

// Initialize immediately
autoFiller.initialize();

// Also initialize when DOM is ready (backup)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        autoFiller.initialize();
    });
} else {
    autoFiller.initialize();
}

// Re-initialize on navigation (for SPA behavior)
let lastUrl = window.location.href;
new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => {
            autoFiller.initialize();
        }, 1000);
    }
}).observe(document, { subtree: true, childList: true });

console.log('🚀 PoE Trade Helper content script loaded for Abyss Jewels');