// PoE Trade Helper - Enhanced Popup Script with Tier Range Selection
console.log("🎯 PoE Trade Helper - Popup script loading...");

// === GLOBAL STATE ===
let currentJewelType = "";
let selectedMods = [];
let abyssJewelsData = null;
let abyssJewelModsData = null;
let fullModsData = null;
let processedMods = {};
let jewelTypeToTagMap = {};
let currentModForTierSelection = null;
let elements = {};

// === CONFIGURATION ===
const JEWEL_TYPE_CONFIG = {
  murderous: {
    displayName: "Murderous Eye Jewel",
    tagPattern: ["not_for_sale", "abyss_jewel_melee", "abyss_jewel", "default"],
  },
  searching: {
    displayName: "Searching Eye Jewel",
    tagPattern: [
      "not_for_sale",
      "abyss_jewel_ranged",
      "abyss_jewel",
      "default",
    ],
  },
  hypnotic: {
    displayName: "Hypnotic Eye Jewel",
    tagPattern: [
      "not_for_sale",
      "abyss_jewel_caster",
      "abyss_jewel",
      "default",
    ],
  },
  ghastly: {
    displayName: "Ghastly Eye Jewel",
    tagPattern: [
      "not_for_sale",
      "abyss_jewel_minion",
      "abyss_jewel",
      "default",
    ],
  },
};

const WEAPON_EQUIVALENTS = {
  wand: ["wand", "bow"],
  bow: ["wand", "bow"],
  dagger: [
    "dagger",
    "claw",
    "one handed sword",
    "one handed axe",
    "one handed mace",
    "sceptre",
  ],
  claw: [
    "dagger",
    "claw",
    "one handed sword",
    "one handed axe",
    "one handed mace",
    "sceptre",
  ],
  sword: [
    "dagger",
    "claw",
    "one handed sword",
    "one handed axe",
    "one handed mace",
    "sceptre",
  ],
  axe: [
    "dagger",
    "claw",
    "one handed sword",
    "one handed axe",
    "one handed mace",
    "sceptre",
  ],
  mace: [
    "dagger",
    "claw",
    "one handed sword",
    "one handed axe",
    "one handed mace",
    "sceptre",
  ],
  sceptre: [
    "dagger",
    "claw",
    "one handed sword",
    "one handed axe",
    "one handed mace",
    "sceptre",
  ],
  staff: ["staff", "two handed sword", "two handed axe", "two handed mace"],
  "two handed sword": [
    "staff",
    "two handed sword",
    "two handed axe",
    "two handed mace",
  ],
  "two handed axe": [
    "staff",
    "two handed sword",
    "two handed axe",
    "two handed mace",
  ],
  "two handed mace": [
    "staff",
    "two handed sword",
    "two handed axe",
    "two handed mace",
  ],
};

// === INITIALIZATION ===
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 DOM loaded, initializing popup...");

  try {
    await loadDataFiles();
    processJewelData();
    initializeElements();
    attachEventListeners();
    populateJewelDropdown();
    initializeSpeedControl();

    console.log("✅ Popup initialization complete");
    showStatusMessage("Extension loaded successfully", "success");
  } catch (error) {
    console.error("❌ Failed to initialize popup:", error);
    showStatusMessage("Failed to load extension data", "error");
  }
});

// === DATA LOADING ===
async function loadDataFiles() {
  console.log("📁 Loading data files from GitHub...");

  const GITHUB_BASE_URL =
    "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/";

  try {
    const [jewelResponse, modsResponse, fullModsResponse] = await Promise.all([
      fetch(`${GITHUB_BASE_URL}abyss_jewels.json`),
      fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`),
      fetch(`${GITHUB_BASE_URL}mods.json`),
    ]);

    if (!jewelResponse.ok || !modsResponse.ok || !fullModsResponse.ok) {
      throw new Error("Failed to load data files");
    }

    abyssJewelsData = await jewelResponse.json();
    abyssJewelModsData = await modsResponse.json();
    fullModsData = await fullModsResponse.json();

    console.log("✅ All data loaded successfully");
  } catch (error) {
    console.error("❌ Error loading data files:", error);
    throw error;
  }
}

function processJewelData() {
  Object.entries(JEWEL_TYPE_CONFIG).forEach(([key, config]) => {
    jewelTypeToTagMap[key] = config.tagPattern.join(",");
  });
}

// === MOD PROCESSING ===
function getModsForJewelType(jewelType) {
  if (!jewelType || !abyssJewelModsData || !fullModsData) return {};

  if (processedMods[jewelType]) {
    return processedMods[jewelType];
  }

  const tagString = jewelTypeToTagMap[jewelType];
  if (!tagString) return {};

  const abyssJewelsSection = abyssJewelModsData["Abyss Jewels"];
  if (!abyssJewelsSection) return {};

  const jewelData = abyssJewelsSection[tagString];
  if (!jewelData) return {};

  const mods = {};

  Object.entries(jewelData.mods || {}).forEach(([category, categoryMods]) => {
    Object.entries(categoryMods).forEach(([modKey, modVariants]) => {
      const uniqueKey = `${category}_${modKey}`.toLowerCase();

      const tiers = {};
      const sortedVariants = Object.entries(modVariants)
        .map(([variantKey, weight]) => {
          const modDetails = fullModsData?.[variantKey];
          return {
            variantKey,
            weight,
            modDetails,
            requiredLevel: modDetails?.required_level || 1,
          };
        })
        .sort((a, b) => (b.requiredLevel || 0) - (a.requiredLevel || 0));

      sortedVariants.forEach(({ variantKey, weight, modDetails }, index) => {
        const tierNum = index + 1;
        const tierKey = `T${tierNum}`;

        let tierValues = { min: undefined, max: undefined };

        if (modDetails && modDetails.text) {
          tierValues = extractModValues(modDetails.text, modDetails);

          // Debug logging for damage mods
          if (
            modDetails.text.includes("Added") &&
            modDetails.text.includes("Damage")
          ) {
            console.log(
              `[Tier Extraction Debug] ${tierKey} - Text: "${modDetails.text}", Extracted: min=${tierValues.min}, max=${tierValues.max}`
            );
          }
        }

        if (tierValues.min === undefined || tierValues.max === undefined) {
          tierValues = getFallbackValues(modKey, tierNum);
        }

        tiers[tierKey] = {
          min: tierValues.min,
          max: tierValues.max,
          weight: weight,
          variantKey: variantKey,
          requiredLevel: modDetails?.required_level || 1,
          text: modDetails?.text || "Unknown",
        };
      });

      mods[uniqueKey] = {
        name: formatModName(modKey),
        category: category,
        confidence: 95,
        statId: modKey,
        displayText: formatModName(modKey),
        tiers: tiers,
      };
    });
  });

  processedMods[jewelType] = mods;
  console.log(`✅ Processed ${Object.keys(mods).length} mods for ${jewelType}`);
  return mods;
}

// === VALUE EXTRACTION ===
function extractModValues(modText, modDetails) {
  if (!modText || typeof modText !== "string") {
    return { min: undefined, max: undefined };
  }

  const textValues = extractValuesFromText(modText);

  // Debug logging
  if (modText.includes("Added") && modText.includes("Damage")) {
    console.log(`[Extract Debug] Text: "${modText}"`);
    console.log(`[Extract Debug] Text extraction result:`, textValues);
  }

  if (textValues.min !== undefined && textValues.max !== undefined) {
    return textValues;
  }

  // Fallback to stats
  if (modDetails && modDetails.stats && modDetails.stats.length > 0) {
    const statsValues = extractValuesFromStats(modDetails.stats, modText);

    if (modText.includes("Added") && modText.includes("Damage")) {
      console.log(`[Extract Debug] Stats fallback used:`, statsValues);
      console.log(`[Extract Debug] Stats data:`, modDetails.stats);
    }

    return statsValues;
  }

  return { min: undefined, max: undefined };
}

function extractValuesFromText(text) {
  // Handle damage ranges like "(14-15) to (25-28)"
  // For these, we want the FULL range of possible damage added
  const fullDamageRangeMatch = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\) to \((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );
  if (fullDamageRangeMatch) {
    // For damage ranges, the meaningful values for searching are:
    // - Minimum: the lowest roll of the lower bound (first number)
    // - Maximum: the highest roll of the upper bound (last number)
    return {
      min: parseFloat(fullDamageRangeMatch[1]), // Lowest possible min damage
      max: parseFloat(fullDamageRangeMatch[4]), // Highest possible max damage
    };
  }

  // Handle partial damage ranges like "3 to (5-6)" or "(5-6) to 7"
  // First pattern: "X to (Y-Z)" - single min value to range max
  const partialRangeMatch1 = text.match(
    /(\d+(?:\.\d+)?)\s+to\s+\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );
  if (partialRangeMatch1) {
    return {
      min: parseFloat(partialRangeMatch1[1]), // The single min value
      max: parseFloat(partialRangeMatch1[3]), // The max of the range
    };
  }

  // Second pattern: "(X-Y) to Z" - range min to single max value
  const partialRangeMatch2 = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)\s+to\s+(\d+(?:\.\d+)?)/
  );
  if (partialRangeMatch2) {
    return {
      min: parseFloat(partialRangeMatch2[1]), // The min of the range
      max: parseFloat(partialRangeMatch2[3]), // The single max value
    };
  }

  // Handle simple "X to Y" pattern (no parentheses)
  const simpleRangeMatch = text.match(
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+Added/
  );
  if (simpleRangeMatch) {
    return {
      min: parseFloat(simpleRangeMatch[1]),
      max: parseFloat(simpleRangeMatch[2]),
    };
  }

  // Simple parenthetical ranges like (17-20)
  const rangeMatch = text.match(/\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
    };
  }

  // Single values
  const singleMatch = text.match(/[+\-]?(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    return { min: value, max: value };
  }

  return { min: undefined, max: undefined };
}

function extractValuesFromStats(stats, modText) {
  if (!stats || stats.length === 0) return { min: undefined, max: undefined };

  const stat = stats[0];
  if (!stat || stat.min === undefined || stat.max === undefined) {
    return { min: undefined, max: undefined };
  }

  let min = stat.min;
  let max = stat.max;

  // Debug logging for damage mods
  if (modText && modText.includes("Added") && modText.includes("Damage")) {
    console.log(
      `[Stats Extraction] Original stats min: ${stat.min}, max: ${stat.max}`
    );

    // Check if there are multiple stats (for damage ranges)
    if (stats.length > 1) {
      console.log(`[Stats Extraction] Multiple stats found:`, stats);
      // For damage mods with 2 stats, typically:
      // stats[0] = minimum damage roll
      // stats[1] = maximum damage roll
      const stat2 = stats[1];
      if (stat2 && stat2.min !== undefined && stat2.max !== undefined) {
        // Use first stat's min as overall min, second stat's max as overall max
        min = stat.min;
        max = stat2.max;
        console.log(
          `[Stats Extraction] Using multi-stat values: min=${min}, max=${max}`
        );
      }
    }
  }

  if (stat.id) {
    const conversion = getUnitConversion(stat.id, modText);
    if (conversion !== 1) {
      min = Math.round(min * conversion);
      max = Math.round(max * conversion);
      console.log(
        `[Stats Extraction] After conversion (factor ${conversion}): min=${min}, max=${max}`
      );
    }
  }

  return { min, max };
}

function getUnitConversion(statId, modText) {
  if (statId.includes("_per_minute") && modText.includes("per second")) {
    return 1 / 60;
  }
  if (statId.includes("_permyriad") || statId.includes("_per_ten_thousand")) {
    return 1 / 100;
  }
  return 1;
}

function getFallbackValues(modKey, tierNum) {
  const modType = modKey.toLowerCase();

  if (modType.includes("life")) {
    const values = [
      { min: 36, max: 40 },
      { min: 31, max: 35 },
      { min: 26, max: 30 },
      { min: 20, max: 25 },
    ];
    return values[tierNum - 1] || { min: 15, max: 19 };
  }

  return {
    min: Math.max(1, 10 - (tierNum - 1) * 2),
    max: Math.max(2, 12 - (tierNum - 1) * 2),
  };
}

// === UTILITY FUNCTIONS ===
function formatModName(modKey) {
  const customNames = {
    AbyssJewelLife: "Added Life",
    AbyssJewelMana: "Added Mana",
    AbyssJewelEnergyShield: "Added Energy Shield",
    AbyssJewelFireResistance: "Fire Resistance",
    AbyssJewelColdResistance: "Cold Resistance",
    AbyssJewelLightningResistance: "Lightning Resistance",
    AbyssJewelAttackSpeed: "Attack Speed",
    AbyssJewelCastSpeed: "Cast Speed",
    AbyssJewelProjectileSpeed: "Projectile Speed",
    AbyssJewelMinionDamage: "Minion Damage",
    AbyssJewelMinionAttackSpeed: "Minion Attack Speed",
  };

  if (customNames[modKey]) return customNames[modKey];

  return modKey
    .replace(/^AbyssJewel/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

function genericizeModText(text) {
  if (!text) return "";

  let formatted = text.replace(/with (\w+)s\s+Attacks/g, "with $1 Attacks");
  formatted = formatted
    .replace(
      /\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\) to \(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g,
      "# to #"
    )
    .replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "#")
    .replace(/\b\d+(?:\.\d+)?\b/g, "#")
    .replace(/\+#/g, "+#");

  return formatted.trim();
}

// === VALUE AVERAGING LOGIC ===
function isFlatAddedDamageMod(modText) {
  if (!modText) return false;

  const textLower = modText.toLowerCase();

  const hasDamagePattern =
    (textLower.includes("adds") && textLower.includes("damage")) ||
    (textLower.includes("added") && textLower.includes("damage"));

  const hasDamageType =
    textLower.includes("physical") ||
    textLower.includes("fire") ||
    textLower.includes("cold") ||
    textLower.includes("lightning") ||
    textLower.includes("chaos") ||
    textLower.includes("elemental");

  const isPercentage =
    textLower.includes("%") ||
    textLower.includes("increased") ||
    textLower.includes("more") ||
    textLower.includes("multiplier") ||
    textLower.includes("critical strike chance");

  return hasDamagePattern && hasDamageType && !isPercentage;
}

function calculateSearchValues(
  tierData,
  modText,
  isExactTier,
  fromTier,
  toTier
) {
  // For exact tier searches (fromTier === toTier), don't average
  if (isExactTier) {
    console.log(
      `[Value Calc] Exact tier - using actual values: ${tierData.min}-${tierData.max}`
    );
    // For exact tier of damage mods, use the average damage as both min and max
    if (isFlatAddedDamageMod(modText) && tierData.min && tierData.max) {
      const avgDamage = Math.round((tierData.min + tierData.max) / 2);
      console.log(
        `[Value Calc] Exact tier damage mod - using average damage: ${avgDamage}`
      );
      return {
        min: avgDamage,
        max: avgDamage,
        wasAveraged: true,
      };
    }
    return {
      min: tierData.min,
      max: tierData.max,
      wasAveraged: false,
    };
  }

  // For range searches of damage mods, we need to search by average damage
  if (isFlatAddedDamageMod(modText) && tierData.min && tierData.max) {
    // Calculate the average damage this tier provides
    const avgDamage = Math.round((tierData.min + tierData.max) / 2);
    console.log(
      `[Value Calc] Range search damage mod - fromTier avg damage: ${avgDamage}`
    );

    // The minimum for our search is the average damage of the fromTier
    // The maximum will be calculated from the toTier in the main function
    return {
      min: avgDamage,
      max: tierData.max, // This will be overridden by toTier's average
      wasAveraged: true,
      avgDamage: avgDamage, // Store for reference
    };
  }

  console.log(`[Value Calc] Non-damage mod: ${tierData.min}-${tierData.max}`);
  return {
    min: tierData.min,
    max: tierData.max,
    wasAveraged: false,
  };
}

/**
 * Calculate a capped max value to prevent tier bleeding
 * Only caps if it would actually help (i.e., don't make the range worse)
 */
function calculateCappedMaxValue(mod, toTier, toTierData) {
  const tierKeys = Object.keys(mod.tiers);
  const toTierIndex = tierKeys.indexOf(toTier);

  // If this is the best tier (T1) or we can't find it, use the original max
  if (toTierIndex <= 0) {
    return toTierData.max;
  }

  // Get the next better tier (e.g., if toTier is T3, get T2)
  const nextTierKey = tierKeys[toTierIndex - 1];
  const nextTierData = mod.tiers[nextTierKey];

  if (!nextTierData) {
    return toTierData.max;
  }

  console.log(
    `[Tier Capping Debug] Checking ${toTier} (max: ${toTierData.max}) vs ${nextTierKey} (min: ${nextTierData.min})`
  );

  // Only cap if:
  // 1. There's actual overlap (next tier's min <= current tier's max)
  // 2. The capped value would still be >= current tier's min (valid range)
  // 3. The capped value would be less than the original max (actually helping)

  if (nextTierData.min <= toTierData.max) {
    const proposedCap = nextTierData.min - 1;

    // Only use the cap if it's a valid value that's better than no cap
    if (proposedCap >= toTierData.min && proposedCap < toTierData.max) {
      console.log(
        `[Tier Capping] ${toTier} max: ${toTierData.max} → capped at ${proposedCap} to avoid ${nextTierKey} items`
      );
      return proposedCap;
    } else {
      console.log(
        `[Tier Capping] ${toTier}: Cap of ${proposedCap} would be invalid or unhelpful, using original max ${toTierData.max}`
      );
    }
  } else {
    console.log(
      `[Tier Capping] ${toTier}: No overlap with ${nextTierKey}, using original max ${toTierData.max}`
    );
  }

  return toTierData.max;
}

// === DOM INITIALIZATION ===
function initializeElements() {
  const elementIds = [
    "jewelType",
    "modSearch",
    "searchResults",
    "selectedMods",
    "autoFillBtn",
    "statusMessage",
    "tierModal",
    "tierModalHeader",
    "tierFromSelect",
    "tierToSelect",
    "tierRangeInfo",
    "confirmTierSelection",
    "closeTierModal",
  ];

  elementIds.forEach((id) => {
    elements[id] = document.getElementById(id);
    if (!elements[id]) {
      console.warn(`⚠️ Element not found: ${id}`);
    }
  });
}

function attachEventListeners() {
  if (elements.jewelType) {
    elements.jewelType.addEventListener("change", handleJewelTypeChange);
  }

  if (elements.modSearch) {
    elements.modSearch.addEventListener("input", handleModSearchInput);
    elements.modSearch.addEventListener("keydown", handleModSearchKeydown);
  }

  if (elements.autoFillBtn) {
    elements.autoFillBtn.addEventListener("click", handleAutoFill);
  }

  if (elements.closeTierModal) {
    elements.closeTierModal.addEventListener("click", closeTierModal);
  }

  if (elements.confirmTierSelection) {
    elements.confirmTierSelection.addEventListener(
      "click",
      confirmTierSelection
    );
  }

  if (elements.tierFromSelect) {
    elements.tierFromSelect.addEventListener("change", updateTierRangeInfo);
  }

  if (elements.tierToSelect) {
    elements.tierToSelect.addEventListener("change", updateTierRangeInfo);
  }

  if (elements.tierModal) {
    elements.tierModal.addEventListener("click", function (e) {
      if (e.target === elements.tierModal) {
        closeTierModal();
      }
    });
  }
}

function populateJewelDropdown() {
  if (!elements.jewelType) return;

  elements.jewelType.innerHTML =
    '<option value="">Select Abyss Jewel Type</option>';

  Object.entries(JEWEL_TYPE_CONFIG).forEach(([key, config]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = config.displayName;
    elements.jewelType.appendChild(option);
  });
}

// === EVENT HANDLERS ===
function handleJewelTypeChange(event) {
  currentJewelType = event.target.value;
  selectedMods = [];
  updateSelectedModsDisplay();
  clearSearchResults();

  if (elements.modSearch) {
    elements.modSearch.value = "";
    elements.modSearch.disabled = !currentJewelType;
    elements.modSearch.placeholder = currentJewelType
      ? "Type to search mods..."
      : "Select a jewel type first";
  }

  updateAutoFillButton();

  if (currentJewelType) {
    showStatusMessage(
      `Selected ${JEWEL_TYPE_CONFIG[currentJewelType].displayName}`,
      "success"
    );
  }
}

function handleModSearchInput(event) {
  const query = event.target.value.trim();

  if (query.length < 2) {
    clearSearchResults();
    return;
  }

  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type first", "info");
    clearSearchResults();
    return;
  }

  const matchingMods = findMatchingMods(query);
  displaySearchResults(matchingMods);
}

function handleModSearchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const results = elements.searchResults?.querySelectorAll(".search-result");
    if (results && results.length > 0) {
      results[0].click();
    }
  }
}

// === MOD SEARCH ===
function findMatchingMods(query, maxResults = 10) {
  if (!currentJewelType) return [];

  const availableMods = getModsForJewelType(currentJewelType);
  const queryLower = query.toLowerCase();
  const results = [];

  const abbreviations = {
    es: "energy shield",
    hp: "life",
    mp: "mana",
    res: "resistance",
    dmg: "damage",
    att: "attack",
    crit: "critical",
  };

  let expandedQuery = queryLower;
  Object.entries(abbreviations).forEach(([abbr, expansion]) => {
    expandedQuery = expandedQuery.replace(
      new RegExp(`\\b${abbr}\\b`, "g"),
      expansion
    );
  });

  let searchQueries = [expandedQuery];

  // Handle weapon interchangeability
  if (currentJewelType === "searching") {
    if (expandedQuery.includes("bow")) {
      searchQueries.push(expandedQuery.replace(/\bbow(s)?\b/g, "wand$1"));
    } else if (expandedQuery.includes("wand")) {
      searchQueries.push(expandedQuery.replace(/\bwand(s)?\b/g, "bow$1"));
    }
  }

  if (currentJewelType === "murderous") {
    const meleeWeapons = [
      "dagger",
      "claw",
      "sword",
      "axe",
      "mace",
      "sceptre",
      "staff",
    ];
    const foundWeapon = meleeWeapons.find((w) => expandedQuery.includes(w));

    if (foundWeapon) {
      meleeWeapons.forEach((weapon) => {
        if (weapon !== foundWeapon) {
          searchQueries.push(
            expandedQuery.replace(
              new RegExp(`\\b${foundWeapon}(s)?\\b`, "g"),
              `${weapon}$1`
            )
          );
        }
      });
    }
  }

  const userSearchedWeapon = expandedQuery.match(
    /\b(bow|wand|dagger|claw|sword|axe|mace|sceptre|staff)s?\b/i
  )?.[1];

  Object.entries(availableMods).forEach(([key, mod]) => {
    const modNameLower = mod.name.toLowerCase();
    const modTextLower = (mod.displayText || mod.name).toLowerCase();
    let confidence = 0;

    for (const searchQuery of searchQueries) {
      let queryConfidence = 0;

      if (modNameLower === searchQuery || modNameLower === expandedQuery) {
        queryConfidence = 100;
      } else if (
        modNameLower.startsWith(searchQuery) ||
        modNameLower.startsWith(expandedQuery)
      ) {
        queryConfidence = 95;
      } else if (
        modNameLower.includes(searchQuery) ||
        modNameLower.includes(expandedQuery)
      ) {
        queryConfidence = 85;
      } else {
        const queryWords = searchQuery.split(" ").filter((w) => w.length > 2);
        let matchingWords = 0;

        queryWords.forEach((word) => {
          if (modNameLower.includes(word) || modTextLower.includes(word)) {
            matchingWords++;
          }
        });

        if (matchingWords > 0) {
          queryConfidence = Math.min(
            80,
            (matchingWords / queryWords.length) * 80
          );
        }
      }

      if (queryConfidence > confidence) {
        confidence = queryConfidence;
      }
    }

    if (confidence > 70) {
      let displayName = mod.name;

      if (userSearchedWeapon) {
        const weaponCapitalized =
          userSearchedWeapon.charAt(0).toUpperCase() +
          userSearchedWeapon.slice(1);

        if (currentJewelType === "searching") {
          displayName = displayName.replace(
            /With (Wand|Bow)s?/gi,
            `With ${weaponCapitalized}`
          );
        } else if (currentJewelType === "murderous") {
          displayName = displayName.replace(
            /With (Dagger|Claw|Sword|Axe|Mace|Sceptre|Staff)s?/gi,
            `With ${weaponCapitalized}`
          );
        }
      }

      results.push({
        key: key,
        name: displayName,
        originalName: mod.name,
        confidence: confidence,
        tiers: mod.tiers,
        statId: mod.statId,
        category: mod.category,
        userSearchedWeapon: userSearchedWeapon,
      });
    }
  });

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

// === UI UPDATES ===
function displaySearchResults(results) {
  if (!elements.searchResults) return;

  elements.searchResults.innerHTML = "";

  if (results.length === 0) {
    elements.searchResults.innerHTML =
      '<div class="no-results">No matching mods found</div>';
    return;
  }

  results.forEach((result) => {
    const resultDiv = document.createElement("div");
    resultDiv.className = "search-result";
    resultDiv.innerHTML = `
      <span class="mod-name">${result.name}</span>
      <span class="confidence">(${result.confidence}%)</span>
      <span class="category">[${result.category}]</span>
    `;

    resultDiv.addEventListener("click", () => selectMod(result));
    elements.searchResults.appendChild(resultDiv);
  });
}

function clearSearchResults() {
  if (elements.searchResults) {
    elements.searchResults.innerHTML = "";
  }
}

// === TIER SELECTION MODAL ===
function selectMod(mod) {
  currentModForTierSelection = mod;
  showTierModal(mod);
}

function showTierModal(mod) {
  if (!elements.tierModal || !elements.tierFromSelect || !elements.tierToSelect)
    return;

  // Update modal header
  if (elements.tierModalHeader) {
    elements.tierModalHeader.textContent = `Select Tier Range for "${mod.name}"`;
  }

  // Clear and populate tier dropdowns
  elements.tierFromSelect.innerHTML = "";
  elements.tierToSelect.innerHTML = "";

  const tierKeys = Object.keys(mod.tiers);

  tierKeys.forEach((tier) => {
    const tierData = mod.tiers[tier];

    // From dropdown
    const fromOption = document.createElement("option");
    fromOption.value = tier;
    fromOption.textContent = `${tier} (${tierData.min}-${tierData.max})`;
    elements.tierFromSelect.appendChild(fromOption);

    // To dropdown
    const toOption = document.createElement("option");
    toOption.value = tier;
    toOption.textContent = `${tier} (${tierData.min}-${tierData.max})`;
    elements.tierToSelect.appendChild(toOption);
  });

  // Set default selection (T4 to T1)
  if (tierKeys.length > 0) {
    elements.tierFromSelect.value = tierKeys[tierKeys.length - 1]; // Usually T4
    elements.tierToSelect.value = tierKeys[0]; // Usually T1
  }

  updateTierRangeInfo();
  elements.tierModal.style.display = "flex";
}

function updateTierRangeInfo() {
  if (
    !elements.tierRangeInfo ||
    !elements.tierFromSelect ||
    !elements.tierToSelect
  )
    return;
  if (!currentModForTierSelection) return;

  const fromTier = elements.tierFromSelect.value;
  const toTier = elements.tierToSelect.value;

  // Validate selection
  const fromIndex = parseInt(fromTier.replace("T", ""));
  const toIndex = parseInt(toTier.replace("T", ""));

  if (fromIndex < toIndex) {
    // Invalid range (e.g., T2 to T3)
    elements.tierToSelect.value = fromTier;
    return;
  }

  const isExactTier = fromTier === toTier;
  const tierData = currentModForTierSelection.tiers[fromTier];
  const toTierData = currentModForTierSelection.tiers[toTier];
  const modText = tierData.text || currentModForTierSelection.name;

  let infoText = "";

  if (isExactTier) {
    infoText = `<span class="tier-range-highlight">Exact ${fromTier}</span> - Values: ${tierData.min}-${tierData.max}`;

    if (isFlatAddedDamageMod(modText)) {
      infoText += ` <br><small style="color: #888;">(No averaging for exact tier)</small>`;
    }
  } else {
    // Calculate what the capped max will be
    const cappedMax = calculateCappedMaxValue(
      currentModForTierSelection,
      toTier,
      toTierData
    );
    const isCapped = cappedMax < toTierData.max;

    infoText = `<span class="tier-range-highlight">${fromTier} to ${toTier}</span> - Range: ${tierData.min}-${cappedMax}`;

    if (isCapped) {
      infoText += ` <br><small style="color: #ff9800;">Max capped to avoid ${getPrevTier(
        toTier
      )} items</small>`;
    }

    if (isFlatAddedDamageMod(modText)) {
      const average = Math.round((tierData.min + tierData.max) / 2);
      infoText += ` <br><small style="color: #4CAF50;">Damage averaging: ${average}-${cappedMax}</small>`;
    }
  }

  elements.tierRangeInfo.innerHTML = infoText;
}

function getPrevTier(tier) {
  const tierNum = parseInt(tier.replace("T", ""));
  return tierNum > 1 ? `T${tierNum - 1}` : "higher tier";
}

function confirmTierSelection() {
  if (!currentModForTierSelection) return;

  const fromTier = elements.tierFromSelect.value;
  const toTier = elements.tierToSelect.value;

  addSelectedModWithRange(currentModForTierSelection, fromTier, toTier);
  closeTierModal();
}

function closeTierModal() {
  if (elements.tierModal) {
    elements.tierModal.style.display = "none";
  }
  currentModForTierSelection = null;
}

// === MOD SELECTION ===
function addSelectedModWithRange(mod, fromTier, toTier) {
  const existingIndex = selectedMods.findIndex(
    (selected) => selected.key === mod.key
  );

  const fromTierData = mod.tiers[fromTier];
  const toTierData = mod.tiers[toTier];
  const isExactTier = fromTier === toTier;

  console.log(
    `[Tier Selection] ${mod.name}: ${fromTier} (${fromTierData.min}-${fromTierData.max}) to ${toTier} (${toTierData.min}-${toTierData.max})`
  );

  // Adjust tier text for user's weapon choice
  let adjustedTierData = { ...fromTierData };
  if (mod.userSearchedWeapon && fromTierData.text) {
    const weaponSingular =
      mod.userSearchedWeapon.charAt(0).toUpperCase() +
      mod.userSearchedWeapon.slice(1);

    if (currentJewelType === "searching") {
      adjustedTierData.text = fromTierData.text.replace(
        /with (Wand|Bow)s?\s+Attacks/gi,
        `with ${weaponSingular} Attacks`
      );
    } else if (currentJewelType === "murderous") {
      const meleePattern =
        /with (Dagger|Claw|Sword|Axe|Mace|Sceptre|Staff)s?\s+Attacks/gi;
      adjustedTierData.text = fromTierData.text.replace(
        meleePattern,
        `with ${weaponSingular} Attacks`
      );
    }
  }

  // Calculate search values with conditional averaging
  const modTextForCheck = adjustedTierData.text || mod.originalName || mod.name;
  const searchValues = calculateSearchValues(
    fromTierData,
    modTextForCheck,
    isExactTier,
    fromTier,
    toTier
  );

  // For range searches, we use fromTier's average as min and toTier's average as max
  let finalMinValue = searchValues.min;
  let finalMaxValue = isExactTier ? searchValues.max : toTierData.max;

  // For damage mods in range searches, use average damage for both tiers
  if (!isExactTier && isFlatAddedDamageMod(modTextForCheck)) {
    // Calculate the average damage for the toTier
    const toTierAvg = Math.round((toTierData.min + toTierData.max) / 2);
    finalMaxValue = toTierAvg;
    console.log(
      `[Damage Range] Using average damage range: ${finalMinValue} to ${toTierAvg}`
    );
  }

  // No need for tier capping when using average damage values

  console.log(
    `[Final Values] Min: ${finalMinValue} (from ${fromTier}${
      searchValues.wasAveraged ? ", avg damage" : ""
    }), Max: ${finalMaxValue} (from ${toTier}${
      !isExactTier && isFlatAddedDamageMod(modTextForCheck)
        ? ", avg damage"
        : ""
    })`
  );

  const modData = {
    key: mod.key,
    modName: mod.name,
    name: mod.name,
    originalName: mod.originalName || mod.name,
    fromTier: fromTier,
    toTier: toTier,
    tierRange: isExactTier ? fromTier : `${fromTier}-${toTier}`,
    tierData: adjustedTierData,
    minValue: finalMinValue,
    maxValue: finalMaxValue,
    wasAveraged: searchValues.wasAveraged,
    wasCapped: finalMaxValue < toTierData.max,
    isExactTier: isExactTier,
    statId: mod.statId,
    category: mod.category,
    userSearchedWeapon: mod.userSearchedWeapon,
  };

  if (existingIndex !== -1) {
    selectedMods[existingIndex] = modData;
  } else {
    selectedMods.push(modData);
  }

  updateSelectedModsDisplay();
  updateAutoFillButton();
  clearSearchInput();

  const tierDisplay = isExactTier ? fromTier : `${fromTier}-${toTier}`;
  const averageIndicator = searchValues.wasAveraged ? " (averaged)" : "";
  const cappedIndicator = modData.wasCapped ? " (capped)" : "";
  showStatusMessage(
    `Added ${mod.name} (${tierDisplay})${averageIndicator}${cappedIndicator}`,
    "success"
  );
}

function updateSelectedModsDisplay() {
  if (!elements.selectedMods) return;

  if (selectedMods.length === 0) {
    elements.selectedMods.innerHTML =
      '<div class="no-mods">No mods selected</div>';
    return;
  }

  elements.selectedMods.innerHTML = selectedMods
    .map((mod, index) => {
      const displayMin = mod.minValue;
      const displayMax = mod.maxValue;
      const tierDisplay = mod.tierRange || mod.fromTier || "T?";

      // Build indicator string
      let indicators = "";
      if (mod.wasAveraged) {
        indicators +=
          ' <span style="color: #4CAF50; font-size: 0.85em;">(avg)</span>';
      }
      if (mod.wasCapped) {
        indicators +=
          ' <span style="color: #ff9800; font-size: 0.85em;">(cap)</span>';
      }

      return `
        <div class="selected-mod">
          <span class="mod-info">
            <span class="mod-name">${mod.name}</span>
            <span class="mod-tier">${tierDisplay}</span>
            <span class="mod-range">(${displayMin}-${displayMax})${indicators}</span>
          </span>
          <button class="remove-mod" data-index="${index}">&times;</button>
        </div>
      `;
    })
    .join("");

  // Attach event listeners to remove buttons
  document.querySelectorAll(".remove-mod").forEach((button) => {
    button.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      removeSelectedMod(index);
    });
  });
}

function removeSelectedMod(index) {
  if (index >= 0 && index < selectedMods.length) {
    const removedMod = selectedMods.splice(index, 1)[0];
    updateSelectedModsDisplay();
    updateAutoFillButton();
    showStatusMessage(`Removed ${removedMod.name}`, "info");
  }
}

function clearSearchInput() {
  if (elements.modSearch) {
    elements.modSearch.value = "";
  }
  clearSearchResults();
}

function updateAutoFillButton() {
  if (!elements.autoFillBtn) return;

  const hasJewelType = !!currentJewelType;
  const hasMods = selectedMods.length > 0;

  elements.autoFillBtn.disabled = !hasJewelType;

  if (hasMods) {
    elements.autoFillBtn.textContent = `Search with ${selectedMods.length} mod${
      selectedMods.length !== 1 ? "s" : ""
    }`;
  } else if (hasJewelType) {
    elements.autoFillBtn.textContent = `Search ${JEWEL_TYPE_CONFIG[currentJewelType].displayName}`;
  } else {
    elements.autoFillBtn.textContent = "Select Jewel Type";
  }
}

// === AUTO-FILL ===
function getGenericizedModText(mod) {
  if (mod.tierData && mod.tierData.text) {
    return genericizeModText(mod.tierData.text);
  }

  const textToGenericize = mod.displayText || mod.originalName || mod.name;
  return genericizeModText(textToGenericize);
}

async function handleAutoFill() {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  const speedSlider = document.getElementById("speedSlider");
  const speedMultiplier = parseFloat(speedSlider.value) || 0.5;

  const searchMode = selectedMods.length > 0 ? "with-mods" : "base-only";

  const config = {
    jewelType: currentJewelType,
    jewelDisplayName: JEWEL_TYPE_CONFIG[currentJewelType].displayName,
    searchMode: searchMode,
    selectedMods: selectedMods.map((mod) => ({
      ...mod,
      genericText: getGenericizedModText(mod),
      searchText: getGenericizedModText(mod),
    })),
    speedMultiplier: speedMultiplier,
    timestamp: Date.now(),
  };

  showStatusMessage(
    `Opening trade site (${(1 / speedMultiplier).toFixed(1)}x speed)...`,
    "info"
  );

  try {
    const response = await chrome.runtime.sendMessage({
      action: "openTradeTab",
      config: config,
    });

    if (response && response.success) {
      showStatusMessage("Trade site opened successfully", "success");
    } else {
      throw new Error(response?.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Auto-fill failed:", error);
    showStatusMessage("Failed to open trade site", "error");
  }
}

function showStatusMessage(message, type = "info") {
  if (!elements.statusMessage) return;

  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;

  if (type !== "error") {
    setTimeout(() => {
      if (elements.statusMessage.textContent === message) {
        elements.statusMessage.textContent = "";
        elements.statusMessage.className = "status-message";
      }
    }, 3000);
  }
}

// === SPEED CONTROL ===
function initializeSpeedControl() {
  const speedSlider = document.getElementById("speedSlider");
  const speedValue = document.getElementById("speedValue");
  const speedDesc = document.getElementById("speedDesc");
  const speedPresets = document.querySelectorAll(".speed-preset");

  chrome.storage.local.get(["speedMultiplier"], (result) => {
    const savedSpeed = result.speedMultiplier || 0.5;
    speedSlider.value = savedSpeed;
    updateSpeedDisplay(savedSpeed);
    updatePresetButtons(savedSpeed);
  });

  speedSlider.addEventListener("input", (e) => {
    const speed = parseFloat(e.target.value);
    updateSpeedDisplay(speed);
    updatePresetButtons(speed);
    saveSpeedSetting(speed);
  });

  speedPresets.forEach((button) => {
    button.addEventListener("click", (e) => {
      const speed = parseFloat(e.target.dataset.speed);
      speedSlider.value = speed;
      updateSpeedDisplay(speed);
      updatePresetButtons(speed);
      saveSpeedSetting(speed);
    });
  });

  function updateSpeedDisplay(speed) {
    const multiplier = (1 / speed).toFixed(1);
    speedValue.textContent = `${multiplier}x`;

    if (speed <= 0.3) {
      speedDesc.textContent = "Ultra Fast";
      speedDesc.style.color = "#ff6b6b";
    } else if (speed <= 0.5) {
      speedDesc.textContent = "Fast";
      speedDesc.style.color = "#d4af37";
    } else if (speed <= 0.7) {
      speedDesc.textContent = "Safe";
      speedDesc.style.color = "#51cf66";
    } else {
      speedDesc.textContent = "Normal";
      speedDesc.style.color = "#999";
    }
  }

  function updatePresetButtons(speed) {
    speedPresets.forEach((button) => {
      const buttonSpeed = parseFloat(button.dataset.speed);
      if (Math.abs(buttonSpeed - speed) < 0.05) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  function saveSpeedSetting(speed) {
    chrome.storage.local.set({ speedMultiplier: speed });
    console.log(
      `Speed multiplier saved: ${speed} (${(1 / speed).toFixed(1)}x speed)`
    );
  }
}

console.log("📦 PoE Trade Helper popup script loaded completely");
