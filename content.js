// PoE Easy Search Content Script v16.0 - COUNT Mode Support
const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms * 0.1 + Math.random() * 10));

let allAbyssModsData = null;
let modMappings = {};

async function loadModsData() {
  if (allAbyssModsData) return true;

  try {
    const url =
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/all_abyss_jewel_mods.json";
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

function genericizeModText(modText) {
  if (!modText) return "";
  return modText
    .replace(/\(\d+-\d+\)/g, "#")
    .replace(/\b\d+\b/g, "#")
    .replace(/\+#/g, "+#")
    .replace(/\s+/g, " ")
    .trim();
}

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

function mapModToTradeStat(modName, mod) {
  if (mod && mod.searchText) {
    return mod.searchText;
  }
  const mapping = findModMapping(modName);
  return mapping || modName;
}

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

async function setBaseItemTypeInstantly(jewelType) {
  const displayName = CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) throw new Error(`Unknown jewel type: ${jewelType}`);

  const searchInput = await findElementWithFallback(
    CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );
  if (!searchInput) throw new Error("Could not find base item search field");

  searchInput.focus();
  searchInput.click();
  searchInput.value = "";

  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(200);

  const valueSet = setInputValueInstantly(searchInput, displayName);
  if (!valueSet) {
    throw new Error("Failed to set base item value");
  }

  searchInput.focus();
  searchInput.click();

  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  searchInput.dispatchEvent(
    new Event("keydown", { key: "ArrowDown", bubbles: true })
  );

  await wait(800);

  const baseItemSelected = selectFromBaseItemDropdown(displayName);

  if (!baseItemSelected) {
    searchInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(200);
  }

  await wait(100);
}

function selectFromBaseItemDropdown(targetText) {
  const normalizeText = (text) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedTarget = normalizeText(targetText);

  const possibleSelectors = [
    ".search-select .multiselect__content .multiselect__option:not(.multiselect__option--disabled)",
    ".multiselect__content .multiselect__option:not(.multiselect__option--disabled)",
    ".multiselect__option:not(.multiselect__option--disabled)",
  ];

  for (const selector of possibleSelectors) {
    const baseItemOptions = document.querySelectorAll(selector);
    if (baseItemOptions.length === 0) continue;

    const jewelOptions = Array.from(baseItemOptions)
      .filter((opt) => opt.textContent.toLowerCase().includes("jewel"))
      .slice(0, 10);

    for (const option of baseItemOptions) {
      const optionText = option.textContent.trim();
      const normalizedOption = normalizeText(optionText);

      if (normalizedOption === normalizedTarget) {
        option.scrollIntoView({ block: "nearest" });
        option.click();
        return true;
      }
    }

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

async function setStatFilterMode(mode, countValue = null) {
  if (mode === CONFIG.SEARCH_MODES.AND) {
    return true;
  }

  if (mode === CONFIG.SEARCH_MODES.COUNT && countValue) {
    try {
      await wait(1000);

      const advancedPane = document.querySelector(
        ".search-advanced-pane.brown"
      );
      if (!advancedPane) {
        console.warn("Could not find advanced search pane");
        return false;
      }

      let editButton = null;
      for (const selector of CONFIG.SELECTORS.STAT_FILTER_EDIT_BUTTON) {
        editButton = advancedPane.querySelector(selector);
        if (editButton) break;
      }

      if (!editButton) {
        console.warn("Edit button not found - COUNT mode may not be available");
        return false;
      }

      editButton.focus();
      editButton.click();
      await wait(1200);

      let multiselectDropdown = null;

      for (const selector of CONFIG.SELECTORS.STAT_FILTER_MODE_DROPDOWN) {
        multiselectDropdown = document.querySelector(selector);
        if (multiselectDropdown) break;
      }

      if (!multiselectDropdown) {
        multiselectDropdown = document.querySelector(".multiselect--active");
      }

      if (!multiselectDropdown) {
        const allMultiselects = document.querySelectorAll(".multiselect");
        for (const ms of allMultiselects) {
          const options = ms.querySelectorAll(".multiselect__option");
          if (options.length > 0) {
            multiselectDropdown = ms;
            break;
          }
        }
      }

      if (!multiselectDropdown) {
        console.error("Multiselect dropdown not found after clicking edit");
        return false;
      }

      const dropdownOptions = multiselectDropdown.querySelectorAll(
        ".multiselect__option:not(.multiselect__option--disabled)"
      );

      if (dropdownOptions.length === 0) {
        console.warn("No options found in multiselect dropdown");
        return false;
      }

      const countOption = Array.from(dropdownOptions).find((option) => {
        const text = option.textContent.trim().toLowerCase();
        return (
          text.includes("count") ||
          text.includes("minimum") ||
          text.includes("at least") ||
          text.includes("min") ||
          text.match(/\d+.*of.*\d+/)
        );
      });

      if (!countOption) {
        console.warn("COUNT option not found in dropdown");
        return false;
      }

      countOption.scrollIntoView({ block: "nearest" });
      countOption.click();
      await wait(800);

      let countInput = null;
      for (const selector of CONFIG.SELECTORS.COUNT_VALUE_INPUT) {
        countInput = document.querySelector(selector);
        if (countInput) break;
      }

      if (!countInput) {
        const allNumberInputs = document.querySelectorAll(
          'input[type="number"]'
        );
        if (allNumberInputs.length > 0) {
          countInput = allNumberInputs[allNumberInputs.length - 1];
        }
      }

      if (countInput) {
        countInput.focus();
        setInputValueInstantly(countInput, countValue.toString());
        await wait(200);
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

  if (Object.values(CONFIG.SEARCH_MODES).includes(mode)) {
    console.warn(`Search mode "${mode}" is not yet implemented`);
    return false;
  }

  console.error(`Unknown search mode: ${mode}`);
  return false;
}

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

  input.focus();
  input.click();

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("keyup", { bubbles: true }));
  input.dispatchEvent(
    new Event("keydown", { key: "ArrowDown", bubbles: true })
  );

  await wait(800);
}

function selectFromStatFilterDropdown(targetText) {
  const statFilterOptions = document.querySelectorAll(
    CONFIG.SELECTORS.STAT_FILTER_OPTIONS
  );
  if (statFilterOptions.length === 0) return false;

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

      if (
        config.statFilterMode === CONFIG.SEARCH_MODES.COUNT &&
        config.countValue
      ) {
        const modeSet = await setStatFilterMode(
          CONFIG.SEARCH_MODES.COUNT,
          config.countValue
        );
        if (!modeSet) {
          console.warn("Failed to set COUNT mode - continuing with AND mode");
        }
      }
    }

    const modeText =
      config.statFilterMode === CONFIG.SEARCH_MODES.COUNT
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

async function waitForElement(selectors, timeout = 5000) {
  const element = await findElementWithFallback(selectors, timeout);
  if (!element) throw new Error(`Element not found: ${selectors.join(", ")}`);
  return element;
}

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
