// Enhanced popup.js with fuzzy search integration
// Integrates with the enhanced data-processor.js for intelligent mod matching

class PopupController {
    constructor() {
        this.processor = null;
        this.searchConfig = {
            searchType: 'base-only', // 'base-only' or 'with-mods'
            baseItem: '',
            baseItemKey: '',
            mods: [],
            itemLevel: { min: '', max: '' },
            quality: { min: '', max: '' },
            price: { min: '', max: '' },
            corrupted: 'any',
            fractured: 'any',
            synthesised: 'any'
        };
        this.modSuggestions = [];
        this.selectedModIndex = -1;
    }

    async initialize() {
        try {
            // Initialize the enhanced data processor
            this.processor = new DataProcessor();
            await this.processor.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Populate base item dropdown
            this.populateBaseItems();
            
            console.log('PopupController initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PopupController:', error);
            this.showError('Failed to load game data. Please try again.');
        }
    }

    setupEventListeners() {
        // Search type toggle
        const searchTypeRadios = document.querySelectorAll('input[name="search-type"]');
        searchTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.searchConfig.searchType = e.target.value;
                this.toggleModSection();
            });
        });

        // Base item selection
        const baseItemSelect = document.getElementById('base-item-select');
        baseItemSelect.addEventListener('change', (e) => {
            this.onBaseItemChange(e.target.value);
        });

        // Mod search input with fuzzy matching
        const modSearchInput = document.getElementById('mod-search-input');
        modSearchInput.addEventListener('input', (e) => {
            this.onModSearchInput(e.target.value);
        });

        // Handle keyboard navigation for mod suggestions
        modSearchInput.addEventListener('keydown', (e) => {
            this.handleModSearchKeydown(e);
        });

        // Item level inputs
        const minLevelInput = document.getElementById('min-level');
        const maxLevelInput = document.getElementById('max-level');
        minLevelInput.addEventListener('input', (e) => {
            this.searchConfig.itemLevel.min = e.target.value;
        });
        maxLevelInput.addEventListener('input', (e) => {
            this.searchConfig.itemLevel.max = e.target.value;
        });

        // Quality inputs
        const minQualityInput = document.getElementById('min-quality');
        const maxQualityInput = document.getElementById('max-quality');
        minQualityInput.addEventListener('input', (e) => {
            this.searchConfig.quality.min = e.target.value;
        });
        maxQualityInput.addEventListener('input', (e) => {
            this.searchConfig.quality.max = e.target.value;
        });

        // Price inputs
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        minPriceInput.addEventListener('input', (e) => {
            this.searchConfig.price.min = e.target.value;
        });
        maxPriceInput.addEventListener('input', (e) => {
            this.searchConfig.price.max = e.target.value;
        });

        // Property selects
        const corruptedSelect = document.getElementById('corrupted-select');
        const fracturedSelect = document.getElementById('fractured-select');
        const synthesisedSelect = document.getElementById('synthesised-select');
        
        corruptedSelect.addEventListener('change', (e) => {
            this.searchConfig.corrupted = e.target.value;
        });
        fracturedSelect.addEventListener('change', (e) => {
            this.searchConfig.fractured = e.target.value;
        });
        synthesisedSelect.addEventListener('change', (e) => {
            this.searchConfig.synthesised = e.target.value;
        });

        // Search buttons
        const searchBaseButton = document.getElementById('search-base-button');
        const searchModsButton = document.getElementById('search-mods-button');
        
        searchBaseButton.addEventListener('click', () => {
            this.performBaseItemSearch();
        });
        searchModsButton.addEventListener('click', () => {
            this.performModSearch();
        });

        // Clear mods button
        const clearModsButton = document.getElementById('clear-mods-button');
        clearModsButton.addEventListener('click', () => {
            this.clearSelectedMods();
        });
    }

    toggleModSection() {
        const modSection = document.getElementById('mod-section');
        const searchButtons = document.getElementById('search-buttons');
        
        if (this.searchConfig.searchType === 'base-only') {
            modSection.style.display = 'none';
            searchButtons.innerHTML = `
                <button id="search-base-button" class="search-button primary">
                    Search Base Items
                </button>
            `;
        } else {
            modSection.style.display = 'block';
            searchButtons.innerHTML = `
                <button id="search-mods-button" class="search-button primary">
                    Search with Mods
                </button>
            `;
        }
        
        // Re-attach event listeners for new buttons
        this.attachSearchButtonListeners();
    }

    attachSearchButtonListeners() {
        const searchBaseButton = document.getElementById('search-base-button');
        const searchModsButton = document.getElementById('search-mods-button');
        
        if (searchBaseButton) {
            searchBaseButton.addEventListener('click', () => {
                this.performBaseItemSearch();
            });
        }
        if (searchModsButton) {
            searchModsButton.addEventListener('click', () => {
                this.performModSearch();
            });
        }
    }

    populateBaseItems() {
        const baseItemSelect = document.getElementById('base-item-select');
        const baseItemsByClass = this.processor.getBaseItemsByClass();
        
        // Clear existing options
        baseItemSelect.innerHTML = '<option value="">Select a base item...</option>';
        
        // Group items by class
        Object.entries(baseItemsByClass).forEach(([itemClass, items]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = itemClass;
            
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.key;
                option.textContent = item.name;
                option.dataset.itemClass = itemClass;
                optgroup.appendChild(option);
            });
            
            baseItemSelect.appendChild(optgroup);
        });
    }

    onBaseItemChange(baseItemKey) {
        this.searchConfig.baseItem = baseItemKey;
        this.searchConfig.baseItemKey = baseItemKey;
        
        // Clear existing mods when base item changes
        this.clearSelectedMods();
        
        // Enable mod search if base item is selected
        const modSearchInput = document.getElementById('mod-search-input');
        if (baseItemKey) {
            modSearchInput.disabled = false;
            modSearchInput.placeholder = 'Type to search for mods (e.g., "max es", "life", "resistance")...';
        } else {
            modSearchInput.disabled = true;
            modSearchInput.placeholder = 'Select a base item first';
        }
    }

    onModSearchInput(userInput) {
        if (!this.searchConfig.baseItemKey || userInput.length < 2) {
            this.hideModSuggestions();
            return;
        }

        // Use fuzzy matching to find relevant mods
        const matches = this.processor.findMatchingMods(
            this.searchConfig.baseItemKey, 
            userInput, 
            8 // Show up to 8 suggestions
        );

        this.modSuggestions = matches;
        this.selectedModIndex = -1;
        this.displayModSuggestions(matches);
    }

    displayModSuggestions(matches) {
        let suggestionsContainer = document.getElementById('mod-suggestions');
        
        if (!suggestionsContainer) {
            // Create suggestions container if it doesn't exist
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'mod-suggestions';
            suggestionsContainer.className = 'mod-suggestions';
            
            const modSearchInput = document.getElementById('mod-search-input');
            modSearchInput.parentNode.insertBefore(suggestionsContainer, modSearchInput.nextSibling);
        }

        if (matches.length === 0) {
            suggestionsContainer.innerHTML = '<div class="no-suggestions">No matching mods found</div>';
            suggestionsContainer.style.display = 'block';
            return;
        }

        const suggestionsHTML = matches.map((match, index) => {
            const scoreColor = match.matchScore >= 90 ? '#28a745' : 
                             match.matchScore >= 70 ? '#ffc107' : '#6c757d';
            
            return `
                <div class="mod-suggestion" data-index="${index}" data-mod-key="${match.key}">
                    <div class="mod-name">${match.name}</div>
                    <div class="mod-meta">
                        <span class="match-score" style="color: ${scoreColor}">
                            ${match.matchScore}% match
                        </span>
                        <span class="mod-type">${match.type || 'Explicit'}</span>
                    </div>
                </div>
            `;
        }).join('');

        suggestionsContainer.innerHTML = suggestionsHTML;
        suggestionsContainer.style.display = 'block';

        // Add click handlers for suggestions
        suggestionsContainer.querySelectorAll('.mod-suggestion').forEach((element, index) => {
            element.addEventListener('click', () => {
                this.selectModSuggestion(index);
            });
        });
    }

    handleModSearchKeydown(event) {
        const suggestionsContainer = document.getElementById('mod-suggestions');
        if (!suggestionsContainer || suggestionsContainer.style.display === 'none') {
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedModIndex = Math.min(
                    this.selectedModIndex + 1, 
                    this.modSuggestions.length - 1
                );
                this.highlightSelectedSuggestion();
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.selectedModIndex = Math.max(this.selectedModIndex - 1, -1);
                this.highlightSelectedSuggestion();
                break;
                
            case 'Enter':
                event.preventDefault();
                if (this.selectedModIndex >= 0) {
                    this.selectModSuggestion(this.selectedModIndex);
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                this.hideModSuggestions();
                break;
        }
    }

    highlightSelectedSuggestion() {
        const suggestions = document.querySelectorAll('.mod-suggestion');
        suggestions.forEach((element, index) => {
            element.classList.toggle('selected', index === this.selectedModIndex);
        });
    }

    selectModSuggestion(index) {
        const selectedMod = this.modSuggestions[index];
        if (!selectedMod) return;

        // Show tier selection for the selected mod
        this.showTierSelection(selectedMod);
        
        // Clear the search input and hide suggestions
        document.getElementById('mod-search-input').value = '';
        this.hideModSuggestions();
    }

    showTierSelection(mod) {
        // Get available tiers for this mod on the selected base item
        const availableTiers = this.processor.getAvailableTiers(
            mod.key, 
            this.searchConfig.baseItemKey
        );

        if (availableTiers.length === 0) {
            this.showError('No tier information available for this mod');
            return;
        }

        // Create tier selection modal/dropdown
        let tierModal = document.getElementById('tier-selection-modal');
        if (!tierModal) {
            tierModal = this.createTierSelectionModal();
        }

        // Populate tier options with exact value ranges
        const tierOptionsHTML = availableTiers.map(tier => {
            const tierInfo = this.processor.convertTierToValues(
                mod.key, 
                this.searchConfig.baseItemKey, 
                tier.tier
            );
            
            let valueDisplay = '';
            if (tierInfo && tierInfo.values && tierInfo.values.length > 0) {
                const values = tierInfo.values[0];
                valueDisplay = `(${values.min}-${values.max})`;
            }

            return `
                <div class="tier-option" data-tier="${tier.tier}" data-mod-key="${mod.key}">
                    <span class="tier-name">${tier.tier}</span>
                    <span class="tier-values">${valueDisplay}</span>
                </div>
            `;
        }).join('');

        const tierContent = `
            <div class="tier-modal-header">
                <h4>Select Tier for: ${mod.name}</h4>
                <button class="close-tier-modal">×</button>
            </div>
            <div class="tier-options">
                ${tierOptionsHTML}
            </div>
        `;

        tierModal.innerHTML = tierContent;
        tierModal.style.display = 'block';

        // Add event listeners
        this.attachTierModalListeners(mod);
    }

    createTierSelectionModal() {
        const modal = document.createElement('div');
        modal.id = 'tier-selection-modal';
        modal.className = 'tier-modal';
        document.body.appendChild(modal);
        return modal;
    }

    attachTierModalListeners(mod) {
        const tierModal = document.getElementById('tier-selection-modal');
        
        // Close button
        const closeButton = tierModal.querySelector('.close-tier-modal');
        closeButton.addEventListener('click', () => {
            tierModal.style.display = 'none';
        });

        // Tier option selection
        const tierOptions = tierModal.querySelectorAll('.tier-option');
        tierOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedTier = option.dataset.tier;
                this.addSelectedMod(mod, selectedTier);
                tierModal.style.display = 'none';
            });
        });

        // Close on background click
        tierModal.addEventListener('click', (e) => {
            if (e.target === tierModal) {
                tierModal.style.display = 'none';
            }
        });
    }

    addSelectedMod(mod, tier) {
        // Convert tier to exact values
        const tierInfo = this.processor.convertTierToValues(
            mod.key, 
            this.searchConfig.baseItemKey, 
            tier
        );

        const modConfig = {
            key: mod.key,
            name: mod.name,
            tier: tier,
            values: tierInfo ? tierInfo.values : null,
            type: mod.type || 'explicit'
        };

        // Add to search config
        this.searchConfig.mods.push(modConfig);

        // Update UI to show selected mod
        this.updateSelectedModsDisplay();
    }

    updateSelectedModsDisplay() {
        let selectedModsContainer = document.getElementById('selected-mods');
        
        if (!selectedModsContainer) {
            selectedModsContainer = document.createElement('div');
            selectedModsContainer.id = 'selected-mods';
            selectedModsContainer.className = 'selected-mods';
            
            const modSection = document.getElementById('mod-section');
            modSection.appendChild(selectedModsContainer);
        }

        if (this.searchConfig.mods.length === 0) {
            selectedModsContainer.innerHTML = '';
            return;
        }

        const modsHTML = this.searchConfig.mods.map((mod, index) => {
            let valueDisplay = '';
            if (mod.values && mod.values.length > 0) {
                const values = mod.values[0];
                valueDisplay = `${values.min}-${values.max}`;
            }

            return `
                <div class="selected-mod" data-index="${index}">
                    <div class="mod-info">
                        <span class="mod-name">${mod.name}</span>
                        <span class="mod-tier">${mod.tier} ${valueDisplay}</span>
                    </div>
                    <button class="remove-mod" data-index="${index}">×</button>
                </div>
            `;
        }).join('');

        selectedModsContainer.innerHTML = `
            <div class="selected-mods-header">
                <h4>Selected Mods (${this.searchConfig.mods.length})</h4>
                <button id="clear-mods-button" class="clear-all-mods">Clear All</button>
            </div>
            <div class="mods-list">
                ${modsHTML}
            </div>
        `;

        // Add remove handlers
        selectedModsContainer.querySelectorAll('.remove-mod').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeMod(index);
            });
        });

        // Clear all handler
        const clearAllButton = selectedModsContainer.querySelector('.clear-all-mods');
        clearAllButton.addEventListener('click', () => {
            this.clearSelectedMods();
        });
    }

    removeMod(index) {
        this.searchConfig.mods.splice(index, 1);
        this.updateSelectedModsDisplay();
    }

    clearSelectedMods() {
        this.searchConfig.mods = [];
        this.updateSelectedModsDisplay();
    }

    hideModSuggestions() {
        const suggestionsContainer = document.getElementById('mod-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    async performBaseItemSearch() {
        if (!this.searchConfig.baseItemKey) {
            this.showError('Please select a base item first');
            return;
        }

        try {
            // Generate trade URL for base item only
            const tradeUrl = this.processor.generateTradeUrlWithoutMods(this.searchConfig);
            
            // Open trade site in new tab
            chrome.tabs.create({ url: tradeUrl });
            
            // Close popup
            window.close();
        } catch (error) {
            console.error('Failed to perform base item search:', error);
            this.showError('Failed to generate search URL');
        }
    }

    async performModSearch() {
        if (!this.searchConfig.baseItemKey) {
            this.showError('Please select a base item first');
            return;
        }

        if (this.searchConfig.mods.length === 0) {
            this.showError('Please add at least one mod to search for');
            return;
        }

        try {
            // Generate trade URL with mods
            const tradeUrl = this.processor.generateTradeUrlWithMods(this.searchConfig);
            
            // Open trade site in new tab
            chrome.tabs.create({ url: tradeUrl });
            
            // Close popup
            window.close();
        } catch (error) {
            console.error('Failed to perform mod search:', error);
            this.showError('Failed to generate search URL');
        }
    }

    showError(message) {
        let errorContainer = document.getElementById('error-message');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-message';
            errorContainer.className = 'error-message';
            document.body.insertBefore(errorContainer, document.body.firstChild);
        }

        errorContainer.textContent = message;
        errorContainer.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new PopupController();
    await controller.initialize();
});

// Global reference for debugging
window.popupController = null;
document.addEventListener('DOMContentLoaded', async () => {
    window.popupController = new PopupController();
    await window.popupController.initialize();
});