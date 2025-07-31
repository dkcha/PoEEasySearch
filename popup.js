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
    tagPattern: ["not_for_sale", "abyss_jewel_ranged", "abyss_jewel", "default"],
  },
  hypnotic: {
    displayName: "Hypnotic Eye Jewel",
    tagPattern: ["not_for_sale", "abyss_jewel_caster", "abyss_jewel", "default"],
  },
  ghastly: {
    displayName: "Ghastly Eye Jewel",
    tagPattern: ["not_for_sale", "abyss_jewel_minion", "abyss_jewel", "default"],
  },
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

  const GITHUB_BASE_URL = "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/";

  try {
    // Load all data files
    const [jewelResponse, modsResponse, fullModsResponse] = await Promise.all([
      fetch(`${GITHUB_BASE_URL}abyss_jewels.json`),
      fetch(`${GITHUB_BASE_URL}abyss_jewel_mods.json`),
      fetch(`${GITHUB_BASE_URL}mods.json`)
    ]);

    if (!jewelResponse.ok) throw new Error(`Failed to load abyss_jewels.json: ${jewelResponse.status}`);
    if (!modsResponse.ok) throw new Error(`Failed to load abyss_jewel_mods.json: ${modsResponse.status}`);
    if (!fullModsResponse.ok) throw new Error(`Failed to load mods.json: ${fullModsResponse.status}`);

    abyssJewelsData = await jewelResponse.json();
    abyssJewelModsData = await modsResponse.json();
    fullModsData = await fullModsResponse.json();

    console.log("✅ All data loaded successfully");
    console.log(`- Abyss Jewels: ${Object.keys(abyssJewelsData || {}).length} entries`);
    console.log(`- Full Mods: ${Object.keys(fullModsData || {}).length} entries`);
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
          console.warn(`⚠️ Failed to extract values for ${modKey} ${tierKey}, using fallback`);
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
  const damageRangeMatch = text.match(/\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\) to \((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\)/);
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
    "jewelType", "modSearch", "searchResults", "selectedMods",
    "autoFillBtn", "statusMessage", "tierModal", "tierOptions", "closeTierModal"
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

  elements.jewelType.innerHTML = '<option value="">Select Abyss Jewel Type</option>';

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
    elements.modSearch.placeholder = currentJewelType ? "Type to search mods..." : "Select a jewel type first";
  }

  updateAutoFillButton();

  if (currentJewelType) {
    showStatusMessage(`Selected ${JEWEL_TYPE_CONFIG[currentJewelType].displayName}`, "success");
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
    expandedQuery = expandedQuery.replace(new RegExp(`\\b${abbr}\\b`, "g"), expansion);
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
    } else if (modNameLower.startsWith(queryLower) || modNameLower.startsWith(expandedQuery)) {
      confidence = 95;
    } else if (modNameLower.includes(queryLower) || modNameLower.includes(expandedQuery)) {
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
              (weapon) => modNameLower.includes(weapon) || modTextLower.includes(weapon)
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
      const detectedWeapon = Object.keys(weaponAliases).find((weapon) => queryLower.includes(weapon));

      if (detectedWeapon && modNameLower.includes("damage")) {
        const weaponCapitalized = detectedWeapon.charAt(0).toUpperCase() + detectedWeapon.slice(1);
        if (!displayName.includes(weaponCapitalized)) {
          displayName = displayName.replace(/damage/i, `${weaponCapitalized} Damage`);
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
    elements.searchResults.innerHTML = '<div class="no-results">No matching mods found</div>';
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
  const existingIndex = selectedMods.findIndex((selected) => selected.key === mod.key);

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
    elements.selectedMods.innerHTML = '<div class="no-mods">No mods selected</div>';
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
    elements.autoFillBtn.textContent = `Search with ${selectedMods.length} mod${selectedMods.length !== 1 ? "s" : ""}`;
  } else if (hasJewelType) {
    elements.autoFillBtn.textContent = `Search ${JEWEL_TYPE_CONFIG[currentJewelType].displayName}`;
  } else {
    elements.autoFillBtn.textContent = "Select Jewel Type";
  }
}

// Handle auto-fill
async function handleAutoFill() {
  if (!currentJewelType) {
    showStatusMessage("Please select a jewel type", "error");
    return;
  }

  const searchMode = selectedMods.length > 0 ? "with-mods" : "base-only";

  const config = {
    jewelType: currentJewelType,
    jewelDisplayName: JEWEL_TYPE_CONFIG[currentJewelType].displayName,
    searchMode: searchMode,
    selectedMods: selectedMods,
    timestamp: Date.now(),
  };

  showStatusMessage("Opening trade site...", "info");

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

// Make functions globally available
window.removeSelectedMod = removeSelectedMod;

console.log("📦 PoE Trade Helper popup script loaded completely");