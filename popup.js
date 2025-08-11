// PoE Trade Helper - Fixed Popup Script
console.log("🎯 PoE Trade Helper - Popup script loading...");

// Global variables
let currentJewelType = "";
let selectedMods = [];
let abyssJewelsData = null;
let abyssJewelModsData = null;
let fullModsData = null;
let processedMods = {};
let jewelTypeToTagMap = {};

// DOM elements
let elements = {};

// Jewel type configuration
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

/**
 * Weapon type groupings - mods in the same group share tier values
 */
const WEAPON_EQUIVALENTS = {
  // Ranged weapons
  wand: ["wand", "bow"],
  bow: ["wand", "bow"],

  // Melee weapons
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

  // Two-handed weapons
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

// Initialize the popup when DOM is loaded
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

// Load data from GitHub repository
async function loadDataFiles() {
  console.log("📁 Loading data files from GitHub...");

  const GITHUB_BASE_URL =
    "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/";

  try {
    // Load all data files
    const [jewelResponse, modsResponse, fullModsResponse] = await Promise.all([
      fetch(`${GITHUB_BASE_URL}abyss_jewels.json`),
      fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`),
      fetch(`${GITHUB_BASE_URL}mods.json`),
    ]);

    if (!jewelResponse.ok)
      throw new Error(
        `Failed to load abyss_jewels.json: ${jewelResponse.status}`
      );
    if (!modsResponse.ok)
      throw new Error(
        `Failed to load abyss_jewel_mods.json: ${modsResponse.status}`
      );
    if (!fullModsResponse.ok)
      throw new Error(`Failed to load mods.json: ${fullModsResponse.status}`);

    abyssJewelsData = await jewelResponse.json();
    abyssJewelModsData = await modsResponse.json();
    fullModsData = await fullModsResponse.json();

    console.log("✅ All data loaded successfully");
    console.log(
      `- Abyss Jewels: ${Object.keys(abyssJewelsData || {}).length} entries`
    );
    console.log(
      `- Full Mods: ${Object.keys(fullModsData || {}).length} entries`
    );
  } catch (error) {
    console.error("❌ Error loading data files:", error);
    throw error;
  }
}

// Process jewel data to create tag mappings
function processJewelData() {
  Object.entries(JEWEL_TYPE_CONFIG).forEach(([key, config]) => {
    const tagString = config.tagPattern.join(",");
    jewelTypeToTagMap[key] = tagString;
  });
}

// Get available mods for a specific jewel type with REAL tier data
function getModsForJewelType(jewelType) {
  if (!jewelType || !abyssJewelModsData || !fullModsData) {
    return {};
  }

  const tagString = jewelTypeToTagMap[jewelType];
  if (!tagString) {
    console.warn(`⚠️ No tag mapping found for jewel type: ${jewelType}`);
    return {};
  }

  if (processedMods[jewelType]) {
    return processedMods[jewelType];
  }

  console.log(`🔍 Loading mods for ${jewelType} with tags: ${tagString}`);

  const abyssJewelsSection = abyssJewelModsData["Abyss Jewels"];
  if (!abyssJewelsSection) {
    console.warn('⚠️ No "Abyss Jewels" section found in mod data');
    return {};
  }

  const jewelData = abyssJewelsSection[tagString];
  if (!jewelData) {
    console.warn(`⚠️ No mod data found for tag combination: ${tagString}`);
    return {};
  }

  const mods = {};

  // Process each mod category
  Object.entries(jewelData.mods || {}).forEach(([category, categoryMods]) => {
    Object.entries(categoryMods).forEach(([modKey, modVariants]) => {
      const uniqueKey = `${category}_${modKey}`.toLowerCase();

      // Get REAL tier data from fullModsData
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
        .sort((a, b) => (b.requiredLevel || 0) - (a.requiredLevel || 0)); // T1 = highest level

      sortedVariants.forEach(({ variantKey, weight, modDetails }, index) => {
        const tierNum = index + 1;
        const tierKey = `T${tierNum}`;

        // Extract REAL values from mod details
        let tierValues = { min: undefined, max: undefined };

        if (modDetails && modDetails.text) {
          tierValues = extractModValues(modDetails.text, modDetails);
        }

        // Only use fallback if extraction completely fails
        if (tierValues.min === undefined || tierValues.max === undefined) {
          console.warn(
            `⚠️ Failed to extract values for ${modKey} ${tierKey}, using fallback`
          );
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

// Extract mod values from text and stats (same logic as content.js)
function extractModValues(modText, modDetails) {
  if (!modText || typeof modText !== "string") {
    return { min: undefined, max: undefined };
  }

  // First try to extract from text
  const textValues = extractValuesFromText(modText);
  if (textValues.min !== undefined && textValues.max !== undefined) {
    return textValues;
  }

  // Fallback to stats with unit conversion
  if (modDetails && modDetails.stats && modDetails.stats.length > 0) {
    return extractValuesFromStats(modDetails.stats, modText);
  }

  return { min: undefined, max: undefined };
}

function extractValuesFromText(text) {
  // Handle damage ranges like "(14-15) to (25-28)" - extract full range
  const damageRangeMatch = text.match(
    /\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\) to \((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/
  );
  if (damageRangeMatch) {
    return {
      min: parseFloat(damageRangeMatch[1]), // Lowest possible (14)
      max: parseFloat(damageRangeMatch[4]), // Highest possible (28)
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
  if (!stats || stats.length === 0) {
    return { min: undefined, max: undefined };
  }

  const stat = stats[0];
  if (!stat || stat.min === undefined || stat.max === undefined) {
    return { min: undefined, max: undefined };
  }

  let min = stat.min;
  let max = stat.max;

  // Apply unit conversions
  if (stat.id) {
    const conversion = getUnitConversion(stat.id, modText);
    min = Math.round(min * conversion);
    max = Math.round(max * conversion);
  }

  return { min, max };
}

function getUnitConversion(statId, modText) {
  // Life/Mana/ES regeneration: per_minute → per_second
  if (statId.includes("_per_minute") && modText.includes("per second")) {
    return 1 / 60;
  }

  // Percentage conversions
  if (statId.includes("_permyriad") || statId.includes("_per_ten_thousand")) {
    return 1 / 100;
  }

  return 1;
}

// Fallback values only when extraction fails
function getFallbackValues(modKey, tierNum) {
  const modType = modKey.toLowerCase();

  if (modType.includes("life")) {
    const values = [
      { min: 36, max: 40 }, // T1
      { min: 31, max: 35 }, // T2
      { min: 26, max: 30 }, // T3
      { min: 20, max: 25 }, // T4
    ];
    return values[tierNum - 1] || { min: 15, max: 19 };
  }

  // Default fallback
  return {
    min: Math.max(1, 10 - (tierNum - 1) * 2),
    max: Math.max(2, 12 - (tierNum - 1) * 2),
  };
}

// Format mod key into readable name
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

  if (customNames[modKey]) {
    return customNames[modKey];
  }

  // Default formatting
  return modKey
    .replace(/^AbyssJewel/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

// Initialize DOM elements
function initializeElements() {
  const elementIds = [
    "jewelType",
    "modSearch",
    "searchResults",
    "selectedMods",
    "autoFillBtn",
    "statusMessage",
    "tierModal",
    "tierOptions",
    "closeTierModal",
  ];

  elementIds.forEach((id) => {
    elements[id] = document.getElementById(id);
    if (!elements[id]) {
      console.warn(`⚠️ Element not found: ${id}`);
    }
  });
}

// Attach event listeners
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

  if (elements.tierModal) {
    elements.tierModal.addEventListener("click", function (e) {
      if (e.target === elements.tierModal) {
        closeTierModal();
      }
    });
  }
}

// Populate jewel dropdown
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

// Handle jewel type change
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

// Handle mod search input
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

// Handle keydown events
function handleModSearchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const results = elements.searchResults?.querySelectorAll(".search-result");
    if (results && results.length > 0) {
      results[0].click();
    }
  }
}

// Enhanced search with better weapon detection
function findMatchingMods(query, maxResults = 10) {
  if (!currentJewelType) return [];

  const availableMods = getModsForJewelType(currentJewelType);
  const queryLower = query.toLowerCase();
  const results = [];

  // Enhanced abbreviation expansions
  const abbreviations = {
    es: "energy shield",
    hp: "life",
    mp: "mana",
    res: "resistance",
    dmg: "damage",
    att: "attack",
    crit: "critical",
  };

  // Expand abbreviations
  let expandedQuery = queryLower;
  Object.entries(abbreviations).forEach(([abbr, expansion]) => {
    expandedQuery = expandedQuery.replace(
      new RegExp(`\\b${abbr}\\b`, "g"),
      expansion
    );
  });

  // FIXED weapon aliases - more precise groupings
  const weaponAliases = {
    // Ranged weapons (bow/wand share some mods)
    bow: ["bow", "wand"],
    wand: ["bow", "wand"],
    // Melee weapons (share damage mods)
    dagger: ["dagger", "claw", "sword", "axe", "mace", "scepter"],
    claw: ["dagger", "claw", "sword", "axe", "mace", "scepter"],
    sword: ["dagger", "claw", "sword", "axe", "mace", "scepter"],
    axe: ["dagger", "claw", "sword", "axe", "mace", "scepter"],
    mace: ["dagger", "claw", "sword", "axe", "mace", "scepter"],
    scepter: ["dagger", "claw", "sword", "axe", "mace", "scepter"],
    // Two-handed
    staff: ["staff", "bow"],
  };

  Object.entries(availableMods).forEach(([key, mod]) => {
    const modNameLower = mod.name.toLowerCase();
    const modTextLower = (mod.displayText || mod.name).toLowerCase();
    let confidence = 0;

    // Direct matching
    if (modNameLower === queryLower || modNameLower === expandedQuery) {
      confidence = 100;
    } else if (
      modNameLower.startsWith(queryLower) ||
      modNameLower.startsWith(expandedQuery)
    ) {
      confidence = 95;
    } else if (
      modNameLower.includes(queryLower) ||
      modNameLower.includes(expandedQuery)
    ) {
      confidence = 85;
    } else {
      // Enhanced partial word matching
      const queryWords = expandedQuery.split(" ");
      let matchingWords = 0;
      let hasWeaponMatch = false;

      queryWords.forEach((word) => {
        if (word.length > 2) {
          if (modNameLower.includes(word) || modTextLower.includes(word)) {
            matchingWords++;
          }

          // Check for weapon alias matches
          if (weaponAliases[word]) {
            const weaponVariants = weaponAliases[word];
            const hasWeaponInMod = weaponVariants.some(
              (weapon) =>
                modNameLower.includes(weapon) || modTextLower.includes(weapon)
            );

            if (hasWeaponInMod) {
              matchingWords++;
              hasWeaponMatch = true;
            }
          }
        }
      });

      if (matchingWords > 0) {
        confidence = Math.min(80, (matchingWords / queryWords.length) * 80);
        if (hasWeaponMatch) confidence += 10;
      }
    }

    if (confidence > 70) {
      let displayName = mod.name;

      // Enhanced display for weapon damage mods
      const detectedWeapon = Object.keys(weaponAliases).find((weapon) =>
        queryLower.includes(weapon)
      );

      if (detectedWeapon && modNameLower.includes("damage")) {
        const weaponCapitalized =
          detectedWeapon.charAt(0).toUpperCase() + detectedWeapon.slice(1);
        if (!displayName.includes(weaponCapitalized)) {
          displayName = displayName.replace(
            /damage/i,
            `${weaponCapitalized} Damage`
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
        isWeaponVariant: !!detectedWeapon,
      });
    }
  });

  return results
    .sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) < 5) {
        if (a.isWeaponVariant && !b.isWeaponVariant) return -1;
        if (!a.isWeaponVariant && b.isWeaponVariant) return 1;
      }
      return b.confidence - a.confidence;
    })
    .slice(0, maxResults);
}

// Display search results
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

// Clear search results
function clearSearchResults() {
  if (elements.searchResults) {
    elements.searchResults.innerHTML = "";
  }
}

// Select mod and show tier selection
function selectMod(mod) {
  showTierModal(mod);
}

// Show tier selection modal with CORRECT values
function showTierModal(mod) {
  if (!elements.tierModal || !elements.tierOptions) return;

  elements.tierOptions.innerHTML = "";

  // Create tier options with REAL values
  Object.entries(mod.tiers).forEach(([tier, data]) => {
    const tierButton = document.createElement("button");
    tierButton.className = "tier-option";
    tierButton.innerHTML = `
      <span class="tier-name">${tier}</span>
      <span class="tier-range">${data.min}-${data.max}</span>
    `;

    tierButton.addEventListener("click", () => {
      addSelectedMod(mod, tier, data);
      closeTierModal();
    });

    elements.tierOptions.appendChild(tierButton);
  });

  elements.tierModal.style.display = "flex";
}

// Close tier modal
function closeTierModal() {
  if (elements.tierModal) {
    elements.tierModal.style.display = "none";
  }
}

// Add selected mod with tier
function addSelectedMod(mod, tier, tierData) {
  const existingIndex = selectedMods.findIndex(
    (selected) => selected.key === mod.key
  );

  const modData = {
    key: mod.key,
    modName: mod.name,
    name: mod.name,
    originalName: mod.originalName || mod.name,
    tier: tier,
    tierData: tierData,
    minValue: tierData.min,
    maxValue: tierData.max,
    statId: mod.statId,
    category: mod.category,
    isWeaponVariant: mod.isWeaponVariant || false,
  };

  if (existingIndex !== -1) {
    selectedMods[existingIndex] = modData;
  } else {
    selectedMods.push(modData);
  }

  updateSelectedModsDisplay();
  updateAutoFillButton();
  clearSearchInput();

  const displayMessage = mod.isWeaponVariant
    ? `Added ${mod.name} (${tier}) - Weapon Variant`
    : `Added ${mod.name} (${tier})`;

  showStatusMessage(displayMessage, "success");
}

// Update selected mods display
function updateSelectedModsDisplay() {
  if (!elements.selectedMods) return;

  if (selectedMods.length === 0) {
    elements.selectedMods.innerHTML =
      '<div class="no-mods">No mods selected</div>';
    return;
  }

  elements.selectedMods.innerHTML = selectedMods
    .map(
      (mod, index) => `
        <div class="selected-mod">
          <span class="mod-info">
            <span class="mod-name">${mod.name}</span>
            <span class="mod-tier">${mod.tier}</span>
            <span class="mod-range">(${mod.tierData.min}-${mod.tierData.max})</span>
          </span>
          <button class="remove-mod" onclick="removeSelectedMod(${index})">&times;</button>
        </div>
      `
    )
    .join("");
}

// Remove selected mod
function removeSelectedMod(index) {
  if (index >= 0 && index < selectedMods.length) {
    const removedMod = selectedMods.splice(index, 1)[0];
    updateSelectedModsDisplay();
    updateAutoFillButton();
    showStatusMessage(`Removed ${removedMod.name}`, "info");
  }
}

// Clear search input
function clearSearchInput() {
  if (elements.modSearch) {
    elements.modSearch.value = "";
  }
  clearSearchResults();
}

// Update auto-fill button
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

// Get genericized mod text from the tier data
function getGenericizedModText(mod) {
  // If we already have the genericized text from tier data
  if (mod.tierData && mod.tierData.text) {
    return genericizeModText(mod.tierData.text);
  }

  // Fallback to the display text or name
  const textToGenericize = mod.displayText || mod.originalName || mod.name;
  return genericizeModText(textToGenericize);
}

// Helper to genericize mod text (replace numbers with #)
function genericizeModText(text) {
  if (!text) return "";

  // Replace damage ranges like "(14-15) to (25-28)" with "# to #"
  let genericized = text
    .replace(
      /\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\) to \(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g,
      "# to #"
    )
    .replace(/\(\d+(?:\.\d+)?-\d+(?:\.\d+)?\)/g, "#")
    .replace(/\b\d+(?:\.\d+)?\b/g, "#")
    .replace(/\+#/g, "+#");

  return genericized.trim();
}

// Handle auto-fill action
async function handleAutoFill() {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  // Get current speed setting
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
    speedMultiplier: speedMultiplier, // Add speed setting to config
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

// Show status message
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

// Speed control initialization
function initializeSpeedControl() {
  const speedSlider = document.getElementById("speedSlider");
  const speedValue = document.getElementById("speedValue");
  const speedDesc = document.getElementById("speedDesc");
  const speedPresets = document.querySelectorAll(".speed-preset");

  // Load saved speed setting
  chrome.storage.local.get(["speedMultiplier"], (result) => {
    const savedSpeed = result.speedMultiplier || 0.5;
    speedSlider.value = savedSpeed;
    updateSpeedDisplay(savedSpeed);
    updatePresetButtons(savedSpeed);
  });

  // Update display when slider changes
  speedSlider.addEventListener("input", (e) => {
    const speed = parseFloat(e.target.value);
    updateSpeedDisplay(speed);
    updatePresetButtons(speed);
    saveSpeedSetting(speed);
  });

  // Handle preset buttons
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
    // Calculate actual speed multiplier
    const multiplier = (1 / speed).toFixed(1);
    speedValue.textContent = `${multiplier}x`;

    // Update description
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

/**
 * Check if a mod has weapon-specific text
 */
function isWeaponSpecificMod(modText) {
  if (!modText) return false;

  const weaponPattern =
    /with (wand|bow|dagger|claw|sword|axe|mace|sceptre|staff|one handed|two handed)/i;
  return weaponPattern.test(modText);
}

/**
 * Extract weapon type from mod text
 */
function extractWeaponFromMod(modText) {
  if (!modText) return null;

  const match = modText.match(/with ([\w\s]+?)(?:\s+attacks?)?$/i);
  if (!match) return null;

  const weapon = match[1].toLowerCase().trim();

  // Normalize weapon names
  if (weapon.includes("wand")) return "wand";
  if (weapon.includes("bow")) return "bow";
  if (weapon.includes("dagger")) return "dagger";
  if (weapon.includes("claw")) return "claw";
  if (weapon.includes("sceptre")) return "sceptre";
  if (weapon.includes("staff")) return "staff";
  if (weapon.includes("two handed")) {
    if (weapon.includes("sword")) return "two handed sword";
    if (weapon.includes("axe")) return "two handed axe";
    if (weapon.includes("mace")) return "two handed mace";
  }
  if (weapon.includes("sword")) return "sword";
  if (weapon.includes("axe")) return "axe";
  if (weapon.includes("mace")) return "mace";

  return weapon;
}

/**
 * Get equivalent weapon mods using the same tier values
 */
function getWeaponEquivalents(originalMod, tierData) {
  const modText = tierData.text || originalMod.originalName || originalMod.name;

  if (!isWeaponSpecificMod(modText)) {
    return null;
  }

  const weapon = extractWeaponFromMod(modText);
  if (!weapon || !WEAPON_EQUIVALENTS[weapon]) {
    return null;
  }

  const equivalentWeapons = WEAPON_EQUIVALENTS[weapon];
  if (equivalentWeapons.length <= 1) {
    return null; // No equivalents
  }

  // Generate equivalent mod texts
  const equivalents = equivalentWeapons.map((weaponType) => {
    // Replace weapon name in the original text
    let equivalentText = modText;

    // Handle special cases
    if (weaponType.includes("two handed")) {
      equivalentText = modText.replace(/with [\w\s]+/i, `with ${weaponType}`);
    } else if (weaponType.includes("one handed")) {
      equivalentText = modText.replace(/with [\w\s]+/i, `with ${weaponType}`);
    } else {
      // Simple weapon replacement
      const weaponDisplay =
        weaponType.charAt(0).toUpperCase() + weaponType.slice(1) + "s";
      equivalentText = modText.replace(
        /with [\w\s]+/i,
        `with ${weaponDisplay}`
      );
    }

    return {
      weapon: weaponType,
      text: equivalentText,
      genericText: genericizeModText(equivalentText),
    };
  });

  return {
    originalWeapon: weapon,
    equivalents: equivalents,
    count: equivalents.length,
  };
}

/**
 * Enhanced tier modal to show weapon equivalents option
 */
function showTierModalWithEquivalents(mod) {
  if (!elements.tierModal || !elements.tierOptions) return;

  elements.tierOptions.innerHTML = "";

  // Check if this mod has weapon equivalents
  let hasEquivalents = false;
  let weaponEquivalents = null;

  // Check first tier for weapon info
  const firstTier = Object.values(mod.tiers)[0];
  if (firstTier) {
    weaponEquivalents = getWeaponEquivalents(mod, firstTier);
    hasEquivalents = weaponEquivalents !== null;
  }

  // Add weapon equivalents checkbox if applicable
  if (hasEquivalents) {
    const equivalentsDiv = document.createElement("div");
    equivalentsDiv.style.cssText = `
      padding: 10px;
      background: #3a3a3a;
      border-radius: 4px;
      margin-bottom: 12px;
      border: 1px solid #555;
    `;

    equivalentsDiv.innerHTML = `
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="checkbox" id="includeWeaponEquivalents" style="margin-right: 8px;">
        <span style="color: #d4af37; font-weight: bold;">
          Include all ${weaponEquivalents.count} weapon types
        </span>
      </label>
      <div style="color: #999; font-size: 11px; margin-top: 4px;">
        (${weaponEquivalents.equivalents.map((e) => e.weapon).join(", ")})
      </div>
    `;

    elements.tierOptions.appendChild(equivalentsDiv);
  }

  // Create tier options with REAL values
  Object.entries(mod.tiers).forEach(([tier, data]) => {
    const tierButton = document.createElement("button");
    tierButton.className = "tier-option";
    tierButton.innerHTML = `
      <span class="tier-name">${tier}</span>
      <span class="tier-range">${data.min}-${data.max}</span>
    `;

    tierButton.addEventListener("click", () => {
      const includeEquivalents = document.getElementById(
        "includeWeaponEquivalents"
      );
      const shouldIncludeEquivalents =
        includeEquivalents && includeEquivalents.checked;

      if (shouldIncludeEquivalents && weaponEquivalents) {
        // Add all weapon equivalents as a group
        addWeaponEquivalentGroup(mod, tier, data, weaponEquivalents);
      } else {
        // Add single mod as before
        addSelectedMod(mod, tier, data);
      }
      closeTierModal();
    });

    elements.tierOptions.appendChild(tierButton);
  });

  elements.tierModal.style.display = "flex";
}

/**
 * Add a group of weapon equivalent mods
 */
function addWeaponEquivalentGroup(
  originalMod,
  tier,
  tierData,
  weaponEquivalents
) {
  // Remove any existing mods with the same base type
  const baseModName = originalMod.name.replace(/with \w+/i, "").trim();
  selectedMods = selectedMods.filter((m) => !m.name.includes(baseModName));

  // Add the weapon group as a single "smart" mod
  const groupMod = {
    key: `${originalMod.key}_weapon_group`,
    modName: `${baseModName} (${weaponEquivalents.count} weapons)`,
    name: `${baseModName} (${weaponEquivalents.count} weapons)`,
    originalName: originalMod.originalName,
    tier: tier,
    tierData: tierData,
    minValue: tierData.min,
    maxValue: tierData.max,
    statId: originalMod.statId,
    category: originalMod.category,
    isWeaponGroup: true,
    weaponEquivalents: weaponEquivalents.equivalents,
    // Store all genericized texts for the content script
    genericTexts: weaponEquivalents.equivalents.map((e) => e.genericText),
  };

  selectedMods.push(groupMod);
  updateSelectedModsDisplay();
  updateAutoFillButton();
  clearSearchInput();

  showStatusMessage(
    `Added ${baseModName} for ${weaponEquivalents.count} weapon types (${tier})`,
    "success"
  );
}

// Override the original showTierModal function
const originalShowTierModal = showTierModal;
showTierModal = showTierModalWithEquivalents;

/**
 * Enhanced handleAutoFill to support weapon groups
 */
const originalHandleAutoFill = handleAutoFill;
handleAutoFill = async function () {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  const speedSlider = document.getElementById("speedSlider");
  const speedMultiplier = parseFloat(speedSlider.value) || 0.5;
  const searchMode = selectedMods.length > 0 ? "with-mods" : "base-only";

  // Process mods to handle weapon groups
  const processedMods = [];

  for (const mod of selectedMods) {
    if (mod.isWeaponGroup && mod.genericTexts) {
      // For weapon groups, pick one representative mod for the search
      // The trade site will handle the OR logic
      processedMods.push({
        ...mod,
        genericText: mod.genericTexts[0], // Use first weapon variant
        searchText: mod.genericTexts[0],
        // Store all variants for potential future use
        allGenericTexts: mod.genericTexts,
      });
    } else {
      // Regular mod
      processedMods.push({
        ...mod,
        genericText: getGenericizedModText(mod),
        searchText: getGenericizedModText(mod),
      });
    }
  }

  const config = {
    jewelType: currentJewelType,
    jewelDisplayName: JEWEL_TYPE_CONFIG[currentJewelType].displayName,
    searchMode: searchMode,
    selectedMods: processedMods,
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
};

/**
 * Enhanced display for weapon group mods in the selected list
 */
const originalUpdateSelectedModsDisplay = updateSelectedModsDisplay;
updateSelectedModsDisplay = function () {
  if (!elements.selectedMods) return;

  if (selectedMods.length === 0) {
    elements.selectedMods.innerHTML =
      '<div class="no-mods">No mods selected</div>';
    return;
  }

  elements.selectedMods.innerHTML = selectedMods
    .map((mod, index) => {
      const isWeaponGroup = mod.isWeaponGroup;
      const displayStyle = isWeaponGroup
        ? 'style="border-left-color: #e74c3c;"'
        : "";
      const weaponIcon = isWeaponGroup ? "⚔️ " : "";

      return `
      <div class="selected-mod" ${displayStyle}>
        <span class="mod-info">
          <span class="mod-name">${weaponIcon}${mod.name}</span>
          <span class="mod-tier">${mod.tier}</span>
          <span class="mod-range">(${mod.tierData.min}-${mod.tierData.max})</span>
        </span>
        <button class="remove-mod" onclick="removeSelectedMod(${index})">&times;</button>
      </div>
    `;
    })
    .join("");
};

// Make functions globally available
window.removeSelectedMod = removeSelectedMod;

console.log("📦 PoE Trade Helper popup script loaded completely");
