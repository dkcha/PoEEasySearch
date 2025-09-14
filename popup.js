// PoE Trade Helper - Enhanced Popup Script with Tier Range Selection (Ultra-Speed)
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

// === INITIALIZATION ===
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 DOM loaded, initializing popup...");

  try {
    await loadDataFiles();
    processJewelData();
    initializeElements();
    attachEventListeners();
    populateJewelDropdown();

    console.log("✅ Popup initialization complete");
    showStatusMessage("Extension loaded successfully", "success");
  } catch (error) {
    console.error("❌ Failed to initialize popup:", error);
    showStatusMessage("Failed to load extension data", "error");
  }
});

// === DATA LOADING ===
async function loadDataFiles() {
  console.log("📂 Loading data files from GitHub...");
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
  if (processedMods[jewelType]) return processedMods[jewelType];

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

        if (modDetails?.text) {
          tierValues = extractModValues(modDetails.text, modDetails);
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
  if (textValues.min !== undefined && textValues.max !== undefined) {
    return textValues;
  }

  if (modDetails?.stats?.length > 0) {
    return extractValuesFromStats(modDetails.stats, modText);
  }

  return { min: undefined, max: undefined };
}

function extractValuesFromText(text) {
  // Handle damage ranges like "(14-15) to (25-28)"
  const fullDamageRangeMatch = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\) to \((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );
  if (fullDamageRangeMatch) {
    return {
      min: parseFloat(fullDamageRangeMatch[1]),
      max: parseFloat(fullDamageRangeMatch[4]),
    };
  }

  // Handle partial damage ranges
  const partialRangeMatch1 = text.match(
    /(\d+(?:\.\d+)?)\s+to\s+\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );
  if (partialRangeMatch1) {
    return {
      min: parseFloat(partialRangeMatch1[1]),
      max: parseFloat(partialRangeMatch1[3]),
    };
  }

  const partialRangeMatch2 = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)\s+to\s+(\d+(?:\.\d+)?)/
  );
  if (partialRangeMatch2) {
    return {
      min: parseFloat(partialRangeMatch2[1]),
      max: parseFloat(partialRangeMatch2[3]),
    };
  }

  // Handle simple "X to Y" pattern
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

  // For damage mods with 2 stats, use first stat's min and second stat's max
  if (
    modText?.includes("Added") &&
    modText.includes("Damage") &&
    stats.length > 1
  ) {
    const stat2 = stats[1];
    if (stat2?.min !== undefined && stat2.max !== undefined) {
      min = stat.min;
      max = stat2.max;
    }
  }

  if (stat.id) {
    const conversion = getUnitConversion(stat.id, modText);
    if (conversion !== 1) {
      min = Math.round(min * conversion);
      max = Math.round(max * conversion);
    }
  }

  return { min, max };
}

function getUnitConversion(statId, modText) {
  if (statId.includes("_per_minute") && modText.includes("per second"))
    return 1 / 60;
  if (statId.includes("_permyriad") || statId.includes("_per_ten_thousand"))
    return 1 / 100;
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
  if (isExactTier) {
    if (isFlatAddedDamageMod(modText) && tierData.min && tierData.max) {
      const avgDamage = Math.round((tierData.min + tierData.max) / 2);
      return { min: avgDamage, max: avgDamage, wasAveraged: true };
    }
    return { min: tierData.min, max: tierData.max, wasAveraged: false };
  }

  if (isFlatAddedDamageMod(modText) && tierData.min && tierData.max) {
    const avgDamage = Math.round((tierData.min + tierData.max) / 2);
    return {
      min: avgDamage,
      max: tierData.max,
      wasAveraged: true,
      avgDamage: avgDamage,
    };
  }

  return { min: tierData.min, max: tierData.max, wasAveraged: false };
}

function calculateCappedMaxValue(mod, toTier, toTierData) {
  const tierKeys = Object.keys(mod.tiers);
  const toTierIndex = tierKeys.indexOf(toTier);

  if (toTierIndex <= 0) return toTierData.max;

  const nextTierKey = tierKeys[toTierIndex - 1];
  const nextTierData = mod.tiers[nextTierKey];

  if (!nextTierData || nextTierData.min > toTierData.max) return toTierData.max;

  const proposedCap = nextTierData.min - 1;
  if (proposedCap >= toTierData.min && proposedCap < toTierData.max) {
    return proposedCap;
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
    if (!elements[id]) console.warn(`⚠️ Element not found: ${id}`);
  });
}

function attachEventListeners() {
  if (elements.jewelType)
    elements.jewelType.addEventListener("change", handleJewelTypeChange);
  if (elements.modSearch) {
    elements.modSearch.addEventListener("input", handleModSearchInput);
    elements.modSearch.addEventListener("keydown", handleModSearchKeydown);
  }
  if (elements.autoFillBtn)
    elements.autoFillBtn.addEventListener("click", handleAutoFill);
  if (elements.closeTierModal)
    elements.closeTierModal.addEventListener("click", closeTierModal);
  if (elements.confirmTierSelection)
    elements.confirmTierSelection.addEventListener(
      "click",
      confirmTierSelection
    );
  if (elements.tierFromSelect)
    elements.tierFromSelect.addEventListener("change", updateTierRangeInfo);
  if (elements.tierToSelect)
    elements.tierToSelect.addEventListener("change", updateTierRangeInfo);

  if (elements.tierModal) {
    elements.tierModal.addEventListener("click", function (e) {
      if (e.target === elements.tierModal) closeTierModal();
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
    if (results?.length > 0) results[0].click();
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

  // Enhanced weapon detection
  const allWeapons = [
    "bow",
    "wand",
    "dagger",
    "claw",
    "sword",
    "axe",
    "mace",
    "sceptre",
    "staff",
  ];

  let userSearchedWeapon = expandedQuery.match(
    /\b(bow|wand|dagger|claw|sword|axe|mace|sceptre|staff)s?\b/i
  )?.[1];
  let partialWeaponMatches = [];

  if (!userSearchedWeapon && expandedQuery.length >= 2) {
    partialWeaponMatches = allWeapons.filter(
      (weapon) =>
        weapon.startsWith(expandedQuery) || weapon.includes(expandedQuery)
    );

    if (
      partialWeaponMatches.length === 1 &&
      partialWeaponMatches[0].startsWith(expandedQuery)
    ) {
      userSearchedWeapon = partialWeaponMatches[0];
    }
  }

  // If we have a specific weapon search
  if (userSearchedWeapon) {
    Object.entries(availableMods).forEach(([key, mod]) => {
      const weaponPatterns = [
        /with\s+(\w+)s\s*$/i,
        /with\s+(\w+)s?\s+attacks/i,
        /with\s+(\w+)\s*$/i,
        /\b(dagger|claw|sword|axe|mace|sceptre|staff|bow|wand)s?\b/i,
      ];

      let foundWeaponInMod = null;
      for (const pattern of weaponPatterns) {
        const match = mod.name.match(pattern);
        if (match) {
          foundWeaponInMod = match[1].toLowerCase().replace(/s$/, "");
          break;
        }
      }

      if (foundWeaponInMod) {
        const equivalentWeapons = getEquivalentWeapons(
          foundWeaponInMod,
          currentJewelType
        );
        if (equivalentWeapons.includes(userSearchedWeapon)) {
          const weaponCapitalized =
            userSearchedWeapon.charAt(0).toUpperCase() +
            userSearchedWeapon.slice(1);
          let variantName = generateVariantName(
            mod.name,
            weaponCapitalized,
            userSearchedWeapon
          );

          results.push({
            key:
              userSearchedWeapon === foundWeaponInMod
                ? key
                : `${key}_${userSearchedWeapon}`,
            name: variantName,
            originalName: mod.name,
            confidence: 95,
            tiers: mod.tiers,
            statId: mod.statId,
            category: mod.category,
            weaponType: userSearchedWeapon,
            isWeaponSpecific: true,
            isGeneratedVariant: userSearchedWeapon !== foundWeaponInMod,
            sourceKey: key,
            userSearchedWeapon: userSearchedWeapon,
          });
        }
      }
    });
  } else if (partialWeaponMatches.length > 1) {
    // Multiple partial matches - show weapon-specific mods for all
    partialWeaponMatches.forEach((weapon) => {
      Object.entries(availableMods).forEach(([key, mod]) => {
        const foundWeaponInMod = extractWeaponFromModName(mod.name);
        if (foundWeaponInMod) {
          const equivalentWeapons = getEquivalentWeapons(
            foundWeaponInMod,
            currentJewelType
          );
          if (equivalentWeapons.includes(weapon)) {
            const weaponCapitalized =
              weapon.charAt(0).toUpperCase() + weapon.slice(1);
            let variantName = generateVariantName(
              mod.name,
              weaponCapitalized,
              weapon
            );

            if (!results.some((r) => r.name === variantName)) {
              results.push({
                key: weapon === foundWeaponInMod ? key : `${key}_${weapon}`,
                name: variantName,
                originalName: mod.name,
                confidence: 85,
                tiers: mod.tiers,
                statId: mod.statId,
                category: mod.category,
                weaponType: weapon,
                isWeaponSpecific: true,
                isGeneratedVariant: weapon !== foundWeaponInMod,
                sourceKey: key,
                userSearchedWeapon: weapon,
              });
            }
          }
        }
      });
    });
  } else {
    // General search logic
    const weaponSpecificMods = [];

    Object.entries(availableMods).forEach(([key, mod]) => {
      const modNameLower = mod.name.toLowerCase();
      const modTextLower = (mod.displayText || mod.name).toLowerCase();
      let confidence = calculateModConfidence(
        modNameLower,
        modTextLower,
        expandedQuery
      );

      if (confidence > 70) {
        const weaponInModName = extractWeaponFromModName(mod.name);

        if (weaponInModName) {
          weaponSpecificMods.push({ key, mod, weaponInModName, confidence });
        } else {
          results.push({
            key: key,
            name: mod.name,
            originalName: mod.name,
            confidence: confidence,
            tiers: mod.tiers,
            statId: mod.statId,
            category: mod.category,
            weaponType: null,
            isWeaponSpecific: false,
          });
        }
      }
    });

    // Generate weapon variants for general searches
    weaponSpecificMods.forEach(({ key, mod, weaponInModName, confidence }) => {
      const equivalentWeapons = getEquivalentWeapons(
        weaponInModName,
        currentJewelType
      );
      equivalentWeapons.forEach((weaponType) => {
        const weaponCapitalized =
          weaponType.charAt(0).toUpperCase() + weaponType.slice(1);
        let variantName = generateVariantName(
          mod.name,
          weaponCapitalized,
          weaponType
        );

        results.push({
          key: weaponType === weaponInModName ? key : `${key}_${weaponType}`,
          name: variantName,
          originalName: mod.name,
          confidence: confidence,
          tiers: mod.tiers,
          statId: mod.statId,
          category: mod.category,
          weaponType: weaponType,
          isWeaponSpecific: true,
          isGeneratedVariant: weaponType !== weaponInModName,
          sourceKey: key,
        });
      });
    });
  }

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

// Helper functions
function extractWeaponFromModName(modName) {
  const weaponPatterns = [
    /with\s+(\w+)s\s*$/i,
    /with\s+(\w+)s?\s+attacks/i,
    /with\s+(\w+)\s*$/i,
    /\b(dagger|claw|sword|axe|mace|sceptre|staff|bow|wand)s?\b/i,
  ];

  for (const pattern of weaponPatterns) {
    const match = modName.match(pattern);
    if (match) {
      return match[1].toLowerCase().replace(/s$/, "");
    }
  }
  return null;
}

function generateVariantName(
  originalName,
  weaponCapitalized,
  weaponType = null
) {
  console.log(
    `[Variant Debug] originalName: "${originalName}", weapon: "${weaponCapitalized}", weaponType: "${weaponType}"`
  );

  // Special handling for mace/sceptre - CHECK THIS FIRST before other patterns
  if (weaponType === "mace" || weaponType === "sceptre") {
    if (originalName.includes("with") && originalName.includes("Attacks")) {
      return originalName.replace(
        /with\s+\w+\s+Attacks/i,
        "with Mace or Sceptre Attacks"
      );
    } else if (
      originalName.includes("With") &&
      originalName.includes("Daggers")
    ) {
      return originalName.replace(
        /With\s+\w+s?\b/i,
        "with Mace or Sceptre Attacks"
      );
    }
  }

  // Single weapon replacement logic for other weapons
  if (originalName.includes("With") && originalName.includes("Daggers")) {
    return originalName.replace(
      /with\s+\w+s?\b/i,
      `With ${weaponCapitalized}s`
    );
  } else if (
    originalName.includes("with") &&
    originalName.includes("Attacks")
  ) {
    return originalName.replace(
      /with\s+\w+\s+Attacks/i,
      `with ${weaponCapitalized} Attacks`
    );
  } else {
    return originalName.replace(
      /\b(dagger|claw|sword|axe|mace|sceptre|staff|bow|wand)s?\b/i,
      weaponCapitalized
    );
  }
}

function calculateModConfidence(modNameLower, modTextLower, expandedQuery) {
  if (modNameLower === expandedQuery) return 100;
  if (modNameLower.startsWith(expandedQuery)) return 95;
  if (modNameLower.includes(expandedQuery)) return 85;

  const queryWords = expandedQuery.split(" ").filter((w) => w.length > 2);
  let matchingWords = 0;

  queryWords.forEach((word) => {
    if (modNameLower.includes(word) || modTextLower.includes(word)) {
      matchingWords++;
    }
  });

  return matchingWords > 0
    ? Math.min(80, (matchingWords / queryWords.length) * 80)
    : 0;
}

function getEquivalentWeapons(weaponType, jewelType) {
  if (jewelType === "searching") {
    if (weaponType === "bow" || weaponType === "wand") return ["bow", "wand"];
  } else if (jewelType === "murderous") {
    const normalizedWeapon = weaponType.toLowerCase().replace(/s$/, "");
    const oneHandedMelee = [
      "dagger",
      "claw",
      "sword",
      "axe",
      "mace",
      "sceptre",
    ];
    const twoHandedMelee = ["staff"];

    if (oneHandedMelee.includes(normalizedWeapon)) return oneHandedMelee;
    if (normalizedWeapon === "staff") return twoHandedMelee;
  }

  return [weaponType];
}

function selectMod(mod) {
  if (mod.isGeneratedVariant && mod.sourceKey) {
    const availableMods = getModsForJewelType(currentJewelType);
    const originalMod = availableMods[mod.sourceKey];

    if (originalMod) {
      const hybridMod = {
        ...originalMod,
        key: mod.sourceKey,
        name: mod.name,
        userSearchedWeapon: mod.weaponType,
        isGeneratedVariant: true,
        sourceKey: mod.sourceKey,
      };
      currentModForTierSelection = hybridMod;
      showTierModal(hybridMod);
      return;
    }
  }

  currentModForTierSelection = mod;
  showTierModal(mod);
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
  if (elements.searchResults) elements.searchResults.innerHTML = "";
}

function showTierModal(mod) {
  if (!elements.tierModal || !elements.tierFromSelect || !elements.tierToSelect)
    return;

  if (elements.tierModalHeader) {
    elements.tierModalHeader.textContent = `Select Tier Range for "${mod.name}"`;
  }

  elements.tierFromSelect.innerHTML = "";
  elements.tierToSelect.innerHTML = "";

  const tierKeys = Object.keys(mod.tiers);
  tierKeys.forEach((tier) => {
    const tierData = mod.tiers[tier];

    const fromOption = document.createElement("option");
    fromOption.value = tier;
    fromOption.textContent = `${tier} (${tierData.min}-${tierData.max})`;
    elements.tierFromSelect.appendChild(fromOption);

    const toOption = document.createElement("option");
    toOption.value = tier;
    toOption.textContent = `${tier} (${tierData.min}-${tierData.max})`;
    elements.tierToSelect.appendChild(toOption);
  });

  if (tierKeys.length > 0) {
    elements.tierFromSelect.value = tierKeys[tierKeys.length - 1];
    elements.tierToSelect.value = tierKeys[0];
  }

  updateTierRangeInfo();
  elements.tierModal.style.display = "flex";
}

function updateTierRangeInfo() {
  if (
    !elements.tierRangeInfo ||
    !elements.tierFromSelect ||
    !elements.tierToSelect ||
    !currentModForTierSelection
  )
    return;

  const fromTier = elements.tierFromSelect.value;
  const toTier = elements.tierToSelect.value;

  const fromIndex = parseInt(fromTier.replace("T", ""));
  const toIndex = parseInt(toTier.replace("T", ""));

  if (fromIndex < toIndex) {
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
  if (elements.tierModal) elements.tierModal.style.display = "none";
  currentModForTierSelection = null;
}

// === MOD SELECTION - FIXED WEAPON TEXT ADJUSTMENT ===
function addSelectedModWithRange(mod, fromTier, toTier) {
  console.log(
    `[Auto-fill Debug] Processing mod: ${mod.name}, isGenerated: ${mod.isGeneratedVariant}, weapon: ${mod.userSearchedWeapon}`
  );

  const existingIndex = selectedMods.findIndex(
    (selected) => selected.key === mod.key || selected.key === mod.sourceKey
  );

  // Get the original mod data and tier info
  let actualMod = mod;
  let actualKey = mod.key;

  if (mod.isGeneratedVariant && mod.sourceKey) {
    const availableMods = getModsForJewelType(currentJewelType);
    const originalMod = availableMods[mod.sourceKey];

    if (originalMod) {
      actualMod = {
        ...originalMod,
        name: mod.name,
        userSearchedWeapon: mod.userSearchedWeapon,
        isGeneratedVariant: true,
        sourceKey: mod.sourceKey,
      };
      actualKey = mod.sourceKey;
      console.log(
        `[Auto-fill Debug] Using original mod data from key: ${actualKey}`
      );
    } else {
      console.error(
        `[Auto-fill Debug] Could not find original mod for source key: ${mod.sourceKey}`
      );
      return;
    }
  }

  const fromTierData = actualMod.tiers[fromTier];
  const toTierData = actualMod.tiers[toTier];
  const isExactTier = fromTier === toTier;

  // CRITICAL FIX: Create adjusted tier data with correct weapon text
  let adjustedTierData = { ...fromTierData };

  if (mod.isGeneratedVariant && mod.userSearchedWeapon && fromTierData.text) {
    const weaponCapitalized =
      mod.userSearchedWeapon.charAt(0).toUpperCase() +
      mod.userSearchedWeapon.slice(1);

    console.log(`[Auto-fill Debug] Original tier text: "${fromTierData.text}"`);

    // Replace weapon text to match the selected variant
    if (
      mod.userSearchedWeapon === "mace" ||
      mod.userSearchedWeapon === "sceptre"
    ) {
      // For mace or sceptre, always use the compound mod text
      adjustedTierData.text = fromTierData.text.replace(
        /with\s+\w+\s+Attacks/gi,
        "with Mace or Sceptre Attacks"
      );
      console.log(
        `[Auto-fill Debug] Mace/Sceptre compound text: "${adjustedTierData.text}"`
      );
    } else {
      // Single weapon mod - replace normally (for dagger, claw, sword, axe, staff)
      adjustedTierData.text = fromTierData.text.replace(
        /with\s+(Dagger|Claw|Sword|Axe|Mace|Sceptre|Staff|Bow|Wand)s?\s+Attacks/gi,
        `with ${weaponCapitalized} Attacks`
      );
      console.log(
        `[Auto-fill Debug] Single weapon replacement: "${adjustedTierData.text}"`
      );
    }

    console.log(
      `[Auto-fill Debug] Adjusted tier text: "${adjustedTierData.text}"`
    );
  }

  // Calculate search values
  const modTextForCheck = adjustedTierData.text || mod.originalName || mod.name;
  const searchValues = calculateSearchValues(
    fromTierData,
    modTextForCheck,
    isExactTier,
    fromTier,
    toTier
  );

  let finalMinValue = searchValues.min;
  let finalMaxValue = isExactTier ? searchValues.max : toTierData.max;

  if (!isExactTier && isFlatAddedDamageMod(modTextForCheck)) {
    const toTierAvg = Math.round((toTierData.min + toTierData.max) / 2);
    finalMaxValue = toTierAvg;
  }

  const modData = {
    key: actualKey,
    modName: mod.name,
    name: mod.name,
    originalName: mod.originalName || actualMod.name,
    fromTier: fromTier,
    toTier: toTier,
    tierRange: isExactTier ? fromTier : `${fromTier}-${toTier}`,
    tierData: adjustedTierData, // Use the adjusted tier data with correct weapon text
    minValue: finalMinValue,
    maxValue: finalMaxValue,
    wasAveraged: searchValues.wasAveraged,
    wasCapped: finalMaxValue < toTierData.max,
    isExactTier: isExactTier,
    statId: actualMod.statId,
    category: actualMod.category,
    userSearchedWeapon: mod.userSearchedWeapon,
    isGeneratedVariant: mod.isGeneratedVariant || false,
    sourceKey: mod.sourceKey || actualKey,
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
      const tierDisplay = mod.tierRange || mod.fromTier || "T?";
      let indicators = "";
      if (mod.wasAveraged)
        indicators +=
          ' <span style="color: #4CAF50; font-size: 0.85em;">(avg)</span>';
      if (mod.wasCapped)
        indicators +=
          ' <span style="color: #ff9800; font-size: 0.85em;">(cap)</span>';

      return `
        <div class="selected-mod">
          <span class="mod-info">
            <span class="mod-name">${mod.name}</span>
            <span class="mod-tier">${tierDisplay}</span>
            <span class="mod-range">(${mod.minValue}-${mod.maxValue})${indicators}</span>
          </span>
          <button class="remove-mod" data-index="${index}">&times;</button>
        </div>
      `;
    })
    .join("");

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
  if (elements.modSearch) elements.modSearch.value = "";
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

// === AUTO-FILL - FIXED GENERICIZED TEXT ===
function getGenericizedModText(mod) {
  console.log(`[Auto-fill Debug] Getting genericized text for mod:`, mod);

  // CRITICAL FIX: For generated variants, use the adjusted tierData text
  if (mod.isGeneratedVariant && mod.tierData?.text) {
    console.log(
      `[Auto-fill Debug] Using adjusted tier text: "${mod.tierData.text}"`
    );
    return genericizeModText(mod.tierData.text);
  }

  if (mod.tierData?.text) {
    console.log(`[Auto-fill Debug] Using tier text: "${mod.tierData.text}"`);
    return genericizeModText(mod.tierData.text);
  }

  const textToGenericize = mod.displayText || mod.originalName || mod.name;
  console.log(`[Auto-fill Debug] Using fallback text: "${textToGenericize}"`);
  return genericizeModText(textToGenericize);
}

async function handleAutoFill() {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  const searchMode = selectedMods.length > 0 ? "with-mods" : "base-only";
  console.log(`[Auto-fill Debug] Selected mods:`, selectedMods);

  const processedMods = selectedMods.map((mod) => {
    const genericText = getGenericizedModText(mod);
    console.log(
      `[Auto-fill Debug] Processed mod "${mod.name}" -> "${genericText}"`
    );

    return {
      ...mod,
      genericText: genericText,
      searchText: genericText,
    };
  });

  const config = {
    jewelType: currentJewelType,
    jewelDisplayName: JEWEL_TYPE_CONFIG[currentJewelType].displayName,
    searchMode: searchMode,
    selectedMods: processedMods,
    timestamp: Date.now(),
  };

  console.log(`[Auto-fill Debug] Sending config to content script:`, config);
  showStatusMessage("Opening trade site...", "info");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "openTradeTab",
      config: config,
    });

    if (response?.success) {
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

console.log("📦 PoE Trade Helper popup script loaded completely");
