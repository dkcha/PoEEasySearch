// Enhanced data-processor.js with real RePoE integration and no-mods support
class RePoEDataProcessor {
  constructor() {
    this.baseItems = null;
    this.mods = null;
    this.statTranslations = null;
    this.itemClasses = null;
    this.tags = null;

    // RePoE endpoints (using the actively maintained repoe-fork)
    // can be replaced with URLs from my Github repo if needed
    this.endpoints = {
      baseItems: "https://repoe-fork.github.io/base_items.json",
      mods: "https://repoe-fork.github.io/mods.json",
      statTranslations: "https://repoe-fork.github.io/stat_translations.json",
      itemClasses: "https://repoe-fork.github.io/item_classes.json",
      tags: "https://repoe-fork.github.io/tags.json",
    };

    this.initializeData();
  }

  async initializeData() {
    try {
      console.log("🔄 Loading RePoE data...");

      // Load all required data files
      const [baseItems, mods, statTranslations, itemClasses, tags] =
        await Promise.all([
          this.fetchRePoEData("baseItems"),
          this.fetchRePoEData("mods"),
          this.fetchRePoEData("statTranslations"),
          this.fetchRePoEData("itemClasses"),
          this.fetchRePoEData("tags"),
        ]);

      this.baseItems = baseItems;
      this.mods = mods;
      this.statTranslations = statTranslations;
      this.itemClasses = itemClasses;
      this.tags = tags;

      console.log("✅ RePoE data loaded successfully");
      console.log(`📊 Loaded ${Object.keys(baseItems).length} base items`);
      console.log(`📊 Loaded ${Object.keys(mods).length} mods`);
    } catch (error) {
      console.error("❌ Failed to load RePoE data:", error);
      // Fallback to mock data for development
      this.loadMockData();
    }
  }

  async fetchRePoEData(dataType) {
    const response = await fetch(this.endpoints[dataType]);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${dataType}: ${response.status}`);
    }
    return await response.json();
  }

  // Enhanced: Get available base items by category
  getBaseItemsByCategory() {
    if (!this.baseItems) return this.getMockBaseItems();

    const categories = {};

    for (const [itemId, item] of Object.entries(this.baseItems)) {
      const itemClass = item.item_class;
      if (!categories[itemClass]) {
        categories[itemClass] = [];
      }

      categories[itemClass].push({
        id: itemId,
        name: item.name,
        level: item.required_level || 1,
        tags: item.tags || [],
        implicits: item.implicits || [],
        properties: item.properties || {},
      });
    }

    // Sort items within each category by level, then name
    for (const category of Object.values(categories)) {
      category.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
    }

    return categories;
  }

  // Enhanced: Get available mods for a base item
  getAvailableModsForItem(itemId) {
    if (!this.baseItems || !this.mods) {
      return this.getMockMods();
    }

    const baseItem = this.baseItems[itemId];
    if (!baseItem) return {};

    const availableMods = {};
    const itemTags = new Set(baseItem.tags || []);
    const itemClass = baseItem.item_class;

    // Filter mods that can appear on this item
    for (const [modId, mod] of Object.entries(this.mods)) {
      // Skip non-prefix/suffix mods for now
      if (!["prefix", "suffix"].includes(mod.generation_type)) continue;

      // Check if mod can spawn on this item
      const canSpawn = this.canModSpawnOnItem(mod, itemClass, itemTags);
      if (!canSpawn) continue;

      // Group mods by their stat effects
      const modGroup = this.getModGroup(mod);
      if (!modGroup) continue;

      if (!availableMods[modGroup.id]) {
        availableMods[modGroup.id] = {
          id: modGroup.id,
          name: modGroup.name,
          tiers: [],
          type: mod.generation_type,
        };
      }

      // Calculate tier info
      const tierInfo = this.calculateTierInfo(mod);
      availableMods[modGroup.id].tiers.push({
        modId: modId,
        tier: tierInfo.tier,
        values: tierInfo.values,
        weight: mod.spawn_weights?.[0]?.weight || 1000,
      });
    }

    // Sort tiers within each mod group (T1 = best values)
    for (const modGroup of Object.values(availableMods)) {
      modGroup.tiers.sort((a, b) => {
        // T1 should have the highest values
        return b.values.max - a.values.max;
      });

      // Assign tier numbers
      modGroup.tiers.forEach((tier, index) => {
        tier.tier = `T${index + 1}`;
      });
    }

    return availableMods;
  }

  canModSpawnOnItem(mod, itemClass, itemTags) {
    // Check spawn weights for this item class
    if (!mod.spawn_weights) return false;

    for (const spawnWeight of mod.spawn_weights) {
      if (spawnWeight.weight === 0) continue;

      // Check if any of the spawn weight tags match the item
      if (spawnWeight.tag === itemClass) return true;
      if (itemTags.has(spawnWeight.tag)) return true;
    }

    return false;
  }

  getModGroup(mod) {
    if (!mod.stats || mod.stats.length === 0) return null;

    const primaryStat = mod.stats[0];
    const statId = primaryStat.id;

    // Use stat translations to get human-readable name
    if (this.statTranslations && this.statTranslations[statId]) {
      const translation = this.statTranslations[statId];
      // Get the first translation entry
      const firstTranslation = Object.values(translation)[0];
      if (firstTranslation && firstTranslation.English) {
        return {
          id: statId,
          name: firstTranslation.English[0]?.string || statId,
        };
      }
    }

    // Fallback to stat ID
    return {
      id: statId,
      name: statId.replace(/_/g, " "),
    };
  }

  calculateTierInfo(mod) {
    if (!mod.stats || mod.stats.length === 0) {
      return { tier: "T1", values: { min: 0, max: 0 } };
    }

    const primaryStat = mod.stats[0];
    return {
      tier: "T1", // Will be calculated later
      values: {
        min: primaryStat.min || 0,
        max: primaryStat.max || 0,
      },
    };
  }

  // NEW: Support for no-mods searches
  generateTradeUrlWithoutMods(config) {
    if (!config.baseItem) {
      throw new Error("Base item is required");
    }

    // Base URL for PoE trade site
    const baseUrl = "https://www.pathofexile.com/trade/search/Settlers";

    // Build search query for base item only
    const query = {
      status: { option: "online" },
      type: config.baseItem,
      filters: {},
    };

    // Add item level filter
    if (config.itemLevel && (config.itemLevel.min || config.itemLevel.max)) {
      query.filters.misc_filters = query.filters.misc_filters || {};
      query.filters.misc_filters.filters =
        query.filters.misc_filters.filters || {};
      query.filters.misc_filters.filters.ilvl = {
        min: config.itemLevel.min || null,
        max: config.itemLevel.max || null,
      };
    }

    // Add quality filter
    if (config.quality && (config.quality.min || config.quality.max)) {
      query.filters.misc_filters = query.filters.misc_filters || {};
      query.filters.misc_filters.filters =
        query.filters.misc_filters.filters || {};
      query.filters.misc_filters.filters.quality = {
        min: config.quality.min || null,
        max: config.quality.max || null,
      };
    }

    // Add corrupted filter
    if (config.corrupted !== undefined) {
      query.filters.misc_filters = query.filters.misc_filters || {};
      query.filters.misc_filters.filters =
        query.filters.misc_filters.filters || {};
      query.filters.misc_filters.filters.corrupted = {
        option: config.corrupted ? "true" : "false",
      };
    }

    // Add fractured filter
    if (config.fractured !== undefined) {
      query.filters.misc_filters = query.filters.misc_filters || {};
      query.filters.misc_filters.filters =
        query.filters.misc_filters.filters || {};
      query.filters.misc_filters.filters.fractured_item = {
        option: config.fractured ? "true" : "false",
      };
    }

    // Add synthesised filter
    if (config.synthesised !== undefined) {
      query.filters.misc_filters = query.filters.misc_filters || {};
      query.filters.misc_filters.filters =
        query.filters.misc_filters.filters || {};
      query.filters.misc_filters.filters.synthesised_item = {
        option: config.synthesised ? "true" : "false",
      };
    }

    // Add price filter
    if (config.price && (config.price.min || config.price.max)) {
      query.filters.trade_filters = {
        filters: {
          price: {
            min: config.price.min || null,
            max: config.price.max || null,
            option: config.price.currency || "chaos",
          },
        },
      };
    }

    // Encode the query
    const encodedQuery = encodeURIComponent(JSON.stringify(query));
    return `${baseUrl}?q=${encodedQuery}`;
  }

  // Enhanced: Generate trade URL with mods support
  generateTradeUrl(config) {
    // If no mods specified, use the no-mods version
    if (!config.mods || config.mods.length === 0) {
      return this.generateTradeUrlWithoutMods(config);
    }

    // Existing mod-based URL generation
    const baseUrl = "https://www.pathofexile.com/trade/search/Settlers";

    const query = {
      status: { option: "online" },
      type: config.baseItem,
      filters: {
        type_filters: {
          filters: {},
        },
      },
    };

    // Add stat filters for each mod
    if (config.mods && config.mods.length > 0) {
      query.stats = [
        {
          type: "and",
          filters: config.mods.map((mod) => {
            const tierInfo = this.getTierInfo(
              config.baseItem,
              mod.id,
              mod.tier
            );
            return {
              id: mod.id,
              value: {
                min: tierInfo ? tierInfo.min : null,
                max: tierInfo ? tierInfo.max : null,
              },
            };
          }),
        },
      ];
    }

    // Add all the same filters as the no-mods version
    this.addFiltersToQuery(query, config);

    const encodedQuery = encodeURIComponent(JSON.stringify(query));
    return `${baseUrl}?q=${encodedQuery}`;
  }

  addFiltersToQuery(query, config) {
    // Item level filter
    if (config.itemLevel && (config.itemLevel.min || config.itemLevel.max)) {
      query.filters.misc_filters = query.filters.misc_filters || {
        filters: {},
      };
      query.filters.misc_filters.filters.ilvl = {
        min: config.itemLevel.min || null,
        max: config.itemLevel.max || null,
      };
    }

    // Quality filter
    if (config.quality && (config.quality.min || config.quality.max)) {
      query.filters.misc_filters = query.filters.misc_filters || {
        filters: {},
      };
      query.filters.misc_filters.filters.quality = {
        min: config.quality.min || null,
        max: config.quality.max || null,
      };
    }

    // Boolean filters
    if (config.corrupted !== undefined) {
      query.filters.misc_filters = query.filters.misc_filters || {
        filters: {},
      };
      query.filters.misc_filters.filters.corrupted = {
        option: config.corrupted ? "true" : "false",
      };
    }

    if (config.fractured !== undefined) {
      query.filters.misc_filters = query.filters.misc_filters || {
        filters: {},
      };
      query.filters.misc_filters.filters.fractured_item = {
        option: config.fractured ? "true" : "false",
      };
    }

    if (config.synthesised !== undefined) {
      query.filters.misc_filters = query.filters.misc_filters || {
        filters: {},
      };
      query.filters.misc_filters.filters.synthesised_item = {
        option: config.synthesised ? "true" : "false",
      };
    }

    // Price filter
    if (config.price && (config.price.min || config.price.max)) {
      query.filters.trade_filters = {
        filters: {
          price: {
            min: config.price.min || null,
            max: config.price.max || null,
            option: config.price.currency || "chaos",
          },
        },
      };
    }
  }

  getTierInfo(baseItem, modId, tier) {
    const availableMods = this.getAvailableModsForItem(baseItem);
    const mod = availableMods[modId];

    if (!mod) return null;

    const tierData = mod.tiers.find((t) => t.tier === tier);
    return tierData ? tierData.values : null;
  }

  // Enhanced: Validate configuration with no-mods support
  validateConfiguration(config) {
    const errors = [];

    if (!config.baseItem) {
      errors.push("Base item is required");
    }

    // Validate item level
    if (config.itemLevel) {
      if (
        config.itemLevel.min &&
        (config.itemLevel.min < 1 || config.itemLevel.min > 100)
      ) {
        errors.push("Item level min must be between 1 and 100");
      }
      if (
        config.itemLevel.max &&
        (config.itemLevel.max < 1 || config.itemLevel.max > 100)
      ) {
        errors.push("Item level max must be between 1 and 100");
      }
      if (
        config.itemLevel.min &&
        config.itemLevel.max &&
        config.itemLevel.min > config.itemLevel.max
      ) {
        errors.push("Item level min cannot be greater than max");
      }
    }

    // Validate quality
    if (config.quality) {
      if (
        config.quality.min &&
        (config.quality.min < 0 || config.quality.min > 30)
      ) {
        errors.push("Quality min must be between 0 and 30");
      }
      if (
        config.quality.max &&
        (config.quality.max < 0 || config.quality.max > 30)
      ) {
        errors.push("Quality max must be between 0 and 30");
      }
      if (
        config.quality.min &&
        config.quality.max &&
        config.quality.min > config.quality.max
      ) {
        errors.push("Quality min cannot be greater than max");
      }
    }

    // Validate price
    if (config.price) {
      if (config.price.min && config.price.min < 0) {
        errors.push("Price min cannot be negative");
      }
      if (config.price.max && config.price.max < 0) {
        errors.push("Price max cannot be negative");
      }
      if (
        config.price.min &&
        config.price.max &&
        config.price.min > config.price.max
      ) {
        errors.push("Price min cannot be greater than max");
      }
    }

    // Validate mods (if present)
    if (config.mods && config.mods.length > 0) {
      const availableMods = this.getAvailableModsForItem(config.baseItem);

      for (const mod of config.mods) {
        if (!mod.id || !mod.tier) {
          errors.push("Each mod must have an id and tier");
          continue;
        }

        if (!availableMods[mod.id]) {
          errors.push(
            `Mod ${mod.id} is not available for the selected base item`
          );
          continue;
        }

        const validTiers = availableMods[mod.id].tiers.map((t) => t.tier);
        if (!validTiers.includes(mod.tier)) {
          errors.push(`Tier ${mod.tier} is not valid for mod ${mod.id}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  // Fallback mock data for development
  loadMockData() {
    console.log("📝 Loading mock data for development");
    this.baseItems = this.getMockBaseItems();
    this.mods = this.getMockMods();
  }

  getMockBaseItems() {
    return {
      "crystal-belt": {
        name: "Crystal Belt",
        item_class: "Belt",
        required_level: 79,
        tags: ["belt", "default"],
        implicits: [],
        properties: {},
      },
      "leather-belt": {
        name: "Leather Belt",
        item_class: "Belt",
        required_level: 1,
        tags: ["belt", "default"],
        implicits: ["life"],
        properties: {},
      },
      "prismatic-ring": {
        name: "Prismatic Ring",
        item_class: "Ring",
        required_level: 30,
        tags: ["ring", "default"],
        implicits: ["all_resistances"],
        properties: {},
      },
    };
  }

  getMockMods() {
    return {
      energy_shield_flat: {
        name: "+# to maximum Energy Shield",
        tiers: [
          { tier: "T1", min: 80, max: 89, weight: 1000 },
          { tier: "T2", min: 70, max: 79, weight: 1000 },
          { tier: "T3", min: 60, max: 69, weight: 1000 },
        ],
      },
      life_flat: {
        name: "+# to maximum Life",
        tiers: [
          { tier: "T1", min: 80, max: 89, weight: 1000 },
          { tier: "T2", min: 70, max: 79, weight: 1000 },
          { tier: "T3", min: 60, max: 69, weight: 1000 },
        ],
      },
    };
  }
}

// Initialize the data processor
window.repoDataProcessor = new RePoEDataProcessor();
