// PoE Trade Helper - Popup Script
// Global state management
let currentJewelType = "";
let selectedMods = [];
let allAbyssModsData = null;
let currentModForTierSelection = null;
let elements = {};

// Configuration for different jewel types and their mod domains
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

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await loadDataFiles();
    initializeElements();
    attachEventListeners();
    populateJewelDropdown();
    showStatusMessage("Extension loaded successfully", "success");
  } catch (error) {
    console.error("Failed to initialize popup:", error);
    showStatusMessage("Failed to load extension data", "error");
  }
});

// Load mod data from GitHub repository
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
  } catch (error) {
    console.error("Data loading error:", error);
    throw error;
  }
}

// Process and group mods by jewel type with tier aggregation
function getModsForJewelType(jewelType) {
  if (!jewelType || !allAbyssModsData) return {};

  const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
  if (!jewelConfig) return {};

  const modGroups = {};

  // Group mods by their base type
  Object.entries(allAbyssModsData).forEach(([modId, modData]) => {
    if (!modData.spawn_weights) return;

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

  // Create tier-aggregated mods from grouped variants
  const relevantMods = {};

  Object.entries(modGroups).forEach(([baseModType, modVariants]) => {
    if (modVariants.length === 0) return;

    // Sort by required level (highest first = T1)
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

    // Special handling for life regeneration mods
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

// Extract base mod type from mod text using pattern matching
function extractBaseModType(modId, modText) {
  if (!modText) {
    return modId || "UnknownMod";
  }

  const textLower = modText.toLowerCase();

  // Minion patterns (must come first to avoid collisions)
  if (textLower.includes("minion")) {
    if (textLower.includes("maximum life")) return "MinionMaximumLife";
    if (
      textLower.includes("life per second") ||
      textLower.includes("life regeneration")
    ) {
      return "MinionLifeRegeneration";
    }
    if (textLower.includes("leech") && textLower.includes("life"))
      return "MinionLifeLeech";

    if (
      textLower.includes("attack speed") &&
      textLower.includes("cast speed")
    ) {
      return "MinionAttackAndCastSpeed";
    }
    if (textLower.includes("attack speed")) return "MinionAttackSpeed";
    if (textLower.includes("cast speed")) return "MinionCastSpeed";
    if (textLower.includes("movement speed")) return "MinionMovementSpeed";

    if (textLower.includes("damage")) {
      if (textLower.includes("fire damage")) return "MinionFireDamage";
      if (textLower.includes("cold damage")) return "MinionColdDamage";
      if (textLower.includes("lightning damage"))
        return "MinionLightningDamage";
      if (textLower.includes("physical damage")) return "MinionPhysicalDamage";
      if (textLower.includes("chaos damage")) return "MinionChaosDamage";
      return "MinionDamage";
    }

    if (textLower.includes("accuracy")) return "MinionAccuracy";
    if (textLower.includes("resistance")) return "MinionResistances";
    if (textLower.includes("blind")) return "MinionBlindOnHit";
    if (textLower.includes("taunt")) return "MinionTauntOnHit";
    if (textLower.includes("hinder")) return "MinionHinderOnHit";
    if (textLower.includes("poison")) return "MinionPoisonOnHit";
    if (textLower.includes("ignite")) return "MinionIgniteOnHit";
    if (textLower.includes("bleed")) return "MinionBleedOnHit";

    return "MinionMod";
  }

  // Player stat patterns
  if (textLower.includes("maximum life")) return "MaximumLife";
  if (textLower.includes("maximum mana")) return "MaximumMana";
  if (textLower.includes("maximum energy shield")) return "MaximumEnergyShield";

  // Life regeneration patterns with conditional handling
  if (
    textLower.includes("life per second") ||
    textLower.includes("life regeneration")
  ) {
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

  if (
    textLower.includes("mana per second") ||
    textLower.includes("mana regeneration")
  ) {
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

  // Speed and cast patterns
  if (textLower.includes("cast speed")) {
    if (textLower.includes("recently") || textLower.includes("if")) {
      return "ConditionalCastSpeed";
    }
    return "CastSpeed";
  }

  if (textLower.includes("attack speed")) return "AttackSpeed";
  if (textLower.includes("movement speed")) return "MovementSpeed";

  if (textLower.includes("spell") && textLower.includes("damage")) {
    return "SpellDamage";
  }

  // Critical strike patterns
  if (textLower.includes("critical strike chance"))
    return "CriticalStrikeChance";
  if (textLower.includes("critical strike multiplier"))
    return "CriticalStrikeMultiplier";

  // Ailment effect patterns
  if (textLower.includes("effect of") && textLower.includes("ailments")) {
    if (textLower.includes("cold")) return "ColdAilmentEffect";
    if (textLower.includes("fire")) return "FireAilmentEffect";
    if (textLower.includes("lightning")) return "LightningAilmentEffect";
    return "AilmentEffect";
  }

  // Fallback pattern extraction
  const fallbackType = modText
    .replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "")
    .replace(/\b\d+(?:\.\d+)?\b/g, "")
    .replace(/[+\-#%]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 30);

  return fallbackType || modId || "UnknownMod";
}

// Create user-friendly mod names by normalizing value placeholders
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

// Create tier information from mod data
function createTierInfo(modData) {
  let min = undefined,
    max = undefined;

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

// Extract numeric values from mod text using regex patterns
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

// Search for mods matching query with fuzzy matching and abbreviation support
function findMatchingMods(query, maxResults = 10) {
  if (!currentJewelType || !allAbyssModsData) return [];

  const availableMods = getModsForJewelType(currentJewelType);
  const queryLower = query.toLowerCase().trim();
  const results = [];

  // Common abbreviations mapping
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

  // Search through all available mods with confidence scoring
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

// Helper functions for advanced text matching
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

// Initialize DOM element references
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

// Attach event listeners to UI elements
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

// Populate jewel type dropdown with available options
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

// Handle jewel type selection change
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

// Handle mod search input with real-time filtering
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

// Handle keyboard navigation in search
function handleModSearchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const results = elements.searchResults?.querySelectorAll(".search-result");
    if (results?.length > 0) results[0].click();
  }
}

// Display search results in the UI
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

// Handle mod selection and show tier modal
function selectMod(mod) {
  currentModForTierSelection = mod;
  showTierModal(mod);
}

// Show tier selection modal for the selected mod
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

// Update tier range information display based on current selections
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

  const tierKeys = Object.keys(currentModForTierSelection.tiers);
  const lowestTier = tierKeys[tierKeys.length - 1];
  const isLowestTierSearch = fromTier === lowestTier || toTier === lowestTier;

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
    if (fromTierNum > toTierNum) {
      minDisplayValue = fromTierData.min;
      maxDisplayValue = toTierData.max;
    } else {
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

// Confirm tier selection and add mod to selected list
function confirmTierSelection() {
  if (!currentModForTierSelection) return;

  const fromTier = elements.tierFromSelect.value;
  const toTier = elements.tierToSelect.value;

  addSelectedModWithRange(currentModForTierSelection, fromTier, toTier);
  closeTierModal();
}

// Check if mod is a flat added damage type (requires special averaging)
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

// Add selected mod with tier range to the mod list
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
    wasAveraged = false;

  // Calculate search values based on tier selection
  if (isLowestTierSearch) {
    finalMinValue = 0;
    finalMaxValue = Math.max(fromTierData.max, toTierData.max);
    wasAveraged = false;
  } else if (isExactTier) {
    if (isFlatAddedDamageMod(modTextForCheck)) {
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
    if (isFlatAddedDamageMod(modTextForCheck)) {
      const lowerDamageRange = calculateDamageRange(lowerValueTierData);
      const higherDamageRange = calculateDamageRange(higherValueTierData);

      finalMinValue = lowerDamageRange.min;
      finalMaxValue = higherDamageRange.max;
      wasAveraged = true;
    } else {
      finalMinValue = lowerValueTierData.min;
      finalMaxValue = higherValueTierData.max;
      wasAveraged = false;
    }
  }

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

// Calculate damage range for flat damage mods using averaging
function calculateDamageRange(tierData) {
  const text = tierData.text;
  const damageRangeMatch = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\) to \((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );

  if (damageRangeMatch) {
    const lowMin = parseFloat(damageRangeMatch[1]);
    const lowMax = parseFloat(damageRangeMatch[2]);
    const highMin = parseFloat(damageRangeMatch[3]);
    const highMax = parseFloat(damageRangeMatch[4]);

    // Calculate the actual damage range by averaging
    const actualMin = (lowMin + highMin) / 2;
    const actualMax = (lowMax + highMax) / 2;

    return { min: actualMin, max: actualMax };
  }

  return { min: tierData.min, max: tierData.max };
}

// Close tier selection modal
function closeTierModal() {
  if (elements.tierModal) elements.tierModal.style.display = "none";
  currentModForTierSelection = null;
}

// Update the display of selected mods
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

// Remove a selected mod from the list
function removeSelectedMod(index) {
  if (index >= 0 && index < selectedMods.length) {
    const removedMod = selectedMods.splice(index, 1)[0];
    updateSelectedModsDisplay();
    updateAutoFillButton();
    showStatusMessage(`Removed ${removedMod.name}`, "info");
  }
}

// Clear search input and results
function clearSearchInput() {
  if (elements.modSearch) elements.modSearch.value = "";
  clearSearchResults();
}

function clearSearchResults() {
  if (elements.searchResults) elements.searchResults.innerHTML = "";
}

// Update auto-fill button text based on current state
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

// Handle auto-fill button click and send config to background script
async function handleAutoFill() {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  const searchMode = selectedMods.length > 0 ? "with-mods" : "base-only";

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

// Convert mod text to generic format for trade site matching
function genericizeModText(text) {
  if (!text) return "";

  return text
    .replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "#")
    .replace(/\b\d+(?:\.\d+)?\b/g, "#")
    .replace(/\+#/g, "+#")
    .replace(/\s+/g, " ")
    .trim();
}

// Show status message to user
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
