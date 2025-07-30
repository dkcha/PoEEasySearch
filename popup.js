// PoE Trade Helper - Complete Popup Script with GitHub Loading
console.log('🎯 PoE Trade Helper - Popup script loading...');

// Global variables
let currentJewelType = '';
let selectedMods = [];
let abyssJewelsData = null;
let abyssJewelModsData = null;
let processedMods = {};
let jewelTypeToTagMap = {};

// DOM elements
let elements = {};

// Jewel type configuration
const JEWEL_TYPE_CONFIG = {
    'murderous': {
        displayName: 'Murderous Eye Jewel',
        tagPattern: ['not_for_sale', 'abyss_jewel_melee', 'abyss_jewel', 'default']
    },
    'searching': {
        displayName: 'Searching Eye Jewel', 
        tagPattern: ['not_for_sale', 'abyss_jewel_ranged', 'abyss_jewel', 'default']
    },
    'hypnotic': {
        displayName: 'Hypnotic Eye Jewel',
        tagPattern: ['not_for_sale', 'abyss_jewel_caster', 'abyss_jewel', 'default']
    },
    'ghastly': {
        displayName: 'Ghastly Eye Jewel',
        tagPattern: ['not_for_sale', 'abyss_jewel_minion', 'abyss_jewel', 'default']
    }
};

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM loaded, initializing popup...');
    
    try {
        // Load data files from GitHub
        await loadDataFiles();
        
        // Process the loaded data
        processJewelData();
        
        // Initialize UI elements
        initializeElements();
        
        // Set up event listeners
        attachEventListeners();
        
        // Populate the jewel dropdown
        populateJewelDropdown();
        
        console.log('✅ Popup initialization complete');
        showStatusMessage('Extension loaded successfully', 'success');
        
    } catch (error) {
        console.error('❌ Failed to initialize popup:', error);
        showStatusMessage('Failed to load extension data', 'error');
    }
});

// Load data from GitHub repository
async function loadDataFiles() {
    console.log('📁 Loading data files from GitHub...');
    
    const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/';
    
    try {
        // Load abyss jewels data from GitHub
        console.log('🌐 Fetching abyss_jewels.json from GitHub...');
        const jewelResponse = await fetch(`${GITHUB_BASE_URL}abyss_jewels.json`);
        if (!jewelResponse.ok) {
            throw new Error(`Failed to load abyss_jewels.json from GitHub: ${jewelResponse.status} ${jewelResponse.statusText}`);
        }
        abyssJewelsData = await jewelResponse.json();
        console.log('✅ Loaded abyss_jewels.json from GitHub');
        
        // Load abyss jewel mods data from GitHub
        console.log('🌐 Fetching abyss_jewel_mods.json from GitHub...');
        const modsResponse = await fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`);
        if (!modsResponse.ok) {
            throw new Error(`Failed to load abyss_jewel_mods.json from GitHub: ${modsResponse.status} ${modsResponse.statusText}`);
        }
        abyssJewelModsData = await modsResponse.json();
        console.log('✅ Loaded abyss_jewel_mods.json from GitHub');
        
        // Log data structure info for debugging
        console.log('📊 Data loaded successfully:');
        console.log(`- Abyss Jewels entries: ${Object.keys(abyssJewelsData || {}).length}`);
        if (abyssJewelModsData && abyssJewelModsData['Abyss Jewels']) {
            const tagCombos = Object.keys(abyssJewelModsData['Abyss Jewels']);
            console.log(`- Abyss Jewel mod tag combinations: ${tagCombos.length}`);
            console.log(`- Tag combinations found: ${tagCombos.join(', ')}`);
        }
        
    } catch (error) {
        console.error('❌ Error loading data files from GitHub:', error);
        throw error;
    }
}

// Process jewel data to create tag mappings
function processJewelData() {
    console.log('🔄 Processing jewel data...');
    
    if (!abyssJewelModsData) {
        throw new Error('No mod data available');
    }
    
    // Create mapping from jewel types to their tag combinations
    Object.entries(JEWEL_TYPE_CONFIG).forEach(([key, config]) => {
        const tagString = config.tagPattern.join(',');
        jewelTypeToTagMap[key] = tagString;
        console.log(`📋 Mapped ${config.displayName} to tags: ${tagString}`);
    });
    
    console.log('✅ Jewel data processing complete');
}

// Get available mods for a specific jewel type
function getModsForJewelType(jewelType) {
    if (!jewelType || !abyssJewelModsData) {
        return {};
    }
    
    const tagString = jewelTypeToTagMap[jewelType];
    if (!tagString) {
        console.warn(`⚠️ No tag mapping found for jewel type: ${jewelType}`);
        return {};
    }
    
    // Check if we've already processed mods for this jewel type
    if (processedMods[jewelType]) {
        return processedMods[jewelType];
    }
    
    console.log(`🔍 Loading mods for ${jewelType} with tags: ${tagString}`);
    
    const abyssJewelsSection = abyssJewelModsData['Abyss Jewels'];
    if (!abyssJewelsSection) {
        console.warn('⚠️ No "Abyss Jewels" section found in mod data');
        return {};
    }
    
    const jewelData = abyssJewelsSection[tagString];
    if (!jewelData) {
        console.warn(`⚠️ No mod data found for tag combination: ${tagString}`);
        return {};
    }
    
    const mods = {};
    
    // Process each mod category (prefix, suffix, corrupted, etc.)
    Object.entries(jewelData.mods || {}).forEach(([category, categoryMods]) => {
        Object.entries(categoryMods).forEach(([modKey, modVariants]) => {
            // Create a unique key for the mod
            const uniqueKey = `${category}_${modKey}`.toLowerCase();
            
            // Process mod variants to extract tier information
            const tiers = {};
            const sortedVariants = Object.entries(modVariants).sort(([a], [b]) => a.localeCompare(b));
            
            sortedVariants.forEach(([variantKey, weight], index) => {
                // Extract tier information from variant key
                const tierMatch = variantKey.match(/(\d+)$/);
                const tierNum = tierMatch ? parseInt(tierMatch[1]) : (index + 1);
                const tierKey = `T${tierNum}`;
                
                // Use realistic tier values based on mod type
                const tierValues = getTierValues(modKey, tierNum);
                
                tiers[tierKey] = {
                    min: tierValues.min,
                    max: tierValues.max,
                    weight: weight,
                    variantKey: variantKey
                };
            });
            
            mods[uniqueKey] = {
                name: formatModName(modKey),
                category: category,
                confidence: 95,
                statId: modKey,
                displayText: formatModName(modKey),
                tiers: tiers
            };
        });
    });
    
    // Cache the processed mods
    processedMods[jewelType] = mods;
    
    console.log(`✅ Processed ${Object.keys(mods).length} mods for ${jewelType}`);
    return mods;
}

// Get tier values based on mod type and tier number
function getTierValues(modKey, tierNum) {
    const modType = modKey.toLowerCase();
    
    if (modType.includes('life')) {
        const values = [
            { min: 36, max: 40 }, // T1
            { min: 31, max: 35 }, // T2
            { min: 26, max: 30 }, // T3 
            { min: 20, max: 25 }  // T4
        ];
        return values[tierNum - 1] || { min: 15, max: 19 };
    }
    
    if (modType.includes('mana')) {
        const values = [
            { min: 25, max: 30 }, // T1
            { min: 20, max: 24 }, // T2
            { min: 15, max: 19 }, // T3
            { min: 10, max: 14 }  // T4
        ];
        return values[tierNum - 1] || { min: 5, max: 9 };
    }
    
    if (modType.includes('energyshield')) {
        const values = [
            { min: 18, max: 20 }, // T1
            { min: 15, max: 17 }, // T2
            { min: 12, max: 14 }, // T3
            { min: 8, max: 11 }   // T4
        ];
        return values[tierNum - 1] || { min: 5, max: 7 };
    }
    
    if (modType.includes('resistance')) {
        const values = [
            { min: 18, max: 20 }, // T1
            { min: 15, max: 17 }, // T2
            { min: 12, max: 14 }, // T3
            { min: 8, max: 11 }   // T4
        ];
        return values[tierNum - 1] || { min: 5, max: 7 };
    }
    
    if (modType.includes('speed') || modType.includes('damage')) {
        const values = [
            { min: 12, max: 15 }, // T1
            { min: 9, max: 11 },  // T2
            { min: 6, max: 8 },   // T3
            { min: 3, max: 5 }    // T4
        ];
        return values[tierNum - 1] || { min: 1, max: 2 };
    }
    
    // Default values for unknown mod types
    return {
        min: Math.max(1, 10 - (tierNum - 1) * 2),
        max: Math.max(2, 12 - (tierNum - 1) * 2)
    };
}

// Format mod key into readable name
function formatModName(modKey) {
    // Custom mappings for better readability
    const customNames = {
        'AbyssJewelLife': 'Added Life',
        'AbyssJewelMana': 'Added Mana',
        'AbyssJewelEnergyShield': 'Added Energy Shield',
        'AbyssJewelFireResistance': 'Fire Resistance',
        'AbyssJewelColdResistance': 'Cold Resistance',
        'AbyssJewelLightningResistance': 'Lightning Resistance',
        'AbyssJewelAttackSpeed': 'Attack Speed',
        'AbyssJewelCastSpeed': 'Cast Speed',
        'AbyssJewelProjectileSpeed': 'Projectile Speed',
        'AbyssJewelMinionDamage': 'Minion Damage',
        'AbyssJewelMinionAttackSpeed': 'Minion Attack Speed'
    };
    
    if (customNames[modKey]) {
        return customNames[modKey];
    }
    
    // Default formatting - remove AbyssJewel prefix and add spaces
    return modKey
        .replace(/^AbyssJewel/, '') // Remove prefix
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .replace(/\s+/g, ' ') // Clean up spaces
        .trim();
}

// Initialize DOM elements with validation
function initializeElements() {
    console.log('🔧 Initializing DOM elements...');
    
    const elementIds = [
        'jewelType', 'modSearch', 'searchResults', 
        'selectedMods', 'autoFillBtn', 'statusMessage', 'tierModal',
        'tierOptions', 'closeTierModal'
    ];
    
    elementIds.forEach(id => {
        elements[id] = document.getElementById(id);
        if (!elements[id]) {
            console.warn(`⚠️ Element not found: ${id}`);
        } else {
            console.log(`✅ Found element: ${id}`);
        }
    });
    
    console.log('✅ DOM elements initialized');
}

// Attach event listeners to UI elements
function attachEventListeners() {
    console.log('🔗 Attaching event listeners...');
    
    try {
        // Jewel type selection
        if (elements.jewelType) {
            elements.jewelType.addEventListener('change', handleJewelTypeChange);
            console.log('✅ Jewel type listener attached');
        }
        
        // REMOVED: Search mode toggle - no longer needed since mode is auto-detected
        
        // Mod search input - THIS IS THE KEY ONE FOR YOUR ISSUE
        if (elements.modSearch) {
            elements.modSearch.addEventListener('input', handleModSearchInput);
            elements.modSearch.addEventListener('keydown', handleModSearchKeydown);
            console.log('✅ Mod search listeners attached');
            
            // Enable the input field explicitly
            elements.modSearch.disabled = false;
            elements.modSearch.placeholder = 'Type to search mods...';
        } else {
            console.error('❌ modSearch element not found - search will not work!');
        }
        
        // Auto-fill button
        if (elements.autoFillBtn) {
            elements.autoFillBtn.addEventListener('click', handleAutoFill);
            console.log('✅ Auto-fill button listener attached');
        }
        
        // Tier modal close
        if (elements.closeTierModal) {
            elements.closeTierModal.addEventListener('click', closeTierModal);
            console.log('✅ Close tier modal listener attached');
        }
        
        // Click outside modal to close
        if (elements.tierModal) {
            elements.tierModal.addEventListener('click', function(e) {
                if (e.target === elements.tierModal) {
                    closeTierModal();
                }
            });
            console.log('✅ Tier modal backdrop listener attached');
        }
        
        console.log('✅ All event listeners attached successfully');
        
    } catch (error) {
        console.error('❌ Error attaching event listeners:', error);
    }
}

// Populate the jewel dropdown with available types
function populateJewelDropdown() {
    console.log('📋 Populating jewel dropdown...');
    
    if (!elements.jewelType) {
        console.error('❌ Jewel type dropdown not found');
        return;
    }
    
    // Clear existing options
    elements.jewelType.innerHTML = '<option value="">Select Abyss Jewel Type</option>';
    
    // Add options for each jewel type
    Object.entries(JEWEL_TYPE_CONFIG).forEach(([key, config]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = config.displayName;
        elements.jewelType.appendChild(option);
    });
    
    console.log('✅ Jewel dropdown populated with', Object.keys(JEWEL_TYPE_CONFIG).length, 'options');
}

// Handle jewel type selection change
function handleJewelTypeChange(event) {
    currentJewelType = event.target.value;
    console.log(`🔄 Jewel type changed to: ${currentJewelType}`);
    
    // Clear current search and selected mods
    selectedMods = [];
    updateSelectedModsDisplay();
    clearSearchResults();
    
    if (elements.modSearch) {
        elements.modSearch.value = '';
        // Enable search input when jewel type is selected
        elements.modSearch.disabled = !currentJewelType;
        elements.modSearch.placeholder = currentJewelType ? 
            'Type to search mods...' : 
            'Select a jewel type first';
    }
    
    updateAutoFillButton();
    
    if (currentJewelType) {
        showStatusMessage(`Selected ${JEWEL_TYPE_CONFIG[currentJewelType].displayName}`, 'success');
    }
}

// Handle mod search input - THIS IS THE CRITICAL FUNCTION
function handleModSearchInput(event) {
    const query = event.target.value.trim();
    console.log(`🔍 Search input: "${query}"`);
    
    if (query.length < 2) {
        clearSearchResults();
        return;
    }
    
    if (!currentJewelType) {
        showStatusMessage('Please select a jewel type first', 'info');
        clearSearchResults();
        return;
    }
    
    console.log(`🔍 Searching for mods matching: "${query}"`);
    const matchingMods = findMatchingMods(query);
    console.log(`🔍 Found ${matchingMods.length} matching mods`);
    displaySearchResults(matchingMods);
}

// Handle keydown events in mod search
function handleModSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const results = elements.searchResults?.querySelectorAll('.search-result');
        if (results && results.length > 0) {
            results[0].click(); // Select first result
        }
    }
}

// Find matching mods using fuzzy search
function findMatchingMods(query, maxResults = 5) {
    if (!currentJewelType) {
        console.warn('⚠️ No jewel type selected for search');
        return [];
    }
    
    const availableMods = getModsForJewelType(currentJewelType);
    console.log(`🔍 Searching in ${Object.keys(availableMods).length} available mods for ${currentJewelType}`);
    
    const queryLower = query.toLowerCase();
    const results = [];
    
    // Abbreviation expansions for common terms
    const abbreviations = {
        'es': 'energy shield',
        'hp': 'life',
        'mp': 'mana',
        'res': 'resistance',
        'dmg': 'damage',
        'inc': 'increased',
        'att': 'attack',
        'def': 'defence',
        'crit': 'critical',
        'multi': 'multiplier'
    };
    
    // Expand abbreviations
    let expandedQuery = queryLower;
    Object.entries(abbreviations).forEach(([abbr, expansion]) => {
        expandedQuery = expandedQuery.replace(new RegExp(`\\b${abbr}\\b`, 'g'), expansion);
    });
    
    Object.entries(availableMods).forEach(([key, mod]) => {
        const modNameLower = mod.name.toLowerCase();
        let confidence = 0;
        
        // Exact name match (highest confidence)
        if (modNameLower === queryLower || modNameLower === expandedQuery) {
            confidence = 100;
        }
        // Name starts with query
        else if (modNameLower.startsWith(queryLower) || modNameLower.startsWith(expandedQuery)) {
            confidence = 95;
        }
        // Name contains query
        else if (modNameLower.includes(queryLower) || modNameLower.includes(expandedQuery)) {
            confidence = 85;
        }
        // Partial word matching
        else {
            const queryWords = expandedQuery.split(' ');
            let matchingWords = 0;
            
            queryWords.forEach(word => {
                if (word.length > 2 && modNameLower.includes(word)) {
                    matchingWords++;
                }
            });
            
            if (matchingWords > 0) {
                confidence = Math.min(80, (matchingWords / queryWords.length) * 80);
            }
        }
        
        if (confidence > 70) {
            results.push({
                key: key,
                name: mod.name,
                confidence: confidence,
                tiers: mod.tiers,
                statId: mod.statId,
                category: mod.category
            });
        }
    });
    
    // Sort by confidence and limit results
    const sortedResults = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults);
    
    console.log(`🔍 Returning ${sortedResults.length} results:`, sortedResults.map(r => `${r.name} (${r.confidence}%)`));
    return sortedResults;
}

// Display search results
function displaySearchResults(results) {
    if (!elements.searchResults) {
        console.error('❌ searchResults element not found');
        return;
    }
    
    elements.searchResults.innerHTML = '';
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = '<div class="no-results">No matching mods found</div>';
        return;
    }
    
    results.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result';
        resultDiv.innerHTML = `
            <span class="mod-name">${result.name}</span>
            <span class="confidence">(${result.confidence}%)</span>
            <span class="category">[${result.category}]</span>
        `;
        
        resultDiv.addEventListener('click', () => selectMod(result));
        elements.searchResults.appendChild(resultDiv);
    });
    
    console.log(`✅ Displayed ${results.length} search results`);
}

// Clear search results
function clearSearchResults() {
    if (elements.searchResults) {
        elements.searchResults.innerHTML = '';
    }
}

// Select a mod and show tier selection
function selectMod(mod) {
    console.log(`🎯 Selected mod: ${mod.name}`);
    showTierModal(mod);
}

// Show tier selection modal
function showTierModal(mod) {
    if (!elements.tierModal || !elements.tierOptions) return;
    
    // Clear previous tier options
    elements.tierOptions.innerHTML = '';
    
    // Create tier options
    Object.entries(mod.tiers).forEach(([tier, data]) => {
        const tierButton = document.createElement('button');
        tierButton.className = 'tier-option';
        tierButton.innerHTML = `
            <span class="tier-name">${tier}</span>
            <span class="tier-range">${data.min}-${data.max}</span>
        `;
        
        tierButton.addEventListener('click', () => {
            addSelectedMod(mod, tier, data);
            closeTierModal();
        });
        
        elements.tierOptions.appendChild(tierButton);
    });
    
    elements.tierModal.style.display = 'flex';
}

// Close tier selection modal
function closeTierModal() {
    if (elements.tierModal) {
        elements.tierModal.style.display = 'none';
    }
}

// Add selected mod with tier
function addSelectedMod(mod, tier, tierData) {
    // Check if mod already exists
    const existingIndex = selectedMods.findIndex(selected => selected.key === mod.key);
    
    if (existingIndex !== -1) {
        // Update existing mod
        selectedMods[existingIndex] = {
            key: mod.key,
            modName: mod.name, // Changed from 'name' to 'modName' for content.js compatibility
            name: mod.name,
            tier: tier,
            tierData: tierData,
            minValue: tierData.min, // Add these for content.js compatibility
            maxValue: tierData.max,
            statId: mod.statId,
            category: mod.category
        };
    } else {
        // Add new mod
        selectedMods.push({
            key: mod.key,
            modName: mod.name, // Changed from 'name' to 'modName' for content.js compatibility
            name: mod.name,
            tier: tier,
            tierData: tierData,
            minValue: tierData.min, // Add these for content.js compatibility
            maxValue: tierData.max,
            statId: mod.statId,
            category: mod.category
        });
    }
    
    updateSelectedModsDisplay();
    updateAutoFillButton();
    clearSearchInput();
    
    console.log(`✅ Added mod: ${mod.name} (${tier})`);
    showStatusMessage(`Added ${mod.name} (${tier})`, 'success');
}

// Update selected mods display
function updateSelectedModsDisplay() {
    if (!elements.selectedMods) return;
    
    if (selectedMods.length === 0) {
        elements.selectedMods.innerHTML = '<div class="no-mods">No mods selected</div>';
        return;
    }
    
    elements.selectedMods.innerHTML = selectedMods.map((mod, index) => `
        <div class="selected-mod">
            <span class="mod-info">
                <span class="mod-name">${mod.name}</span>
                <span class="mod-tier">${mod.tier}</span>
                <span class="mod-range">(${mod.tierData.min}-${mod.tierData.max})</span>
            </span>
            <button class="remove-mod" onclick="removeSelectedMod(${index})">&times;</button>
        </div>
    `).join('');
}

// Remove selected mod
function removeSelectedMod(index) {
    if (index >= 0 && index < selectedMods.length) {
        const removedMod = selectedMods.splice(index, 1)[0];
        updateSelectedModsDisplay();
        updateAutoFillButton();
        console.log(`🗑️ Removed mod: ${removedMod.name}`);
        showStatusMessage(`Removed ${removedMod.name}`, 'info');
    }
}

// Clear search input
function clearSearchInput() {
    if (elements.modSearch) {
        elements.modSearch.value = '';
    }
    clearSearchResults();
}

// Update auto-fill button state
function updateAutoFillButton() {
    if (!elements.autoFillBtn) return;
    
    const hasJewelType = !!currentJewelType;
    const hasMods = selectedMods.length > 0;
    const isValidConfig = hasJewelType; // Always valid if jewel type is selected
    
    elements.autoFillBtn.disabled = !isValidConfig;
    
    if (hasMods) {
        // User has selected specific mods
        elements.autoFillBtn.textContent = `Search with ${selectedMods.length} mod${selectedMods.length !== 1 ? 's' : ''}`;
    } else if (hasJewelType) {
        // User wants base jewel only
        elements.autoFillBtn.textContent = `Search ${JEWEL_TYPE_CONFIG[currentJewelType].displayName}`;
    } else {
        // No jewel type selected
        elements.autoFillBtn.textContent = 'Select Jewel Type';
    }
}

// Handle auto-fill button click
async function handleAutoFill() {
    console.log('🚀 Starting auto-fill process...');
    
    if (!currentJewelType) {
        showStatusMessage('Please select a jewel type', 'error');
        return;
    }
    
    // Automatically determine search mode based on selected mods
    const searchMode = selectedMods.length > 0 ? 'with-mods' : 'base-only';
    
    const config = {
        jewelType: currentJewelType,
        jewelDisplayName: JEWEL_TYPE_CONFIG[currentJewelType].displayName,
        searchMode: searchMode,
        selectedMods: selectedMods,
        timestamp: Date.now()
    };
    
    console.log(`🎯 Auto-fill config: ${searchMode} with ${selectedMods.length} mods`);
    console.log('📋 Selected mods for auto-fill:', selectedMods);
    showStatusMessage('Opening trade site...', 'info');
    
    try {
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
            action: 'openTradeTab',
            config: config
        });
        
        if (response && response.success) {
            showStatusMessage('Trade site opened successfully', 'success');
        } else {
            throw new Error(response?.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('❌ Auto-fill failed:', error);
        showStatusMessage('Failed to open trade site', 'error');
    }
}

// Show status message
function showStatusMessage(message, type = 'info') {
    if (!elements.statusMessage) return;
    
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    
    // Auto-hide after 3 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            if (elements.statusMessage.textContent === message) {
                elements.statusMessage.textContent = '';
                elements.statusMessage.className = 'status-message';
            }
        }, 3000);
    }
}

// Make functions globally available for onclick handlers
window.removeSelectedMod = removeSelectedMod;

console.log('📦 PoE Trade Helper popup script loaded completely');

// Debug function to test search functionality
window.debugSearch = function(query = 'life') {
    console.log('🧪 Debug search function called with query:', query);
    console.log('Current jewel type:', currentJewelType);
    
    if (!currentJewelType) {
        console.log('❌ No jewel type selected');
        return;
    }
    
    const mods = getModsForJewelType(currentJewelType);
    console.log('Available mods:', Object.keys(mods).length);
    
    const results = findMatchingMods(query);
    console.log('Search results:', results);
    
    return results;
};

// Debug function to check UI state
window.debugUI = function() {
    console.log('🧪 Debug UI state:');
    console.log('- Current jewel type:', currentJewelType);
    console.log('- Selected mods:', selectedMods.length);
    console.log('- Auto search mode:', selectedMods.length > 0 ? 'with-mods' : 'base-only');
    console.log('- Elements found:', Object.keys(elements).filter(key => elements[key]));
    console.log('- Elements missing:', Object.keys(elements).filter(key => !elements[key]));
    
    // Check search input specifically
    const searchInput = document.getElementById('modSearch');
    console.log('- Search input element:', !!searchInput);
    console.log('- Search input disabled:', searchInput?.disabled);
    console.log('- Search input value:', searchInput?.value);
    console.log('- Search input placeholder:', searchInput?.placeholder);
    
    return {
        currentJewelType,
        selectedMods: selectedMods.length,
        autoSearchMode: selectedMods.length > 0 ? 'with-mods' : 'base-only',
        elementsFound: Object.keys(elements).filter(key => elements[key]),
        elementsMissing: Object.keys(elements).filter(key => !elements[key]),
        searchInput: {
            exists: !!searchInput,
            disabled: searchInput?.disabled,
            value: searchInput?.value,
            placeholder: searchInput?.placeholder
        }
    };
};