// Enhanced popup.js with no-mods support and RePoE integration
class PoETradeExtensionUI {
    constructor() {
        this.config = {
            baseItem: '',
            itemLevel: { min: null, max: null },
            quality: { min: null, max: null },
            corrupted: false,
            fractured: false,
            synthesised: false,
            mods: [],
            price: { min: null, max: null, currency: 'chaos' }
        };
        
        this.availableMods = {};
        this.dataProcessor = null;
        
        this.initializeUI();
        this.loadConfiguration();
        this.waitForDataProcessor();
    }

    async waitForDataProcessor() {
        // Wait for the data processor to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        
        while (!window.repoDataProcessor && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.repoDataProcessor) {
            this.dataProcessor = window.repoDataProcessor;
            
            // Wait for data to be loaded
            attempts = 0;
            while (!this.dataProcessor.baseItems && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            this.populateBaseItems();
            this.updateStatus('✅ Ready - RePoE data loaded');
        } else {
            this.updateStatus('⚠️ Using mock data - RePoE unavailable');
        }
    }

    initializeUI() {
        this.bindEvents();
        this.updateSearchTypeVisibility();
    }

    bindEvents() {
        // Search type toggle
        const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');
        searchTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateSearchTypeVisibility();
            });
        });

        // Base item selection
        const baseItemSelect = document.getElementById('baseItem');
        baseItemSelect.addEventListener('change', (e) => {
            this.config.baseItem = e.target.value;
            this.onBaseItemChange();
            this.saveConfiguration();
        });

        // Item level inputs
        document.getElementById('itemLevelMin').addEventListener('input', (e) => {
            this.config.itemLevel.min = e.target.value ? parseInt(e.target.value) : null;
            this.saveConfiguration();
        });

        document.getElementById('itemLevelMax').addEventListener('input', (e) => {
            this.config.itemLevel.max = e.target.value ? parseInt(e.target.value) : null;
            this.saveConfiguration();
        });

        // Quality inputs
        document.getElementById('qualityMin').addEventListener('input', (e) => {
            this.config.quality.min = e.target.value ? parseInt(e.target.value) : null;
            this.saveConfiguration();
        });

        document.getElementById('qualityMax').addEventListener('input', (e) => {
            this.config.quality.max = e.target.value ? parseInt(e.target.value) : null;
            this.saveConfiguration();
        });

        // Boolean toggles
        document.getElementById('corrupted').addEventListener('change', (e) => {
            this.config.corrupted = e.target.checked;
            this.saveConfiguration();
        });

        document.getElementById('fractured').addEventListener('change', (e) => {
            this.config.fractured = e.target.checked;
            this.saveConfiguration();
        });

        document.getElementById('synthesised').addEventListener('change', (e) => {
            this.config.synthesised = e.target.checked;
            this.saveConfiguration();
        });

        // Price inputs
        document.getElementById('priceMin').addEventListener('input', (e) => {
            this.config.price.min = e.target.value ? parseFloat(e.target.value) : null;
            this.saveConfiguration();
        });

        document.getElementById('priceMax').addEventListener('input', (e) => {
            this.config.price.max = e.target.value ? parseFloat(e.target.value) : null;
            this.saveConfiguration();
        });

        document.getElementById('priceCurrency').addEventListener('change', (e) => {
            this.config.price.currency = e.target.value;
            this.saveConfiguration();
        });

        // Action buttons
        document.getElementById('addMod').addEventListener('click', () => {
            this.addMod();
        });

        document.getElementById('clearMods').addEventListener('click', () => {
            this.clearMods();
        });

        document.getElementById('searchTrade').addEventListener('click', () => {
            this.executeSearch();
        });

        document.getElementById('resetConfig').addEventListener('click', () => {
            this.resetConfiguration();
        });

        // Collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section.classList.toggle('collapsed');
            });
        });
    }

    updateSearchTypeVisibility() {
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        const modsSection = document.querySelector('.section.mods');
        const searchButton = document.getElementById('searchTrade');
        
        if (searchType === 'baseOnly') {
            modsSection.style.display = 'none';
            searchButton.textContent = 'Search Base Items';
            this.updateStatus('🎯 Base item search mode - no mods required');
        } else {
            modsSection.style.display = 'block';
            searchButton.textContent = 'Search with Mods';
            this.updateStatus('🔧 Mod-based search mode');
        }
    }

    populateBaseItems() {
        if (!this.dataProcessor || !this.dataProcessor.baseItems) {
            this.populateMockBaseItems();
            return;
        }

        const baseItemSelect = document.getElementById('baseItem');
        baseItemSelect.innerHTML = '<option value="">Select base item...</option>';

        const itemsByCategory = this.dataProcessor.getBaseItemsByCategory();
        
        for (const [category, items] of Object.entries(itemsByCategory)) {
            // Skip empty categories or categories with unhelpful names
            if (!items.length || category.startsWith('DONOTUSE')) continue;
            
            const optgroup = document.createElement('optgroup');
            optgroup.label = this.formatCategoryName(category);
            
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (Level ${item.level})`;
                optgroup.appendChild(option);
            });
            
            baseItemSelect.appendChild(optgroup);
        }

        this.updateStatus('📦 Base items loaded from RePoE');
    }

    populateMockBaseItems() {
        const baseItemSelect = document.getElementById('baseItem');
        baseItemSelect.innerHTML = `
            <option value="">Select base item...</option>
            <optgroup label="Belts">
                <option value="crystal-belt">Crystal Belt (Level 79)</option>
                <option value="leather-belt">Leather Belt (Level 1)</option>
            </optgroup>
            <optgroup label="Rings">
                <option value="prismatic-ring">Prismatic Ring (Level 30)</option>
            </optgroup>
        `;
        
        this.updateStatus('📦 Using mock base items');
    }

    formatCategoryName(category) {
        // Convert item class names to readable format
        const nameMap = {
            'Body Armour': 'Body Armours',
            'AbyssJewel': 'Abyss Jewels',
            'Active Skill Gem': 'Active Skill Gems'
        };
        
        return nameMap[category] || category;
    }

    onBaseItemChange() {
        if (this.config.baseItem && this.dataProcessor) {
            this.availableMods = this.dataProcessor.getAvailableModsForItem(this.config.baseItem);
            this.updateModSelectors();
            this.updateStatus(`🔍 Loaded ${Object.keys(this.availableMods).length} available mods for ${this.config.baseItem}`);
        }
    }

    updateModSelectors() {
        // Clear existing mod rows but keep the template
        const modContainer = document.getElementById('modContainer');
        const existingRows = modContainer.querySelectorAll('.mod-row:not(.template)');
        existingRows.forEach(row => row.remove());

        // Regenerate mod rows based on current config
        this.config.mods.forEach((mod, index) => {
            this.addModRow(mod, index);
        });
    }

    addMod() {
        const newMod = {
            id: '',
            tier: 'T1',
            name: ''
        };
        
        this.config.mods.push(newMod);
        this.addModRow(newMod, this.config.mods.length - 1);
        this.saveConfiguration();
    }

    addModRow(mod, index) {
        const modContainer = document.getElementById('modContainer');
        const template = modContainer.querySelector('.mod-row.template');
        const newRow = template.cloneNode(true);
        
        newRow.classList.remove('template');
        newRow.style.display = 'flex';
        
        // Set up mod selection dropdown
        const modSelect = newRow.querySelector('.mod-select');
        modSelect.innerHTML = '<option value="">Select mod...</option>';
        
        for (const [modId, modData] of Object.entries(this.availableMods)) {
            const option = document.createElement('option');
            option.value = modId;
            option.textContent = modData.name;
            if (modId === mod.id) option.selected = true;
            modSelect.appendChild(option);
        }
        
        // Set up tier selection dropdown
        const tierSelect = newRow.querySelector('.tier-select');
        this.updateTierOptions(tierSelect, mod.id, mod.tier);
        
        // Event listeners
        modSelect.addEventListener('change', (e) => {
            this.config.mods[index].id = e.target.value;
            this.config.mods[index].name = this.availableMods[e.target.value]?.name || '';
            this.updateTierOptions(tierSelect, e.target.value, 'T1');
            this.config.mods[index].tier = 'T1';
            tierSelect.value = 'T1';
            this.saveConfiguration();
        });
        
        tierSelect.addEventListener('change', (e) => {
            this.config.mods[index].tier = e.target.value;
            this.saveConfiguration();
        });
        
        const removeBtn = newRow.querySelector('.remove-mod');
        removeBtn.addEventListener('click', () => {
            this.removeMod(index);
        });
        
        modContainer.appendChild(newRow);
    }

    updateTierOptions(tierSelect, modId, selectedTier = 'T1') {
        tierSelect.innerHTML = '';
        
        if (!modId || !this.availableMods[modId]) {
            tierSelect.innerHTML = '<option value="">Select tier...</option>';
            return;
        }
        
        const mod = this.availableMods[modId];
        mod.tiers.forEach(tier => {
            const option = document.createElement('option');
            option.value = tier.tier;
            option.textContent = `${tier.tier} (${tier.values.min}-${tier.values.max})`;
            if (tier.tier === selectedTier) option.selected = true;
            tierSelect.appendChild(option);
        });
    }

    removeMod(index) {
        this.config.mods.splice(index, 1);
        this.updateModSelectors();
        this.saveConfiguration();
    }

    clearMods() {
        this.config.mods = [];
        this.updateModSelectors();
        this.saveConfiguration();
        this.updateStatus('🗑️ All mods cleared');
    }

    async executeSearch() {
        try {
            this.updateStatus('🔄 Generating search...');
            
            // Validate configuration
            const validation = this.dataProcessor ? 
                this.dataProcessor.validateConfiguration(this.config) : 
                this.validateBasicConfiguration();
            
            if (!validation.isValid) {
                this.updateStatus(`❌ ${validation.errors[0]}`);
                return;
            }

            // Generate trade URL
            let tradeUrl;
            if (this.dataProcessor) {
                tradeUrl = this.dataProcessor.generateTradeUrl(this.config);
            } else {
                tradeUrl = this.generateMockTradeUrl();
            }

            // Open in new tab
            await chrome.tabs.create({ url: tradeUrl });
            
            const searchType = document.querySelector('input[name="searchType"]:checked').value;
            const modCount = this.config.mods.length;
            
            if (searchType === 'baseOnly') {
                this.updateStatus('✅ Base item search opened');
            } else {
                this.updateStatus(`✅ Search opened with ${modCount} mod${modCount !== 1 ? 's' : ''}`);
            }
            
        } catch (error) {
            console.error('Search execution failed:', error);
            this.updateStatus(`❌ Search failed: ${error.message}`);
        }
    }

    validateBasicConfiguration() {
        const errors = [];
        
        if (!this.config.baseItem) {
            errors.push('Base item is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    generateMockTradeUrl() {
        const baseUrl = 'https://www.pathofexile.com/trade/search/Settlers';
        const query = {
            status: { option: "online" },
            type: this.config.baseItem
        };
        
        const encodedQuery = encodeURIComponent(JSON.stringify(query));
        return `${baseUrl}?q=${encodedQuery}`;
    }

    saveConfiguration() {
        chrome.storage.local.set({ 'poe-trade-config': this.config }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save configuration:', chrome.runtime.lastError);
            }
        });
    }

    loadConfiguration() {
        chrome.storage.local.get('poe-trade-config', (result) => {
            if (result['poe-trade-config']) {
                this.config = { ...this.config, ...result['poe-trade-config'] };
                this.populateUIFromConfig();
            }
        });
    }

    populateUIFromConfig() {
        // Set base item
        const baseItemSelect = document.getElementById('baseItem');
        if (baseItemSelect) baseItemSelect.value = this.config.baseItem || '';

        // Set item level
        const itemLevelMin = document.getElementById('itemLevelMin');
        if (itemLevelMin) itemLevelMin.value = this.config.itemLevel.min || '';
        
        const itemLevelMax = document.getElementById('itemLevelMax');
        if (itemLevelMax) itemLevelMax.value = this.config.itemLevel.max || '';

        // Set quality
        const qualityMin = document.getElementById('qualityMin');
        if (qualityMin) qualityMin.value = this.config.quality.min || '';
        
        const qualityMax = document.getElementById('qualityMax');
        if (qualityMax) qualityMax.value = this.config.quality.max || '';

        // Set boolean flags
        const corruptedCheck = document.getElementById('corrupted');
        if (corruptedCheck) corruptedCheck.checked = this.config.corrupted;
        
        const fracturedCheck = document.getElementById('fractured');
        if (fracturedCheck) fracturedCheck.checked = this.config.fractured;
        
        const synthesisedCheck = document.getElementById('synthesised');
        if (synthesisedCheck) synthesisedCheck.checked = this.config.synthesised;

        // Set price
        const priceMin = document.getElementById('priceMin');
        if (priceMin) priceMin.value = this.config.price.min || '';
        
        const priceMax = document.getElementById('priceMax');
        if (priceMax) priceMax.value = this.config.price.max || '';
        
        const priceCurrency = document.getElementById('priceCurrency');
        if (priceCurrency) priceCurrency.value = this.config.price.currency || 'chaos';

        // Trigger base item change if we have one loaded
        if (this.config.baseItem) {
            this.onBaseItemChange();
        }
    }

    resetConfiguration() {
        this.config = {
            baseItem: '',
            itemLevel: { min: null, max: null },
            quality: { min: null, max: null },
            corrupted: false,
            fractured: false,
            synthesised: false,
            mods: [],
            price: { min: null, max: null, currency: 'chaos' }
        };
        
        this.populateUIFromConfig();
        this.updateModSelectors();
        this.saveConfiguration();
        this.updateStatus('🔄 Configuration reset');
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            
            // Auto-clear success messages after 3 seconds
            if (message.startsWith('✅')) {
                setTimeout(() => {
                    if (statusElement.textContent === message) {
                        statusElement.textContent = '🎯 Ready to search';
                    }
                }, 3000);
            }
        }
    }
}

// Initialize the UI when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new PoETradeExtensionUI();
});