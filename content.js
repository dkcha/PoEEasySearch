// PoE Easy Search Content Script v16.0 - COUNT Mode Support
// Utility function for random delays to avoid detection
const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms * 0.1 + Math.random() * 10));

// Global state management
let allAbyssModsData = null;
let modMappings = {};

// Load mod data from GitHub repository
async function loadModsData() {
  if (allAbyssModsData) return true;

  try {
    const url = CONFIG.GITHUB_URLS.ALL_ABYSS_MODS;
    const response = await fetch(url);
    const data = await response.json();
    allAbyssModsData = data;
    createSimpleModMappings();
    return true;
  } catch (error) {
    console.error("Failed to load mod data:", error);
    createFallbackMappings();
    return false;
  }
}

// Create mappings for mod text matching and normalization
function createSimpleModMappings() {
  if (!allAbyssModsData) return;

  modMappings = {};
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

    modMappings[modData.text.toLowerCase()] = {
      modId: modId,
      originalText: modData.text,
      searchText: genericizedText,
      stats: modData.stats,
      required_level: modData.required_level,
    };
  });
}

// Convert specific mod values to generic placeholders for trade site matching
function genericizeModText(modText) {
  if (!modText) return "";
  return modText
    .replace(/\(\d+-\d+\)/g, "#")
    .replace(/\b\d+\b/g, "#")
    .replace(/\+#/g, "+#")
    .replace(/\s+/g, " ")
    .trim();
}

// Find matching mod text from our dataset
function findModMapping(searchTerm) {
  if (!modMappings) return null;

  const lowerSearchTerm = searchTerm.toLowerCase();

  if (modMappings[lowerSearchTerm]) {
    return modMappings[lowerSearchTerm].searchText;
  }

  const genericizedSearchTerm = genericizeModText(searchTerm);
  if (modMappings[genericizedSearchTerm.toLowerCase()]) {
    return genericizedSearchTerm;
  }

  for (const [pattern, modData] of Object.entries(modMappings)) {
    if (
      pattern.includes(lowerSearchTerm) ||
      lowerSearchTerm.includes(pattern)
    ) {
      return modData.searchText;
    }
  }

  return null;
}

// Fallback mod mappings if data loading fails
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
}

// Map mod names to trade site stat text
function mapModToTradeStat(modName, mod) {
  if (mod && mod.searchText) {
    return mod.searchText;
  }
  const mapping = findModMapping(modName);
  return mapping || modName;
}

// Set input values with proper event triggering for Vue/React compatibility
function setInputValueInstantly(input, value) {
  if (!input || input.disabled) return false;

  input.value = value;

  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(input, value);
  } catch (e) {
    // Fallback to direct assignment
  }

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
  return input.value === value;
}

// Set base item type (jewel selection) with proper dropdown triggering
async function setBaseItemTypeInstantly(jewelType) {
  const displayName = CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) throw new Error(`Unknown jewel type: ${jewelType}`);

  const searchInput = await findElementWithFallback(
    CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );
  if (!searchInput) throw new Error("Could not find base item search field");

  // Clear and focus input
  searchInput.focus();
  searchInput.click();
  searchInput.value = "";

  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(200);

  // Set the jewel name
  const valueSet = setInputValueInstantly(searchInput, displayName);
  if (!valueSet) {
    throw new Error("Failed to set base item value");
  }

  // Trigger dropdown appearance with multiple events
  searchInput.focus();
  searchInput.click();

  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  searchInput.dispatchEvent(
    new Event("keydown", { key: "ArrowDown", bubbles: true })
  );

  await wait(800);

  // Select from dropdown
  const baseItemSelected = selectFromBaseItemDropdown(displayName);

  if (!baseItemSelected) {
    searchInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(200);
  }

  await wait(100);
}

// Select base item from dropdown with enhanced matching logic
function selectFromBaseItemDropdown(targetText) {
  const normalizeText = (text) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedTarget = normalizeText(targetText);

  // Try multiple selectors to find the correct dropdown
  const possibleSelectors = [
    ".search-select .multiselect__content .multiselect__option:not(.multiselect__option--disabled)",
    ".multiselect__content .multiselect__option:not(.multiselect__option--disabled)",
    ".multiselect__option:not(.multiselect__option--disabled)",
  ];

  for (const selector of possibleSelectors) {
    const baseItemOptions = document.querySelectorAll(selector);
    if (baseItemOptions.length === 0) continue;

    // Verify we're looking at jewel options, not other items
    const jewelOptions = Array.from(baseItemOptions)
      .filter((opt) => opt.textContent.toLowerCase().includes("jewel"))
      .slice(0, 10);

    // Try exact match first
    for (const option of baseItemOptions) {
      const optionText = option.textContent.trim();
      const normalizedOption = normalizeText(optionText);

      if (normalizedOption === normalizedTarget) {
        option.scrollIntoView({ block: "nearest" });
        option.click();
        return true;
      }
    }

    // Try partial matching if we found jewel options
    if (jewelOptions.length > 0) {
      for (const option of baseItemOptions) {
        const optionText = option.textContent.trim();
        if (
          optionText
            .toLowerCase()
            .includes(targetText.toLowerCase().replace(" jewel", ""))
        ) {
          option.scrollIntoView({ block: "nearest" });
          option.click();
          return true;
        }
      }
    }
  }

  return false;
}

// NEW: Set stat filter mode (AND/COUNT) on the trade site
async function setStatFilterMode(mode, countValue = null) {
  if (mode === "and") {
    // Default mode - no changes needed
    return true;
  }

  if (mode === "count" && countValue) {
    try {
      // Wait for all mod filters to be added first
      await wait(1000);

      // Find the search advanced pane
      const advancedPane = document.querySelector(
        ".search-advanced-pane.brown"
      );
      if (!advancedPane) {
        console.warn("Could not find advanced search pane");
        return false;
      }

      // Look for the edit button
      const editButton = advancedPane.querySelector(".btn.edit-btn");
      if (!editButton) {
        console.warn("Edit button not found - COUNT mode may not be available");
        return false;
      }

      // Click the edit button to reveal mode options
      editButton.focus();
      editButton.click();
      await wait(800);

      // Look for the specific multiselect dropdown that appears
      const multiselectDropdown = document.querySelector(
        ".multiselect.filter-select.filter-select-title.filter-select-mutate.multiselect--active"
      );

      if (!multiselectDropdown) {
        console.warn("Multiselect dropdown not found after clicking edit");
        return false;
      }

      // Look for the options within the multiselect dropdown
      const dropdownOptions = multiselectDropdown.querySelectorAll(
        ".multiselect__option:not(.multiselect__option--disabled)"
      );

      if (dropdownOptions.length === 0) {
        console.warn("No options found in multiselect dropdown");
        return false;
      }

      // Find the COUNT option
      const countOption = Array.from(dropdownOptions).find((option) => {
        const text = option.textContent.trim().toLowerCase();
        return (
          text.includes("count") ||
          text.includes("minimum") ||
          text.includes("at least")
        );
      });

      if (!countOption) {
        console.warn(
          "COUNT option not found in dropdown. Available options:",
          Array.from(dropdownOptions).map((o) => `"${o.textContent.trim()}"`)
        );
        return false;
      }

      // Click the COUNT option
      countOption.scrollIntoView({ block: "nearest" });
      countOption.click();
      await wait(500);

      // After selecting COUNT, look for the number input that should appear
      // It might appear in the same area or in a new location
      const countInputSelectors = [
        '.search-advanced-pane.brown input[type="number"]',
        '.filter-select input[type="number"]',
        'input[type="number"]',
        'input[placeholder*="count"]',
        'input[placeholder*="minimum"]',
      ];

      let countInput = null;
      for (const selector of countInputSelectors) {
        countInput = document.querySelector(selector);
        if (countInput) break;
      }

      if (countInput) {
        // Focus and set the count value
        countInput.focus();
        setInputValueInstantly(countInput, countValue.toString());
        await wait(200);

        // Trigger events to ensure the value is registered
        countInput.dispatchEvent(new Event("blur", { bubbles: true }));
      } else {
        console.warn(
          "Count input field not found after selecting COUNT option"
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to set COUNT mode:", error);
      return false;
    }
  }

  return false;
}

// Add a single mod filter with tier range selection
async function addSingleModFilterInstantly(mod, filterIndex) {
  try {
    const statFilterInput = await findStatFilterInput();
    if (!statFilterInput) {
      throw new Error("Could not find stat filter input");
    }

    const tradeSiteStat = mapModToTradeStat(mod.modName, mod);
    await setStatFilterInputInstantly(statFilterInput, tradeSiteStat);
    await wait(500);

    const statSelected = selectFromStatFilterDropdown(tradeSiteStat);
    if (!statSelected) {
      throw new Error("Failed to select stat from dropdown");
    }

    await wait(300);
    const verified = await verifyStatFilterCreated(tradeSiteStat);
    if (!verified) {
      throw new Error("Failed to create stat filter");
    }

    await setModValuesInstantly(mod);
  } catch (error) {
    throw error;
  }
}

// Find the stat filter input field in the advanced search section
async function findStatFilterInput() {
  let statInput = document.querySelector(
    '.search-advanced-pane.brown input[placeholder*="Add Stat Filter"]'
  );

  if (statInput) {
    return statInput;
  }

  const statSection = document.querySelector(".search-advanced-pane.brown");
  if (statSection) {
    const mutateSelect = statSection.querySelector(
      '.filter-select-mutate input[type="text"]'
    );
    if (mutateSelect) {
      return mutateSelect;
    }

    const anyInput = statSection.querySelector(
      'input[type="text"]:not([disabled])'
    );
    if (anyInput && anyInput.placeholder.includes("Add Stat Filter")) {
      return anyInput;
    }
  }

  return null;
}

// Set stat filter input with proper dropdown triggering
async function setStatFilterInputInstantly(input, tradeSiteStat) {
  input.value = "";
  input.focus();
  input.click();

  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(200);

  const success = setInputValueInstantly(input, tradeSiteStat);
  if (!success) {
    return;
  }

  // Force dropdown to appear and filter results
  input.focus();
  input.click();

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("keyup", { bubbles: true }));
  input.dispatchEvent(
    new Event("keydown", { key: "ArrowDown", bubbles: true })
  );

  await wait(800);
}

// Select stat from filtered dropdown with advanced text matching
function selectFromStatFilterDropdown(targetText) {
  const statFilterOptions = document.querySelectorAll(
    CONFIG.SELECTORS.STAT_FILTER_OPTIONS
  );
  if (statFilterOptions.length === 0) return false;

  // Create multiple search variations to handle different text formats
  const searchVariations = [
    targetText,
    targetText.replace(/explicit /i, ""),
    targetText.replace(/pseudo /i, ""),
    targetText.replace(/#/g, "X"),
    targetText.replace(/#/g, "(X-Y)"),
    targetText.replace(
      "Minions deal # to # additional Chaos Damage",
      "Minions deal (X-Y) additional Chaos Damage"
    ),
    targetText.replace(
      "Minions have #% chance to Poison Enemies on Hit",
      "Minions have X% chance to Poison Enemies on Hit"
    ),
    targetText.replace(" additional", ""),
    targetText.replace(" Enemies", ""),
  ];

  const normalizeText = (text) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  // Try exact matches with all variations
  for (const variation of searchVariations) {
    const normalizedVariation = normalizeText(variation);

    for (const option of statFilterOptions) {
      const optionText = option.textContent.trim();
      const normalizedOption = normalizeText(optionText);

      if (normalizedOption === normalizedVariation) {
        option.scrollIntoView({ block: "nearest" });
        option.click();
        return true;
      }
    }
  }

  // Fallback to keyword matching
  const keywords = [];
  if (targetText.toLowerCase().includes("chaos")) keywords.push("chaos");
  if (targetText.toLowerCase().includes("poison")) keywords.push("poison");
  if (targetText.toLowerCase().includes("minion")) keywords.push("minion");
  if (targetText.toLowerCase().includes("deal")) keywords.push("deal");
  if (targetText.toLowerCase().includes("damage")) keywords.push("damage");

  for (const option of statFilterOptions) {
    const optionText = option.textContent.toLowerCase();

    const matchCount = keywords.filter((keyword) =>
      optionText.includes(keyword)
    ).length;

    if (matchCount >= Math.min(3, keywords.length)) {
      option.scrollIntoView({ block: "nearest" });
      option.click();
      return true;
    }
  }

  return false;
}

// ENHANCED: Main auto-fill handler with COUNT mode support
async function handleAutoFill(config) {
  await wait(500);

  const isStable = await waitForTradePageStability();
  if (!isStable) {
    console.warn("Page may not be fully stable, proceeding anyway...");
  }

  try {
    await loadModsData();
    await waitForPageReady();
    await clearExistingSearch();
    await setBaseItemTypeInstantly(config.jewelType);

    if (config.searchMode === "with-mods" && config.selectedMods?.length > 0) {
      await addModFiltersInstantly(config.selectedMods);

      // NEW: Set stat filter mode if COUNT mode is selected
      if (config.statFilterMode === "count" && config.countValue) {
        const modeSet = await setStatFilterMode("count", config.countValue);
        if (!modeSet) {
          console.warn("Failed to set COUNT mode - continuing with AND mode");
        }
      }
    }

    const modeText =
      config.statFilterMode === "count"
        ? `COUNT (at least ${config.countValue})`
        : "AND";

    return {
      success: true,
      message: `Successfully configured search for ${config.jewelDisplayName} with ${modeText} mode`,
    };
  } catch (error) {
    console.error("Auto-fill failed:", error);
    throw new Error(`Auto-fill failed: ${error.message}`);
  }
}

// Add multiple mod filters sequentially
async function addModFiltersInstantly(selectedMods) {
  for (let i = 0; i < selectedMods.length; i++) {
    const mod = selectedMods[i];

    try {
      await addSingleModFilterInstantly(mod, i);
      await wait(200);
    } catch (error) {
      console.error(`Failed to add mod ${mod.modName}:`, error);
    }
  }
}

// Verify that stat filter was successfully created
async function verifyStatFilterCreated(expectedStat) {
  await wait(300);

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

  const minInput = latestFilter.querySelector('input[placeholder="min"]');
  const maxInput = latestFilter.querySelector('input[placeholder="max"]');

  return minInput && maxInput;
}

// Set min/max values for the most recently created mod filter
async function setModValuesInstantly(mod) {
  let minValue = mod.minValue;
  let maxValue = mod.maxValue;

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
    setInputValueInstantly(minInput, minValue.toString());
  }

  if (maxInput && maxValue !== undefined) {
    setInputValueInstantly(maxInput, maxValue.toString());
  }
}

// Find elements with fallback selectors and timeout
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

// Wait for page to be ready for interaction
async function waitForPageReady() {
  try {
    await waitForElement(["body", ".content"], 10000);

    if (!window.location.href.includes("pathofexile.com/trade")) {
      throw new Error("Not on Path of Exile trade site");
    }

    await wait(500);
    await waitForTradePageStability();
  } catch (error) {
    console.error("waitForPageReady error:", error);
    throw error;
  }
}

// Wait for trade page elements to stabilize
async function waitForTradePageStability() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20;

    const checkStability = () => {
      attempts++;

      const hasStatSection = document.querySelector(
        ".search-advanced-pane.brown"
      );
      const hasBaseSearch = document.querySelector(
        '.search-select input[placeholder="Search Items..."]'
      );
      const noLoadingSpinners = !document.querySelector(
        '.loading, [class*="loading"]'
      );

      if (
        (hasStatSection && hasBaseSearch && noLoadingSpinners) ||
        attempts >= maxAttempts
      ) {
        resolve();
      } else {
        setTimeout(checkStability, 250);
      }
    };

    checkStability();
  });
}

// Clear any existing search filters
async function clearExistingSearch() {
  const clearButton = await findElementWithFallback(
    ['button[title*="Clear"]', ".clear-all-button"],
    1000
  );
  if (clearButton) {
    clearButton.click();
    await wait(100);
  }
}

// Wait for specific element to appear
async function waitForElement(selectors, timeout = 5000) {
  const element = await findElementWithFallback(selectors, timeout);
  if (!element) throw new Error(`Element not found: ${selectors.join(", ")}`);
  return element;
}

// Initialize content script and message listener
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  loadModsData();

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
