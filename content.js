// PoE Easy Search - Content Script (Fixed & Refactored)
console.log("🎯 PoE Easy Search content script loading...");

// Global variables
let abyssJewelMods = null;
let staticMods = null;
let modMappings = {};

// Configuration
const CONFIG = {
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
  GITHUB_URLS: {
    JEWEL_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/abyss_jewel_mods.json",
    STATIC_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/mods.json",
  },
};

// Speed configuration - adjust this single value to control all timing
const SPEED_MULTIPLIER = 0.5; // 0.5 = 2x faster, 0.3 = 3x faster, 1.0 = normal speed

// Base timing values (in milliseconds)
const BASE_TIMING = {
  BETWEEN_MODS: 600, // Delay between adding different mods
  DROPDOWN_WAIT: 400, // Wait for dropdown to populate
  TYPING_CHAR: 30, // Delay between keystrokes
  CLICK_DELAY: 100, // Delay after clicking
  INPUT_FOCUS: 80, // Delay after focusing input
  SCROLL_WAIT: 100, // Wait after scrolling
  VERIFY_WAIT: 500, // Wait to verify element creation
  INITIAL_WAIT: 1000, // Initial page load wait
};

// Load mod data from GitHub
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

// FIXED: Create proper genericized patterns from mod text
function createDynamicModMappings() {
  if (!staticMods) return;

  modMappings = {};
  let mappingCount = 0;

  for (const [modId, modData] of Object.entries(staticMods)) {
    if (!modData.text || modData.domain !== "abyss_jewel") continue;

    // FIXED: Create proper genericized version (replace numbers with #)
    const genericizedText = genericizeModText(modData.text);

    // Use the genericized text as the primary mapping
    modMappings[genericizedText] = {
      modId: modId,
      originalText: modData.text,
      searchText: genericizedText,
      stats: modData.stats,
      required_level: modData.required_level,
      ...modData,
    };
    mappingCount++;

    // FIXED: Add common keyword aliases for important mods
    createKeywordAliases(modData, genericizedText, modMappings);

    // Create weapon aliases for weapon-specific mods
    if (
      modData.text.match(/(dagger|claw|sword|axe|mace|scepter|staff|bow|wand)/i)
    ) {
      const weaponAliases = createWeaponAliases(modData, genericizedText);
      Object.assign(modMappings, weaponAliases);
      mappingCount += Object.keys(weaponAliases).length;
    }
  }

  console.log(`✅ Created ${mappingCount} dynamic mod mappings`);
}

// FIXED: Create keyword aliases for common searches
function createKeywordAliases(modData, genericizedText, mappings) {
  const text = modData.text.toLowerCase();

  // Life mod aliases
  if (text.includes("maximum life") && !text.includes("regenerate")) {
    mappings["added life"] = { ...modData, searchText: genericizedText };
    mappings["life"] = { ...modData, searchText: genericizedText };
    mappings["+# to maximum life"] = {
      ...modData,
      searchText: genericizedText,
    };
  }

  // Life regeneration aliases
  if (text.includes("regenerate") && text.includes("life")) {
    mappings["life regeneration"] = { ...modData, searchText: genericizedText };
    mappings["life regen"] = { ...modData, searchText: genericizedText };
    mappings["regenerate # life per second"] = {
      ...modData,
      searchText: genericizedText,
    };
  }

  // Mana mod aliases
  if (text.includes("maximum mana")) {
    mappings["added mana"] = { ...modData, searchText: genericizedText };
    mappings["mana"] = { ...modData, searchText: genericizedText };
    mappings["+# to maximum mana"] = {
      ...modData,
      searchText: genericizedText,
    };
  }

  // Energy shield aliases
  if (text.includes("maximum energy shield")) {
    mappings["added energy shield"] = {
      ...modData,
      searchText: genericizedText,
    };
    mappings["energy shield"] = { ...modData, searchText: genericizedText };
    mappings["+# to maximum energy shield"] = {
      ...modData,
      searchText: genericizedText,
    };
  }

  // Resistance aliases
  if (text.includes("resistance")) {
    const resistType = text.match(/(fire|cold|lightning|chaos)/);
    if (resistType) {
      mappings[`${resistType[1]} resistance`] = {
        ...modData,
        searchText: genericizedText,
      };
      mappings[`+#% to ${resistType[1]} resistance`] = {
        ...modData,
        searchText: genericizedText,
      };
    }
  }
}

// FIXED: Proper mod text genericization
function genericizeModText(modText) {
  // Replace parenthetical ranges like (14-15) with #
  let genericized = modText.replace(/\(\d+-\d+\)/g, "#");
  // Replace standalone numbers with #
  genericized = genericized.replace(/\b\d+\b/g, "#");
  // Clean up multiple spaces
  genericized = genericized.replace(/\s+/g, " ").trim();

  return genericized;
}

// FIXED: Create weapon aliases using genericized text
function createWeaponAliases(modData, genericizedText) {
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

// FIXED: Enhanced mod finder with exact keyword matching
function findDynamicMapping(searchTerm) {
  if (!modMappings) return null;

  console.log(`🔍 Finding mapping for: "${searchTerm}"`);

  // FIXED: Try exact keyword match first (for "added life" etc.)
  const lowerSearchTerm = searchTerm.toLowerCase();
  if (modMappings[lowerSearchTerm]) {
    console.log(`✅ Exact keyword match found: "${lowerSearchTerm}"`);
    return modMappings[lowerSearchTerm].searchText;
  }

  // Then try genericized search term
  const genericizedSearchTerm = genericizeModText(searchTerm);
  console.log(`🔄 Genericized search term: "${genericizedSearchTerm}"`);

  // Try exact match on genericized text
  if (modMappings[genericizedSearchTerm]) {
    console.log(`✅ Exact genericized match found: "${genericizedSearchTerm}"`);
    return genericizedSearchTerm;
  }

  // Fuzzy matching with scoring
  let bestMatch = null;
  let bestScore = 0;

  const damageType = extractDamageType(searchTerm.toLowerCase());
  const weaponType = extractWeaponType(searchTerm.toLowerCase());

  for (const [pattern, modData] of Object.entries(modMappings)) {
    let score = calculateMatchScore(
      genericizedSearchTerm,
      pattern,
      damageType,
      weaponType
    );

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

  console.log(`❌ No suitable mapping found for: "${searchTerm}"`);
  return null;
}

// Helper functions for matching
function extractDamageType(text) {
  const match = text.match(/(physical|fire|cold|lightning|chaos)/i);
  return match ? match[1].toLowerCase() : null;
}

function extractWeaponType(text) {
  const match = text.match(
    /(dagger|claw|sword|axe|mace|scepter|staff|bow|wand)s?/i
  );
  return match ? match[1].toLowerCase() : null;
}

function calculateMatchScore(searchTerm, pattern, damageType, weaponType) {
  let score = 0;

  const lowerSearchTerm = searchTerm.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  // Exact match gets highest score
  if (lowerPattern === lowerSearchTerm) return 100;

  // Contains match
  if (
    lowerPattern.includes(lowerSearchTerm) ||
    lowerSearchTerm.includes(lowerPattern)
  ) {
    score = 80;
  }

  // Keyword matching
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

  // Bonus for exact damage type match
  if (damageType && lowerPattern.includes(damageType)) score += 20;

  // Bonus for exact weapon type match
  if (weaponType && lowerPattern.includes(weaponType)) score += 15;

  // Penalty for wrong damage type
  if (damageType) {
    const patternDamageType = extractDamageType(lowerPattern);
    if (patternDamageType && patternDamageType !== damageType) score -= 50;
  }

  return score;
}

// Tier-aware value extraction (same logic as popup.js)
function extractModValues(modData, modName) {
  console.log(`🔍 Extracting values for: ${modName}`);

  if (!modData) return { min: null, max: null };

  const textToCheck = modData.originalText || modData.text;
  if (textToCheck) {
    console.log(`📝 Checking text: ${textToCheck}`);

    // Parse full damage ranges like "(14-15) to (25-28)"
    const damageRangeMatch = textToCheck.match(
      /\((\d+)-(\d+)\)\s+to\s+\((\d+)-(\d+)\)/
    );
    if (damageRangeMatch) {
      const minLow = parseInt(damageRangeMatch[1]);
      const maxHigh = parseInt(damageRangeMatch[4]);
      console.log(`🎯 Found damage range: ${minLow} to ${maxHigh}`);
      return { min: minLow, max: maxHigh };
    }

    // Parse single ranges like "(36-40)"
    const singleRangeMatch = textToCheck.match(/\((\d+)-(\d+)\)/);
    if (singleRangeMatch) {
      const min = parseInt(singleRangeMatch[1]);
      const max = parseInt(singleRangeMatch[2]);

      // Convert per-minute to per-second
      if (textToCheck.toLowerCase().includes("per minute")) {
        return { min: Math.round(min / 60), max: Math.round(max / 60) };
      }

      console.log(`✅ Extracted range: ${min}-${max}`);
      return { min, max };
    }
  }

  // Fallback to stats array
  if (modData.stats && modData.stats.length > 0) {
    const firstStat = modData.stats[0];

    // Handle per-minute conversions
    if (firstStat.id && firstStat.id.includes("per_minute")) {
      return {
        min: Math.round(firstStat.min / 60),
        max: Math.round(firstStat.max / 60),
      };
    }

    // Handle percentage conversions
    if (firstStat.id && firstStat.id.includes("permyriad")) {
      return {
        min: Math.round(firstStat.min / 100),
        max: Math.round(firstStat.max / 100),
      };
    }

    return { min: firstStat.min, max: firstStat.max };
  }

  return { min: null, max: null };
}

// Find mod data by name with tier-aware selection
function findModDataByName(modName, tier = "T1") {
  if (!staticMods) return null;

  console.log(`🔍 Finding mod data for: ${modName} (${tier})`);

  const lowerModName = modName.toLowerCase();
  let candidates = [];

  for (const [modId, modData] of Object.entries(staticMods)) {
    if (!modData.text || modData.domain !== "abyss_jewel") continue;

    const modText = modData.text.toLowerCase();
    let isMatch = false;

    // Specific matching logic
    if (lowerModName.includes("life") && !lowerModName.includes("regen")) {
      isMatch =
        modText.includes("maximum life") && !modText.includes("regenerate");
    } else if (
      lowerModName.includes("life") &&
      lowerModName.includes("regen")
    ) {
      isMatch = modText.includes("regenerate") && modText.includes("life");
    } else if (lowerModName.includes("damage")) {
      const damageType = extractDamageType(lowerModName);
      const weaponType = extractWeaponType(lowerModName);
      isMatch =
        modText.includes("damage") &&
        (!damageType || modText.includes(damageType)) &&
        (!weaponType || modText.includes(weaponType));
    } else {
      isMatch =
        modText.includes(lowerModName) || lowerModName.includes(modText);
    }

    if (isMatch) {
      candidates.push({ modId, modData, level: modData.required_level || 0 });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by required level (descending) to get T1 first
  candidates.sort((a, b) => b.level - a.level);

  const selectedMod = candidates[0];
  console.log(`✅ Selected mod: ${selectedMod.modData.text}`);
  return selectedMod.modData;
}

// Create enhanced fallback mappings with proper life mod support
function createFallbackMappings() {
  modMappings = {
    // Life mods
    "added life": "+# to maximum Life",
    life: "+# to maximum Life",
    "+# to maximum life": "+# to maximum Life",

    // Life regeneration
    "life regeneration": "Regenerate # Life per second",
    "life regen": "Regenerate # Life per second",
    "regenerate # life per second": "Regenerate # Life per second",

    // Mana mods
    "added mana": "+# to maximum Mana",
    mana: "+# to maximum Mana",
    "+# to maximum mana": "+# to maximum Mana",

    // Energy shield
    "added energy shield": "+# to maximum Energy Shield",
    "energy shield": "+# to maximum Energy Shield",
    "+# to maximum energy shield": "+# to maximum Energy Shield",

    // Resistances
    "fire resistance": "+#% to Fire Resistance",
    "+#% to fire resistance": "+#% to Fire Resistance",
    "cold resistance": "+#% to Cold Resistance",
    "+#% to cold resistance": "+#% to Cold Resistance",
    "lightning resistance": "+#% to Lightning Resistance",
    "+#% to lightning resistance": "+#% to Lightning Resistance",
    "chaos resistance": "+#% to Chaos Resistance",
    "+#% to chaos resistance": "+#% to Chaos Resistance",
  };
  console.log("✅ Enhanced fallback mappings created");
}

// FIXED: Map mod name to trade site stat
function mapModToTradeStat(modName, mod) {
  console.log(`🔄 Mapping mod: "${modName}"`);

  // First check if we have genericText or searchText from popup
  if (mod && (mod.genericText || mod.searchText)) {
    const genericText = mod.genericText || mod.searchText;
    console.log(`✅ Using genericized text from popup: ${genericText}`);
    return genericText;
  }

  // Otherwise fall back to your existing dynamic mapping
  const dynamicMapping = findDynamicMapping(modName);
  if (dynamicMapping) {
    console.log(`✅ Dynamic mapping: ${modName} → ${dynamicMapping}`);
    return dynamicMapping;
  }

  console.log(`⚠️ No mapping found, using original: ${modName}`);
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
      // Make sure we're passing the full mod objects with minValue/maxValue
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

// Set base item type
async function setBaseItemType(jewelType) {
  const displayName = CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) throw new Error(`Unknown jewel type: ${jewelType}`);

  const searchInput = await findElementWithFallback(
    CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );
  if (!searchInput) throw new Error("Could not find base item search field");

  await interactWithVueMultiselect(searchInput, displayName);
  console.log("✅ Base item type set:", displayName);
}

// Interact with Vue multiselect with faster timing
async function interactWithVueMultiselect(input, searchText) {
  input.focus();
  input.click();
  await delays.click();

  input.value = "";
  await simulateTyping(input, searchText);
  await delays.dropdown();

  const optionSelected = await selectVueMultiselectOption(searchText);
  if (!optionSelected) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await delays.click();
  }
}

// Select Vue multiselect option
async function selectVueMultiselectOption(targetText) {
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

// Add mod filters with optimized timing
async function addModFilters(selectedMods) {
  for (let i = 0; i < selectedMods.length; i++) {
    const mod = selectedMods[i];
    console.log(`📝 Adding mod ${i + 1}/${selectedMods.length}:`, mod.modName);

    try {
      await addSingleModFilter(mod, i);
      await delays.betweenMods(); // Clean and semantic
    } catch (error) {
      console.error(`❌ Failed to add mod ${mod.modName}:`, error);
    }
  }
}

/**
 * Enhanced addSingleModFilter to handle weapon group mods
 */
async function addSingleModFilter(mod, filterIndex) {
  console.log(`🔄 Creating stat filter ${filterIndex + 1} for: ${mod.modName}`);

  // Check if this is a weapon group mod
  const isWeaponGroup = mod.isWeaponGroup && mod.allGenericTexts;

  // Find Add Stat Filter control (your existing code)
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

  if (isWeaponGroup) {
    // Handle weapon group mods specially
    console.log(
      `🔄 Adding weapon group mod with ${mod.allGenericTexts.length} variants`
    );

    // For weapon groups, we'll use the "Count" feature on the trade site
    // This allows searching for ANY of the weapon variants
    await addWeaponGroupFilter(addStatButton, mod);
  } else {
    // Regular mod handling (your existing code)
    const tradeSiteStat = mapModToTradeStat(mod.modName, mod);
    console.log(`🔄 Using trade site stat: "${tradeSiteStat}"`);

    // Interact with Add Stat Filter control (your existing code continues...)
    if (addStatButton.tagName === "BUTTON") {
      addStatButton.click();
      await wait(400);

      const statInput = document.querySelector(
        'input[placeholder*="Add Stat Filter"], .multiselect__input:last-of-type'
      );
      if (statInput) {
        await interactWithStatInput(statInput, tradeSiteStat);
      } else {
        throw new Error(
          "No stat input appeared after clicking Add Stat Filter"
        );
      }
    } else if (addStatButton.tagName === "INPUT") {
      await interactWithStatInput(addStatButton, tradeSiteStat);
    }

    await wait(800);
    const verifyFilter = await verifyStatFilterCreated(tradeSiteStat);
    if (!verifyFilter) {
      throw new Error("Failed to create stat filter");
    }

    await setModValuesInLatestFilter(mod);
  }
}

// Interact with stat input with optimized timing
async function interactWithStatInput(input, tradeSiteStat) {
  input.focus();
  input.click();
  await wait(150); // Reduced from 300ms

  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(100); // Reduced from 200ms

  await simulateTyping(input, tradeSiteStat);
  await wait(600); // Reduced from 1500ms - still enough for dropdown

  const optionSelected = await selectFromStatDropdown(tradeSiteStat);
  if (!optionSelected) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        code: "Enter",
      })
    );
    await wait(250); // Reduced from 500ms
  }
}

// Select from STAT dropdown with faster timing
async function selectFromStatDropdown(targetText) {
  console.log("🔍 Looking for STAT dropdown option:", targetText);

  await delays.dropdown();

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

    const isDamageMatch =
      lowerTargetText.includes("damage") && lowerOptionText.includes("damage");
    const isWeaponMatch =
      (lowerTargetText.includes("wand") && lowerOptionText.includes("wand")) ||
      (lowerTargetText.includes("bow") && lowerOptionText.includes("bow"));

    if (isExactMatch || (containsMatch && isDamageMatch && isWeaponMatch)) {
      console.log(`✅ Found matching STAT option: "${optionText}"`);
      option.scrollIntoView({ block: "nearest" });
      await delays.scroll();
      option.click();
      await delays.click();
      return true;
    }
  }
  return false;
}

// Verify stat filter creation
async function verifyStatFilterCreated(expectedStat) {
  await wait(1000);

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

  const hasMinMaxInputs =
    latestFilter.querySelector('input[placeholder="min"]') &&
    latestFilter.querySelector('input[placeholder="max"]');

  return hasMinMaxInputs;
}

// Set values in latest filter with faster timing
async function setModValuesInLatestFilter(mod) {
  console.log("📊 Setting values for latest filter:", mod.modName);

  // CHANGE: Use the values passed from popup.js (which may be averaged)
  // instead of extracting them from mod data
  let minValue = mod.minValue;
  let maxValue = mod.maxValue;

  // Only fall back to extraction if values weren't provided
  if (minValue === undefined || maxValue === undefined) {
    console.log(
      "⚠️ No values provided from popup, extracting from mod data..."
    );
    const tier = mod.tier || "T1";
    const modData = findModDataByName(mod.modName, tier);
    const extractedValues = extractModValues(modData, mod.modName);
    minValue =
      extractedValues.min !== null ? extractedValues.min : mod.minValue;
    maxValue =
      extractedValues.max !== null ? extractedValues.max : mod.maxValue;
  } else {
    console.log(`✅ Using values from popup: min=${minValue}, max=${maxValue}`);
  }

  await wait(200); // Reduced from 500ms

  // Find latest stat filter
  let latestFilter = null;
  const statFilterContainers = document.querySelectorAll(
    ".search-advanced-pane.brown .filter.full-span, .filter-group .filter.full-span"
  );

  if (statFilterContainers.length > 0) {
    latestFilter = statFilterContainers[statFilterContainers.length - 1];
  }

  if (!latestFilter) {
    throw new Error("No stat filter containers found");
  }

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

// Faster typing simulation
async function simulateTyping(input, text) {
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await delays.focus();

  for (let i = 0; i < text.length; i++) {
    input.value += text[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await delays.typing();
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
  await delays.click();
}

// Faster input filling with optimized timing
async function clearAndFillInput(input, value) {
  if (
    input.disabled ||
    input.closest('.currency, .currency-section, [class*="currency"]')
  ) {
    return;
  }

  input.focus();
  await wait(50); // Reduced from 150ms

  input.select();
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(50); // Reduced from 100ms

  for (let i = 0; i < value.length; i++) {
    input.value += value[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(25 + Math.random() * 25); // Reduced from 50-80ms to 25-50ms
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
  await wait(50); // Reduced from 100ms
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

function wait(baseMs, randomRange = 100) {
  // Apply speed multiplier to both base and random range
  const adjustedBase = baseMs * SPEED_MULTIPLIER;
  const adjustedRange = randomRange * SPEED_MULTIPLIER;
  const randomDelay = Math.random() * adjustedRange;
  return new Promise((resolve) =>
    setTimeout(resolve, adjustedBase + randomDelay)
  );
}

const delays = {
  betweenMods: () => wait(BASE_TIMING.BETWEEN_MODS, 200),
  dropdown: () => wait(BASE_TIMING.DROPDOWN_WAIT, 100),
  typing: () => wait(BASE_TIMING.TYPING_CHAR, 15),
  click: () => wait(BASE_TIMING.CLICK_DELAY, 50),
  focus: () => wait(BASE_TIMING.INPUT_FOCUS, 30),
  scroll: () => wait(BASE_TIMING.SCROLL_WAIT, 50),
  verify: () => wait(BASE_TIMING.VERIFY_WAIT, 100),
  initial: () => wait(BASE_TIMING.INITIAL_WAIT, 200),
};

// Initialize content script
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  console.log("✅ Content script initialized");

  loadModsData().then(() => {
    console.log("✅ Content script ready with fixed mod mappings");
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

/**
 * Add a weapon group filter using the Count feature
 */
async function addWeaponGroupFilter(addStatButton, mod) {
  // We'll add each weapon variant as a separate filter in a group
  // The trade site will treat these as OR conditions when grouped

  // Click the add stat button
  if (addStatButton.tagName === "BUTTON") {
    addStatButton.click();
    await wait(400);
  }

  // Use the first weapon variant to create the filter
  const firstVariant = mod.allGenericTexts[0];

  const statInput =
    document.querySelector(
      'input[placeholder*="Add Stat Filter"], .multiselect__input:last-of-type'
    ) || addStatButton;

  if (statInput) {
    await interactWithStatInput(statInput, firstVariant);

    await wait(800);

    // Verify the filter was created
    const verifyFilter = await verifyStatFilterCreated(firstVariant);
    if (!verifyFilter) {
      console.warn(
        "⚠️ Failed to create weapon group filter, falling back to single mod"
      );
      return;
    }

    // Set the values for the filter
    await setModValuesInLatestFilter(mod);

    // Optional: Look for a "Count" or "Group" option to enable OR logic
    // This depends on the trade site's current UI
    await enableFilterGrouping();
  }
}

/**
 * Enable OR grouping for filters (if available on trade site)
 */
async function enableFilterGrouping() {
  // Look for count/group toggle on the latest filter
  const latestFilter = document.querySelector(
    ".search-advanced-pane.brown .filter.full-span:last-child"
  );

  if (!latestFilter) return;

  // Look for a "Count" dropdown or similar grouping option
  const countOption = latestFilter.querySelector(
    'select[name*="count"], button[title*="group"], .filter-group-toggle'
  );

  if (countOption) {
    console.log("✅ Found grouping option, enabling OR logic");
    if (countOption.tagName === "SELECT") {
      countOption.value = "1"; // Set to "Count: 1" for OR logic
      countOption.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      countOption.click();
    }
    await wait(200);
  }
}

/**
 * Alternative approach: Smart weapon detection in search
 * This enhances your existing mapModToTradeStat function
 */
const originalMapModToTradeStat = mapModToTradeStat;
mapModToTradeStat = function (modName, mod) {
  console.log(`🔄 Mapping mod: "${modName}"`);

  // Check if this is a weapon group mod
  if (mod && mod.isWeaponGroup && mod.genericTexts) {
    // For weapon groups, use a representative genericized text
    // The trade site should recognize the pattern
    const representativeText = mod.genericTexts[0];
    console.log(`✅ Using weapon group representative: ${representativeText}`);
    return representativeText;
  }

  // Otherwise use the original logic
  return originalMapModToTradeStat.call(this, modName, mod);
};

// Export functions for debugging
window.extractModValues = extractModValues;
window.loadModsData = loadModsData;
window.findDynamicMapping = findDynamicMapping;
window.modMappings = modMappings;

console.log("✅ PoE Easy Search content script loaded successfully");
