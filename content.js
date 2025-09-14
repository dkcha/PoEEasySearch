// PoE Easy Search - Content Script (Ultra-Speed Optimized)
console.log("🎯 PoE Easy Search content script loading...");

// Ultra-speed timing (0.3x multiplier applied)
const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms * 0.3 + Math.random() * 30));

// === GLOBAL STATE ===
let abyssJewelMods = null;
let staticMods = null;
let modMappings = {};

// === DATA LOADING ===
async function loadModsData() {
  if (abyssJewelMods && staticMods) return true;

  try {
    const [jewelResponse, modsResponse] = await Promise.all([
      fetch(CONFIG.GITHUB_URLS.JEWEL_MODS),
      fetch(CONFIG.GITHUB_URLS.STATIC_MODS),
    ]);

    abyssJewelMods = await jewelResponse.json();
    staticMods = await modsResponse.json();
    createDynamicModMappings();
    console.log("✅ Mod data loaded successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to load mod data:", error);
    createFallbackMappings();
    return false;
  }
}

function createDynamicModMappings() {
  if (!staticMods) return;

  modMappings = {};
  let mappingCount = 0;

  for (const [modId, modData] of Object.entries(staticMods)) {
    if (!modData.text || modData.domain !== "abyss_jewel") continue;

    const genericizedText = genericizeModText(modData.text);
    modMappings[genericizedText] = {
      modId: modId,
      originalText: modData.text,
      searchText: genericizedText,
      stats: modData.stats,
      required_level: modData.required_level,
      ...modData,
    };
    mappingCount++;

    if (
      modData.text.match(
        /(dagger|claw|sword|axe|mace or sceptre|staff|bow|wand)/i
      )
    ) {
      const weaponAliases = createWeaponAliases(modData, genericizedText);
      Object.assign(modMappings, weaponAliases);
      mappingCount += Object.keys(weaponAliases).length;
    }
  }

  console.log(`✅ Created ${mappingCount} dynamic mod mappings`);
}

// === UTILITY FUNCTIONS ===
function genericizeModText(modText) {
  let genericized = modText.replace(/\(\d+-\d+\)/g, "#");
  genericized = genericized.replace(/\b\d+\b/g, "#");
  return genericized.replace(/\s+/g, " ").trim();
}

function createWeaponAliases(modData, genericizedText) {
  const aliases = {};
  const weaponTypes = [
    "dagger",
    "claw",
    "sword",
    "axe",
    "mace or sceptre",
    "staff",
    "bow",
    "wand",
  ];

  for (const weaponType of weaponTypes) {
    if (modData.text.toLowerCase().includes(weaponType)) {
      const aliasWeapons = getWeaponAliases(weaponType);
      for (const alias of aliasWeapons) {
        if (alias !== weaponType) {
          const aliasPattern = genericizedText.replace(
            new RegExp(weaponType, "gi"),
            alias
          );
          aliases[aliasPattern] = {
            ...modData,
            searchText: aliasPattern,
            isAlias: true,
            originalWeapon: weaponType,
            aliasWeapon: alias,
          };
        }
      }
      break;
    }
  }
  return aliases;
}

function getWeaponAliases(weaponType) {
  const meleeWeapons = [
    "dagger",
    "claw",
    "sword",
    "axe",
    "mace or sceptre",
    "staff",
  ];
  const rangedWeapons = ["bow", "wand"];

  if (meleeWeapons.includes(weaponType)) return meleeWeapons;
  if (rangedWeapons.includes(weaponType)) return rangedWeapons;
  return [weaponType];
}

function findDynamicMapping(searchTerm) {
  if (!modMappings) return null;

  const lowerSearchTerm = searchTerm.toLowerCase();
  if (modMappings[lowerSearchTerm]) {
    return modMappings[lowerSearchTerm].searchText;
  }

  const genericizedSearchTerm = genericizeModText(searchTerm);
  if (modMappings[genericizedSearchTerm]) {
    return genericizedSearchTerm;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const [pattern, modData] of Object.entries(modMappings)) {
    let score = calculateMatchScore(genericizedSearchTerm, pattern);
    if (score > bestScore && score >= 60) {
      bestScore = score;
      bestMatch = modData.searchText;
    }
  }

  if (bestMatch) {
    console.log(
      `✅ Fuzzy match found: "${searchTerm}" → "${bestMatch}" (score: ${bestScore})`
    );
    return bestMatch;
  }
  return null;
}

function calculateMatchScore(searchTerm, pattern) {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  if (lowerPattern === lowerSearchTerm) return 100;
  if (
    lowerPattern.includes(lowerSearchTerm) ||
    lowerSearchTerm.includes(lowerPattern)
  )
    return 80;

  let score = 0;
  const searchWords = lowerSearchTerm.split(" ").filter((w) => w.length > 2);
  const patternWords = lowerPattern.split(" ").filter((w) => w.length > 2);

  for (const searchWord of searchWords) {
    for (const patternWord of patternWords) {
      if (
        patternWord.includes(searchWord) ||
        searchWord.includes(patternWord)
      ) {
        score += 10;
      }
    }
  }
  return score;
}

function createFallbackMappings() {
  modMappings = {
    "added life": "+# to maximum Life",
    life: "+# to maximum Life",
    "+# to maximum life": "+# to maximum Life",
    "life regeneration": "Regenerate # Life per second",
    "life regen": "Regenerate # Life per second",
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
  if (mod && (mod.genericText || mod.searchText)) {
    const genericText = mod.genericText || mod.searchText;
    console.log(`✅ Using genericized text from popup: ${genericText}`);
    return genericText;
  }

  const dynamicMapping = findDynamicMapping(modName);
  return dynamicMapping || modName;
}

// === MAIN AUTO-FILL HANDLER ===
async function handleAutoFill(config) {
  console.log("🔍 Starting auto-fill with config:", config);

  try {
    await loadModsData();
    await waitForPageReady();
    await clearExistingSearch();
    await setBaseItemType(config.jewelType);

    if (config.searchMode === "with-mods" && config.selectedMods?.length > 0) {
      console.log("🔧 Adding", config.selectedMods.length, "mod filters...");
      await addModFilters(config.selectedMods);
    }

    console.log(
      "✅ Form prepared. Please click search manually to avoid bot detection."
    );
    return {
      success: true,
      message: `Successfully configured search for ${
        CONFIG.JEWEL_MAPPINGS[config.jewelType]
      }`,
    };
  } catch (error) {
    console.error("❌ Auto-fill failed:", error);
    throw new Error(`Auto-fill failed: ${error.message}`);
  }
}

async function setBaseItemType(jewelType) {
  const displayName = CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) throw new Error(`Unknown jewel type: ${jewelType}`);

  const searchInput = await findElementWithFallback(
    CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );
  if (!searchInput) throw new Error("Could not find base item search field");

  const rect = searchInput.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    await wait(300);
  }

  await interactWithVueMultiselect(searchInput, displayName);
  await wait(150);

  // Verify selection
  const selectedItems = document.querySelectorAll(
    '.multiselect__single, .multiselect__tag, [class*="selected"]'
  );
  const valueSet = Array.from(selectedItems).some((item) =>
    item.textContent.includes(displayName)
  );

  if (!valueSet) {
    console.warn(
      "⚠️ Base item may not have been set correctly, attempting retry..."
    );
    await wait(300);
    await interactWithVueMultiselect(searchInput, displayName);
  }
  console.log("✅ Base item type set:", displayName);
}

async function interactWithVueMultiselect(input, searchText) {
  input.scrollIntoView({ behavior: "instant", block: "center" });
  await wait(30);

  input.focus();
  input.click();
  await wait(30);

  // Instant fill for ultra speed
  input.value = searchText;

  // Try native setter
  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(input, searchText);
  } catch (e) {
    console.warn("Native setter failed:", e);
  }

  // Dispatch events
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: searchText,
    })
  );

  await wait(120);

  const optionSelected = await selectVueMultiselectOption(searchText);
  if (!optionSelected) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(30);
  }
}

async function selectVueMultiselectOption(targetText) {
  const options = document.querySelectorAll(".multiselect__option");
  for (const option of options) {
    const optionText = option.textContent.trim();
    if (optionText.toLowerCase().includes(targetText.toLowerCase())) {
      console.log("✅ Found matching option:", optionText);
      option.click();
      await wait(150);
      return true;
    }
  }
  return false;
}

async function addModFilters(selectedMods) {
  for (let i = 0; i < selectedMods.length; i++) {
    const mod = selectedMods[i];
    console.log(`🔧 Adding mod ${i + 1}/${selectedMods.length}:`, mod.modName);

    try {
      await addSingleModFilter(mod, i);
      await wait(180);
    } catch (error) {
      console.error(`❌ Failed to add mod ${mod.modName}:`, error);
    }
  }
}

async function addSingleModFilter(mod, filterIndex) {
  console.log(`🔥 Creating stat filter ${filterIndex + 1} for: ${mod.modName}`);

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

  const tradeSiteStat = mapModToTradeStat(mod.modName, mod);
  console.log(`🔥 Using trade site stat: "${tradeSiteStat}"`);

  if (addStatButton.tagName === "BUTTON") {
    addStatButton.click();
    await wait(120);

    const statInput = document.querySelector(
      'input[placeholder*="Add Stat Filter"], .multiselect__input:last-of-type'
    );
    if (statInput) {
      await interactWithStatInput(statInput, tradeSiteStat);
    } else {
      throw new Error("No stat input appeared after clicking Add Stat Filter");
    }
  } else if (addStatButton.tagName === "INPUT") {
    await interactWithStatInput(addStatButton, tradeSiteStat);
  }

  await wait(240);
  const verifyFilter = await verifyStatFilterCreated(tradeSiteStat);
  if (!verifyFilter) {
    throw new Error("Failed to create stat filter");
  }

  await setModValuesInLatestFilter(mod);
}

async function interactWithStatInput(input, tradeSiteStat) {
  input.focus();
  input.click();
  await wait(45);

  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(30);

  // Instant fill for ultra speed
  input.value = tradeSiteStat;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(180);

  const optionSelected = await selectFromStatDropdown(tradeSiteStat);
  if (!optionSelected) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        code: "Enter",
      })
    );
    await wait(75);
  }
}

async function selectFromStatDropdown(targetText) {
  console.log("🔍 Looking for STAT dropdown option:", targetText);

  await wait(120);

  const statDropdownSelectors = [
    ".search-advanced-pane.brown .multiselect__option:not(.multiselect__option--disabled)",
    '[class*="stat"] .multiselect__option:not(.multiselect__option--disabled)',
    ".multiselect__option:not(.multiselect__option--disabled)",
  ];

  let foundOptions = [];

  for (const selector of statDropdownSelectors) {
    const options = document.querySelectorAll(selector);
    const statOptions = Array.from(options).filter((option) => {
      const optionText = option.textContent.toLowerCase();
      const isItemName =
        optionText.includes("amulet") ||
        optionText.includes("ring") ||
        optionText.includes("belt") ||
        optionText.includes("boots") ||
        optionText.match(/^\w+ \w+ \w+$/);
      const isStatLike =
        optionText.includes("damage") ||
        optionText.includes("resistance") ||
        optionText.includes("life") ||
        optionText.includes("mana") ||
        optionText.includes("#") ||
        optionText.includes("%");
      return !isItemName || isStatLike;
    });

    if (statOptions.length > 0) {
      foundOptions = statOptions;
      break;
    }
  }

  if (foundOptions.length === 0) return false;

  const lowerTargetText = targetText.toLowerCase();

  for (const option of foundOptions.slice(0, 50)) {
    let optionText = "";
    const spans = option.querySelectorAll("span");
    if (spans.length > 0) {
      optionText = spans[spans.length - 1].textContent.trim();
    } else {
      optionText = option.textContent.trim();
    }

    const lowerOptionText = optionText.toLowerCase();
    const isExactMatch = lowerOptionText === lowerTargetText;
    const containsMatch =
      lowerOptionText.includes(lowerTargetText) ||
      lowerTargetText.includes(lowerOptionText);

    if (isExactMatch || containsMatch) {
      console.log(`✅ Found matching STAT option: "${optionText}"`);
      option.scrollIntoView({ block: "nearest" });
      await wait(15);
      option.click();
      await wait(30);
      return true;
    }
  }
  return false;
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

  return (
    latestFilter.querySelector('input[placeholder="min"]') &&
    latestFilter.querySelector('input[placeholder="max"]')
  );
}

async function setModValuesInLatestFilter(mod) {
  console.log("📊 Setting values for latest filter:", mod.modName);

  let minValue = mod.minValue;
  let maxValue = mod.maxValue;

  console.log(`✅ Using values from popup: min=${minValue}, max=${maxValue}`);

  await wait(60);

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
    await clearAndFillInput(minInput, minValue.toString());
    console.log("✅ Min value set:", minValue);
  }

  if (maxInput && maxValue !== undefined) {
    await clearAndFillInput(maxInput, maxValue.toString());
    console.log("✅ Max value set:", maxValue);
  }
}

// === HELPER FUNCTIONS ===
async function clearAndFillInput(input, value) {
  if (
    input.disabled ||
    input.closest('.currency, .currency-section, [class*="currency"]')
  ) {
    return;
  }

  input.focus();
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
  await wait(15);
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
  console.log("⏳ [waitForPageReady] Starting...");

  try {
    await waitForElement(["body", ".content"], 10000);
    console.log("✅ [waitForPageReady] Body/content found");

    if (!window.location.href.includes("pathofexile.com/trade")) {
      throw new Error("Not on Path of Exile trade site");
    }

    // Ultra speed wait
    await wait(900);

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
    2000
  );
  if (clearButton) {
    clearButton.click();
    await wait(300);
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
  console.log("✅ Content script initialized");

  loadModsData().then(() => {
    console.log("✅ Content script ready");
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
window.findDynamicMapping = findDynamicMapping;
window.modMappings = modMappings;

console.log("✅ PoE Easy Search content script loaded successfully");
