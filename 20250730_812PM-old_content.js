// PoE Easy Search - Enhanced Content Script for pathofexile.com/trade
console.log("🎯 PoE Easy Search content script loading...");
console.log("📄 Current URL:", window.location.href);

// Configuration for PoE Trade Site Integration
const POE_TRADE_CONFIG = {
  // Mapping from extension jewel types to trade site base item names
  JEWEL_MAPPINGS: {
    murderous: "Murderous Eye Jewel",
    searching: "Searching Eye Jewel",
    hypnotic: "Hypnotic Eye Jewel",
    ghastly: "Ghastly Eye Jewel",
  },

  // Dynamic mod mappings will be loaded from mods data
  MOD_MAPPINGS: {},

  // Selectors for PoE trade site elements (based on ACTUAL HTML structure)
  SELECTORS: {
    // Base item type selection (Vue.js multiselect component)
    BASE_ITEM_SEARCH: [
      '.search-select input[type="text"]',
      ".search-bar .search-select input",
      'input[placeholder*="Search Items"]',
      ".search-left input",
      ".multiselect__input",
    ],

    // Stat filter section (right brown panel)
    STAT_FILTER_SECTION: [
      ".search-advanced-pane.brown",
      ".filter-group-body",
      ".search-advanced-items .brown",
    ],

    // Add stat filter input (multiselect with specific placeholder)
    ADD_STAT_INPUT: [
      'input[placeholder="+ Add Stat Filter"]',
      '.multiselect__input[placeholder*="Add Stat Filter"]',
      '.filter-select-mutate input[type="text"]',
    ],

    // Stat dropdown options (after typing in add stat filter)
    STAT_DROPDOWN_OPTIONS: [
      ".multiselect__option",
      "li.multiselect__element .multiselect__option",
      ".multiselect__content .multiselect__option",
    ],

    // Individual filter containers (after stat is added)
    FILTER_CONTAINERS: [
      ".filter-group-body .filter.full-span",
      ".filter.full-span",
      ".filter-group-body .filter",
    ],

    // Min/Max value inputs (based on actual HTML)
    MIN_VALUE_INPUT: [
      'input.form-control.minmax[placeholder="min"]',
      'input[placeholder="min"]',
      '.filter input[type="number"]:first-of-type',
    ],

    MAX_VALUE_INPUT: [
      'input.form-control.minmax[placeholder="max"]',
      'input[placeholder="max"]',
      '.filter input[type="number"]:last-of-type',
    ],

    // Remove filter buttons
    REMOVE_FILTER_BUTTON: [".btn.remove-btn", "button.remove-btn"],

    // Search button
    SEARCH_BUTTON: [
      ".btn.search-btn",
      "button.search-btn",
      ".controls-center button",
    ],

    // Clear button
    CLEAR_BUTTON: [
      ".btn.clear-btn",
      "button.clear-btn",
      ".controls-right button",
    ],
  },
};

// Global variable to store loaded mods data
let LOADED_MODS_DATA = null;

/**
 * Converts mod text from specific numeric ranges to generic format for trade site compatibility
 */
function genericizeModText(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  return (
    text
      // Replace parenthetical ranges like (8-10) with #
      .replace(/\(\d+-\d+\)/g, "#")
      // Replace standalone numbers (not in parentheses) with #
      .replace(/(?<!\()\b\d+(?!-|\))/g, "#")
      // Clean up any remaining artifacts like extra spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Extract min/max values from mod text with proper unit conversion
 */
function extractModValues(modText, modDetails) {
  if (!modText || typeof modText !== "string") {
    return { min: undefined, max: undefined };
  }

  // First, try to extract values from the text field directly
  const textValues = extractValuesFromText(modText);

  if (textValues.min !== undefined && textValues.max !== undefined) {
    return textValues;
  }

  // Fallback: extract from stats with unit conversion
  if (modDetails && modDetails.stats && modDetails.stats.length > 0) {
    return extractValuesFromStats(modDetails.stats, modText);
  }

  return { min: undefined, max: undefined };
}

/**
 * Extract numeric values from parenthetical ranges in text
 * Examples: "(17-20)" → {min: 17, max: 20}
 *          "+(36-60)" → {min: 36, max: 60}
 *          "2%" → {min: 2, max: 2}
 */
function extractValuesFromText(text) {
  // Pattern 1: Parenthetical ranges like (17-20) or +(36-60)
  const rangeMatch = text.match(/\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
    };
  }

  // Pattern 2: Single values like "2%" or "+25"
  const singleMatch = text.match(/[+\-]?(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    return {
      min: value,
      max: value,
    };
  }

  return { min: undefined, max: undefined };
}

/**
 * Extract values from stats array with unit conversion
 */
function extractValuesFromStats(stats, modText) {
  if (!stats || stats.length === 0) {
    return { min: undefined, max: undefined };
  }

  const stat = stats[0]; // Use first stat
  if (!stat || stat.min === undefined || stat.max === undefined) {
    return { min: undefined, max: undefined };
  }

  let min = stat.min;
  let max = stat.max;

  // Apply unit conversions based on stat ID
  if (stat.id) {
    const conversion = getUnitConversion(stat.id, modText);
    min = Math.round(min * conversion);
    max = Math.round(max * conversion);
  }

  return { min, max };
}

/**
 * Get unit conversion factor based on stat ID and mod text
 */
function getUnitConversion(statId, modText) {
  // Life/Mana/ES regeneration: per_minute → per_second
  if (statId.includes("_per_minute") && modText.includes("per second")) {
    return 1 / 60; // Convert per minute to per second
  }

  // Percentage conversions: some stats store as basis points (1% = 100 basis points)
  if (statId.includes("_permyriad") || statId.includes("_per_ten_thousand")) {
    return 1 / 100; // Convert basis points to percentage
  }

  // Default: no conversion
  return 1;
}

/**
 * Weapon mod alias mappings - handles shared mod pools between weapon types
 */
const WEAPON_MOD_ALIASES = {
  // Ranged weapon damage aliases (Searching Eye Jewels)
  bow: {
    aliases: ["wand", "bow"],
    displayTypes: ["Bow Attacks", "Wand Attacks"],
    searchTerms: ["bow", "wand"],
  },
  wand: {
    aliases: ["wand", "bow"],
    displayTypes: ["Wand Attacks", "Bow Attacks"],
    searchTerms: ["wand", "bow"],
  },

  // Melee weapon damage aliases (Murderous Eye Jewels)
  dagger: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Dagger Attacks",
      "Claw Attacks",
      "Sword Attacks",
      "Axe Attacks",
      "Mace Attacks",
      "Scepter Attacks",
      "Staff Attacks",
    ],
    searchTerms: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
  },
  claw: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Claw Attacks",
      "Dagger Attacks",
      "Sword Attacks",
      "Axe Attacks",
      "Mace Attacks",
      "Scepter Attacks",
      "Staff Attacks",
    ],
    searchTerms: ["claw", "dagger", "sword", "axe", "mace", "scepter", "staff"],
  },
  sword: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Sword Attacks",
      "Dagger Attacks",
      "Claw Attacks",
      "Axe Attacks",
      "Mace Attacks",
      "Scepter Attacks",
      "Staff Attacks",
    ],
    searchTerms: ["sword", "dagger", "claw", "axe", "mace", "scepter", "staff"],
  },
  axe: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Axe Attacks",
      "Dagger Attacks",
      "Claw Attacks",
      "Sword Attacks",
      "Mace Attacks",
      "Scepter Attacks",
      "Staff Attacks",
    ],
    searchTerms: ["axe", "dagger", "claw", "sword", "mace", "scepter", "staff"],
  },
  mace: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Mace Attacks",
      "Dagger Attacks",
      "Claw Attacks",
      "Sword Attacks",
      "Axe Attacks",
      "Scepter Attacks",
      "Staff Attacks",
    ],
    searchTerms: ["mace", "dagger", "claw", "sword", "axe", "scepter", "staff"],
  },
  scepter: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Scepter Attacks",
      "Dagger Attacks",
      "Claw Attacks",
      "Sword Attacks",
      "Axe Attacks",
      "Mace Attacks",
      "Staff Attacks",
    ],
    searchTerms: ["scepter", "dagger", "claw", "sword", "axe", "mace", "staff"],
  },
  staff: {
    aliases: ["dagger", "claw", "sword", "axe", "mace", "scepter", "staff"],
    displayTypes: [
      "Staff Attacks",
      "Dagger Attacks",
      "Claw Attacks",
      "Sword Attacks",
      "Axe Attacks",
      "Mace Attacks",
      "Scepter Attacks",
    ],
    searchTerms: ["staff", "dagger", "claw", "sword", "axe", "mace", "scepter"],
  },
};

/**
 * Load mods data and create dynamic mod mappings
 */
async function loadModsData() {
  if (LOADED_MODS_DATA) {
    return LOADED_MODS_DATA; // Return cached data
  }

  try {
    console.log("📊 Loading both mod data files from GitHub...");

    // Load both files simultaneously
    const [jewelModsResponse, fullModsResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/abyss_jewel_mods.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/mods.json"
      ),
    ]);

    if (!jewelModsResponse.ok || !fullModsResponse.ok) {
      throw new Error("Failed to fetch one or both mod data files");
    }

    const jewelModsData = await jewelModsResponse.json(); // Organization/weights
    const fullModsData = await fullModsResponse.json(); // Actual mod details

    console.log("✅ Both mod data files loaded successfully");
    console.log("📊 Jewel mods structure:", Object.keys(jewelModsData || {}));
    console.log(
      "📊 Full mods entries:",
      Object.keys(fullModsData || {}).length
    );

    // Cache the combined data
    LOADED_MODS_DATA = {
      jewelMods: jewelModsData,
      fullMods: fullModsData,
    };

    // Create dynamic mod mappings using both datasets
    createDynamicModMappings(LOADED_MODS_DATA);

    return LOADED_MODS_DATA;
  } catch (error) {
    console.error("❌ Failed to load mods data:", error);

    // Fallback to basic mappings
    createFallbackMappings();

    return null;
  }
}

/**
 * Create expanded mod mappings that include weapon aliases
 */
function createExpandedModMappings(combinedData) {
  console.log("🔄 Creating expanded mod mappings with weapon aliases...");

  const mappings = {};
  let mappingCount = 0;
  let aliasCount = 0;

  const { jewelMods, fullMods } = combinedData;

  if (jewelMods && jewelMods["Abyss Jewels"]) {
    const abyssJewels = jewelMods["Abyss Jewels"];

    for (const [categoryKey, categoryData] of Object.entries(abyssJewels)) {
      if (categoryData && categoryData.mods) {
        const mods = categoryData.mods;

        for (const [modType, modTypeData] of Object.entries(mods)) {
          for (const [modGroup, modGroupData] of Object.entries(modTypeData)) {
            for (const [uniqueModId, weight] of Object.entries(modGroupData)) {
              const modDetails = fullMods[uniqueModId];

              if (
                modDetails &&
                typeof modDetails === "object" &&
                modDetails.text
              ) {
                const genericText = genericizeModText(modDetails.text);

                // Original mapping
                mappings[uniqueModId] = genericText;
                mappings[modGroup] = genericText;
                mappingCount++;

                // Create weapon aliases for damage mods
                const weaponAliases = createWeaponAliases(
                  modDetails.text,
                  modGroup
                );
                Object.assign(mappings, weaponAliases);
                aliasCount += Object.keys(weaponAliases).length;
              }
            }
          }
        }
      }
    }
  }

  // Add fallback mappings with weapon aliases
  const fallbackMappings = createEnhancedFallbackMappings();
  Object.assign(mappings, fallbackMappings);

  // Update the global config
  POE_TRADE_CONFIG.MOD_MAPPINGS = mappings;

  console.log(
    `✅ Created ${mappingCount} dynamic mod mappings + ${aliasCount} weapon aliases + ${
      Object.keys(fallbackMappings).length
    } fallback mappings`
  );
  console.log(
    "🔍 Sample weapon alias mappings:",
    Object.entries(mappings)
      .filter(([key]) => key.includes("bow") || key.includes("sword"))
      .slice(0, 5)
  );
}

/**
 * Create weapon aliases for a given mod text
 */
function createWeaponAliases(modText, modGroup) {
  const aliases = {};
  const lowerModText = modText.toLowerCase();

  // Detect weapon type in mod text
  for (const [weaponType, config] of Object.entries(WEAPON_MOD_ALIASES)) {
    const foundInText = config.searchTerms.some((term) =>
      lowerModText.includes(term)
    );

    if (foundInText) {
      // Create aliases for all related weapon types
      config.aliases.forEach((aliasWeapon, index) => {
        if (aliasWeapon !== weaponType) {
          // Create display text variants
          const displayType =
            config.displayTypes[index] ||
            `${
              aliasWeapon.charAt(0).toUpperCase() + aliasWeapon.slice(1)
            } Attacks`;

          // Replace weapon type in the original text
          const aliasText = modText.replace(
            new RegExp(config.searchTerms.join("|"), "gi"),
            displayType
          );

          const genericAliasText = genericizeModText(aliasText);

          // Create various search terms
          const searchKeys = [
            `${aliasWeapon} damage`,
            `${aliasWeapon} attacks`,
            `added damage ${aliasWeapon}`,
            `damage with ${aliasWeapon}`,
            `${aliasWeapon}`,
            `${modGroup}_${aliasWeapon}`,
            `added ${aliasWeapon} damage`,
          ];

          // Map all search variations to the same mod
          searchKeys.forEach((key) => {
            aliases[key] = genericAliasText;
          });

          console.log(
            `🔗 Created weapon alias: ${weaponType} → ${aliasWeapon} (${displayType})`
          );
        }
      });

      break; // Found the weapon type, no need to continue
    }
  }

  return aliases;
}

/**
 * Enhanced fallback mappings with weapon aliases
 */
function createEnhancedFallbackMappings() {
  const fallbackMappings = {
    // Life regeneration (specific)
    "life regeneration": "Regenerate # Life per second",
    "life regen": "Regenerate # Life per second",
    "regenerate life": "Regenerate # Life per second",

    // Basic life/mana/ES (separate from regen)
    life: "+# to maximum Life",
    "added life": "+# to maximum Life",
    "maximum life": "+# to maximum Life",
    mana: "+# to maximum Mana",
    "added mana": "+# to maximum Mana",
    "energy shield": "+# to maximum Energy Shield",
    "added energy shield": "+# to maximum Energy Shield",

    // Resistances
    "fire resistance": "+#% to Fire Resistance",
    "cold resistance": "+#% to Cold Resistance",
    "lightning resistance": "+#% to Lightning Resistance",
    "chaos resistance": "+#% to Chaos Resistance",
    "all resistances": "+#% to all Elemental Resistances",

    // Speed stats
    "attack speed": "#% increased Attack Speed",
    "cast speed": "#% increased Cast Speed",
    "movement speed": "#% increased Movement Speed",

    // Critical stats
    "critical multiplier": "+#% to Global Critical Strike Multiplier",
    "critical chance": "#% increased Global Critical Strike Chance",

    // Special mods
    phasing: "#% chance to gain Phasing for # seconds on Kill",

    // Minion stats
    "minion damage": "Minions deal #% increased Damage",
    "minion life": "Minions have #% increased maximum Life",
    "minion attack speed": "Minions have #% increased Attack Speed",
    "minion life regeneration": "Minions Regenerate # Life per second",

    // Attributes
    strength: "+# to Strength",
    dexterity: "+# to Dexterity",
    intelligence: "+# to Intelligence",
    "all attributes": "+# to all Attributes",
  };

  // Add weapon-specific damage aliases
  const damageTypes = ["fire", "cold", "lightning", "physical", "chaos"];
  const weaponTypes = [
    "bow",
    "wand",
    "dagger",
    "claw",
    "sword",
    "axe",
    "mace",
    "scepter",
    "staff",
  ];

  damageTypes.forEach((damageType) => {
    weaponTypes.forEach((weaponType) => {
      // Various search patterns users might type
      const searchPatterns = [
        `${damageType} damage ${weaponType}`,
        `${damageType} damage to ${weaponType}`,
        `${damageType} damage with ${weaponType}`,
        `added ${damageType} damage ${weaponType}`,
        `${weaponType} ${damageType} damage`,
        `${weaponType} ${damageType}`,
        `${damageType} ${weaponType}`,
      ];

      const mappedValue = `Adds # to # ${
        damageType.charAt(0).toUpperCase() + damageType.slice(1)
      } Damage to ${
        weaponType.charAt(0).toUpperCase() + weaponType.slice(1)
      } Attacks`;

      searchPatterns.forEach((pattern) => {
        fallbackMappings[pattern] = mappedValue;
      });
    });
  });

  return fallbackMappings;
}

/**
 * Enhanced mod finder that includes weapon aliases
 */
function findModInLoadedDataWithAliases(modName) {
  const lowerModName = modName.toLowerCase();

  // First try the original function
  const originalResult = findModInLoadedDataEnhanced(modName);
  if (originalResult) {
    return originalResult;
  }

  // Try weapon alias matching
  if (!LOADED_MODS_DATA || !LOADED_MODS_DATA.jewelMods) {
    return null;
  }

  const abyssJewels = LOADED_MODS_DATA.jewelMods["Abyss Jewels"];
  if (!abyssJewels) return null;

  // Check if this is a weapon damage search
  const weaponTypes = Object.keys(WEAPON_MOD_ALIASES);
  const mentionedWeapon = weaponTypes.find((weapon) =>
    lowerModName.includes(weapon)
  );

  if (mentionedWeapon) {
    console.log(
      `🔍 Detected weapon type search: ${mentionedWeapon} in "${modName}"`
    );

    const weaponConfig = WEAPON_MOD_ALIASES[mentionedWeapon];

    // Search for any of the aliased weapon types in the actual mod data
    for (const aliasWeapon of weaponConfig.aliases) {
      for (const [categoryKey, categoryData] of Object.entries(abyssJewels)) {
        if (categoryData && categoryData.mods) {
          const mods = categoryData.mods;

          for (const [modType, modTypeData] of Object.entries(mods)) {
            for (const [modGroup, modGroupData] of Object.entries(
              modTypeData
            )) {
              for (const [modKey, weight] of Object.entries(modGroupData)) {
                const modDetails = LOADED_MODS_DATA.fullMods?.[modKey];

                if (modDetails && modDetails.text) {
                  const modTextLower = modDetails.text.toLowerCase();

                  // Check if this mod matches our search pattern and contains the alias weapon
                  if (
                    modTextLower.includes(aliasWeapon) &&
                    ((lowerModName.includes("damage") &&
                      modTextLower.includes("damage")) ||
                      (lowerModName.includes("fire") &&
                        modTextLower.includes("fire")) ||
                      (lowerModName.includes("cold") &&
                        modTextLower.includes("cold")) ||
                      (lowerModName.includes("lightning") &&
                        modTextLower.includes("lightning")) ||
                      (lowerModName.includes("physical") &&
                        modTextLower.includes("physical")) ||
                      (lowerModName.includes("chaos") &&
                        modTextLower.includes("chaos")))
                  ) {
                    console.log(
                      `🔗 Found weapon alias match: ${modDetails.text} for search "${modName}"`
                    );

                    // Replace the weapon type in the text with the requested weapon
                    const weaponCapitalized =
                      mentionedWeapon.charAt(0).toUpperCase() +
                      mentionedWeapon.slice(1);
                    const aliasCapitalized =
                      aliasWeapon.charAt(0).toUpperCase() +
                      aliasWeapon.slice(1);

                    const modifiedText = modDetails.text.replace(
                      new RegExp(`${aliasCapitalized} Attacks`, "gi"),
                      `${weaponCapitalized} Attacks`
                    );

                    return genericizeModText(modifiedText);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
}

// Enhanced mod finder with better life regen detection
function findModInLoadedDataEnhanced(modName) {
  if (!LOADED_MODS_DATA || !LOADED_MODS_DATA.jewelMods) {
    return null;
  }

  const abyssJewels = LOADED_MODS_DATA.jewelMods["Abyss Jewels"];
  if (!abyssJewels) return null;

  const lowerModName = modName.toLowerCase();

  // Search through all categories and mod types
  for (const [categoryKey, categoryData] of Object.entries(abyssJewels)) {
    if (categoryData && categoryData.mods) {
      const mods = categoryData.mods;

      for (const [modType, modTypeData] of Object.entries(mods)) {
        for (const [modGroup, modGroupData] of Object.entries(modTypeData)) {
          for (const [modKey, weight] of Object.entries(modGroupData)) {
            // Get the actual mod details
            const modDetails = LOADED_MODS_DATA.fullMods?.[modKey];

            if (modDetails && modDetails.text) {
              // Check for life regeneration specifically
              if (
                lowerModName.includes("life") &&
                lowerModName.includes("regen")
              ) {
                if (
                  modDetails.text.toLowerCase().includes("regenerate") &&
                  modDetails.text.toLowerCase().includes("life") &&
                  modDetails.text.toLowerCase().includes("per second")
                ) {
                  console.log("🎯 Found life regen match:", modDetails.text);
                  return genericizeModText(modDetails.text);
                }
              }

              // Check for other exact matches
              if (modKey === modName || modGroup === modName) {
                return genericizeModText(modDetails.text);
              }

              // Enhanced partial matching
              const lowerModKey = modKey.toLowerCase();
              const lowerModGroup = modGroup.toLowerCase();
              const lowerModText = modDetails.text.toLowerCase();

              // Priority matching for life regen
              if (
                lowerModName.includes("life") &&
                lowerModName.includes("regen")
              ) {
                if (
                  lowerModText.includes("regenerate") &&
                  lowerModText.includes("life")
                ) {
                  return genericizeModText(modDetails.text);
                }
              }

              // General partial matching
              if (
                lowerModKey.includes(lowerModName) ||
                lowerModGroup.includes(lowerModName) ||
                lowerModName.includes(lowerModKey) ||
                lowerModName.includes(lowerModGroup)
              ) {
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

/**
 * Create dynamic mod mappings from combined data
 */
function createDynamicModMappings(combinedData) {
  createExpandedModMappings(combinedData);
}

/**
 * Create fallback mappings if data loading fails
 */
function createFallbackMappings() {
  console.log("⚠️ Creating enhanced fallback mod mappings...");

  const fallbackMappings = createEnhancedFallbackMappings();

  POE_TRADE_CONFIG.MOD_MAPPINGS = fallbackMappings;
  console.log("✅ Enhanced fallback mappings created");
}

// Wait for page to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  console.log("✅ Content script initialized on:", window.location.href);

  // Load mods data immediately
  loadModsData()
    .then(() => {
      console.log("✅ Content script ready with dynamic mod mappings");
    })
    .catch((error) => {
      console.error(
        "❌ Failed to load mods data during initialization:",
        error
      );
    });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Content script received message:", message.action);

    if (message.action === "ping") {
      // Respond to ping to indicate content script is ready
      console.log("🏓 Responding to ping - content script is ready");
      sendResponse({ success: true, ready: true });
      return;
    }

    if (message.action === "autoFill") {
      console.log("🚀 Starting auto-fill process...");
      handleAutoFill(message.config)
        .then((result) => {
          console.log("✅ Auto-fill completed:", result);
          sendResponse({ success: true, result });
        })
        .catch((error) => {
          console.error("❌ Auto-fill error:", error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Indicate async response
    }

    if (message.action === "debugPage") {
      debugPageStructure();
      sendResponse({ success: true, message: "Debug info logged to console" });
      return;
    }

    console.log("⚠️ Unknown action:", message.action);
    sendResponse({ success: false, error: "Unknown action" });
  });

  console.log("🎯 Content script ready for auto-fill requests");
}

// Main auto-fill handler - Enhanced with better error handling and retry logic
async function handleAutoFill(config) {
  console.log("📝 Starting auto-fill with config:", config);

  try {
    // Ensure mods data is loaded
    await loadModsData();

    // Wait for page to stabilize
    await waitForPageReady();

    // Clear any existing search to start clean
    console.log("🔄 Clearing existing search...");
    await clearExistingSearch();

    // Step 1: Set the base item type (jewel)
    console.log("💎 Setting jewel type:", config.jewelType);
    await setBaseItemType(config.jewelType);

    // Step 2: Add mod filters if we have specific mods
    if (
      config.searchMode === "with-mods" &&
      config.selectedMods &&
      config.selectedMods.length > 0
    ) {
      console.log("🔍 Adding", config.selectedMods.length, "mod filters...");
      await addModFilters(config.selectedMods);
    } else {
      console.log("📋 Searching for base jewel only (no specific mods)");
    }

    // Step 3: Manual search only (anti-bot measure)
    console.log(
      "✅ Form prepared. Please click search manually to avoid bot detection."
    );
    console.log(
      "🎯 This helps prevent getting logged out due to anti-bot measures."
    );

    return {
      success: true,
      message: `Successfully configured search for ${
        POE_TRADE_CONFIG.JEWEL_MAPPINGS[config.jewelType]
      } ${
        config.searchMode === "with-mods"
          ? "with " + config.selectedMods.length + " mods"
          : "(base only)"
      }`,
    };
  } catch (error) {
    console.error("❌ Auto-fill failed:", error);

    // Provide helpful error context
    const errorContext = await gatherErrorContext();
    throw new Error(
      `Auto-fill failed: ${error.message}\n\nContext: ${errorContext}`
    );
  }
}

// Wait for the page to be ready for interaction
async function waitForPageReady() {
  console.log("⏳ Waiting for page to be ready...");

  // Wait for basic page elements
  await waitForElement(["body", ".content", ".main"], 10000);

  // Wait a bit more for dynamic content to load
  await wait(1000);

  // Check if we're on the right page
  if (!window.location.href.includes("pathofexile.com/trade")) {
    throw new Error("Not on Path of Exile trade site");
  }

  console.log("✅ Page ready for interaction");
}

// Clear existing search to start fresh
async function clearExistingSearch() {
  const clearSelectors = [
    'button[title*="Clear"]',
    'button:contains("Clear")',
    ".clear-all-button",
    '[data-testid="clear-search"]',
    'button[data-action="clear"]',
  ];

  const clearButton = await findElementWithFallback(clearSelectors, 2000);
  if (clearButton) {
    console.log("🔄 Found clear button, clicking...");
    clearButton.click();
    await wait(500);
  } else {
    console.log("⚠️ No clear button found, continuing...");
  }
}

// Enhanced base item type setting for Vue.js multiselect
async function setBaseItemType(jewelType) {
  console.log("💎 Setting base item type:", jewelType);

  const displayName = POE_TRADE_CONFIG.JEWEL_MAPPINGS[jewelType];
  if (!displayName) {
    throw new Error(`Unknown jewel type: ${jewelType}`);
  }

  console.log(
    "💎 Looking for Vue.js multiselect search field for:",
    displayName
  );

  // Strategy 1: Find the main search multiselect input
  const searchInput = await findElementWithFallback(
    POE_TRADE_CONFIG.SELECTORS.BASE_ITEM_SEARCH,
    5000
  );

  if (!searchInput) {
    throw new Error("Could not find base item search field");
  }

  console.log(
    "✅ Found base item search field:",
    searchInput.tagName,
    searchInput.placeholder || searchInput.className
  );

  // Vue.js multiselect interaction
  await interactWithVueMultiselect(searchInput, displayName);

  console.log("✅ Base item type set successfully:", displayName);
}

// Interact with Vue.js multiselect component
async function interactWithVueMultiselect(input, searchText) {
  console.log("🔍 Interacting with Vue multiselect for:", searchText);

  // Focus and click the input to open dropdown
  input.focus();
  input.click();
  await wait(300);

  // Clear and type the search text
  input.value = "";
  await simulateTyping(input, searchText);

  // Wait for dropdown options to appear
  await wait(800);

  // Try to find and click the matching option
  const optionSelected = await selectVueMultiselectOption(searchText);

  if (!optionSelected) {
    console.log(
      "⚠️ Could not select from dropdown, pressing Enter as fallback"
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(300);
  }
}

// Select option from Vue multiselect dropdown
async function selectVueMultiselectOption(targetText) {
  console.log("🔍 Looking for Vue multiselect option:", targetText);

  const optionSelectors = POE_TRADE_CONFIG.SELECTORS.STAT_DROPDOWN_OPTIONS;

  for (const selector of optionSelectors) {
    const options = document.querySelectorAll(selector);

    for (const option of options) {
      const optionText = option.textContent.trim();

      // Check for exact match or partial match
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
  }

  console.log("⚠️ No matching option found in Vue multiselect");
  return false;
}

// Enhanced mod filter addition with better error handling
async function addModFilters(selectedMods) {
  console.log("🔍 Adding", selectedMods.length, "mod filters...");

  for (let i = 0; i < selectedMods.length; i++) {
    const mod = selectedMods[i];
    console.log(`📝 Adding mod ${i + 1}/${selectedMods.length}:`, mod.modName);

    try {
      await addSingleModFilter(mod, i);
      await wait(800); // Delay between mods for stability
    } catch (error) {
      console.error(`❌ Failed to add mod ${mod.modName}:`, error);
      // Continue with other mods instead of failing completely
      console.log("⚠️ Continuing with remaining mods...");
    }
  }

  console.log("✅ Finished processing mod filters");
}

// Enhanced single mod filter addition (based on actual HTML structure)
async function addSingleModFilter(mod, filterIndex) {
  console.log(`📝 Adding mod filter ${filterIndex}:`, mod.modName);

  // Step 1: Find the stat filter section
  const statFilterSection = await findElementWithFallback(
    POE_TRADE_CONFIG.SELECTORS.STAT_FILTER_SECTION,
    5000
  );

  if (!statFilterSection) {
    throw new Error("Could not find stat filter section");
  }

  console.log("✅ Found stat filter section");

  // Step 2: Find the "Add Stat Filter" input
  const addStatInput = await findElementWithFallback(
    POE_TRADE_CONFIG.SELECTORS.ADD_STAT_INPUT,
    3000
  );

  if (!addStatInput) {
    throw new Error('Could not find "Add Stat Filter" input');
  }

  console.log("✅ Found add stat filter input");

  // Step 3: Map mod name to trade site stat using dynamic mapping
  const tradeSiteStat = mapModToTradeStat(mod.modName);
  console.log("🔄 Mapped mod name:", mod.modName, "→", tradeSiteStat);

  // Step 4: Focus the input and start typing
  addStatInput.focus();
  await wait(200);

  // Step 5: Type the search text
  await simulateTyping(addStatInput, tradeSiteStat);

  // Step 6: Wait for dropdown options to appear and select
  await wait(800);
  const optionSelected = await selectFromVueDropdown(tradeSiteStat);

  if (!optionSelected) {
    console.log("⚠️ Could not select option, trying Enter key");
    addStatInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await wait(500);
  }

  // Step 7: Wait for the new filter to be created
  await wait(1000);

  // Step 8: Find the newly created filter and set min/max values
  await setModValuesInLatestFilter(mod);

  console.log("✅ Successfully added mod filter:", mod.modName);
}

// Select option from Vue multiselect dropdown (based on actual HTML)
async function selectFromVueDropdown(targetText) {
  console.log("🔍 Looking for Vue dropdown option:", targetText);

  // Look for multiselect options based on actual HTML structure
  const options = document.querySelectorAll(
    ".multiselect__option:not(.multiselect__option--disabled)"
  );

  for (const option of options) {
    // Get the text content, accounting for the icon structure
    const spans = option.querySelectorAll("span");
    let optionText = "";

    // The actual mod text is usually in the last span
    if (spans.length > 0) {
      optionText = spans[spans.length - 1].textContent.trim();
    } else {
      optionText = option.textContent.trim();
    }

    // Check for match (case insensitive, partial match)
    if (
      optionText.toLowerCase().includes(targetText.toLowerCase()) ||
      targetText.toLowerCase().includes(optionText.toLowerCase())
    ) {
      console.log("✅ Found matching option:", optionText);

      // Click the option
      option.click();
      await wait(500);
      return true;
    }
  }

  console.log("⚠️ No matching option found in dropdown");
  return false;
}

// Set values in the most recently created filter
async function setModValuesInLatestFilter(mod) {
  console.log("📊 Setting values for latest filter:", mod.modName);

  // Find all filter containers
  const filterContainers = document.querySelectorAll(
    ".filter-group-body .filter.full-span"
  );

  if (filterContainers.length === 0) {
    throw new Error("No filter containers found");
  }

  // Get the last (most recent) filter
  const latestFilter = filterContainers[filterContainers.length - 1];

  console.log("🎯 Using latest filter container");

  // Find min and max inputs within this container
  const minInput = latestFilter.querySelector('input[placeholder="min"]');
  const maxInput = latestFilter.querySelector('input[placeholder="max"]');

  // Set minimum value
  if (minInput && mod.minValue !== undefined) {
    await clearAndFillInput(minInput, mod.minValue.toString());
    console.log("📊 Set min value:", mod.minValue);
  }

  // Set maximum value
  if (maxInput && mod.maxValue !== undefined) {
    await clearAndFillInput(maxInput, mod.maxValue.toString());
    console.log("📊 Set max value:", mod.maxValue);
  }

  if (!minInput && !maxInput) {
    console.log("⚠️ No min/max inputs found in latest filter");
  }

  console.log("✅ Values set for latest filter");
}

// Simulate realistic typing for Vue.js inputs
async function simulateTyping(input, text) {
  console.log("⌨️ Typing text:", text);

  // Clear first
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(100);

  // Type character by character
  for (let i = 0; i < text.length; i++) {
    input.value += text[i];

    // Trigger Vue input events
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("keyup", { bubbles: true }));

    await wait(50); // Realistic typing speed
  }

  // Final events for Vue reactivity
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(200);

  console.log("✅ Finished typing:", text);
}

// Map extension mod names to trade site stat names using dynamic mappings
function mapModToTradeStat(modName) {
  // Ensure mods data is loaded
  if (
    !LOADED_MODS_DATA &&
    Object.keys(POE_TRADE_CONFIG.MOD_MAPPINGS).length === 0
  ) {
    console.log(
      "⚠️ Mods data not loaded, using fallback mapping for:",
      modName
    );
    createFallbackMappings();
  }

  // Direct mapping first (try exact mod key)
  if (POE_TRADE_CONFIG.MOD_MAPPINGS[modName]) {
    console.log("✅ Found direct mapping for:", modName);
    return POE_TRADE_CONFIG.MOD_MAPPINGS[modName];
  }

  // ENHANCED: More precise fuzzy matching with priority order
  const lowerModName = modName.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [key, value] of Object.entries(POE_TRADE_CONFIG.MOD_MAPPINGS)) {
    const keyLower = key.toLowerCase();
    let score = 0;

    // Exact match gets highest priority
    if (keyLower === lowerModName) {
      console.log("✅ Found exact fuzzy mapping for:", modName, "→", key);
      return value;
    }

    // Specific patterns for life regeneration
    if (lowerModName.includes("life") && lowerModName.includes("regen")) {
      if (
        key.includes("LifeRegeneration") ||
        (keyLower.includes("regenerate") && keyLower.includes("life"))
      ) {
        score = 95;
      }
    }

    // Specific patterns for other mod types
    if (lowerModName.includes("life") && !lowerModName.includes("regen")) {
      if (
        key.includes("AbyssJewelLife") ||
        (keyLower.includes("life") && keyLower.includes("maximum"))
      ) {
        score = 90;
      }
    }

    // General matching (lower priority)
    if (score === 0) {
      if (keyLower.includes(lowerModName) || lowerModName.includes(keyLower)) {
        score = 70;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { key, value };
    }
  }

  if (bestMatch && bestScore >= 85) {
    console.log(
      "✅ Found prioritized mapping for:",
      modName,
      "→",
      bestMatch.key,
      `(score: ${bestScore})`
    );
    return bestMatch.value;
  }

  // If we have loaded mods data, try to find it there
  if (LOADED_MODS_DATA) {
    const dynamicMapping = findModInLoadedDataWithAliases(modName);
    if (dynamicMapping) {
      console.log("✅ Found dynamic mapping for:", modName);
      // Cache it for future use
      POE_TRADE_CONFIG.MOD_MAPPINGS[modName] = dynamicMapping;
      return dynamicMapping;
    }
  }

  // If no mapping found, return the original name and hope for the best
  console.log("⚠️ No stat mapping found for:", modName, "using original name");
  return modName;
}

// Enhanced helper: Clear and fill input with realistic typing
async function clearAndFillInput(input, value) {
  console.log("✏️ Filling input with:", value);

  // Focus the input
  input.focus();
  await wait(100);

  // Clear existing value
  input.select();
  input.value = "";

  // Trigger input event to clear
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(100);

  // Type the value (simulate realistic typing)
  for (let i = 0; i < value.length; i++) {
    input.value += value[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(50); // Short delay between characters
  }

  // Final events
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur"));

  console.log("✅ Input filled successfully");
}

// Enhanced element finder with multiple strategies and timeout
async function findElementWithFallback(selectors, timeout = 5000) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  // Try immediate selection first
  for (const selector of selectorArray) {
    try {
      // Handle :contains selectors manually
      if (selector.includes(":contains")) {
        const element = findElementByText(selector);
        if (element) return element;
      } else {
        const element = document.querySelector(selector);
        if (element) return element;
      }
    } catch (e) {
      console.log("⚠️ Invalid selector:", selector);
    }
  }

  // If not found immediately, wait and retry
  return new Promise((resolve) => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      for (const selector of selectorArray) {
        try {
          let element;

          if (selector.includes(":contains")) {
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

  return Array.from(elements).find((el) =>
    el.textContent.toLowerCase().includes(text.toLowerCase())
  );
}

// Wait for specific element to appear
async function waitForElement(selectors, timeout = 5000) {
  const element = await findElementWithFallback(selectors, timeout);
  if (!element) {
    throw new Error(`Element not found: ${selectors.join(", ")}`);
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
    mappingsCount: Object.keys(POE_TRADE_CONFIG.MOD_MAPPINGS).length,
  };

  // Check for common elements
  const checks = {
    hasSearchInput: !!document.querySelector('input[type="text"]'),
    hasButtons: document.querySelectorAll("button").length,
    hasSelects: document.querySelectorAll("select").length,
    hasForms: document.querySelectorAll("form").length,
  };

  return JSON.stringify({ ...context, ...checks }, null, 2);
}

// Debug function to inspect page structure
function debugPageStructure() {
  console.log("🔍 PoE Trade Site Structure Debug:");
  console.log("- URL:", window.location.href);
  console.log("- Title:", document.title);
  console.log("- Mods Data Loaded:", !!LOADED_MODS_DATA);
  console.log(
    "- Dynamic Mappings Count:",
    Object.keys(POE_TRADE_CONFIG.MOD_MAPPINGS).length
  );

  // Show sample mappings
  console.log("\n📊 Sample Dynamic Mappings:");
  const sampleMappings = Object.entries(POE_TRADE_CONFIG.MOD_MAPPINGS).slice(
    0,
    10
  );
  sampleMappings.forEach(([key, value], i) => {
    console.log(`${i + 1}. ${key} → ${value}`);
  });

  // Look for main search elements
  console.log("\n🔍 Search Elements:");
  POE_TRADE_CONFIG.SELECTORS.BASE_ITEM_SEARCH.forEach((selector, i) => {
    const element = document.querySelector(selector);
    console.log(
      `${i + 1}. ${selector}: ${element ? "✅ FOUND" : "❌ Not found"}`
    );
  });

  // Look for stat filter elements
  console.log("\n🔍 Stat Filter Elements:");
  POE_TRADE_CONFIG.SELECTORS.STAT_FILTER_SECTION.forEach((selector, i) => {
    const element = document.querySelector(selector);
    console.log(
      `${i + 1}. ${selector}: ${element ? "✅ FOUND" : "❌ Not found"}`
    );
  });

  // General form analysis
  console.log("\n📊 General Form Analysis:");
  const forms = document.querySelectorAll("form");
  const inputs = document.querySelectorAll("input");
  const buttons = document.querySelectorAll("button");
  const selects = document.querySelectorAll("select");

  console.log(`- Forms: ${forms.length}`);
  console.log(`- Inputs: ${inputs.length}`);
  console.log(`- Buttons: ${buttons.length}`);
  console.log(`- Selects: ${selects.length}`);

  // Show first few inputs with details
  console.log("\n📝 Sample Inputs:");
  for (let i = 0; i < Math.min(5, inputs.length); i++) {
    const input = inputs[i];
    console.log(`${i + 1}.`, {
      type: input.type,
      placeholder: input.placeholder || "none",
      id: input.id || "none",
      name: input.name || "none",
      className: input.className.slice(0, 30) || "none",
    });
  }

  // Show buttons
  console.log("\n🔘 Sample Buttons:");
  for (let i = 0; i < Math.min(5, buttons.length); i++) {
    const btn = buttons[i];
    console.log(`${i + 1}.`, {
      text: btn.textContent.trim().slice(0, 20),
      type: btn.type || "none",
      className: btn.className.slice(0, 30) || "none",
    });
  }
}

// Enhanced wait function with randomization
function wait(baseMs, randomRange = 200) {
  const randomDelay = Math.random() * randomRange;
  const totalDelay = baseMs + randomDelay;
  return new Promise((resolve) => setTimeout(resolve, totalDelay));
}

// Make functions available globally
window.extractModValues = extractModValues;
window.extractValuesFromText = extractValuesFromText;
window.extractValuesFromStats = extractValuesFromStats;
window.getUnitConversion = getUnitConversion;
window.debugPageStructure = debugPageStructure;
window.POE_TRADE_CONFIG = POE_TRADE_CONFIG;
window.loadModsData = loadModsData;
window.genericizeModText = genericizeModText;
window.createDynamicModMappings = createDynamicModMappings;

// Function to update debug data after loading
window.updateDebugData = function () {
  window.LOADED_MODS_DATA = LOADED_MODS_DATA;
  console.log(
    "🔍 Debug data updated. LOADED_MODS_DATA keys:",
    Object.keys(LOADED_MODS_DATA || {})
  );
};

console.log(
  "✅ Enhanced PoE Easy Search content script loaded successfully with weapon aliases and dynamic mod mappings"
);
console.log(
  "🔍 Call debugPageStructure() in console to inspect page structure"
);
console.log("📋 Configuration loaded:", Object.keys(POE_TRADE_CONFIG));
console.log("🚀 Dynamic mod mapping system with weapon aliases initialized");
