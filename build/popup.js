/**
 * Popup Controller for PoE Trade Helper - Abyss Jewels
 * Handles UI interactions and search functionality
 */

class AbyssJewelPopupController {
    constructor() {
        this.processor = new AbyssJewelDataProcessor();
        this.searchConfig = {
            baseItem: null,
            searchType: 'base',
            selectedMods: [],
            itemLevel: { min: null, max: null },
            price: { min: null, max: null }
        };
        this.currentSuggestionIndex = -1;
        this.currentTierSelection = null;
    }

    async initialize() {
        try {
            await this.processor.initialize();
            this.setupEventListeners();
            this.populateBaseItems();
            console.log('✅ Abyss Jewel Popup Controller initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize popup controller:', error);
            this.showError('Failed to load extension data. Please refresh.');
            throw error;
        }
    }

    setupEventListeners() {
        // Base item selection
        document.getElementById('baseItemSelect').addEventListener('change', (e) => {
            this.searchConfig.baseItem = e.target.value;
            this.updateModSearchState();
        });

        // Search type toggle
        document.querySelectorAll('.toggle-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.switchSearchType(e.target.dataset.type);
            });
        });

        // Mod search input
        const modInput = document.getElementById('modSearchInput');
        modInput.addEventListener('input', (e) => {
            this.onModSearchInput(e.target.value);
        });
        modInput.addEventListener('keydown', (e) => {
            this.handleModSearchKeydown(e);
        });

        // Advanced options toggle
        document.getElementById('advancedToggle').addEventListener('click', () => {
            this.toggleAdvancedOptions();
        });

        // Search buttons
        document.getElementById('searchBaseBtn').addEventListener('click', () => {
            this.performBaseSearch();
        });
        document.getElementById('searchModsBtn').addEventListener('click', () => {
            this.performModSearch();
        });

        // Tier modal
        document.getElementById('confirmTierBtn').addEventListener('click', () => {
            this.confirmTierSelection();
        });
        document.getElementById('cancelTierBtn').addEventListener('click', () => {
            this.closeTierModal();
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mod-search-container')) {
                this.hideSuggestions();
            }
        });
    }

    populateBaseItems() {
        const baseItems = this.processor.getBaseItems();
        const select = document.getElementById('baseItemSelect');
        
        Object.entries(baseItems).forEach(([key, item]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }

    switchSearchType(type) {
        this.searchConfig.searchType = type;
        
        // Update toggle buttons
        document.querySelectorAll('.toggle-option').forEach(option => {
            option.classList.toggle('active', option.dataset.type === type);
        });

        // Show/hide sections
        const modSection = document.getElementById('modSearchSection');
        const baseBtn = document.getElementById('searchBaseBtn');
        const modBtn = document.getElementById('searchModsBtn');

        if (type === 'mods') {
            modSection.classList.add('active');
            baseBtn.style.display = 'none';
            modBtn.style.display = 'block';
        } else {
            modSection.classList.remove('active');
            baseBtn.style.display = 'block';
            modBtn.style.display = 'none';
        }

        this.updateModSearchState();
    }

    updateModSearchState() {
        const modInput = document.getElementById('modSearchInput');
        const hasBaseItem = this.searchConfig.baseItem;
        const isModSearch = this.searchConfig.searchType === 'mods';
        
        modInput.disabled = !hasBaseItem || !isModSearch;
        
        if (!hasBaseItem && isModSearch) {
            this.showError('Please select an Abyss Jewel first');
        } else {
            this.hideError();
        }
    }

    onModSearchInput(query) {
        if (!query || query.length < 2) {
            this.hideSuggestions();
            return;
        }

        const results = this.processor.findMatchingMods(
            this.searchConfig.baseItem, 
            query, 
            8
        );

        this.displaySuggestions(results);
        this.currentSuggestionIndex = -1;
    }

    displaySuggestions(results) {
        const container = document.getElementById('modSuggestions');
        
        if (results.length === 0) {
            this.hideSuggestions();
            return;
        }

        container.innerHTML = '';
        container.style.display = 'block';

        results.forEach((result, index) => {
            const div = document.createElement('div');
            div.className = 'mod-suggestion';
            div.dataset.index = index;
            
            const scoreClass = result.score >= 90 ? 'score-excellent' : 
                             result.score >= 70 ? 'score-good' : 'score-fair';
            
            div.innerHTML = `
                <span class="mod-suggestion-name">${result.displayName}</span>
                <span class="mod-suggestion-score ${scoreClass}">${result.score}%</span>
            `;
            
            div.addEventListener('click', () => {
                this.selectModSuggestion(result);
            });
            
            container.appendChild(div);
        });
    }

    handleModSearchKeydown(e) {
        const suggestions = document.querySelectorAll('.mod-suggestion');
        
        if (suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentSuggestionIndex = Math.min(
                    this.currentSuggestionIndex + 1, 
                    suggestions.length - 1
                );
                this.highlightSuggestion();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentSuggestionIndex = Math.max(
                    this.currentSuggestionIndex - 1, 
                    0
                );
                this.highlightSuggestion();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.currentSuggestionIndex >= 0) {
                    const modInput = document.getElementById('modSearchInput');
                    const query = modInput.value;
                    const results = this.processor.findMatchingMods(
                        this.searchConfig.baseItem, 
                        query, 
                        8
                    );
                    if (results[this.currentSuggestionIndex]) {
                        this.selectModSuggestion(results[this.currentSuggestionIndex]);
                    }
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }

    highlightSuggestion() {
        const suggestions = document.querySelectorAll('.mod-suggestion');
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle(
                'highlighted', 
                index === this.currentSuggestionIndex
            );
        });
    }

    selectModSuggestion(modData) {
        this.currentTierSelection = modData;
        this.showTierSelection(modData);
        this.hideSuggestions();
        document.getElementById('modSearchInput').value = '';
    }

    showTierSelection(modData) {
        const modal = document.getElementById('tierModal');
        const options = document.getElementById('tierOptions');
        const title = document.querySelector('.tier-modal-title');
        
        title.textContent = `Select Tier for ${modData.displayName}`;
        
        const tiers = this.processor.getAvailableTiers(
            modData.modKey, 
            this.searchConfig.baseItem
        );
        
        options.innerHTML = '';
        
        tiers.forEach(tier => {
            const div = document.createElement('div');
            div.className = 'tier-option';
            div.dataset.tierKey = tier.tierKey;
            
            const values = this.processor.convertTierToValues(
                modData.modKey,
                this.searchConfig.baseItem,
                tier.tierKey
            );
            
            div.innerHTML = `
                <div class="tier-name">${tier.displayName}</div>
                <div class="tier-values">${values.min}-${values.max}</div>
            `;
            
            div.addEventListener('click', () => {
                document.querySelectorAll('.tier-option').forEach(opt => 
                    opt.classList.remove('selected')
                );
                div.classList.add('selected');
            });
            
            options.appendChild(div);
        });
        
        modal.classList.add('active');
    }

    confirmTierSelection() {
        const selectedTier = document.querySelector('.tier-option.selected');
        
        if (!selectedTier || !this.currentTierSelection) {
            this.showError('Please select a tier');
            return;
        }
        
        const tierKey = selectedTier.dataset.tierKey;
        const values = this.processor.convertTierToValues(
            this.currentTierSelection.modKey,
            this.searchConfig.baseItem,
            tierKey
        );
        
        const modEntry = {
            modKey: this.currentTierSelection.modKey,
            displayName: this.currentTierSelection.displayName,
            tier: values.tier,
            values: values
        };
        
        this.addSelectedMod(modEntry);
        this.closeTierModal();
    }

    addSelectedMod(modEntry) {
        // Check if mod already exists
        const existingIndex = this.searchConfig.selectedMods.findIndex(
            mod => mod.modKey === modEntry.modKey
        );
        
        if (existingIndex >= 0) {
            this.searchConfig.selectedMods[existingIndex] = modEntry;
        } else {
            this.searchConfig.selectedMods.push(modEntry);
        }
        
        this.updateSelectedModsDisplay();
    }

    updateSelectedModsDisplay() {
        const container = document.getElementById('selectedModsList');
        
        if (this.searchConfig.selectedMods.length === 0) {
            container.innerHTML = '<div style="color: #6b7280; font-style: italic;">No mods selected</div>';
            return;
        }
        
        container.innerHTML = '';
        
        this.searchConfig.selectedMods.forEach((mod, index) => {
            const div = document.createElement('div');
            div.className = 'selected-mod';
            
            div.innerHTML = `
                <div class="selected-mod-info">
                    <div class="selected-mod-name">${mod.displayName}</div>
                    <div class="selected-mod-values">${mod.tier}: ${mod.values.min}-${mod.values.max}</div>
                </div>
                <button class="remove-mod-btn" data-index="${index}">Remove</button>
            `;
            
            div.querySelector('.remove-mod-btn').addEventListener('click', () => {
                this.removeSelectedMod(index);
            });
            
            container.appendChild(div);
        });
    }

    removeSelectedMod(index) {
        this.searchConfig.selectedMods.splice(index, 1);
        this.updateSelectedModsDisplay();
    }

    closeTierModal() {
        document.getElementById('tierModal').classList.remove('active');
        this.currentTierSelection = null;
    }

    hideSuggestions() {
        document.getElementById('modSuggestions').style.display = 'none';
        this.currentSuggestionIndex = -1;
    }

    toggleAdvancedOptions() {
        const toggle = document.getElementById('advancedToggle');
        const content = document.getElementById('advancedContent');
        
        const isCollapsed = toggle.classList.contains('collapsed');
        
        toggle.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
        
        // Animate content
        if (isCollapsed) {
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            content.style.maxHeight = '0';
        }
    }

    performBaseSearch() {
        if (!this.searchConfig.baseItem) {
            this.showError('Please select an Abyss Jewel');
            return;
        }
        
        const config = { ...this.searchConfig };
        config.selectedMods = []; // Base search doesn't use mods
        
        const url = this.processor.generateTradeUrlWithMods(config);
        this.openTradeUrl(url);
    }

    performModSearch() {
        if (!this.searchConfig.baseItem) {
            this.showError('Please select an Abyss Jewel');
            return;
        }
        
        if (this.searchConfig.selectedMods.length === 0) {
            this.showError('Please add at least one mod to search for');
            return;
        }
        
        const url = this.processor.generateTradeUrlWithMods(this.searchConfig);
        this.openTradeUrl(url);
    }

    openTradeUrl(url) {
        chrome.tabs.create({ url: url });
        window.close();
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        document.getElementById('errorMessage').classList.remove('show');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const controller = new AbyssJewelPopupController();
        await controller.initialize();
        window.abyssController = controller; // For debugging
        
        // Enable testing in console
        window.runTests = async () => {
            const tester = new AbyssJewelFuzzySearchTest();
            return await tester.runAllTests();
        };
        
    } catch (error) {
        console.error('❌ Failed to initialize popup:', error);
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = 'Failed to load data. Please refresh the extension.';
            errorDiv.classList.add('show');
        }
    }
});