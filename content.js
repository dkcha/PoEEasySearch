// PoE Easy Search - Content Script for pathofexile.com/trade
console.log('🎯 PoE Easy Search content script loading...');
console.log('📄 Current URL:', window.location.href);

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

function initializeContentScript() {
    console.log('✅ Content script initialized on:', window.location.href);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Content script received message:', message.action);
        
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
            
            // Return true to indicate async response
            return true;
        }
        
        console.log('⚠️ Unknown action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    });
    
    console.log('🎯 Content script ready for auto-fill requests');
}

// Main auto-fill handler
async function handleAutoFill(config) {
    console.log('📝 Starting auto-fill with config:', config);
    
    try {
        // Add a small delay to ensure page is ready
        await wait(500);
        
        // Reset the form first (optional)
        console.log('🔄 Resetting form...');
        await resetTradeForm();
        
        // Set the base item type (jewel)
        console.log('💎 Setting jewel type...');
        await setBaseItemType(config.jewelType);
        
        // If we have specific mods to search for, add them
        if (config.searchMode === 'with-mods' && config.selectedMods.length > 0) {
            console.log('🔍 Adding mod filters...');
            await addModFilters(config.selectedMods);
        }
        
        console.log('✅ Auto-fill completed successfully');
        return { 
            success: true, 
            message: `Auto-filled ${config.jewelType} ${config.searchMode === 'with-mods' ? 'with ' + config.selectedMods.length + ' mods' : 'base only'}` 
        };
        
    } catch (error) {
        console.error('❌ Auto-fill failed:', error);
        throw error;
    }
}

// Reset the trade form
async function resetTradeForm() {
    console.log('🔄 Looking for reset/clear buttons...');
    
    // Look for various reset button selectors
    const resetSelectors = [
        '[data-testid="clear-all-filters"]',
        'button[title*="Clear"]',
        'button[title*="Reset"]',
        '.clear-all',
        '.reset-filters',
        'button:contains("Clear")',
        'button:contains("Reset")'
    ];
    
    for (const selector of resetSelectors) {
        const resetButton = document.querySelector(selector);
        if (resetButton) {
            console.log('✅ Found reset button:', selector);
            resetButton.click();
            await wait(300);
            return;
        }
    }
    
    console.log('⚠️ No reset button found - continuing without reset');
}

// Set the base item type (Abyss Jewel)
async function setBaseItemType(jewelType) {
    console.log('💎 Setting base item type:', jewelType);
    
    const jewelDisplayNames = {
        'murderous-eye': 'Murderous Eye Jewel',
        'searching-eye': 'Searching Eye Jewel', 
        'hypnotic-eye': 'Hypnotic Eye Jewel',
        'ghastly-eye': 'Ghastly Eye Jewel'
    };
    
    const displayName = jewelDisplayNames[jewelType];
    if (!displayName) {
        throw new Error(`Unknown jewel type: ${jewelType}`);
    }
    
    console.log('💎 Looking for item type field for:', displayName);
    
    // Try different selectors for the type dropdown/input
    const typeSelectors = [
        'select[data-testid="item-type-select"]',
        'input[placeholder*="Type"]',
        'input[placeholder*="Base"]',
        '.filter-group select:first-child',
        'select.form-control:first-child',
        '#type',
        '[name="type"]',
        '.search-advanced-items select:first-child'
    ];
    
    let typeField = null;
    for (const selector of typeSelectors) {
        typeField = document.querySelector(selector);
        if (typeField) {
            console.log('✅ Found type field:', selector, typeField.tagName);
            break;
        }
    }
    
    if (!typeField) {
        // Try to find any input/select that might be for item type
        const allInputs = document.querySelectorAll('input[type="text"], select');
        console.log('🔍 Found', allInputs.length, 'input/select fields, trying first few...');
        
        for (let i = 0; i < Math.min(3, allInputs.length); i++) {
            const field = allInputs[i];
            const placeholder = field.placeholder || '';
            const id = field.id || '';
            const className = field.className || '';
            
            console.log(`Field ${i}:`, { 
                tag: field.tagName, 
                placeholder, 
                id, 
                className: className.slice(0, 50) 
            });
            
            // If it looks like it might be a type field, try it
            if (placeholder.toLowerCase().includes('type') || 
                placeholder.toLowerCase().includes('base') ||
                id.toLowerCase().includes('type') ||
                className.toLowerCase().includes('type')) {
                typeField = field;
                console.log('🎯 Trying field as type field:', field);
                break;
            }
        }
    }
    
    if (!typeField) {
        throw new Error('Could not find item type field on the page');
    }
    
    // Fill the field based on its type
    if (typeField.tagName === 'SELECT') {
        await selectFromDropdown(typeField, displayName);
    } else {
        await fillInputField(typeField, displayName);
    }
    
    console.log('✅ Set jewel type to:', displayName);
}

// Add mod filters to the search
async function addModFilters(selectedMods) {
    console.log('🔍 Adding', selectedMods.length, 'mod filters...');
    
    for (let i = 0; i < selectedMods.length; i++) {
        const mod = selectedMods[i];
        console.log(`📝 Adding mod ${i + 1}/${selectedMods.length}:`, mod.modName);
        
        try {
            await addSingleModFilter(mod, i);
            await wait(500); // Delay between mods
        } catch (error) {
            console.error(`❌ Failed to add mod ${mod.modName}:`, error);
            // Continue with other mods
        }
    }
    
    console.log('✅ Finished adding mod filters');
}

// Add a single mod filter
async function addSingleModFilter(mod, filterIndex) {
    console.log(`📝 Adding mod filter:`, mod.modName);
    
    // Look for "Add Stat Filter" or similar button
    const addStatSelectors = [
        'button[data-testid="add-stat-filter"]',
        'button:contains("Add Stat")',
        'button:contains("Add Filter")',
        '.add-stat-filter',
        '.add-filter',
        'button[title*="Add"]'
    ];
    
    let addStatButton = null;
    for (const selector of addStatSelectors) {
        // For :contains selectors, we need to find manually
        if (selector.includes(':contains')) {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (selector.includes('Add Stat') && text.includes('add') && text.includes('stat')) {
                    addStatButton = btn;
                    break;
                } else if (selector.includes('Add Filter') && text.includes('add') && text.includes('filter')) {
                    addStatButton = btn;
                    break;
                }
            }
        } else {
            addStatButton = document.querySelector(selector);
        }
        
        if (addStatButton) {
            console.log('✅ Found add stat button:', selector);
            break;
        }
    }
    
    if (!addStatButton) {
        console.log('⚠️ Could not find "Add Stat Filter" button, trying alternative approach...');
        // Maybe the form already has empty stat filters we can use
        const existingFilters = document.querySelectorAll('.stat-filter, .filter-group, .form-group');
        console.log('🔍 Found', existingFilters.length, 'existing filter containers');
        
        if (existingFilters.length === 0) {
            throw new Error('Could not find stat filter interface');
        }
        
        // Use the last existing filter or create approach
        // This is a fallback - might need adjustment based on actual site structure
    } else {
        // Click to add new stat filter
        addStatButton.click();
        await wait(500);
    }
    
    // Find the newly created or available filter container
    const filterContainers = document.querySelectorAll('.stat-filter, .filter-group, .form-group');
    let targetFilter = filterContainers[filterContainers.length - 1];
    
    if (!targetFilter && filterContainers.length > 0) {
        targetFilter = filterContainers[0]; // Use first available
    }
    
    if (!targetFilter) {
        throw new Error('Could not find stat filter container');
    }
    
    console.log('🎯 Using filter container:', targetFilter.className);
    
    // Find the stat selection field within this filter
    const statField = targetFilter.querySelector('select, input[type="text"], input[placeholder*="stat"]');
    
    if (!statField) {
        throw new Error('Could not find stat selection field');
    }
    
    // Set the stat name
    if (statField.tagName === 'SELECT') {
        await selectFromDropdown(statField, mod.modName);
    } else {
        await fillInputField(statField, mod.modName);
    }
    
    await wait(300);
    
    // Set min/max values
    await setStatValues(targetFilter, mod);
    
    console.log('✅ Added mod filter:', mod.modName);
}

// Set the min/max values for a stat filter
async function setStatValues(filterContainer, mod) {
    console.log('📊 Setting stat values for:', mod.modName, `${mod.minValue}-${mod.maxValue}`);
    
    // Look for min/max input fields within the filter container
    const numberInputs = filterContainer.querySelectorAll('input[type="number"]');
    const textInputs = filterContainer.querySelectorAll('input[type="text"]');
    
    // Combine and filter for likely min/max fields
    const allInputs = [...numberInputs, ...textInputs];
    const valueInputs = allInputs.filter(input => {
        const placeholder = (input.placeholder || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const className = (input.className || '').toLowerCase();
        
        return placeholder.includes('min') || placeholder.includes('max') || 
               placeholder.includes('value') || placeholder.includes('from') || 
               placeholder.includes('to') || id.includes('min') || id.includes('max') ||
               className.includes('min') || className.includes('max');
    });
    
    console.log('🔍 Found', valueInputs.length, 'potential value inputs');
    
    // If we found exactly 2 inputs, assume first is min, second is max
    if (valueInputs.length >= 2) {
        const minInput = valueInputs[0];
        const maxInput = valueInputs[1];
        
        console.log('📊 Setting min value:', mod.minValue);
        await fillInputField(minInput, mod.minValue.toString());
        
        console.log('📊 Setting max value:', mod.maxValue);
        await fillInputField(maxInput, mod.maxValue.toString());
        
    } else if (valueInputs.length === 1) {
        // If only one input, set it to the min value
        console.log('📊 Setting single value:', mod.minValue);
        await fillInputField(valueInputs[0], mod.minValue.toString());
        
    } else {
        console.log('⚠️ Could not find min/max value inputs for:', mod.modName);
        // Try to find any number inputs in the container as fallback
        const anyNumberInputs = filterContainer.querySelectorAll('input');
        if (anyNumberInputs.length > 0) {
            console.log('🔄 Trying fallback: setting first input to min value');
            await fillInputField(anyNumberInputs[0], mod.minValue.toString());
        }
    }
    
    console.log('✅ Stat values set for:', mod.modName);
}

// Helper function to select from dropdown
async function selectFromDropdown(selectElement, optionText) {
    console.log('📋 Selecting from dropdown:', optionText);
    
    if (!selectElement.options) {
        console.log('⚠️ Element is not a select dropdown');
        return false;
    }
    
    // Try to find exact match first
    const options = Array.from(selectElement.options);
    let targetOption = options.find(option => 
        option.text.toLowerCase() === optionText.toLowerCase() ||
        option.value.toLowerCase() === optionText.toLowerCase()
    );
    
    // If no exact match, try partial match
    if (!targetOption) {
        targetOption = options.find(option =>
            option.text.toLowerCase().includes(optionText.toLowerCase()) ||
            optionText.toLowerCase().includes(option.text.toLowerCase())
        );
    }
    
    if (targetOption) {
        selectElement.value = targetOption.value;
        
        // Trigger events to notify the page
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        selectElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('✅ Selected option:', targetOption.text);
        await wait(200);
        return true;
    }
    
    console.log('⚠️ Could not find option:', optionText);
    return false;
}

// Helper function to fill input field
async function fillInputField(inputElement, value) {
    console.log('✏️ Filling input field with:', value);
    
    // Clear existing value
    inputElement.value = '';
    inputElement.focus();
    
    // Set the value
    inputElement.value = value;
    
    // Trigger input events to notify the page
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    // For some sites, we need to simulate typing
    const inputEvent = new Event('input', { 
        bubbles: true, 
        cancelable: true, 
        inputType: 'insertText', 
        data: value 
    });
    inputElement.dispatchEvent(inputEvent);
    
    inputElement.blur();
    await wait(200);
    
    console.log('✅ Input filled with:', value);
}

// Helper function to wait
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced element finder with multiple strategies
function findElement(selectors, timeout = 5000) {
    return new Promise((resolve, reject) => {
        let element = null;
        
        // Try each selector
        for (const selector of selectors) {
            try {
                element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
            } catch (e) {
                console.log('⚠️ Invalid selector:', selector, e.message);
            }
        }
        
        // If not found immediately, wait and retry
        const startTime = Date.now();
        const interval = setInterval(() => {
            for (const selector of selectors) {
                try {
                    element = document.querySelector(selector);
                    if (element) {
                        clearInterval(interval);
                        resolve(element);
                        return;
                    }
                } catch (e) {
                    // Skip invalid selectors
                }
            }
            
            // Timeout check
            if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error(`Element not found after ${timeout}ms: ${selectors.join(', ')}`));
            }
        }, 100);
    });
}

// Debug function to inspect page structure
function debugPageStructure() {
    console.log('🔍 Page Structure Debug:');
    console.log('- URL:', window.location.href);
    console.log('- Title:', document.title);
    
    // Find all form elements
    const forms = document.querySelectorAll('form');
    console.log('- Forms found:', forms.length);
    
    const inputs = document.querySelectorAll('input');
    console.log('- Inputs found:', inputs.length);
    
    const selects = document.querySelectorAll('select');
    console.log('- Selects found:', selects.length);
    
    const buttons = document.querySelectorAll('button');
    console.log('- Buttons found:', buttons.length);
    
    // Log first few inputs with their attributes
    for (let i = 0; i < Math.min(5, inputs.length); i++) {
        const input = inputs[i];
        console.log(`Input ${i}:`, {
            type: input.type,
            placeholder: input.placeholder,
            id: input.id,
            className: input.className.slice(0, 30)
        });
    }
    
    // Log first few selects
    for (let i = 0; i < Math.min(3, selects.length); i++) {
        const select = selects[i];
        console.log(`Select ${i}:`, {
            id: select.id,
            className: select.className.slice(0, 30),
            options: select.options.length
        });
    }
}

// Make debug function available globally
window.debugPageStructure = debugPageStructure;

console.log('✅ PoE Easy Search content script loaded successfully');
console.log('🔍 Call debugPageStructure() in console to inspect page structure');