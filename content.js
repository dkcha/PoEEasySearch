// PoE Easy Search - Enhanced Content Script for pathofexile.com/trade
console.log('🎯 PoE Easy Search content script loading...');
console.log('📄 Current URL:', window.location.href);

// Configuration for PoE Trade Site Integration
const POE_TRADE_CONFIG = {
    // Mapping from extension jewel types to trade site base item names
    JEWEL_MAPPINGS: {
        'murderous': 'Murderous Eye Jewel',
        'searching': 'Searching Eye Jewel', 
        'hypnotic': 'Hypnotic Eye Jewel',
        'ghastly': 'Ghastly Eye Jewel'
    },

    // Dynamic mod mappings will be loaded from mods data
    MOD_MAPPINGS: {},

    // Selectors for PoE trade site elements (based on ACTUAL HTML structure)
    SELECTORS: {
        // Base item type selection (Vue.js multiselect component)
        BASE_ITEM_SEARCH: [
            '.search-select input[type="text"]',
            '.search-bar .search-select input',
            'input[placeholder*="Search Items"]',
            '.search-left input',
            '.multiselect__input'
        ],

        // Stat filter section (right brown panel)
        STAT_FILTER_SECTION: [
            '.search-advanced-pane.brown',
            '.filter-group-body',
            '.search-advanced-items .brown'
        ],

        // Add stat filter input (multiselect with specific placeholder)
        ADD_STAT_INPUT: [
            'input[placeholder="+ Add Stat Filter"]',
            '.multiselect__input[placeholder*="Add Stat Filter"]',
            '.filter-select-mutate input[type="text"]'
        ],

        // Stat dropdown options (after typing in add stat filter)
        STAT_DROPDOWN_OPTIONS: [
            '.multiselect__option',
            'li.multiselect__element .multiselect__option',
            '.multiselect__content .multiselect__option'
        ],

        // Individual filter containers (after stat is added)
        FILTER_CONTAINERS: [
            '.filter-group-body .filter.full-span',
            '.filter.full-span',
            '.filter-group-body .filter'
        ],

        // Min/Max value inputs (based on actual HTML)
        MIN_VALUE_INPUT: [
            'input.form-control.minmax[placeholder="min"]',
            'input[placeholder="min"]',
            '.filter input[type="number"]:first-of-type'
        ],

        MAX_VALUE_INPUT: [
            'input.form-control.minmax[placeholder="max"]',
            'input[placeholder="max"]',
            '.filter input[type="number"]:last-of-type'
        ],

        // Remove filter buttons
        REMOVE_FILTER_BUTTON: [
            '.btn.remove-btn',
            'button.remove-btn'
        ],

        // Search button
        SEARCH_BUTTON: [
            '.btn.search-btn',
            'button.search-btn',
            '.controls-center button'
        ],

        // Clear button
        CLEAR_BUTTON: [
            '.btn.clear-btn',
            'button.clear-btn',
            '.controls-right button'
        ]
    }
};

// Global variable to store loaded mods data
let LOADED_MODS_DATA = null;

/**
 * Converts mod text from specific numeric ranges to generic format for trade site compatibility
 */
function genericizeModText(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    return text
        // Replace parenthetical ranges like (8-10) with #
        .replace(/\(\d+-\d+\)/g, '#')
        // Replace standalone numbers (not in parentheses) with #
        .replace(/(?<!\()\b\d+(?!-|\))/g, '#')
        // Clean up any remaining artifacts like extra spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Load mods data and create dynamic mod mappings
 */
async function loadModsData() {
    if (LOADED_MODS_DATA) {
        return LOADED_MODS_DATA; // Return cached data
    }
    
    try {
        console.log('📊 Loading mods data from GitHub...');
        
        // Fetch mods data from GitHub
        const response = await fetch('https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/abyss_jewel_mods.json');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch mods data: ${response.status}`);
        }
        
        const modsData = await response.json();
        console.log('✅ Mods data loaded successfully');
        
        // Cache the data
        LOADED_MODS_DATA = modsData;
        
        // Create dynamic mod mappings
        createDynamicModMappings(modsData);
        
        return modsData;
        
    } catch (error) {
        console.error('❌ Failed to load mods data:', error);
        
        // Fallback to basic mappings
        createFallbackMappings();
        
        return null;
    }
}

/**
 * Create dynamic mod mappings from loaded data
 */
function createDynamicModMappings(modsData) {
    console.log('🔄 Creating dynamic mod mappings...');
    
    const mappings = {};
    let mappingCount = 0;
    
    // Process all mod categories
    if (modsData && modsData['Abyss Jewels']) {
        const abyssJewels = modsData['Abyss Jewels'];
        
        // Iterate through all jewel type categories
        for (const [categoryKey, categoryData] of Object.entries(abyssJewels)) {
            if (categoryData && categoryData.mods) {
                const mods = categoryData.mods;
                
                // Process all mod types (prefix, suffix, corrupted)
                for (const [modType, modTypeData] of Object.entries(mods)) {
                    for (const [modGroup, modGroupData] of Object.entries(modTypeData)) {
                        for (const [modKey, modDetails] of Object.entries(modGroupData)) {
                            // Skip non-object entries
                            if (typeof modDetails !== 'object' || !modDetails) continue;
                            
                            // Get the text field and genericize it
                            const originalText = modDetails.text;
                            if (originalText) {
                                const genericText = genericizeModText(originalText);
                                mappings[modKey] = genericText;
                                mappingCount++;
                                
                                // Also map the mod group name for fuzzy matching
                                mappings[modGroup] = genericText;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Add fallback mappings for common searches
    const fallbackMappings = {
        'life': '+# to maximum Life',
        'mana': '+# to maximum Mana',
        'energy shield': '+# to maximum Energy Shield',
        'fire resistance': '+#% to Fire Resistance',
        'cold resistance': '+#% to Cold Resistance',
        'lightning resistance': '+#% to Lightning Resistance',
        'chaos resistance': '+#% to Chaos Resistance',
        'all resistances': '+#% to all Elemental Resistances',
        'attack speed': '#% increased Attack Speed',
        'cast speed': '#% increased Cast Speed',
        'movement speed': '#% increased Movement Speed',
        'critical multiplier': '+#% to Global Critical Strike Multiplier',
        'critical chance': '#% increased Global Critical Strike Chance',
        'phasing': '#% chance to gain Phasing for # seconds on Kill',
        'minion damage': 'Minions deal #% increased Damage',
        'minion life': 'Minions have #% increased maximum Life',
        'minion attack speed': 'Minions have #% increased Attack Speed'
    };
    
    // Add fallback mappings
    Object.assign(mappings, fallbackMappings);
    
    // Update the global config
    POE_TRADE_CONFIG.MOD_MAPPINGS = mappings;
    
    console.log(`✅ Created ${mappingCount} dynamic mod mappings + ${Object.keys(fallbackMappings).length} fallback mappings`);
    console.log('🔍 Sample mappings:', Object.entries(mappings).slice(0, 5));
}

/**
 * Create fallback mappings if data loading fails
 */
function createFallbackMappings() {
    console.log('⚠️ Creating fallback mod mappings...');
    
    const fallbackMappings = {
        // Basic life/mana/ES
        'life': '+# to maximum Life',
        'mana': '+# to maximum Mana',
        'energy shield': '+# to maximum Energy Shield',
        
        // Resistances
        'fire resistance': '+#% to Fire Resistance',
        'cold resistance': '+#% to Cold Resistance',
        'lightning resistance': '+#% to Lightning Resistance',
        'chaos resistance': '+#% to Chaos Resistance',
        'all resistances': '+#% to all Elemental Resistances',
        
        // Speed stats
        'attack speed': '#% increased Attack Speed',
        'cast speed': '#% increased Cast Speed',
        'movement speed': '#% increased Movement Speed',
        
        // Critical stats
        'critical multiplier': '+#% to Global Critical Strike Multiplier',
        'critical chance': '#% increased Global Critical Strike Chance',
        
        // Special mods
        'phasing': '#% chance to gain Phasing for # seconds on Kill',
        
        // Minion stats (for Ghastly Eye Jewels)
        'minion damage': 'Minions deal #% increased Damage',
        'minion life': 'Minions have #% increased maximum Life',
        'minion attack speed': 'Minions have #% increased Attack Speed',
        
        // Common attribute mods
        'strength': '+# to Strength',
        'dexterity': '+# to Dexterity',
        'intelligence': '+# to Intelligence',
        'all attributes': '+# to all Attributes'
    };
    
    POE_TRADE_CONFIG.MOD_MAPPINGS = fallbackMappings;
    console.log('✅ Fallback mappings created');
}

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

function initializeContentScript() {
    console.log('✅ Content script initialized on:', window.location.href);
    
    // Load mods data immediately
    loadModsData().then(() => {
        console.log('✅ Content script ready with dynamic mod mappings');
    }).catch(error => {
        console.error('❌ Failed to load mods data during initialization:', error);
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Content script received message:', message.action);
        
        if (message.action === 'ping') {
            // Respond to ping to indicate content script is ready
            console.log('🏓 Responding to ping - content script is ready');
            sendResponse({ success: true, ready: true });
            return;
        }
        
        if (message.action === 'autoFill') {
            console.log('🚀 Starting auto-fill process...');
            handleAutoFill(message.config)
                .then(result => {
                    console.log('✅ Auto-fill completed:', result);
                    sendResponse({ success: true, result });
                })
                .catch(error => {
                    console.error('❌ Auto-fill error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            
            return true; // Indicate async response
        }
        
        if (message.action === 'debugPage') {
            debugPageStructure();
            sendResponse({ success: true, message: 'Debug info logged to console' });
            return;
        }
        
        console.log('⚠️ Unknown action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    });
    
    console.log('🎯 Content script ready for auto-fill requests');
}

// Main auto-fill handler - Enhanced with better error handling and retry logic
async function handleAutoFill(config) {
    console.log('📝 Starting auto-fill with config:', config);
    
    try {
        // Ensure mods data is loaded
        await loadModsData();
        
        // Wait for page to stabilize
        await waitForPageReady();
        
        // Clear any existing search to start clean
        console.log('🔄 Clearing existing search...');
        await clearExistingSearch();
        
        // Step 1: Set the base item type (jewel)
        console.log('💎 Setting jewel type:', config.jewelType);
        await setBaseItemType(config.jewelType);
        
        // Step 2: Add mod filters if we have specific mods
        if (config.searchMode === 'with-mods' && config.selectedMods && config.selectedMods.length > 0) {
            console.log('🔍 Adding', config.selectedMods.length, 'mod filters...');
            await addModFilters(config.selectedMods);
        } else {
            console.log('📋 Searching for base jewel only (no specific mods)');
        }
        
        // Step 3: Optional auto-search (can be disabled if user prefers manual search)
        if (config.autoSearch !== false) {
            console.log('🔍 Executing search...');
            await executeSearch();
        }
        
        console.log('✅ Auto-fill completed successfully');
        return { 
            success: true, 
            message: `Successfully configured search for ${POE_TRADE_CONFIG.JEWEL_MAPPINGS[config.jewelType]} ${config.searchMode === 'with-mods' ? 'with ' + config.selectedMods.length + ' mods' : '(base only)'}` 
        };
        
    } catch (error) {
        console.error('❌ Auto-fill failed:', error);
        
        // Provide helpful error context
        const errorContext = await gatherErrorContext();
        throw new Error(`Auto-fill failed: ${error.message}\n\nContext: ${errorContext}`);
    }
}

// Wait for the page to be ready for interaction
async function waitForPageReady() {
    console.log('⏳ Waiting for page to be ready...');
    
    // Wait for basic page elements
    await waitForElement(['body', '.content', '.main'], 10000);
    
    // Wait a bit more for dynamic content to load
    await wait(1000);
    
    // Check if we're on the right page
    if (!window.location.href.includes('pathofexile.com/trade')) {
        throw new Error('Not on Path of Exile trade site');
    }
    
    console.log('✅ Page ready for interaction');
}

// Clear existing search to start fresh
async function clearExistingSearch() {
    const clearSelectors = [
        'button[title*="Clear"]',
        'button:contains("Clear")',
        '.clear-all-button',
        '[data-testid="clear-search"]',
        'button[data-action="clear"]'
    ];
    
    const clearButton = await findElementWithFallback(clearSelectors, 2000);
    if (clearButton) {
        console.log('🔄 Found clear button, clicking...');
        clearButton.click();
        await wait(500);
    } else {
        console.log('⚠️ No clear button found, continuing...');
    }
}

// Enhanced base item type setting for Vue.js multiselect
async function setBaseItemType(jewelType) {
    console.log('💎 Setting base item type:', jewelType);
    
    const displayName = POE_TRADE_CONFIG.JEWEL_MAPPINGS[jewelType];
    if (!displayName) {
        throw new Error(`Unknown jewel type: ${jewelType}`);
    }
    
    console.log('💎 Looking for Vue.js multiselect search field for:', displayName);
    
    // Strategy 1: Find the main search multiselect input
    const searchInput = await findElementWithFallback(POE_TRADE_CONFIG.SELECTORS.BASE_ITEM_SEARCH, 5000);
    
    if (!searchInput) {
        throw new Error('Could not find base item search field');
    }
    
    console.log('✅ Found base item search field:', searchInput.tagName, searchInput.placeholder || searchInput.className);
    
    // Vue.js multiselect interaction
    await interactWithVueMultiselect(searchInput, displayName);
    
    console.log('✅ Base item type set successfully:', displayName);
}

// Enhanced mod filter addition for Vue.js components
async function addSingleModFilter(mod, filterIndex) {
    console.log(`📝 Adding mod filter ${filterIndex}:`, mod.modName);
    
    // Step 1: Find the stat filter section
    const statFilterSection = await findElementWithFallback(POE_TRADE_CONFIG.SELECTORS.STAT_FILTER_SECTION, 5000);
    
    if (!statFilterSection) {
        throw new Error('Could not find stat filter section');
    }
    
    console.log('✅ Found stat filter section');
    
    // Step 2: Find the "Add Stat Filter" multiselect
    const addStatInput = await findElementWithFallback(POE_TRADE_CONFIG.SELECTORS.ADD_STAT_BUTTON, 3000);
    
    if (!addStatInput) {
        throw new Error('Could not find "Add Stat Filter" input');
    }
    
    console.log('✅ Found add stat filter input');
    
    // Step 3: Map mod name to trade site stat
    const tradeSiteStat = mapModToTradeStat(mod.modName);
    console.log('🔄 Mapped mod name:', mod.modName, '→', tradeSiteStat);
    
    // Step 4: Interact with Vue multiselect to add stat
    await interactWithVueMultiselect(addStatInput, tradeSiteStat);
    
    // Step 5: Wait for the new filter to be created
    await wait(1000);
    
    // Step 6: Find the newly created filter and set min/max values
    await setModValuesInNewFilter(mod, filterIndex);
    
    console.log('✅ Successfully added mod filter:', mod.modName);
}

// Interact with Vue.js multiselect component
async function interactWithVueMultiselect(input, searchText) {
    console.log('🔍 Interacting with Vue multiselect for:', searchText);
    
    // Focus and click the input to open dropdown
    input.focus();
    input.click();
    await wait(300);
    
    // Clear and type the search text
    input.value = '';
    await simulateTyping(input, searchText);
    
    // Wait for dropdown options to appear
    await wait(800);
    
    // Try to find and click the matching option
    const optionSelected = await selectVueMultiselectOption(searchText);
    
    if (!optionSelected) {
        console.log('⚠️ Could not select from dropdown, pressing Enter as fallback');
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await wait(300);
    }
}

// Select option from Vue multiselect dropdown
async function selectVueMultiselectOption(targetText) {
    console.log('🔍 Looking for Vue multiselect option:', targetText);
    
    const optionSelectors = POE_TRADE_CONFIG.SELECTORS.STAT_DROPDOWN_OPTIONS;
    
    for (const selector of optionSelectors) {
        const options = document.querySelectorAll(selector);
        
        for (const option of options) {
            const optionText = option.textContent.trim();
            
            // Check for exact match or partial match
            if (optionText.toLowerCase().includes(targetText.toLowerCase()) || 
                targetText.toLowerCase().includes(optionText.toLowerCase())) {
                
                console.log('✅ Found matching option:', optionText);
                option.click();
                await wait(500);
                return true;
            }
        }
    }
    
    console.log('⚠️ No matching option found in Vue multiselect');
    return false;
}

// Set values in newly created filter
async function setModValuesInNewFilter(mod, filterIndex) {
    console.log('📊 Setting values for newly created filter:', mod.modName);
    
    // Find all filter containers and get the most recent one
    const filterContainers = document.querySelectorAll(POE_TRADE_CONFIG.SELECTORS.FILTER_CONTAINERS.join(', '));
    
    if (filterContainers.length === 0) {
        throw new Error('No filter containers found');
    }
    
    // The newest filter should be near the end
    let targetFilter = null;
    
    // Look for a filter that might contain our newly added stat
    for (let i = filterContainers.length - 1; i >= 0; i--) {
        const container = filterContainers[i];
        const hasMinMaxInputs = container.querySelectorAll('input[type="number"]').length >= 1;
        
        if (hasMinMaxInputs) {
            targetFilter = container;
            break;
        }
    }
    
    if (!targetFilter) {
        console.log('⚠️ Could not find target filter with min/max inputs, trying first available');
        targetFilter = filterContainers[0];
    }
    
    console.log('🎯 Using filter container for values');
    
    // Find min and max inputs within this container
    const minInput = targetFilter.querySelector(POE_TRADE_CONFIG.SELECTORS.MIN_VALUE_INPUT.join(', '));
    const maxInput = targetFilter.querySelector(POE_TRADE_CONFIG.SELECTORS.MAX_VALUE_INPUT.join(', '));
    
    // Set minimum value
    if (minInput && mod.minValue !== undefined) {
        await clearAndFillInput(minInput, mod.minValue.toString());
        console.log('📊 Set min value:', mod.minValue);
    }
    
    // Set maximum value  
    if (maxInput && mod.maxValue !== undefined) {
        await clearAndFillInput(maxInput, mod.maxValue.toString());
        console.log('📊 Set max value:', mod.maxValue);
    }
    
    console.log('✅ Values set for filter');
}

// Enhanced mod filter addition with better error handling
async function addModFilters(selectedMods) {
    console.log('🔍 Adding', selectedMods.length, 'mod filters...');
    
    for (let i = 0; i < selectedMods.length; i++) {
        const mod = selectedMods[i];
        console.log(`📝 Adding mod ${i + 1}/${selectedMods.length}:`, mod.modName);
        
        try {
            await addSingleModFilter(mod, i);
            await wait(800); // Delay between mods for stability
        } catch (error) {
            console.error(`❌ Failed to add mod ${mod.modName}:`, error);
            // Continue with other mods instead of failing completely
            console.log('⚠️ Continuing with remaining mods...');
        }
    }
    
    console.log('✅ Finished processing mod filters');
}

// Enhanced single mod filter addition (based on actual HTML structure)
async function addSingleModFilter(mod, filterIndex) {
    console.log(`📝 Adding mod filter ${filterIndex}:`, mod.modName);
    
    // Step 1: Find the stat filter section
    const statFilterSection = await findElementWithFallback(POE_TRADE_CONFIG.SELECTORS.STAT_FILTER_SECTION, 5000);
    
    if (!statFilterSection) {
        throw new Error('Could not find stat filter section');
    }
    
    console.log('✅ Found stat filter section');
    
    // Step 2: Find the "Add Stat Filter" input
    const addStatInput = await findElementWithFallback(POE_TRADE_CONFIG.SELECTORS.ADD_STAT_INPUT, 3000);
    
    if (!addStatInput) {
        throw new Error('Could not find "Add Stat Filter" input');
    }
    
    console.log('✅ Found add stat filter input');
    
    // Step 3: Map mod name to trade site stat using dynamic mapping
    const tradeSiteStat = mapModToTradeStat(mod.modName);
    console.log('🔄 Mapped mod name:', mod.modName, '→', tradeSiteStat);
    
    // Step 4: Focus the input and start typing
    addStatInput.focus();
    await wait(200);
    
    // Step 5: Type the search text
    await simulateTyping(addStatInput, tradeSiteStat);
    
    // Step 6: Wait for dropdown options to appear and select
    await wait(800);
    const optionSelected = await selectFromVueDropdown(tradeSiteStat);
    
    if (!optionSelected) {
        console.log('⚠️ Could not select option, trying Enter key');
        addStatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await wait(500);
    }
    
    // Step 7: Wait for the new filter to be created
    await wait(1000);
    
    // Step 8: Find the newly created filter and set min/max values
    await setModValuesInLatestFilter(mod);
    
    console.log('✅ Successfully added mod filter:', mod.modName);
}

// Select option from Vue multiselect dropdown (based on actual HTML)
async function selectFromVueDropdown(targetText) {
    console.log('🔍 Looking for Vue dropdown option:', targetText);
    
    // Look for multiselect options based on actual HTML structure
    const options = document.querySelectorAll('.multiselect__option:not(.multiselect__option--disabled)');
    
    for (const option of options) {
        // Get the text content, accounting for the icon structure
        const spans = option.querySelectorAll('span');
        let optionText = '';
        
        // The actual mod text is usually in the last span
        if (spans.length > 0) {
            optionText = spans[spans.length - 1].textContent.trim();
        } else {
            optionText = option.textContent.trim();
        }
        
        console.log('🔍 Checking option:', optionText);
        
        // Check for match (case insensitive, partial match)
        if (optionText.toLowerCase().includes(targetText.toLowerCase()) || 
            targetText.toLowerCase().includes(optionText.toLowerCase())) {
            
            console.log('✅ Found matching option:', optionText);
            
            // Click the option
            option.click();
            await wait(500);
            return true;
        }
    }
    
    console.log('⚠️ No matching option found in dropdown');
    return false;
}

// Set values in the most recently created filter
async function setModValuesInLatestFilter(mod) {
    console.log('📊 Setting values for latest filter:', mod.modName);
    
    // Find all filter containers
    const filterContainers = document.querySelectorAll('.filter-group-body .filter.full-span');
    
    if (filterContainers.length === 0) {
        throw new Error('No filter containers found');
    }
    
    // Get the last (most recent) filter
    const latestFilter = filterContainers[filterContainers.length - 1];
    
    console.log('🎯 Using latest filter container');
    
    // Find min and max inputs within this container
    const minInput = latestFilter.querySelector('input[placeholder="min"]');
    const maxInput = latestFilter.querySelector('input[placeholder="max"]');
    
    // Set minimum value
    if (minInput && mod.minValue !== undefined) {
        await clearAndFillInput(minInput, mod.minValue.toString());
        console.log('📊 Set min value:', mod.minValue);
    }
    
    // Set maximum value  
    if (maxInput && mod.maxValue !== undefined) {
        await clearAndFillInput(maxInput, mod.maxValue.toString());
        console.log('📊 Set max value:', mod.maxValue);
    }
    
    if (!minInput && !maxInput) {
        console.log('⚠️ No min/max inputs found in latest filter');
    }
    
    console.log('✅ Values set for latest filter');
}

// Simulate realistic typing for Vue.js inputs
async function simulateTyping(input, text) {
    console.log('⌨️ Typing text:', text);
    
    // Clear first
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(100);
    
    // Type character by character
    for (let i = 0; i < text.length; i++) {
        input.value += text[i];
        
        // Trigger Vue input events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('keyup', { bubbles: true }));
        
        await wait(50); // Realistic typing speed
    }
    
    // Final events for Vue reactivity
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(200);
    
    console.log('✅ Finished typing:', text);
}

// Fill in the stat name for a mod
async function fillModStatName(filterRow, mod) {
    console.log('📝 Filling stat name for:', mod.modName);
    
    // Find stat input within the filter row
    const statInput = filterRow.querySelector(POE_TRADE_CONFIG.SELECTORS.STAT_INPUT.join(', '));
    
    if (!statInput) {
        throw new Error('Could not find stat input field in filter row');
    }
    
    // Map the extension mod name to trade site stat name
    const tradeSiteStat = mapModToTradeStat(mod.modName);
    console.log('🔄 Mapped mod name:', mod.modName, '→', tradeSiteStat);
    
    // Fill the stat input
    await clearAndFillInput(statInput, tradeSiteStat);
    
    // Wait for autocomplete/dropdown
    await wait(1000);
    
    // Try to select from autocomplete
    await selectFromAutocomplete(tradeSiteStat);
    
    console.log('✅ Stat name filled:', tradeSiteStat);
}

// Set min/max values for a mod
async function setModValues(filterRow, mod) {
    console.log('📊 Setting values for:', mod.modName, `${mod.minValue}-${mod.maxValue}`);
    
    // Find min and max inputs
    const minInput = filterRow.querySelector(POE_TRADE_CONFIG.SELECTORS.MIN_VALUE_INPUT.join(', '));
    const maxInput = filterRow.querySelector(POE_TRADE_CONFIG.SELECTORS.MAX_VALUE_INPUT.join(', '));
    
    // Set minimum value
    if (minInput && mod.minValue !== undefined) {
        await clearAndFillInput(minInput, mod.minValue.toString());
        console.log('📊 Set min value:', mod.minValue);
    }
    
    // Set maximum value
    if (maxInput && mod.maxValue !== undefined) {
        await clearAndFillInput(maxInput, mod.maxValue.toString());
        console.log('📊 Set max value:', mod.maxValue);
    }
    
    // If only one input found, use min value
    if (minInput && !maxInput && mod.minValue !== undefined) {
        console.log('📊 Only one value input found, using min value');
    }
    
    console.log('✅ Values set for:', mod.modName);
}

// Map extension mod names to trade site stat names using dynamic mappings
function mapModToTradeStat(modName) {
    // Ensure mods data is loaded
    if (!LOADED_MODS_DATA && Object.keys(POE_TRADE_CONFIG.MOD_MAPPINGS).length === 0) {
        console.log('⚠️ Mods data not loaded, using fallback mapping for:', modName);
        createFallbackMappings();
    }
    
    // Direct mapping first (try exact mod key)
    if (POE_TRADE_CONFIG.MOD_MAPPINGS[modName]) {
        console.log('✅ Found direct mapping for:', modName);
        return POE_TRADE_CONFIG.MOD_MAPPINGS[modName];
    }
    
    // Fuzzy matching for common terms
    const lowerModName = modName.toLowerCase();
    
    for (const [key, value] of Object.entries(POE_TRADE_CONFIG.MOD_MAPPINGS)) {
        if (lowerModName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerModName)) {
            console.log('✅ Found fuzzy mapping for:', modName, '→', key);
            return value;
        }
    }
    
    // If we have loaded mods data, try to find it there
    if (LOADED_MODS_DATA) {
        const dynamicMapping = findModInLoadedData(modName);
        if (dynamicMapping) {
            console.log('✅ Found dynamic mapping for:', modName);
            // Cache it for future use
            POE_TRADE_CONFIG.MOD_MAPPINGS[modName] = dynamicMapping;
            return dynamicMapping;
        }
    }
    
    // If no mapping found, return the original name and hope for the best
    console.log('⚠️ No stat mapping found for:', modName, 'using original name');
    return modName;
}

// Search for mod in loaded data and return genericized text
function findModInLoadedData(modName) {
    if (!LOADED_MODS_DATA || !LOADED_MODS_DATA['Abyss Jewels']) {
        return null;
    }
    
    const abyssJewels = LOADED_MODS_DATA['Abyss Jewels'];
    
    // Search through all categories and mod types
    for (const [categoryKey, categoryData] of Object.entries(abyssJewels)) {
        if (categoryData && categoryData.mods) {
            const mods = categoryData.mods;
            
            for (const [modType, modTypeData] of Object.entries(mods)) {
                for (const [modGroup, modGroupData] of Object.entries(modTypeData)) {
                    for (const [modKey, modDetails] of Object.entries(modGroupData)) {
                        // Check if this is the mod we're looking for
                        if (modKey === modName || modGroup === modName) {
                            if (modDetails && modDetails.text) {
                                return genericizeModText(modDetails.text);
                            }
                        }
                        
                        // Also check partial matches in mod names
                        if (typeof modDetails === 'object' && modDetails && modDetails.text) {
                            const lowerModName = modName.toLowerCase();
                            const lowerModKey = modKey.toLowerCase();
                            const lowerModGroup = modGroup.toLowerCase();
                            
                            if (lowerModKey.includes(lowerModName) || 
                                lowerModGroup.includes(lowerModName) ||
                                lowerModName.includes(lowerModKey) ||
                                lowerModName.includes(lowerModGroup)) {
                                return genericizeModText(modDetails.text);
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
}

// Expand stat filter section if it's collapsed
async function expandStatFilterSection() {
    console.log('🔍 Looking for stat filter expand button...');
    
    const expandSelectors = [
        'button[data-filter-name="stat_filters"]',
        '.filter-group-header button',
        'button:contains("Stat Filters")',
        '.stat-filters .expand-button',
        '[data-testid="expand-stat-filters"]'
    ];
    
    const expandButton = await findElementWithFallback(expandSelectors, 2000);
    
    if (expandButton) {
        console.log('✅ Found expand button, clicking...');
        expandButton.click();
        await wait(500);
    }
}

// Execute the search (optional)
async function executeSearch() {
    console.log('🔍 Looking for search button...');
    
    const searchSelectors = [
        'button[type="submit"]',
        'button:contains("Search")',
        '.search-button',
        '[data-testid="search-submit"]',
        '.form-submit button'
    ];
    
    const searchButton = await findElementWithFallback(searchSelectors, 3000);
    
    if (searchButton) {
        console.log('✅ Found search button, executing search...');
        searchButton.click();
        await wait(1000);
    } else {
        console.log('⚠️ Search button not found, user will need to search manually');
    }
}

// Enhanced helper: Clear and fill input with realistic typing
async function clearAndFillInput(input, value) {
    console.log('✏️ Filling input with:', value);
    
    // Focus the input
    input.focus();
    await wait(100);
    
    // Clear existing value
    input.select();
    input.value = '';
    
    // Trigger input event to clear
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(100);
    
    // Type the value (simulate realistic typing)
    for (let i = 0; i < value.length; i++) {
        input.value += value[i];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(50); // Short delay between characters
    }
    
    // Final events
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    
    console.log('✅ Input filled successfully');
}

// Try to select from autocomplete dropdown
async function selectFromAutocomplete(targetText) {
    console.log('🔍 Looking for autocomplete options for:', targetText);
    
    await wait(500); // Wait for dropdown to appear
    
    const dropdownSelectors = [
        '.autocomplete-option',
        '.suggestion',
        '.dropdown-item',
        '.option',
        '[role="option"]',
        '.search-suggestion'
    ];
    
    for (const selector of dropdownSelectors) {
        const options = document.querySelectorAll(selector);
        
        for (const option of options) {
            const optionText = option.textContent.trim();
            
            if (optionText.toLowerCase().includes(targetText.toLowerCase()) || 
                targetText.toLowerCase().includes(optionText.toLowerCase())) {
                
                console.log('✅ Found matching autocomplete option:', optionText);
                option.click();
                await wait(300);
                return true;
            }
        }
    }
    
    console.log('⚠️ No matching autocomplete option found');
    return false;
}

// Enhanced element finder with multiple strategies and timeout
async function findElementWithFallback(selectors, timeout = 5000) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    // Try immediate selection first
    for (const selector of selectorArray) {
        try {
            // Handle :contains selectors manually
            if (selector.includes(':contains')) {
                const element = findElementByText(selector);
                if (element) return element;
            } else {
                const element = document.querySelector(selector);
                if (element) return element;
            }
        } catch (e) {
            console.log('⚠️ Invalid selector:', selector);
        }
    }
    
    // If not found immediately, wait and retry
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const interval = setInterval(() => {
            for (const selector of selectorArray) {
                try {
                    let element;
                    
                    if (selector.includes(':contains')) {
                        element = findElementByText(selector);
                    } else {
                        element = document.querySelector(selector);
                    }
                    
                    if (element) {
                        clearInterval(interval);
                        resolve(element);
                        return;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            // Timeout check
            if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                resolve(null);
            }
        }, 100);
    });
}

// Helper to find elements by text content (for :contains selectors)
function findElementByText(selector) {
    const match = selector.match(/(.+):contains\("(.+)"\)/);
    if (!match) return null;
    
    const [, elementType, text] = match;
    const elements = document.querySelectorAll(elementType);
    
    return Array.from(elements).find(el => 
        el.textContent.toLowerCase().includes(text.toLowerCase())
    );
}

// Wait for specific element to appear
async function waitForElement(selectors, timeout = 5000) {
    const element = await findElementWithFallback(selectors, timeout);
    if (!element) {
        throw new Error(`Element not found: ${selectors.join(', ')}`);
    }
    return element;
}

// Gather error context for debugging
async function gatherErrorContext() {
    const context = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        modsDataLoaded: !!LOADED_MODS_DATA,
        mappingsCount: Object.keys(POE_TRADE_CONFIG.MOD_MAPPINGS).length
    };
    
    // Check for common elements
    const checks = {
        hasSearchInput: !!document.querySelector('input[type="text"]'),
        hasButtons: document.querySelectorAll('button').length,
        hasSelects: document.querySelectorAll('select').length,
        hasForms: document.querySelectorAll('form').length
    };
    
    return JSON.stringify({...context, ...checks}, null, 2);
}

// Debug function to inspect page structure
function debugPageStructure() {
    console.log('🔍 PoE Trade Site Structure Debug:');
    console.log('- URL:', window.location.href);
    console.log('- Title:', document.title);
    console.log('- Mods Data Loaded:', !!LOADED_MODS_DATA);
    console.log('- Dynamic Mappings Count:', Object.keys(POE_TRADE_CONFIG.MOD_MAPPINGS).length);
    
    // Show sample mappings
    console.log('\n📊 Sample Dynamic Mappings:');
    const sampleMappings = Object.entries(POE_TRADE_CONFIG.MOD_MAPPINGS).slice(0, 10);
    sampleMappings.forEach(([key, value], i) => {
        console.log(`${i+1}. ${key} → ${value}`);
    });
    
    // Look for main search elements
    console.log('\n🔍 Search Elements:');
    POE_TRADE_CONFIG.SELECTORS.BASE_ITEM_SEARCH.forEach((selector, i) => {
        const element = document.querySelector(selector);
        console.log(`${i+1}. ${selector}: ${element ? '✅ FOUND' : '❌ Not found'}`);
    });
    
    // Look for stat filter elements  
    console.log('\n🔍 Stat Filter Elements:');
    POE_TRADE_CONFIG.SELECTORS.STAT_FILTER_SECTION.forEach((selector, i) => {
        const element = document.querySelector(selector);
        console.log(`${i+1}. ${selector}: ${element ? '✅ FOUND' : '❌ Not found'}`);
    });
    
    // General form analysis
    console.log('\n📊 General Form Analysis:');
    const forms = document.querySelectorAll('form');
    const inputs = document.querySelectorAll('input');
    const buttons = document.querySelectorAll('button');
    const selects = document.querySelectorAll('select');
    
    console.log(`- Forms: ${forms.length}`);
    console.log(`- Inputs: ${inputs.length}`);
    console.log(`- Buttons: ${buttons.length}`);
    console.log(`- Selects: ${selects.length}`);
    
    // Show first few inputs with details
    console.log('\n📝 Sample Inputs:');
    for (let i = 0; i < Math.min(5, inputs.length); i++) {
        const input = inputs[i];
        console.log(`${i+1}.`, {
            type: input.type,
            placeholder: input.placeholder || 'none',
            id: input.id || 'none', 
            name: input.name || 'none',
            className: input.className.slice(0, 30) || 'none'
        });
    }
    
    // Show buttons
    console.log('\n🔘 Sample Buttons:');
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const btn = buttons[i];
        console.log(`${i+1}.`, {
            text: btn.textContent.trim().slice(0, 20),
            type: btn.type || 'none',
            className: btn.className.slice(0, 30) || 'none'
        });
    }
}

// Helper function to wait
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make debug function and data available globally for testing
window.debugPageStructure = debugPageStructure;
window.POE_TRADE_CONFIG = POE_TRADE_CONFIG;
window.loadModsData = loadModsData;
window.genericizeModText = genericizeModText;

console.log('✅ Enhanced PoE Easy Search content script loaded successfully with dynamic mod mappings');
console.log('🔍 Call debugPageStructure() in console to inspect page structure');
console.log('📋 Configuration loaded:', Object.keys(POE_TRADE_CONFIG));
console.log('🚀 Dynamic mod mapping system initialized');