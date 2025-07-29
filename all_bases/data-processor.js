// Enhanced data-processor.js with fuzzy mod matching and tier conversion
// Path of Exile Trade Helper - Data Processing Module

class DataProcessor {
  constructor() {
    this.baseItems = {};
    this.mods = {};
    this.statTranslations = {};
    this.itemClasses = {};
    this.processedData = {
      baseItemsByClass: {},
      modsByBaseItem: {},
      tiersByMod: {},
      modAliases: {},
    };
  }

  // Initialize data processor with RePoE data
  async initialize() {
    try {
      await this.loadRePoEData();
      this.processBaseItems();
      this.processMods();
      this.buildModAliases();
      console.log("DataProcessor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize DataProcessor:", error);
      await this.loadFallbackData();
    }
  }

  // Load data from your GitHub repo
  async loadRePoEData() {
    const baseUrl =
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/main/data/";
    const files = [
      "base_items.json",
      "mods.json",
      "stat_translations.json",
      "item_classes.json",
    ];

    const loadPromises = files.map(async (file) => {
      try {
        const response = await fetch(baseUrl + file);
        if (!response.ok) {
          throw new Error(`Failed to load ${file}: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn(`Failed to load ${file}:`, error);
        return {};
      }
    });

    const [baseItems, mods, statTranslations, itemClasses] = await Promise.all(
      loadPromises
    );

    this.baseItems = baseItems;
    this.mods = mods;
    this.statTranslations = statTranslations;
    this.itemClasses = itemClasses;
  }

  // Fallback to local mock data if remote fails
  async loadFallbackData() {
    console.log("Loading fallback mock data...");
    // This would load from local files or embedded mock data
    this.baseItems = {};
    this.mods = {};
    this.statTranslations = {};
    this.itemClasses = {};
  }

  // Process base items into organized categories
  processBaseItems() {
    for (const [itemKey, itemData] of Object.entries(this.baseItems)) {
      const itemClass = itemData.item_class || "Unknown";

      if (!this.processedData.baseItemsByClass[itemClass]) {
        this.processedData.baseItemsByClass[itemClass] = [];
      }

      this.processedData.baseItemsByClass[itemClass].push({
        key: itemKey,
        name: itemData.name || itemKey,
        baseType: itemData.name,
        levelReq: itemData.level_requirement || 0,
        dropLevel: itemData.drop_level || 0,
        itemClass: itemClass,
        tags: itemData.tags || [],
        domainMask: itemData.domain_mask || 0,
      });
    }
  }

  // Process mods and build compatibility mapping
  processMods() {
    for (const [modKey, modData] of Object.entries(this.mods)) {
      // Build base item compatibility for this mod
      const compatibleBases = this.getCompatibleBaseItems(modData);

      // Process mod stats and tiers
      const processedMod = this.processModStats(modKey, modData);

      // Store mod for each compatible base item
      compatibleBases.forEach((baseKey) => {
        if (!this.processedData.modsByBaseItem[baseKey]) {
          this.processedData.modsByBaseItem[baseKey] = [];
        }

        this.processedData.modsByBaseItem[baseKey].push({
          key: modKey,
          ...processedMod,
          compatibleWith: compatibleBases,
        });
      });
    }
  }

  // Process mod stats into tier information
  processModStats(modKey, modData) {
    const stats = modData.stats || [];
    const translatedStats = [];
    const tiers = [];

    stats.forEach((stat, index) => {
      const statId = stat.id;
      const translation = this.getStatTranslation(statId);

      if (translation) {
        translatedStats.push({
          id: statId,
          text: translation.text,
          index: index,
        });
      }

      // Calculate tiers from spawn weights
      if (modData.spawn_weights) {
        const tierData = this.calculateTiers(modData.spawn_weights, stat);
        tiers.push(tierData);
      }
    });

    return {
      name: this.getModDisplayName(modKey, modData, translatedStats),
      stats: translatedStats,
      tiers: tiers,
      spawnWeights: modData.spawn_weights || [],
      domain: modData.domain || "item",
      generationType: modData.generation_type || "prefix",
    };
  }

  // Get stat translation from stat_translations.json
  getStatTranslation(statId) {
    for (const [translationKey, translationData] of Object.entries(
      this.statTranslations
    )) {
      if (translationData.ids && translationData.ids.includes(statId)) {
        return {
          text: translationData.English?.[0]?.string || translationKey,
          format: translationData.English?.[0]?.format || [],
        };
      }
    }
    return null;
  }

  // Calculate tier information from spawn weights
  calculateTiers(spawnWeights, stat) {
    if (!spawnWeights.length) return { tiers: [] };

    // Sort spawn weights by minimum stat value (descending for best first)
    const sortedWeights = [...spawnWeights].sort((a, b) => {
      const aMin = a.stat_values?.[0]?.min || 0;
      const bMin = b.stat_values?.[0]?.min || 0;
      return bMin - aMin; // Descending order (highest first = T1)
    });

    const tiers = sortedWeights.map((weight, index) => {
      const tierNumber = index + 1;
      const statValues = weight.stat_values || [];

      return {
        tier: `T${tierNumber}`,
        tierNumber: tierNumber,
        values: statValues.map((val) => ({
          min: val.min || 0,
          max: val.max || 0,
        })),
        weight: weight.weight || 0,
        tags: weight.tags || [],
      };
    });

    return { tiers: tiers.slice(0, 5) }; // Limit to T1-T5
  }

  // Build mod aliases for fuzzy searching
  buildModAliases() {
    const aliases = {};

    for (const baseKey of Object.keys(this.processedData.modsByBaseItem)) {
      const mods = this.processedData.modsByBaseItem[baseKey];

      mods.forEach((mod) => {
        const modName = mod.name.toLowerCase();
        const variants = this.generateModVariants(modName);

        variants.forEach((variant) => {
          if (!aliases[variant]) {
            aliases[variant] = [];
          }
          aliases[variant].push({
            modKey: mod.key,
            modName: mod.name,
            baseKey: baseKey,
            score: this.calculateVariantScore(variant, modName),
          });
        });
      });
    }

    this.processedData.modAliases = aliases;
  }

  // Generate variants of mod names for fuzzy matching
  generateModVariants(modName) {
    const variants = new Set();

    // Original name
    variants.add(modName);

    // Remove common prefixes/suffixes
    const cleaned = modName
      .replace(/^(\+#|\+|#|\+#\s+to\s+|\+\s+|#\s+to\s+)/i, "")
      .replace(/(\s+(per|to)\s+.+)$/i, "")
      .trim();

    variants.add(cleaned);

    // Key terms extraction
    const keyTerms = cleaned
      .split(/\s+/)
      .filter(
        (term) =>
          term.length > 2 &&
          !["and", "the", "per", "to", "of", "with"].includes(
            term.toLowerCase()
          )
      );

    keyTerms.forEach((term) => variants.add(term));

    // Common abbreviations
    const abbreviations = {
      maximum: "max",
      "energy shield": "es",
      life: "hp",
      mana: "mp",
      resistance: "res",
      damage: "dmg",
      increased: "inc",
      "attack speed": "ias",
      "cast speed": "fcs",
      "critical strike": "crit",
    };

    Object.entries(abbreviations).forEach(([full, abbrev]) => {
      if (modName.includes(full)) {
        variants.add(modName.replace(full, abbrev));
      }
      if (modName.includes(abbrev)) {
        variants.add(modName.replace(abbrev, full));
      }
    });

    return Array.from(variants);
  }

  // Calculate variant score for fuzzy matching quality
  calculateVariantScore(variant, originalName) {
    if (variant === originalName) return 100;
    if (originalName.includes(variant)) return 90;
    if (variant.includes(originalName)) return 80;

    // Levenshtein distance based scoring
    const distance = this.levenshteinDistance(variant, originalName);
    const maxLength = Math.max(variant.length, originalName.length);
    return Math.max(0, 100 - (distance / maxLength) * 100);
  }

  // Levenshtein distance for fuzzy matching
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // MAIN FUZZY SEARCH FUNCTION - Find mods matching user input
  findMatchingMods(baseItemKey, userInput, maxResults = 10) {
    if (!baseItemKey || !userInput) return [];

    const query = userInput.toLowerCase().trim();
    const baseItemMods = this.processedData.modsByBaseItem[baseItemKey] || [];

    // Direct matches first
    const directMatches = baseItemMods
      .filter((mod) => mod.name.toLowerCase().includes(query))
      .map((mod) => ({ ...mod, matchScore: 100 }));

    // Fuzzy matches from aliases
    const fuzzyMatches = [];
    const aliasKeys = Object.keys(this.processedData.modAliases);

    aliasKeys.forEach((alias) => {
      const score = this.calculateVariantScore(alias, query);
      if (score > 60) {
        // Minimum score threshold
        const matches = this.processedData.modAliases[alias].filter(
          (match) => match.baseKey === baseItemKey
        );

        matches.forEach((match) => {
          // Avoid duplicates from direct matches
          if (!directMatches.find((direct) => direct.key === match.modKey)) {
            const modData = baseItemMods.find(
              (mod) => mod.key === match.modKey
            );
            if (modData) {
              fuzzyMatches.push({
                ...modData,
                matchScore: score,
                matchedAlias: alias,
              });
            }
          }
        });
      }
    });

    // Combine and sort by score
    const allMatches = [...directMatches, ...fuzzyMatches]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);

    return allMatches;
  }

  // Convert tier to explicit numeric values
  convertTierToValues(modKey, baseItemKey, tierString) {
    const baseItemMods = this.processedData.modsByBaseItem[baseItemKey] || [];
    const mod = baseItemMods.find((m) => m.key === modKey);

    if (!mod || !mod.tiers || !mod.tiers.tiers) {
      return null;
    }

    const tier = mod.tiers.tiers.find((t) => t.tier === tierString);
    if (!tier) {
      return null;
    }

    // Return the value ranges for this tier
    return {
      tier: tierString,
      tierNumber: tier.tierNumber,
      values: tier.values.map((val) => ({
        min: val.min,
        max: val.max,
        range: `${val.min}-${val.max}`,
      })),
      weight: tier.weight,
    };
  }

  // Get all available tiers for a specific mod
  getAvailableTiers(modKey, baseItemKey) {
    const baseItemMods = this.processedData.modsByBaseItem[baseItemKey] || [];
    const mod = baseItemMods.find((m) => m.key === modKey);

    if (!mod || !mod.tiers || !mod.tiers.tiers) {
      return [];
    }

    return mod.tiers.tiers.map((tier) => ({
      tier: tier.tier,
      tierNumber: tier.tierNumber,
      displayText: `${tier.tier} (${tier.values
        .map((v) => `${v.min}-${v.max}`)
        .join(", ")})`,
      values: tier.values,
    }));
  }

  // Helper functions
  getCompatibleBaseItems(modData) {
    // This would analyze spawn_weights tags and domain to determine compatibility
    // For now, return all base items - you'd implement proper compatibility logic here
    return Object.keys(this.baseItems);
  }

  getModDisplayName(modKey, modData, translatedStats) {
    if (translatedStats.length > 0) {
      return translatedStats[0].text || modKey;
    }
    return modKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Generate trade site URL with mods
  generateTradeUrlWithMods(searchConfig) {
    const baseUrl = "https://www.pathofexile.com/trade/search/Settlers";
    const query = {
      query: {
        status: { option: "online" },
        type: searchConfig.baseItem,
        stats: [
          {
            type: "and",
            filters: [],
          },
        ],
      },
      sort: {
        price: "asc",
      },
    };

    // Add mod filters
    searchConfig.mods.forEach((mod) => {
      const tierValues = this.convertTierToValues(
        mod.modKey,
        searchConfig.baseItem,
        mod.tier
      );
      if (tierValues) {
        tierValues.values.forEach((value) => {
          query.query.stats[0].filters.push({
            id: mod.statId || mod.modKey,
            value: {
              min: value.min,
              max: value.max,
            },
          });
        });
      }
    });

    // Add item level, quality, etc.
    if (searchConfig.itemLevel) {
      query.query.filters = query.query.filters || {};
      query.query.filters.ilvl = {
        min: searchConfig.itemLevel.min,
        max: searchConfig.itemLevel.max,
      };
    }

    const encodedQuery = encodeURIComponent(JSON.stringify(query));
    return `${baseUrl}?q=${encodedQuery}`;
  }

  // Generate trade site URL without mods (base items only)
  generateTradeUrlWithoutMods(searchConfig) {
    const baseUrl = "https://www.pathofexile.com/trade/search/Settlers";
    const query = {
      query: {
        status: { option: "online" },
        type: searchConfig.baseItem,
      },
      sort: {
        price: "asc",
      },
    };

    // Add filters for base item properties
    const filters = {};

    if (searchConfig.itemLevel) {
      filters.ilvl = {
        min: searchConfig.itemLevel.min,
        max: searchConfig.itemLevel.max,
      };
    }

    if (searchConfig.quality) {
      filters.quality = {
        min: searchConfig.quality.min,
        max: searchConfig.quality.max,
      };
    }

    if (searchConfig.corrupted !== undefined) {
      filters.corrupted = { option: searchConfig.corrupted };
    }

    if (searchConfig.fractured !== undefined) {
      filters.fractured = { option: searchConfig.fractured };
    }

    if (searchConfig.synthesised !== undefined) {
      filters.synthesised = { option: searchConfig.synthesised };
    }

    if (Object.keys(filters).length > 0) {
      query.query.filters = filters;
    }

    const encodedQuery = encodeURIComponent(JSON.stringify(query));
    return `${baseUrl}?q=${encodedQuery}`;
  }

  // Public API methods
  getBaseItemsByClass() {
    return this.processedData.baseItemsByClass;
  }

  getModsForBaseItem(baseItemKey) {
    return this.processedData.modsByBaseItem[baseItemKey] || [];
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataProcessor;
} else if (typeof window !== "undefined") {
  window.DataProcessor = DataProcessor;
}

// Example usage:
/*
const processor = new DataProcessor();
await processor.initialize();

// Find mods matching user input
const matches = processor.findMatchingMods('VaalRegalia', 'maximum energy shield');
console.log('Found matches:', matches);

// Convert tier to values
const tierValues = processor.convertTierToValues(matches[0].key, 'VaalRegalia', 'T1');
console.log('T1 values:', tierValues);

// Get all available tiers
const tiers = processor.getAvailableTiers(matches[0].key, 'VaalRegalia');
console.log('Available tiers:', tiers);
*/
