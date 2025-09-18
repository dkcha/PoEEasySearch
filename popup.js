// PoE Trade Helper - Production Popup Script (Data-Driven Architecture v9.3)
console.log("PoE Trade Helper - Popup script loading...");

// === GLOBAL STATE ===
let currentJewelType = "";
let selectedMods = [];
let allAbyssModsData = null;
let currentModForTierSelection = null;
let elements = {};

// === CONFIGURATION ===
const JEWEL_TYPE_CONFIG = {
  murderous: {
    displayName: "Murderous Eye Jewel",
    domain: "abyss_jewel",
    tags: ["abyss_jewel_melee"],
  },
  searching: {
    displayName: "Searching Eye Jewel",
    domain: "abyss_jewel",
    tags: ["abyss_jewel_ranged"],
  },
  hypnotic: {
    displayName: "Hypnotic Eye Jewel",
    domain: "abyss_jewel",
    tags: ["abyss_jewel_caster"],
  },
  ghastly: {
    displayName: "Ghastly Eye Jewel",
    domain: "abyss_jewel",
    tags: ["abyss_jewel_summoner"],
  },
};

// === INITIALIZATION ===
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM loaded, initializing popup...");

  try {
    await loadDataFiles();
    initializeElements();
    attachEventListeners();
    populateJewelDropdown();

    console.log("Popup initialization complete");
    showStatusMessage("Extension loaded successfully", "success");
  } catch (error) {
    console.error("Failed to initialize popup:", error);
    showStatusMessage("Failed to load extension data", "error");
  }
});

// === DATA LOADING ===
async function loadDataFiles() {
  const GITHUB_BASE_URL =
    "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/";
  const targetFile = "all_abyss_jewel_mods.json";
  const fullURL = `${GITHUB_BASE_URL}${targetFile}`;

  try {
    const response = await fetch(fullURL);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();

    if (
      !responseText.trim().startsWith("{") &&
      !responseText.trim().startsWith("[")
    ) {
      throw new Error("Response is not valid JSON format");
    }

    allAbyssModsData = JSON.parse(responseText);

    const finalCount = Object.keys(allAbyssModsData).length;
    console.log(`Loaded ${finalCount} abyss jewel mods from dataset`);
  } catch (error) {
    console.error("Data loading error:", error);
    throw error;
  }
}

// === MOD PROCESSING - TIER AGGREGATION ===
function getModsForJewelType(jewelType) {
  if (!jewelType || !allAbyssModsData) return {};

  const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
  if (!jewelConfig) return {};

  const modGroups = {};

  // First pass: Group mods by their base type
  Object.entries(allAbyssModsData).forEach(([modId, modData]) => {
    if (!modData.spawn_weights) return;

    // Check if this mod can spawn on the selected jewel type
    const canSpawnOnJewel = modData.spawn_weights.some((spawnWeight) => {
      if (!spawnWeight.weight || spawnWeight.weight <= 0) {
        return false;
      }

      const hasJewelSpecificTag = jewelConfig.tags.some(
        (tag) => spawnWeight.tag === tag
      );

      return hasJewelSpecificTag || spawnWeight.tag === "default";
    });

    if (canSpawnOnJewel) {
      const baseModType = extractBaseModType(modId, modData.text);

      if (!modGroups[baseModType]) {
        modGroups[baseModType] = [];
      }

      modGroups[baseModType].push({
        modId: modId,
        modData: modData,
        requiredLevel: modData.required_level || 1,
      });
    }
  });

  // Second pass: Create tier-aggregated mods
  const relevantMods = {};

  Object.entries(modGroups).forEach(([baseModType, modVariants]) => {
    if (modVariants.length === 0) return;

    // Sort by required level (highest first = T1), then by modId for consistency
    const sortedVariants = modVariants.sort((a, b) => {
      const levelDiff = (b.requiredLevel || 0) - (a.requiredLevel || 0);
      if (levelDiff !== 0) return levelDiff;
      return a.modId.localeCompare(b.modId);
    });

    // Create tier structure
    const tiers = {};
    sortedVariants.forEach((variant, index) => {
      const tierKey = `T${index + 1}`;
      const tierInfo = createTierInfo(variant.modData);

      tiers[tierKey] = {
        ...tierInfo,
        modId: variant.modId,
        requiredLevel: variant.requiredLevel,
      };
    });

    // Choose the most representative variant for display
    let primaryVariant = sortedVariants[0];

    // For life regeneration, prefer player regeneration over enemy debuffs
    if (baseModType === "PlayerLifeRegeneration") {
      const playerRegenVariant = sortedVariants.find(
        (variant) =>
          variant.modData.text &&
          variant.modData.text.toLowerCase().includes("regenerate") &&
          !variant.modData.text.toLowerCase().includes("enemies") &&
          !variant.modData.text.toLowerCase().includes("reduced")
      );

      if (playerRegenVariant) {
        primaryVariant = playerRegenVariant;
      }
    }

    const friendlyName = createFriendlyModName(
      primaryVariant.modData.text || baseModType,
      primaryVariant.modData
    );

    relevantMods[baseModType] = {
      modId: baseModType,
      baseModType: baseModType,
      name: friendlyName,
      text: primaryVariant.modData.text,
      tiers: tiers,
      stats: primaryVariant.modData.stats,
      required_level: primaryVariant.modData.required_level,
    };
  });

  return relevantMods;
}

function extractBaseModType(modId, modText) {
  if (!modText) {
    return modId || "UnknownMod";
  }

  const textLower = modText.toLowerCase();

  // Life/Mana/ES patterns
  if (textLower.includes("maximum life")) return "MaximumLife";
  if (textLower.includes("maximum mana")) return "MaximumMana";
  if (textLower.includes("maximum energy shield")) return "MaximumEnergyShield";

  // Life regeneration patterns (fixed base type collision)
  if (
    textLower.includes("life per second") ||
    textLower.includes("life regeneration")
  ) {
    if (
      textLower.includes("minion") ||
      modId.toLowerCase().includes("minion")
    ) {
      return "MinionLifeRegeneration";
    }
    if (
      textLower.includes("while moving") ||
      textLower.includes("moving") ||
      modId.toLowerCase().includes("moving")
    ) {
      return "MovingLifeRegeneration";
    }
    if (
      textLower.includes("recently") ||
      textLower.includes("if you haven't") ||
      textLower.includes("while")
    ) {
      const conditionType = textLower.includes("recently")
        ? "Recently"
        : textLower.includes("if you haven't")
        ? "Conditional"
        : "While";
      return `${conditionType}LifeRegeneration`;
    }
    return "PlayerLifeRegeneration";
  }

  // Mana regeneration patterns
  if (
    textLower.includes("mana per second") ||
    textLower.includes("mana regeneration")
  ) {
    if (
      textLower.includes("minion") ||
      modId.toLowerCase().includes("minion")
    ) {
      return "MinionManaRegeneration";
    }
    return "PlayerManaRegeneration";
  }

  // Resistance patterns
  const resistanceTypes = ["fire", "cold", "lightning", "chaos"];
  for (const type of resistanceTypes) {
    if (textLower.includes(`${type} resistance`)) {
      return `${type.charAt(0).toUpperCase() + type.slice(1)}Resistance`;
    }
  }

  // Weapon damage patterns
  if (textLower.includes("with ") && textLower.includes("attacks")) {
    const weaponMatch = textLower.match(
      /with\s+(\w+(?:\s+or\s+\w+)?)\s+attacks/i
    );
    const damageMatch = textLower.match(
      /(physical|fire|cold|lightning|chaos|elemental)\s+damage/i
    );

    if (weaponMatch && damageMatch) {
      const weapon = weaponMatch[1].replace(/\s+/g, "");
      const damage = damageMatch[1];
      return `${damage.charAt(0).toUpperCase() + damage.slice(1)}DamageWith${
        weapon.charAt(0).toUpperCase() + weapon.slice(1)
      }Attacks`;
    }
  }

  // Speed patterns
  if (textLower.includes("attack speed")) return "AttackSpeed";
  if (textLower.includes("cast speed")) return "CastSpeed";
  if (textLower.includes("movement speed")) return "MovementSpeed";

  // Fallback
  const fallbackType = modText
    .replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "")
    .replace(/\b\d+(?:\.\d+)?\b/g, "")
    .replace(/[+\-#%]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 30);

  return fallbackType || modId || "UnknownMod";
}

// === HELPER FUNCTIONS ===
function createFriendlyModName(text, modData) {
  if (!text) return "Unknown Mod";

  let friendly = text;

  // Handle damage ranges like "(14-15) to (25-28)" -> "# to # Added Physical Damage"
  friendly = friendly.replace(
    /\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\) to \(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g,
    "# to #"
  );

  // Handle single ranges like "(17-20)" -> "#"
  friendly = friendly.replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "#");

  // Handle standalone numbers
  friendly = friendly.replace(/\b\d+(?:\.\d+)?\b/g, "#");

  // Clean up multiple # symbols that are adjacent
  friendly = friendly.replace(/#\s*to\s*#\s*to\s*#/g, "# to #");
  friendly = friendly.replace(/#+/g, "#");

  // Normalize + signs and spacing
  friendly = friendly.replace(/\+#/g, "+#");
  friendly = friendly.replace(/\s+/g, " ");

  return friendly.trim();
}

function createTierInfo(modData) {
  let min = undefined,
    max = undefined;

  // Extract values from mod text
  if (modData.text) {
    const values = extractValuesFromText(modData.text);
    min = values.min;
    max = values.max;
  }

  // Fallback to stats if text parsing failed
  if ((min === undefined || max === undefined) && modData.stats?.length > 0) {
    const stat = modData.stats[0];
    min = stat.min;
    max = stat.max;
  }

  return {
    min: min,
    max: max,
    text: modData.text,
    required_level: modData.required_level || 1,
  };
}

function extractValuesFromText(text) {
  if (!text || typeof text !== "string") {
    return { min: undefined, max: undefined };
  }

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

// === MOD SEARCH ===
function findMatchingMods(query, maxResults = 10) {
  if (!currentJewelType || !allAbyssModsData) return [];

  const availableMods = getModsForJewelType(currentJewelType);
  const queryLower = query.toLowerCase().trim();
  const results = [];

  // Enhanced abbreviations map
  const abbreviations = {
    mana: "maximum mana",
    es: "energy shield",
    phys: "physical damage",
    physical: "physical damage",
    ele: "elemental",
    res: "resistance",
    "fire res": "fire resistance",
    "cold res": "cold resistance",
    "lightning res": "lightning resistance",
    "chaos res": "chaos resistance",
    crit: "critical",
    regen: "regeneration",
    "life regen": "life regeneration",
  };

  const searchQuery = (abbreviations[queryLower] || queryLower).toLowerCase();

  // Search through all available mods
  Object.entries(availableMods).forEach(([modId, mod]) => {
    const modTextLower = (mod.text || "").toLowerCase();
    const modNameLower = (mod.name || "").toLowerCase();
    const baseModTypeLower = (mod.baseModType || "").toLowerCase();

    let confidence = 0;
    let matchType = "";

    // Multiple search strategies with different confidence levels
    if (
      modTextLower === searchQuery ||
      modNameLower === searchQuery ||
      baseModTypeLower === searchQuery
    ) {
      confidence = 100;
      matchType = "exact";
    } else if (
      modTextLower.startsWith(searchQuery) ||
      modNameLower.startsWith(searchQuery) ||
      baseModTypeLower.startsWith(searchQuery)
    ) {
      confidence = 95;
      matchType = "starts_with";
    } else if (
      modTextLower.includes(searchQuery) ||
      modNameLower.includes(searchQuery) ||
      baseModTypeLower.includes(searchQuery)
    ) {
      confidence = 90;
      matchType = "contains_full";
    } else if (
      hasWordBoundaryMatch(modTextLower, searchQuery) ||
      hasWordBoundaryMatch(modNameLower, searchQuery) ||
      hasWordBoundaryMatch(baseModTypeLower, searchQuery)
    ) {
      confidence = 85;
      matchType = "word_boundary";
    } else if (
      hasPartialWordMatch(modTextLower, searchQuery) ||
      hasPartialWordMatch(modNameLower, searchQuery) ||
      hasPartialWordMatch(baseModTypeLower, searchQuery)
    ) {
      confidence = 70;
      matchType = "partial_word";
    } else if (
      hasTokenMatch(modTextLower, searchQuery) ||
      hasTokenMatch(modNameLower, searchQuery) ||
      hasTokenMatch(baseModTypeLower, searchQuery)
    ) {
      confidence = 60;
      matchType = "token";
    }

    if (confidence > 0) {
      results.push({
        modId: modId,
        baseModType: mod.baseModType || modId,
        name: mod.name,
        text: mod.text,
        confidence: confidence,
        matchType: matchType,
        tiers: mod.tiers,
        originalData: mod,
      });
    }
  });

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

// Helper functions for search matching
function hasWordBoundaryMatch(text, query) {
  const words = text.split(/\s+/);
  return words.some((word) => word.includes(query));
}

function hasPartialWordMatch(text, query) {
  if (query.length < 2) return false;
  const words = text.split(/\s+/);
  return words.some((word) => {
    return (
      word.startsWith(query) ||
      word.toLowerCase().indexOf(query.toLowerCase()) === 0
    );
  });
}

function hasTokenMatch(text, query) {
  const queryTokens = query.split(/\s+/);
  const textTokens = text.split(/\s+/);
  return queryTokens.every((queryToken) =>
    textTokens.some((textToken) => textToken.includes(queryToken))
  );
}

// === DOM AND EVENT HANDLING ===
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
    if (!elements[id]) console.warn(`Element not found: ${id}`);
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

    const displayText = result.name;

    resultDiv.innerHTML = `
      <span class="mod-name">${displayText}</span>
      <span class="confidence">(${result.confidence}%)</span>
    `;

    resultDiv.addEventListener("click", () => selectMod(result));
    elements.searchResults.appendChild(resultDiv);
  });
}

function selectMod(mod) {
  currentModForTierSelection = mod;
  showTierModal(mod);
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
  const isExactTier = fromTier === toTier;

  const fromTierData = currentModForTierSelection.tiers[fromTier];
  const toTierData = currentModForTierSelection.tiers[toTier];
  const modText = fromTierData.text || currentModForTierSelection.name;

  // Check if we're dealing with the lowest available tier
  const tierKeys = Object.keys(currentModForTierSelection.tiers);
  const lowestTier = tierKeys[tierKeys.length - 1];
  const isLowestTierSearch = fromTier === lowestTier || toTier === lowestTier;

  // Determine value ranges for display
  const fromTierNum = parseInt(fromTier.replace("T", ""));
  const toTierNum = parseInt(toTier.replace("T", ""));

  let minDisplayValue, maxDisplayValue;

  if (isLowestTierSearch) {
    minDisplayValue = 0;
    maxDisplayValue = isExactTier
      ? fromTierData.max
      : Math.max(fromTierData.max, toTierData.max);
  } else if (isExactTier) {
    minDisplayValue = fromTierData.min;
    maxDisplayValue = fromTierData.max;
  } else {
    // For ranges, show the full span from lowest to highest values
    if (fromTierNum > toTierNum) {
      // T4-T3: min from T4, max from T3
      minDisplayValue = fromTierData.min;
      maxDisplayValue = toTierData.max;
    } else {
      // T3-T4: min from T4, max from T3
      minDisplayValue = toTierData.min;
      maxDisplayValue = fromTierData.max;
    }
  }

  let infoText = "";

  if (isExactTier) {
    if (isLowestTierSearch) {
      infoText = `<span class="tier-range-highlight">Exact ${fromTier}</span> - Search Range: ${minDisplayValue}-${maxDisplayValue}`;
      infoText += ` <br><small style="color: #4CAF50;">No minimum set for lowest tier search</small>`;
    } else {
      infoText = `<span class="tier-range-highlight">Exact ${fromTier}</span> - Values: ${minDisplayValue}-${maxDisplayValue}`;
    }
  } else {
    const tierDisplay = `${fromTier} to ${toTier}`;
    if (isLowestTierSearch) {
      infoText = `<span class="tier-range-highlight">${tierDisplay}</span> - Search Range: ${minDisplayValue}-${maxDisplayValue}`;
      infoText += ` <br><small style="color: #4CAF50;">No minimum set - includes lowest tier</small>`;
    } else {
      infoText = `<span class="tier-range-highlight">${tierDisplay}</span> - Range: ${minDisplayValue}-${maxDisplayValue}`;
    }
  }

  if (isFlatAddedDamageMod(modText) && !isLowestTierSearch && !isExactTier) {
    infoText += ` <br><small style="color: #4CAF50;">Damage mods use averaged minimum values</small>`;
  }

  elements.tierRangeInfo.innerHTML = infoText;
}

function confirmTierSelection() {
  if (!currentModForTierSelection) return;

  const fromTier = elements.tierFromSelect.value;
  const toTier = elements.tierToSelect.value;

  addSelectedModWithRange(currentModForTierSelection, fromTier, toTier);
  closeTierModal();
}

// === UTILITY FUNCTIONS FOR TIER HANDLING ===
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

function getPrevTier(tier) {
  const tierNum = parseInt(tier.replace("T", ""));
  return tierNum > 1 ? `T${tierNum - 1}` : "higher tier";
}

// === MOD SELECTION - MULTIPLE MODS SUPPORT ===
function addSelectedModWithRange(mod, fromTier, toTier) {
  const baseModType =
    mod.baseModType || mod.modId || extractBaseModType(mod.modId, mod.text);

  const existingIndex = selectedMods.findIndex(
    (selected) => selected.baseModType === baseModType
  );

  const fromTierData = mod.tiers[fromTier];
  const toTierData = mod.tiers[toTier];
  const isExactTier = fromTier === toTier;

  const tierKeys = Object.keys(mod.tiers);
  const lowestTier = tierKeys[tierKeys.length - 1];
  const isLowestTierSearch = fromTier === lowestTier || toTier === lowestTier;

  const fromTierNum = parseInt(fromTier.replace("T", ""));
  const toTierNum = parseInt(toTier.replace("T", ""));

  let lowerValueTier, higherValueTier, lowerValueTierData, higherValueTierData;

  if (fromTierNum > toTierNum) {
    lowerValueTier = fromTier;
    higherValueTier = toTier;
    lowerValueTierData = fromTierData;
    higherValueTierData = toTierData;
  } else {
    lowerValueTier = toTier;
    higherValueTier = fromTier;
    lowerValueTierData = toTierData;
    higherValueTierData = fromTierData;
  }

  const modTextForCheck = fromTierData.text || mod.text || mod.name;

  let finalMinValue,
    finalMaxValue,
    wasAveraged = false,
    wasCapped = false;

  if (isLowestTierSearch) {
    finalMinValue = 0;
    finalMaxValue = Math.max(fromTierData.max, toTierData.max);
    wasAveraged = false;
  } else if (isExactTier) {
    if (isFlatAddedDamageMod(modTextForCheck)) {
      // For exact tier damage mods, use the averaged damage range
      const damageRange = calculateDamageRange(fromTierData);
      finalMinValue = damageRange.min;
      finalMaxValue = damageRange.max;
      wasAveraged = true;
    } else {
      finalMinValue = fromTierData.min;
      finalMaxValue = fromTierData.max;
      wasAveraged = false;
    }
  } else {
    // Range search
    if (isFlatAddedDamageMod(modTextForCheck)) {
      // FIXED: For damage mod ranges, use averaged values from each tier
      const lowerDamageRange = calculateDamageRange(lowerValueTierData);
      const higherDamageRange = calculateDamageRange(higherValueTierData);

      finalMinValue = lowerDamageRange.min; // T4 averaged min (9)
      finalMaxValue = higherDamageRange.max; // T3 averaged max (12)
      wasAveraged = true;
    } else {
      finalMinValue = lowerValueTierData.min;
      finalMaxValue = higherValueTierData.max;
      wasAveraged = false;
    }
  }

  console.log("=== MOD VALUE DEBUG ===");
  console.log("Mod name:", mod.name);
  console.log("Selection: fromTier =", fromTier, "toTier =", toTier);
  console.log(
    "lowerValueTier:",
    lowerValueTier,
    "- text:",
    lowerValueTierData.text
  );
  console.log(
    "higherValueTier:",
    higherValueTier,
    "- text:",
    higherValueTierData.text
  );

  if (isFlatAddedDamageMod(modTextForCheck)) {
    const lowerDamageRange = calculateDamageRange(lowerValueTierData);
    const higherDamageRange = calculateDamageRange(higherValueTierData);
    console.log(
      "Lower tier averaged damage:",
      lowerDamageRange.min,
      "-",
      lowerDamageRange.max
    );
    console.log(
      "Higher tier averaged damage:",
      higherDamageRange.min,
      "-",
      higherDamageRange.max
    );
  }

  console.log(
    "FINAL: finalMinValue =",
    finalMinValue,
    ", finalMaxValue =",
    finalMaxValue
  );
  console.log("=== END DEBUG ===");

  const modData = {
    modId: mod.modId,
    baseModType: baseModType,
    modName: mod.name,
    name: mod.name,
    fromTier: fromTier,
    toTier: toTier,
    tierRange: isExactTier ? fromTier : `${fromTier}-${toTier}`,
    tierData: fromTierData,
    minValue: finalMinValue,
    maxValue: finalMaxValue,
    wasAveraged: wasAveraged,
    wasCapped: wasCapped,
    isExactTier: isExactTier,
    isLowestTierSearch: isLowestTierSearch,
    originalText: fromTierData.text || mod.text,
  };

  if (existingIndex !== -1) {
    selectedMods[existingIndex] = modData;
  } else {
    if (selectedMods.length >= 6) {
      showStatusMessage("Maximum 6 mods allowed", "error");
      return;
    }
    selectedMods.push(modData);
  }

  updateSelectedModsDisplay();
  updateAutoFillButton();
  clearSearchInput();

  const tierDisplay = isExactTier ? fromTier : `${fromTier}-${toTier}`;
  const averageIndicator = wasAveraged ? " (averaged)" : "";
  const actionText = existingIndex !== -1 ? "Updated" : "Added";

  showStatusMessage(
    `${actionText} ${mod.name} (${tierDisplay})${averageIndicator}`,
    "success"
  );
}

function calculateDamageRange(tierData) {
  // For damage mods like "(6-7) to (11-13)", calculate the actual damage range
  // The game averages the two numbers: (6+11)/2 to (7+13)/2 = 8.5 to 10
  const text = tierData.text;

  // Extract the two damage ranges
  const damageRangeMatch = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\) to \((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );

  if (damageRangeMatch) {
    const lowMin = parseFloat(damageRangeMatch[1]); // 6
    const lowMax = parseFloat(damageRangeMatch[2]); // 7
    const highMin = parseFloat(damageRangeMatch[3]); // 11
    const highMax = parseFloat(damageRangeMatch[4]); // 13

    // Calculate the actual damage range by averaging (keep as floats for precision)
    const actualMin = (lowMin + highMin) / 2; // (6+11)/2 = 8.5
    const actualMax = (lowMax + highMax) / 2; // (7+13)/2 = 10

    return { min: actualMin, max: actualMax };
  }

  // Fallback to tier data min/max if parsing fails
  return { min: tierData.min, max: tierData.max };
}

function calculateSearchValues(
  tierData,
  modText,
  isExactTier,
  fromTier,
  toTier,
  isLowestTierSearch = false
) {
  // For lowest tier searches, don't set a minimum value
  if (isLowestTierSearch) {
    if (isExactTier) {
      // Exact lowest tier: min = 0, max = tier max
      return {
        min: 0,
        max: tierData.max,
        wasAveraged: false,
      };
    } else {
      // Range including lowest tier: min = 0, max = tier max (no averaging for ranges including lowest)
      return {
        min: 0,
        max: tierData.max,
        wasAveraged: false,
      };
    }
  }

  // For non-lowest tier searches, use original logic
  if (isExactTier) {
    if (isFlatAddedDamageMod(modText) && tierData.min && tierData.max) {
      const avgDamage = Math.round((tierData.min + tierData.max) / 2);
      return { min: avgDamage, max: avgDamage, wasAveraged: true };
    }
    return { min: tierData.min, max: tierData.max, wasAveraged: false };
  }

  // Range searches for non-lowest tiers
  if (isFlatAddedDamageMod(modText) && tierData.min && tierData.max) {
    const avgDamage = Math.round((tierData.min + tierData.max) / 2);
    return {
      min: avgDamage,
      max: tierData.max, // Use fromTier max, toTier max will be applied later
      wasAveraged: true,
      avgDamage: avgDamage,
    };
  }

  return { min: tierData.min, max: tierData.max, wasAveraged: false };
}

function closeTierModal() {
  if (elements.tierModal) elements.tierModal.style.display = "none";
  currentModForTierSelection = null;
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
      return `
        <div class="selected-mod">
          <span class="mod-info">
            <span class="mod-name">${mod.name}</span>
            <span class="mod-range">(${mod.minValue}-${mod.maxValue})</span>
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

function clearSearchResults() {
  if (elements.searchResults) elements.searchResults.innerHTML = "";
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
async function handleAutoFill() {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  const searchMode = selectedMods.length > 0 ? "with-mods" : "base-only";

  // Create processed mods with genericized text for trade site
  const processedMods = selectedMods.map((mod) => {
    const genericText = genericizeModText(mod.tierData.text || mod.name);

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
    console.error("Auto-fill failed:", error);
    showStatusMessage("Failed to open trade site", "error");
  }
}

function genericizeModText(text) {
  if (!text) return "";

  return text
    .replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "#") // Replace (12-15) with #
    .replace(/\b\d+(?:\.\d+)?\b/g, "#") // Replace standalone numbers
    .replace(/\+#/g, "+#") // Normalize + signs
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
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

console.log(
  "PoE Trade Helper popup script loaded completely - Production v9.3"
);
