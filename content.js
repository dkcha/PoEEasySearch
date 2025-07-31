// PoE Easy Search - Content Script (Refactored & Fixed)
console.log("🎯 PoE Easy Search content script loading...");

// Global variables
let abyssJewelMods = null;
let staticMods = null;
let modMappings = {};

// Configuration
const POE_TRADE_CONFIG = {
  JEWEL_MAPPINGS: {
    murderous: "Murderous Eye Jewel",
    searching: "Searching Eye Jewel",
    hypnotic: "Hypnotic Eye Jewel",
    ghastly: "Ghastly Eye Jewel",
  },

  SELECTORS: {
    BASE_ITEM_SEARCH: [
      '.search-select input[type="text"]',
      'input[placeholder*="Search Items"]',
      ".multiselect__input",
    ],
    STAT_FILTER_SECTION: [".search-advanced-pane.brown", ".filter-group-body"],
    ADD_STAT_INPUT: [
      'input[placeholder="+ Add Stat Filter"]',
      '.multiselect__input[placeholder*="Add Stat Filter"]',
    ],
    STAT_DROPDOWN_OPTIONS: [
      ".multiselect__option",
      "li.multiselect__element .multiselect__option",
    ],
    FILTER_CONTAINERS: [
      ".filter-group-body .filter.full-span",
      ".filter.full-span",
    ],
  },
};

// Load mod data from GitHub
async function loadModsData() {
  if (abyssJewelMods && staticMods) return true;

  try {
    const [jewelResponse, modsResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/abyss_jewel_mods.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/mods.json"
      ),
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

// Create dynamic mod mappings with weapon aliases
function createDynamicModMappings() {
  if (!abyssJewelMods || !staticMods) {
    console.log("❌ Required mod data not loaded yet");
    return;
  }

  modMappings = {};
  let mappingCount = 0;

  // Process all abyss jewel mods
  for (const [modId, modData] of Object.entries(staticMods)) {
    if (!modData.text || !modData.domain === "abyss_jewel") continue;

    // Create base mapping
    let baseText = modData.text;
    baseText = baseText.replace(/\(\d+-\d+\)/g, "#").replace(/\d+/g, "#");
    baseText = baseText.replace(/\s+/g, " ").trim();

    modMappings[baseText] = {
      modId: modId,
      originalText: modData.text,
      searchTerms: [
        modData.text,
        baseText,
        modData.name || "",
        modData.type || "",
      ].filter(Boolean),
      ...modData,
    };
    mappingCount++;

    // Create weapon aliases only for specific weapon mods
    if (modData.adds_tags && modData.adds_tags.includes("specific_weapon")) {
      const weaponAliases = createWeaponAliases(baseText, modData);
      Object.assign(modMappings, weaponAliases);
      mappingCount += Object.keys(weaponAliases).length;
    }
  }

  console.log(`✅ Created ${mappingCount} dynamic mod mappings`);
}

// Create weapon aliases with damage type preservation
function createWeaponAliases(baseText, modData) {
  const aliases = {};
  const weaponTypes = [
    "dagger",
    "claw",
    "sword",
    "axe",
    "mace",
    "scepter",
    "staff",
    "bow",
    "wand",
  ];

  for (const weaponType of weaponTypes) {
    if (baseText.toLowerCase().includes(weaponType)) {
      const aliasWeapons = getWeaponAliases(weaponType);

      for (const alias of aliasWeapons) {
        if (alias !== weaponType) {
          const aliasText = baseText.replace(
            new RegExp(weaponType, "gi"),
            alias
          );
          aliases[aliasText] = {
            ...(modMappings[baseText] || modData),
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

// Get weapon aliases based on weapon type
function getWeaponAliases(weaponType) {
  const meleeWeapons = [
    "dagger",
    "claw",
    "sword",
    "axe",
    "mace",
    "scepter",
    "staff",
  ];
  const rangedWeapons = ["bow", "wand"];

  if (meleeWeapons.includes(weaponType)) return meleeWeapons;
  if (rangedWeapons.includes(weaponType)) return rangedWeapons;
  return [weaponType];
}

// Enhanced mod finder with damage type preservation
function findDynamicMapping(searchTerm) {
  if (!modMappings) return null;

  // Extract damage type and weapon type
  const damageTypeMatch = searchTerm.match(
    /(physical|fire|cold|lightning|chaos)/i
  );
  const damageType = damageTypeMatch ? damageTypeMatch[1].toLowerCase() : null;

  const weaponTypeMatch = searchTerm.match(
    /(dagger|claw|sword|axe|mace|scepter|staff|bow|wand)/i
  );
  const weaponType = weaponTypeMatch ? weaponTypeMatch[1].toLowerCase() : null;

  console.log(
    `🔍 Detected weapon type search: ${weaponType} in "${searchTerm}"`
  );

  // Look for exact match first (preserving damage type)
  for (const [mappedText, modData] of Object.entries(modMappings)) {
    if (!modData.searchTerms) continue;

    const mappingHasWeapon = weaponType
      ? modData.searchTerms.some((term) =>
          term.toLowerCase().includes(weaponType)
        )
      : true;

    const mappingHasDamageType = damageType
      ? modData.searchTerms.some((term) =>
          term.toLowerCase().includes(damageType)
        )
      : true;

    if (mappingHasWeapon && mappingHasDamageType) {
      console.log(`✅ Found dynamic mapping for: ${searchTerm}`);
      return mappedText;
    }
  }

  // If no exact match found with damage type, try weapon aliases (only if no damage type)
  if (!damageType && weaponType) {
    const weaponAliases = getWeaponAliases(weaponType);

    for (const aliasWeapon of weaponAliases) {
      for (const [mappedText, modData] of Object.entries(modMappings)) {
        if (!modData.searchTerms) continue;

        const mappingHasAlias = modData.searchTerms.some((term) =>
          term.toLowerCase().includes(aliasWeapon)
        );

        if (mappingHasAlias) {
          console.log(
            `🔗 Found weapon alias match: ${mappedText} for search "${searchTerm}"`
          );
          return mappedText;
        }
      }
    }
  }

  return null;
}

// Enhanced value extraction with proper damage range handling
function extractModValues(modData, modName) {
  console.log(`🔍 Extracting values for: ${modName}`);

  if (!modData) {
    console.log("❌ No mod data provided");
    return { min: null, max: null };
  }

  // Handle damage ranges like "(14-15) to (25-28) Added Cold Damage"
  if (modData.text || modData.originalText) {
    const textToCheck = modData.originalText || modData.text;
    console.log(`📝 Checking text: ${textToCheck}`);

    const damageRangeMatch = textToCheck.match(
      /\((\d+)-(\d+)\)\s+to\s+\((\d+)-(\d+)\)/
    );
    if (damageRangeMatch) {
      const minLow = parseInt(damageRangeMatch[1]);
      const maxHigh = parseInt(damageRangeMatch[4]);

      console.log(
        `🎯 Found damage range: (${minLow}-${damageRangeMatch[2]}) to (${damageRangeMatch[3]}-${maxHigh})`
      );
      console.log(`✅ Using full range: ${minLow} to ${maxHigh}`);

      return {
        min: minLow,
        max: maxHigh,
      };
    }

    // Handle single ranges like "(17-20)"
    const singleRangeMatch = textToCheck.match(/\((\d+)-(\d+)\)/);
    if (singleRangeMatch) {
      const min = parseInt(singleRangeMatch[1]);
      const max = parseInt(singleRangeMatch[2]);

      const isPerMinute = textToCheck.toLowerCase().includes("per minute");
      if (isPerMinute) {
        console.log(
          `🔄 Converting per-minute to per-second: ${min}-${max} → ${Math.round(
            min / 60
          )}-${Math.round(max / 60)}`
        );
        return { min: Math.round(min / 60), max: Math.round(max / 60) };
      }

      console.log(`✅ Extracted single range: ${min}-${max}`);
      return { min, max };
    }
  }

  // Fallback to stats array
  if (modData.stats && modData.stats.length > 0) {
    console.log("📊 Using stats array fallback");

    // For damage mods with min/max stats, combine them
    if (modData.stats.length === 2) {
      const minStat = modData.stats[0];
      const maxStat = modData.stats[1];

      if (minStat.id.includes("minimum") && maxStat.id.includes("maximum")) {
        console.log(
          `🎯 Found min/max damage stats: ${minStat.min}-${minStat.max} to ${maxStat.min}-${maxStat.max}`
        );
        return {
          min: minStat.min,
          max: maxStat.max,
        };
      }
    }

    const firstStat = modData.stats[0];
    if (firstStat.id && firstStat.id.includes("per_minute")) {
      return {
        min: Math.round(firstStat.min / 60),
        max: Math.round(firstStat.max / 60),
      };
    }

    console.log(`✅ Using first stat: ${firstStat.min}-${firstStat.max}`);
    return { min: firstStat.min, max: firstStat.max };
  }

  console.log("❌ No valid values found");
  return { min: null, max: null };
}

// Find mod data by name and tier for value extraction
function findModDataByName(modName, tier = "T1") {
  if (!staticMods) return null;

  console.log(`🔍 Finding mod data for: ${modName} (${tier})`);

  // Extract the mod type from the name
  const lowerModName = modName.toLowerCase();
  let candidates = [];

  // Find all mods that match the general pattern
  for (const [modId, modData] of Object.entries(staticMods)) {
    if (!modData.text || modData.domain !== "abyss_jewel") continue;

    const modText = modData.text.toLowerCase();

    // Check if this mod matches our search criteria
    if (
      lowerModName.includes("cold damage") &&
      lowerModName.includes("dagger")
    ) {
      if (modText.includes("cold damage") && modText.includes("dagger")) {
        candidates.push({ modId, modData, level: modData.required_level || 0 });
      }
    } else if (
      lowerModName.includes("life") &&
      lowerModName.includes("regen")
    ) {
      if (modText.includes("regenerate") && modText.includes("life")) {
        candidates.push({ modId, modData, level: modData.required_level || 0 });
      }
    } else {
      // General matching for other mod types
      const matchesPattern = modData.searchTerms?.some((term) => {
        const termLower = term.toLowerCase();
        return (
          termLower.includes(lowerModName) || lowerModName.includes(termLower)
        );
      });

      if (matchesPattern) {
        candidates.push({ modId, modData, level: modData.required_level || 0 });
      }
    }
  }

  if (candidates.length === 0) {
    console.log(`❌ No mod candidates found for: ${modName}`);
    return null;
  }

  // Sort by required level (descending) to get highest tier first
  candidates.sort((a, b) => b.level - a.level);

  console.log(
    `📊 Found ${candidates.length} candidates, levels:`,
    candidates.map((c) => c.level)
  );

  // For T1, get the highest level (first after sorting)
  // For other tiers, we'd need more logic, but T1 is most common
  const selectedMod = candidates[0];

  console.log(
    `✅ Selected ${tier} mod: ${selectedMod.modData.text} (level ${selectedMod.level})`
  );
  return selectedMod.modData;
}

// Create fallback mappings
function createFallbackMappings() {
  modMappings = {
    "life regeneration": "Regenerate # Life per second",
    "life regen": "Regenerate # Life per second",
    life: "+# to maximum Life",
    "fire resistance": "+#% to Fire Resistance",
    "cold resistance": "+#% to Cold Resistance",
    "lightning resistance": "+#% to Lightning Resistance",
  };
  console.log("✅ Fallback mappings created");
}

// Map mod name to trade site stat
function mapModToTradeStat(modName) {
  // Try dynamic mapping first
  const dynamicMapping = findDynamicMapping(modName);
  if (dynamicMapping) {
    console.log("🔄 Mapped mod name:", modName, "→", dynamicMapping);
    return dynamicMapping;
  }

  // Fallback to direct mapping
  if (modMappings[modName]) {
    return modMappings[modName];
  }

  console.log("⚠️ No stat mapping found for:", modName);
  return modName;
}

// Main auto-fill handler
async function handleAutoFill(config) {
  console.log("📝 Starting auto-fill with config:", config);

  try {
    await loadModsData();
    await waitForPageReady();
    await clearExistingSearch();

    console.log("💎 Setting jewel type:", config.jewelType);
    await setBaseItemType(config.jewelType);

    if (config.searchMode === "with-mods" && config.selectedMods?.length > 0) {
      console.log("🔍 Adding", config.selectedMods.length, "mod filters...");
      await addModFilters(config.selectedMods);
    }

    console.log(
      "✅ Form prepared. Please click search manually to avoid bot detection."
    );

    return {
      success: true,
      message: `Successfully configured search for ${
        POE_TRADE_CONFIG.JEWEL_MAPPINGS[config.jewelType]
      }`,
    };
  } catch (error) {
    console.error("❌ Auto-fill failed:", error);
    throw new Error(`Auto-fill failed: ${error.message}`);
  }
}

// Set base item type
async function setBaseItemType(jewelType) {
  const displayName = POE_TRADE_CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) throw new Error(`Unknown jewel type: ${jewelType}`);

  const searchInput = await findElementWithFallback(
    POE_TRADE_CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );
  if (!searchInput) throw new Error("Could not find base item search field");

  console.log("✅ Found base item search field:", searchInput.tagName);
  await interactWithVueMultiselect(searchInput, displayName);
  console.log("✅ Base item type set successfully:", displayName);
}

// Interact with Vue multiselect
async function interactWithVueMultiselect(input, searchText) {
  console.log("🔍 Interacting with Vue multiselect for:", searchText);

  input.focus();
  input.click();
  await wait(300);

  input.value = "";
  await simulateTyping(input, searchText);
  await wait(800);

  const optionSelected = await selectVueMultiselectOption(searchText);
  if (!optionSelected) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(300);
  }
}

// Select Vue multiselect option
async function selectVueMultiselectOption(targetText) {
  console.log("🔍 Looking for Vue multiselect option:", targetText);

  const options = document.querySelectorAll(".multiselect__option");
  for (const option of options) {
    const optionText = option.textContent.trim();
    if (optionText.toLowerCase().includes(targetText.toLowerCase())) {
      console.log("✅ Found matching option:", optionText);
      option.click();
      await wait(500);
      return true;
    }
  }
  return false;
}

// Add mod filters
async function addModFilters(selectedMods) {
  for (let i = 0; i < selectedMods.length; i++) {
    const mod = selectedMods[i];
    console.log(`📝 Adding mod ${i + 1}/${selectedMods.length}:`, mod.modName);

    try {
      await addSingleModFilter(mod, i);
      await wait(1000 + Math.random() * 2000); // Random delay 1-3 seconds
    } catch (error) {
      console.error(`❌ Failed to add mod ${mod.modName}:`, error);
    }
  }
}

// Add single mod filter
async function addSingleModFilter(mod, filterIndex) {
  const statFilterSection = await findElementWithFallback(
    POE_TRADE_CONFIG.SELECTORS.STAT_FILTER_SECTION,
    5000
  );
  if (!statFilterSection) throw new Error("Could not find stat filter section");

  console.log("✅ Found stat filter section");

  const addStatInput = await findElementWithFallback(
    POE_TRADE_CONFIG.SELECTORS.ADD_STAT_INPUT,
    3000
  );
  if (!addStatInput) throw new Error('Could not find "Add Stat Filter" input');

  console.log("✅ Found add stat filter input");

  const tradeSiteStat = mapModToTradeStat(mod.modName);
  addStatInput.focus();
  await wait(200);

  await simulateTyping(addStatInput, tradeSiteStat);
  await wait(800);

  const optionSelected = await selectFromVueDropdown(tradeSiteStat);
  if (!optionSelected) {
    addStatInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(500);
  }

  await wait(1000);
  await setModValuesInLatestFilter(mod);
}

// Select from Vue dropdown
async function selectFromVueDropdown(targetText) {
  console.log("🔍 Looking for Vue dropdown option:", targetText);

  const options = document.querySelectorAll(
    ".multiselect__option:not(.multiselect__option--disabled)"
  );
  for (const option of options) {
    const spans = option.querySelectorAll("span");
    let optionText =
      spans.length > 0
        ? spans[spans.length - 1].textContent.trim()
        : option.textContent.trim();

    if (
      optionText.toLowerCase().includes(targetText.toLowerCase()) ||
      targetText.toLowerCase().includes(optionText.toLowerCase())
    ) {
      console.log("✅ Found matching option:", optionText);
      option.click();
      await wait(500);
      return true;
    }
  }
  return false;
}

// Set values in latest filter
async function setModValuesInLatestFilter(mod) {
  console.log("📊 Setting values for latest filter:", mod.modName);

  // Find the mod data to extract correct values
  // Pass the tier information if available
  const tier = mod.tier || "T1"; // Default to T1 if no tier specified
  const modData = findModDataByName(mod.modName, tier);
  const extractedValues = extractModValues(modData, mod.modName);

  console.log("🎯 Extracted values:", extractedValues);

  const filterContainers = document.querySelectorAll(
    ".filter-group-body .filter.full-span"
  );
  if (filterContainers.length === 0)
    throw new Error("No filter containers found");

  const latestFilter = filterContainers[filterContainers.length - 1];
  console.log("🎯 Using latest filter container");

  const minInput = latestFilter.querySelector('input[placeholder="min"]');
  const maxInput = latestFilter.querySelector('input[placeholder="max"]');

  // Use extracted values if available, otherwise fall back to mod values
  const minValue =
    extractedValues.min !== null ? extractedValues.min : mod.minValue;
  const maxValue =
    extractedValues.max !== null ? extractedValues.max : mod.maxValue;

  if (minInput && minValue !== undefined) {
    await clearAndFillInput(minInput, minValue.toString());
    console.log("📊 Set min value:", minValue);
  }

  if (maxInput && maxValue !== undefined) {
    await clearAndFillInput(maxInput, maxValue.toString());
    console.log("📊 Set max value:", maxValue);
  }

  console.log("✅ Values set for latest filter");
}

// Simulate typing
async function simulateTyping(input, text) {
  console.log("⌨️ Typing text:", text);

  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(100);

  for (let i = 0; i < text.length; i++) {
    input.value += text[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(40 + Math.random() * 80); // Variable typing speed 40-120ms
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(200);
  console.log("✅ Finished typing:", text);
}

// Clear and fill input
async function clearAndFillInput(input, value) {
  console.log("✏️ Filling input with:", value);

  input.focus();
  await wait(100);

  input.select();
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(100);

  for (let i = 0; i < value.length; i++) {
    input.value += value[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(50);
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur"));
  console.log("✅ Input filled successfully");
}

// Utility functions
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
  await waitForElement(["body", ".content"], 10000);
  await wait(1000);
  if (!window.location.href.includes("pathofexile.com/trade")) {
    throw new Error("Not on Path of Exile trade site");
  }
}

async function clearExistingSearch() {
  const clearButton = await findElementWithFallback(
    ['button[title*="Clear"]', ".clear-all-button"],
    2000
  );
  if (clearButton) {
    clearButton.click();
    await wait(500);
  }
}

async function waitForElement(selectors, timeout = 5000) {
  const element = await findElementWithFallback(selectors, timeout);
  if (!element) throw new Error(`Element not found: ${selectors.join(", ")}`);
  return element;
}

function wait(baseMs, randomRange = 200) {
  const randomDelay = Math.random() * randomRange;
  return new Promise((resolve) => setTimeout(resolve, baseMs + randomDelay));
}

// Initialize content script
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  console.log("✅ Content script initialized");

  loadModsData().then(() => {
    console.log("✅ Content script ready with dynamic mod mappings");
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

// Export functions for debugging
window.extractModValues = extractModValues;
window.loadModsData = loadModsData;
window.findDynamicMapping = findDynamicMapping;
window.modMappings = modMappings;

console.log("✅ PoE Easy Search content script loaded successfully");
