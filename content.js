// PoE Easy Search - Content Script (Ultra-Speed Data-Driven v10.0 - Instant Auto-fill)
console.log("🎯 PoE Easy Search content script loading...");

// Ultra-speed timing (reduced delays for instant operation)
const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms * 0.1 + Math.random() * 10));

// === GLOBAL STATE - SIMPLIFIED ===
let allAbyssModsData = null;
let modMappings = {};

// === DATA LOADING - SIMPLIFIED ===
async function loadModsData() {
  if (allAbyssModsData) return true;

  try {
    console.log("📂 Loading complete abyss jewel dataset...");
    const response = await fetch(CONFIG.GITHUB_URLS.ALL_ABYSS_MODS);

    if (!response.ok) {
      throw new Error("Failed to load complete abyss jewel dataset");
    }

    allAbyssModsData = await response.json();
    createSimpleModMappings();
    console.log("✅ Complete mod dataset loaded successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to load mod data:", error);
    createFallbackMappings();
    return false;
  }
}

function createSimpleModMappings() {
  if (!allAbyssModsData) return;

  modMappings = {};
  let mappingCount = 0;

  // Create simple mappings from the complete dataset
  Object.entries(allAbyssModsData).forEach(([modId, modData]) => {
    if (!modData.text) return;

    const genericizedText = genericizeModText(modData.text);
    modMappings[genericizedText.toLowerCase()] = {
      modId: modId,
      originalText: modData.text,
      searchText: genericizedText,
      stats: modData.stats,
      required_level: modData.required_level,
    };
    mappingCount++;

    // Also map by the raw text
    modMappings[modData.text.toLowerCase()] = {
      modId: modId,
      originalText: modData.text,
      searchText: genericizedText,
      stats: modData.stats,
      required_level: modData.required_level,
    };
    mappingCount++;
  });

  console.log(
    `✅ Created ${mappingCount} simple mod mappings from complete dataset`
  );
}

// === UTILITY FUNCTIONS - SIMPLIFIED ===
function genericizeModText(modText) {
  if (!modText) return "";

  return modText
    .replace(/\(\d+-\d+\)/g, "#") // Replace (12-15) with #
    .replace(/\b\d+\b/g, "#") // Replace standalone numbers
    .replace(/\+#/g, "+#") // Normalize + signs
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function findModMapping(searchTerm) {
  if (!modMappings) return null;

  const lowerSearchTerm = searchTerm.toLowerCase();

  // Direct match
  if (modMappings[lowerSearchTerm]) {
    return modMappings[lowerSearchTerm].searchText;
  }

  // Try genericized version
  const genericizedSearchTerm = genericizeModText(searchTerm);
  if (modMappings[genericizedSearchTerm.toLowerCase()]) {
    return genericizedSearchTerm;
  }

  // Fuzzy matching for partial matches
  for (const [pattern, modData] of Object.entries(modMappings)) {
    if (
      pattern.includes(lowerSearchTerm) ||
      lowerSearchTerm.includes(pattern)
    ) {
      console.log(
        `✅ Fuzzy match found: "${searchTerm}" → "${modData.searchText}"`
      );
      return modData.searchText;
    }
  }

  return null;
}

function createFallbackMappings() {
  modMappings = {
    "added life": "+# to maximum Life",
    life: "+# to maximum Life",
    "+# to maximum life": "+# to maximum Life",
    "added mana": "+# to maximum Mana",
    mana: "+# to maximum Mana",
    "added energy shield": "+# to maximum Energy Shield",
    "energy shield": "+# to maximum Energy Shield",
    "fire resistance": "+#% to Fire Resistance",
    "cold resistance": "+#% to Cold Resistance",
    "lightning resistance": "+#% to Lightning Resistance",
    "chaos resistance": "+#% to Chaos Resistance",
  };
  console.log("✅ Fallback mappings created");
}

function mapModToTradeStat(modName, mod) {
  // Use the exact text from the complete dataset when available
  if (mod && mod.searchText) {
    console.log(`✅ Using exact mod text from dataset: ${mod.searchText}`);
    return mod.searchText;
  }

  // Fallback to mapping lookup
  const mapping = findModMapping(modName);
  return mapping || modName;
}

// === INSTANT VALUE SETTING FUNCTIONS ===
function setInputValueInstantly(input, value) {
  if (!input || input.disabled) return false;

  // Store original value for comparison
  const originalValue = input.value;

  // Method 1: Direct value assignment
  input.value = value;

  // Method 2: Use native property descriptor (for React/Vue)
  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(input, value);
  } catch (e) {
    console.warn("Native setter failed, using standard assignment");
  }

  // Method 3: Trigger Vue/React reactivity with comprehensive events
  const events = [
    new Event("input", { bubbles: true, cancelable: true }),
    new Event("change", { bubbles: true, cancelable: true }),
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: value,
    }),
    new Event("blur", { bubbles: true }),
  ];

  events.forEach((event) => input.dispatchEvent(event));

  // Verify the value was set
  return input.value === value;
}

function selectDropdownOptionInstantly(targetText, optionSelectors = []) {
  const defaultSelectors = [
    ".multiselect__option:not(.multiselect__option--disabled)",
    ".dropdown-option",
    "[role='option']",
    ".option",
  ];

  const selectors =
    optionSelectors.length > 0 ? optionSelectors : defaultSelectors;

  for (const selector of selectors) {
    const options = document.querySelectorAll(selector);

    for (const option of options) {
      const optionText = option.textContent.trim().toLowerCase();
      const searchText = targetText.toLowerCase();

      if (
        optionText === searchText ||
        optionText.includes(searchText) ||
        searchText.includes(optionText)
      ) {
        console.log(
          `✅ Instantly selecting option: "${option.textContent.trim()}"`
        );

        // Trigger click without delays
        option.scrollIntoView({ block: "nearest" });
        option.click();

        // Dispatch additional events if needed
        option.dispatchEvent(new Event("mousedown", { bubbles: true }));
        option.dispatchEvent(new Event("mouseup", { bubbles: true }));

        return true;
      }
    }
  }

  return false;
}

// === MAIN AUTO-FILL HANDLER ===
async function handleAutoFill(config) {
  console.log("🔍 Starting instant auto-fill with config:", config);

  try {
    await loadModsData();
    await waitForPageReady();
    await clearExistingSearch();
    await setBaseItemTypeInstantly(config.jewelType);

    if (config.searchMode === "with-mods" && config.selectedMods?.length > 0) {
      console.log(
        "🔧 Adding",
        config.selectedMods.length,
        "mod filters instantly..."
      );
      await addModFiltersInstantly(config.selectedMods);
    }

    console.log("✅ Form configured instantly. Ready for search.");
    return {
      success: true,
      message: `Successfully configured search for ${
        CONFIG.JEWEL_MAPPINGS[config.jewelType]
      }`,
    };
  } catch (error) {
    console.error("❌ Instant auto-fill failed:", error);
    throw new Error(`Auto-fill failed: ${error.message}`);
  }
}

// === INSTANT BASE ITEM SELECTION ===
async function setBaseItemTypeInstantly(jewelType) {
  const displayName = CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) throw new Error(`Unknown jewel type: ${jewelType}`);

  const searchInput = await findElementWithFallback(
    CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );
  if (!searchInput) throw new Error("Could not find base item search field");

  console.log("⚡ Setting base item instantly:", displayName);

  // Focus the input
  searchInput.focus();
  searchInput.click();

  // Set value instantly
  const valueSet = setInputValueInstantly(searchInput, displayName);

  if (!valueSet) {
    throw new Error("Failed to set base item value");
  }

  // Short wait for dropdown to appear
  await wait(100);

  // Select from dropdown instantly
  const optionSelected = selectDropdownOptionInstantly(displayName);

  if (!optionSelected) {
    // Fallback: trigger Enter key
    searchInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  }

  // Brief verification wait
  await wait(50);
  console.log("✅ Base item type set instantly:", displayName);
}

// === INSTANT MOD FILTER ADDITION ===
async function addModFiltersInstantly(selectedMods) {
  for (let i = 0; i < selectedMods.length; i++) {
    const mod = selectedMods[i];
    console.log(
      `🔧 Adding mod ${i + 1}/${selectedMods.length} instantly:`,
      mod.modName
    );

    try {
      await addSingleModFilterInstantly(mod, i);
      await wait(50); // Minimal wait between mods
    } catch (error) {
      console.error(`❌ Failed to add mod ${mod.modName}:`, error);
    }
  }
}

async function addSingleModFilterInstantly(mod, filterIndex) {
  console.log(
    `🔥 Creating stat filter ${filterIndex + 1} instantly for: ${mod.modName}`
  );

  // Find the "Add Stat Filter" button
  let addStatButton = null;
  const statFiltersPanel = document.querySelector(
    ".search-advanced-pane.brown"
  );

  if (statFiltersPanel) {
    addStatButton = statFiltersPanel.querySelector(
      '[class*="add-stat"], button[class*="stat"][class*="add"], .multiselect__input[placeholder*="Add Stat Filter"], input[placeholder*="Add Stat Filter"]'
    );
  }

  if (!addStatButton) {
    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      if (
        element.textContent &&
        element.textContent.includes("Add Stat Filter")
      ) {
        if (element.tagName === "BUTTON" || element.tagName === "INPUT") {
          addStatButton = element;
          break;
        } else {
          const interactive = element.querySelector(
            "button, input, .multiselect__input"
          );
          if (interactive) {
            addStatButton = interactive;
            break;
          }
        }
      }
    }
  }

  if (!addStatButton) {
    throw new Error('Could not find "Add Stat Filter" control');
  }

  // Use the exact mod text from the complete dataset
  const tradeSiteStat = mapModToTradeStat(mod.modName, mod);
  console.log(`🔥 Using trade site stat instantly: "${tradeSiteStat}"`);

  if (addStatButton.tagName === "BUTTON") {
    addStatButton.click();
    await wait(50); // Minimal wait for UI update

    const statInput = document.querySelector(
      'input[placeholder*="Add Stat Filter"], .multiselect__input:last-of-type'
    );
    if (statInput) {
      await setStatInputInstantly(statInput, tradeSiteStat);
    } else {
      throw new Error("No stat input appeared after clicking Add Stat Filter");
    }
  } else if (addStatButton.tagName === "INPUT") {
    await setStatInputInstantly(addStatButton, tradeSiteStat);
  }

  await wait(100); // Brief wait for filter creation
  const verifyFilter = await verifyStatFilterCreated(tradeSiteStat);
  if (!verifyFilter) {
    throw new Error("Failed to create stat filter");
  }

  await setModValuesInstantly(mod);
}

async function setStatInputInstantly(input, tradeSiteStat) {
  input.focus();
  input.click();

  // Clear and set value instantly
  const valueSet = setInputValueInstantly(input, tradeSiteStat);

  if (!valueSet) {
    throw new Error("Failed to set stat input value");
  }

  await wait(80); // Wait for dropdown

  const optionSelected = selectDropdownOptionInstantly(tradeSiteStat, [
    ".search-advanced-pane.brown .multiselect__option:not(.multiselect__option--disabled)",
    '[class*="stat"] .multiselect__option:not(.multiselect__option--disabled)',
    ".multiselect__option:not(.multiselect__option--disabled)",
  ]);

  if (!optionSelected) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        code: "Enter",
      })
    );
  }
}

async function verifyStatFilterCreated(expectedStat) {
  await wait(100);

  const statFiltersSection = document.querySelector(
    ".search-advanced-pane.brown"
  );
  if (!statFiltersSection) return false;

  const statFilters = statFiltersSection.querySelectorAll(".filter.full-span");
  if (statFilters.length === 0) return false;

  const latestFilter = statFilters[statFilters.length - 1];
  const filterText = latestFilter.textContent || "";

  if (
    filterText.toLowerCase().includes("buyout") ||
    filterText.toLowerCase().includes("price")
  ) {
    return false;
  }

  return (
    latestFilter.querySelector('input[placeholder="min"]') &&
    latestFilter.querySelector('input[placeholder="max"]')
  );
}

async function setModValuesInstantly(mod) {
  console.log("📊 Setting values instantly for latest filter:", mod.modName);

  let minValue = mod.minValue;
  let maxValue = mod.maxValue;

  console.log(`✅ Using values: min=${minValue}, max=${maxValue}`);

  const statFilterContainers = document.querySelectorAll(
    ".search-advanced-pane.brown .filter.full-span, .filter-group .filter.full-span"
  );

  if (statFilterContainers.length === 0) {
    throw new Error("No stat filter containers found");
  }

  const latestFilter = statFilterContainers[statFilterContainers.length - 1];
  const minInput = latestFilter.querySelector(
    'input[placeholder="min"]:not([disabled])'
  );
  const maxInput = latestFilter.querySelector(
    'input[placeholder="max"]:not([disabled])'
  );

  if (minInput && minValue !== undefined) {
    const success = setInputValueInstantly(minInput, minValue.toString());
    if (success) {
      console.log("✅ Min value set instantly:", minValue);
    }
  }

  if (maxInput && maxValue !== undefined) {
    const success = setInputValueInstantly(maxInput, maxValue.toString());
    if (success) {
      console.log("✅ Max value set instantly:", maxValue);
    }
  }
}

// === HELPER FUNCTIONS ===
async function findElementWithFallback(selectors, timeout = 5000) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  for (const selector of selectorArray) {
    const element = document.querySelector(selector);
    if (element) return element;
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      for (const selector of selectorArray) {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(interval);
          resolve(element);
          return;
        }
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

async function waitForPageReady() {
  console.log("⏳ [waitForPageReady] Starting...");

  try {
    await waitForElement(["body", ".content"], 10000);
    console.log("✅ [waitForPageReady] Body/content found");

    if (!window.location.href.includes("pathofexile.com/trade")) {
      throw new Error("Not on Path of Exile trade site");
    }

    // Minimal wait for instant operation
    await wait(300);

    const searchInput = document.querySelector(
      '.search-select input[type="text"], input[placeholder*="Search Items"], .multiselect__input'
    );

    if (searchInput) {
      console.log("✅ [waitForPageReady] Search input found");
    } else {
      console.log(
        "⚠️ [waitForPageReady] Search input not found, but continuing..."
      );
    }

    console.log("✅ [waitForPageReady] Page ready check complete");
  } catch (error) {
    console.error("❌ [waitForPageReady] Error:", error);
    throw error;
  }
}

async function clearExistingSearch() {
  const clearButton = await findElementWithFallback(
    ['button[title*="Clear"]', ".clear-all-button"],
    1000
  );
  if (clearButton) {
    clearButton.click();
    await wait(100); // Minimal wait
  }
}

async function waitForElement(selectors, timeout = 5000) {
  const element = await findElementWithFallback(selectors, timeout);
  if (!element) throw new Error(`Element not found: ${selectors.join(", ")}`);
  return element;
}

// === INITIALIZATION ===
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  console.log("✅ Content script initialized for instant auto-fill");

  loadModsData().then(() => {
    console.log("✅ Content script ready for instant operation");
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
      sendResponse({ success: true, ready: true });
      return;
    }

    if (message.action === "autoFill") {
      handleAutoFill(message.config)
        .then((result) => sendResponse({ success: true, result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    sendResponse({ success: false, error: "Unknown action" });
  });
}

// Export for debugging
window.loadModsData = loadModsData;
window.findModMapping = findModMapping;
window.modMappings = modMappings;

console.log(
  "✅ PoE Easy Search content script loaded - Instant Auto-fill v10.0"
);
