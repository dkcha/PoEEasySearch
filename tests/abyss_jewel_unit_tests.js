// Abyss Jewel Mod Validation Unit Tests
// Tests to ensure proper mod-to-jewel mapping and data integrity

class AbyssJewelModTester {
  constructor() {
    this.testResults = [];
    this.allAbyssModsData = null;
    this.expectedWeaponMods = this.initializeExpectedWeaponMods();
  }

  // Initialize expected weapon-specific mods for each jewel type
  initializeExpectedWeaponMods() {
    return {
      murderous: {
        // Melee weapon types that should appear on Murderous Eye Jewels
        weaponTypes: [
          "claws",
          "daggers",
          "swords",
          "axes",
          "maces",
          "staves",
          "unarmed",
        ],
        expectedMods: [
          "chaos damage to attacks with claws",
          "chaos damage to attacks with daggers",
          "physical damage with swords",
          "fire damage with axes",
          "cold damage with maces",
          "lightning damage with staves",
          "elemental damage with melee weapons",
          "attack speed with melee weapons",
          "critical strike chance with melee weapons",
        ],
      },
      searching: {
        // Ranged weapon types that should appear on Searching Eye Jewels
        weaponTypes: ["bows", "wands"],
        expectedMods: [
          "chaos damage to attacks with bows",
          "physical damage with bows",
          "fire damage with wands",
          "cold damage with bows",
          "lightning damage with wands",
          "elemental damage with bows",
          "attack speed with bows",
          "critical strike chance with bows",
        ],
      },
      hypnotic: {
        // Caster/spell mods that should appear on Hypnotic Eye Jewels
        weaponTypes: ["spells", "caster"],
        expectedMods: [
          "spell damage",
          "elemental damage with spells",
          "cast speed",
          "critical strike chance for spells",
          "mana",
          "energy shield",
        ],
      },
      ghastly: {
        // Minion/summoner mods that should appear on Ghastly Eye Jewels
        weaponTypes: ["minions", "summoner"],
        expectedMods: [
          "minion damage",
          "minion life",
          "minion attack speed",
          "minion cast speed",
          "minion critical strike chance",
          "minion accuracy",
        ],
      },
    };
  }

  // Load the mod data (mock or real)
  async loadModData(modData = null) {
    if (modData) {
      this.allAbyssModsData = modData;
      return;
    }

    // If no data provided, try to load from the actual source
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/all_abyss_jewel_mods.json"
      );
      this.allAbyssModsData = await response.json();
      console.log(
        `Loaded ${Object.keys(this.allAbyssModsData).length} mods for testing`
      );
    } catch (error) {
      console.error("Could not load mod data for testing:", error);
      // Create mock data for testing
      this.allAbyssModsData = this.createMockModData();
    }
  }

  // Create comprehensive mock mod data for testing when real data is unavailable
  createMockModData() {
    return {
      // Murderous Eye Jewel Mods (Melee)
      AbyssJewelChaosDamageClaws1: {
        text: "Adds (6-7) to (11-13) Chaos Damage to Attacks with Claws",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 0 },
        ],
        required_level: 30,
        stats: [{ id: "local_add_chaos_damage_with_claws", min: 6, max: 13 }],
      },
      AbyssJewelPhysicalDamageSwords1: {
        text: "Adds (8-10) to (15-18) Physical Damage to Attacks with Swords",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 0 },
        ],
        required_level: 25,
        stats: [
          { id: "local_add_physical_damage_with_swords", min: 8, max: 18 },
        ],
      },
      AbyssJewelMeleeLife1: {
        text: "+(25-30) to maximum Life",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 1000 },
          { tag: "default", weight: 500 },
        ],
        required_level: 20,
        stats: [{ id: "base_maximum_life", min: 25, max: 30 }],
      },

      // Searching Eye Jewel Mods (Ranged)
      AbyssJewelChaosDamageBows1: {
        text: "Adds (8-10) to (14-16) Chaos Damage to Attacks with Bows",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 500 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 0 },
        ],
        required_level: 35,
        stats: [{ id: "local_add_chaos_damage_with_bows", min: 8, max: 16 }],
      },
      AbyssJewelFireDamageWands1: {
        text: "Adds (5-7) to (12-15) Fire Damage to Attacks with Wands",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 500 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 0 },
        ],
        required_level: 28,
        stats: [{ id: "local_add_fire_damage_with_wands", min: 5, max: 15 }],
      },

      // Hypnotic Eye Jewel Mods (Caster)
      AbyssJewelSpellDamage1: {
        text: "(12-18)% increased Spell Damage",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 500 },
          { tag: "abyss_jewel_summoner", weight: 0 },
        ],
        required_level: 25,
        stats: [{ id: "spell_damage_+%", min: 12, max: 18 }],
      },
      AbyssJewelCastSpeed1: {
        text: "(8-12)% increased Cast Speed",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 500 },
          { tag: "abyss_jewel_summoner", weight: 0 },
        ],
        required_level: 30,
        stats: [{ id: "base_cast_speed_+%", min: 8, max: 12 }],
      },
      AbyssJewelMana1: {
        text: "+(35-45) to maximum Mana",
        spawn_weights: [
          { tag: "abyss_jewel_caster", weight: 500 },
          { tag: "default", weight: 200 },
        ],
        required_level: 15,
        stats: [{ id: "base_maximum_mana", min: 35, max: 45 }],
      },

      // Ghastly Eye Jewel Mods (Summoner)
      AbyssJewelMinionLife1: {
        text: "Minions have +(20-25) to maximum Life",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 500 },
        ],
        required_level: 20,
        stats: [{ id: "minion_maximum_life_+", min: 20, max: 25 }],
      },
      AbyssJewelMinionDamage1: {
        text: "Minions deal (15-20)% increased Damage",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 500 },
        ],
        required_level: 25,
        stats: [{ id: "minion_damage_+%", min: 15, max: 20 }],
      },
      AbyssJewelMinionAttackSpeed1: {
        text: "Minions have (8-12)% increased Attack Speed",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 0 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 500 },
        ],
        required_level: 30,
        stats: [{ id: "minion_attack_speed_+%", min: 8, max: 12 }],
      },
    };
  }

  // Test 1: Verify weapon-specific damage mods appear only on correct jewel types
  testWeaponSpecificMods() {
    const testName = "Weapon-Specific Mod Restrictions";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    // Test each jewel type
    Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
      const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
      const availableMods = this.getModsForJewelType(jewelType);

      console.log(
        `\nTesting ${jewelConfig.displayName} (${
          Object.keys(availableMods).length
        } mods)`
      );

      // Check for weapon-specific damage mods
      Object.values(availableMods).forEach((mod) => {
        const modText = (mod.text || "").toLowerCase();

        // Test chaos damage to attacks with specific weapons
        if (modText.includes("chaos damage to attacks with")) {
          const isClawOrDagger =
            modText.includes("claws") || modText.includes("daggers");
          const isBowMod = modText.includes("bows");

          if (jewelType === "murderous" && isClawOrDagger) {
            passed++;
            console.log(`  ✅ ${mod.text} correctly on Murderous`);
          } else if (jewelType === "searching" && isBowMod) {
            passed++;
            console.log(`  ✅ ${mod.text} correctly on Searching`);
          } else if (
            (jewelType === "hypnotic" || jewelType === "ghastly") &&
            (isClawOrDagger || isBowMod)
          ) {
            failed++;
            failures.push(
              `❌ ${mod.text} incorrectly available on ${jewelConfig.displayName}`
            );
          } else if (jewelType === "murderous" && isBowMod) {
            failed++;
            failures.push(`❌ Bow mod "${mod.text}" incorrectly on Murderous`);
          } else if (jewelType === "searching" && isClawOrDagger) {
            failed++;
            failures.push(
              `❌ Melee mod "${mod.text}" incorrectly on Searching`
            );
          }
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 2: Verify minion mods only appear on Ghastly Eye Jewels
  testMinionModRestrictions() {
    const testName = "Minion Mod Restrictions";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
      const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
      const availableMods = this.getModsForJewelType(jewelType);

      Object.values(availableMods).forEach((mod) => {
        const modText = (mod.text || "").toLowerCase();

        if (modText.includes("minion")) {
          if (jewelType === "ghastly") {
            passed++;
            console.log(`  ✅ ${mod.text} correctly on Ghastly`);
          } else {
            failed++;
            failures.push(
              `❌ Minion mod "${mod.text}" incorrectly on ${jewelConfig.displayName}`
            );
          }
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 3: Verify tier ranges are properly calculated
  testTierRangeCalculations() {
    const testName = "Tier Range Calculations";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    // Test with Murderous Eye Jewels
    const murderousMods = this.getModsForJewelType("murderous");

    Object.values(murderousMods).forEach((mod) => {
      if (!mod.tiers) return;

      const tierKeys = Object.keys(mod.tiers).sort((a, b) => {
        const aNum = parseInt(a.replace("T", ""));
        const bNum = parseInt(b.replace("T", ""));
        return aNum - bNum;
      });

      // Verify tier progression (T1 should have higher values than T2, etc.)
      for (let i = 0; i < tierKeys.length - 1; i++) {
        const higherTier = mod.tiers[tierKeys[i]]; // T1
        const lowerTier = mod.tiers[tierKeys[i + 1]]; // T2

        if (
          higherTier.min >= lowerTier.min &&
          higherTier.max >= lowerTier.max
        ) {
          passed++;
        } else {
          failed++;
          failures.push(
            `❌ ${mod.name}: ${tierKeys[i]} values (${higherTier.min}-${
              higherTier.max
            }) not higher than ${tierKeys[i + 1]} (${lowerTier.min}-${
              lowerTier.max
            })`
          );
        }
      }

      // Test damage averaging for "X to Y" mods
      if (
        mod.text &&
        mod.text.includes(" to ") &&
        mod.text.includes("Damage")
      ) {
        const damageRangeMatch = mod.text.match(
          /\((\d+)-(\d+)\) to \((\d+)-(\d+)\)/
        );
        if (damageRangeMatch) {
          const expectedMin =
            (parseInt(damageRangeMatch[1]) + parseInt(damageRangeMatch[3])) / 2;
          const expectedMax =
            (parseInt(damageRangeMatch[2]) + parseInt(damageRangeMatch[4])) / 2;

          // This would test the calculateDamageRange function from popup.js
          const calculatedRange = this.calculateDamageRange(
            mod.tiers.T1 || Object.values(mod.tiers)[0]
          );

          if (
            Math.abs(calculatedRange.min - expectedMin) < 0.1 &&
            Math.abs(calculatedRange.max - expectedMax) < 0.1
          ) {
            passed++;
            console.log(
              `  ✅ ${mod.name} damage averaging correct: ${calculatedRange.min}-${calculatedRange.max}`
            );
          } else {
            failed++;
            failures.push(
              `❌ ${mod.name} damage averaging incorrect. Expected: ${expectedMin}-${expectedMax}, Got: ${calculatedRange.min}-${calculatedRange.max}`
            );
          }
        }
      }
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 4: Verify no duplicate base mod types within a jewel type
  testNoDuplicateBaseMods() {
    const testName = "No Duplicate Base Mod Types";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
      const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
      const availableMods = this.getModsForJewelType(jewelType);
      const baseModTypes = new Set();

      Object.values(availableMods).forEach((mod) => {
        if (baseModTypes.has(mod.baseModType)) {
          failed++;
          failures.push(
            `❌ Duplicate base mod type "${mod.baseModType}" in ${jewelConfig.displayName}`
          );
        } else {
          baseModTypes.add(mod.baseModType);
          passed++;
        }
      });

      console.log(
        `  ${jewelConfig.displayName}: ${baseModTypes.size} unique base mod types`
      );
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 5: Verify spawn weight logic
  testSpawnWeightLogic() {
    const testName = "Spawn Weight Logic";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    Object.entries(this.allAbyssModsData).forEach(([modId, modData]) => {
      if (!modData.spawn_weights) return;

      // Test that mods with weight > 0 for a jewel type actually appear in that jewel's mod list
      Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
        const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
        const availableMods = this.getModsForJewelType(jewelType);

        const spawnWeight = modData.spawn_weights.find(
          (sw) => jewelConfig.tags.includes(sw.tag) || sw.tag === "default"
        );

        if (spawnWeight && spawnWeight.weight > 0) {
          // Mod should be available - check by base mod type since that's how they're aggregated
          const baseModType = this.extractBaseModType(modId, modData.text);
          const isAvailable = Object.values(availableMods).some(
            (mod) =>
              mod.baseModType === baseModType ||
              mod.modId === modId ||
              mod.modId === baseModType
          );

          if (isAvailable) {
            passed++;
            console.log(
              `  ✅ Mod ${modId} (${baseModType}) correctly available on ${jewelType}`
            );
          } else {
            failed++;
            failures.push(
              `❌ Mod ${modId} (${baseModType}) has spawn weight ${spawnWeight.weight} for ${jewelType} but is not available`
            );
          }
        } else {
          // Mod should NOT be available (weight 0 or no matching tag)
          const baseModType = this.extractBaseModType(modId, modData.text);
          const isAvailable = Object.values(availableMods).some(
            (mod) =>
              mod.baseModType === baseModType ||
              mod.modId === modId ||
              mod.modId === baseModType
          );

          if (!isAvailable) {
            passed++;
          } else {
            failed++;
            failures.push(
              `❌ Mod ${modId} (${baseModType}) has zero/no spawn weight for ${jewelType} but is available`
            );
          }
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 6: Comprehensive coverage test
  testComprehensiveCoverage() {
    const testName = "Comprehensive Coverage";
    console.log(`\n=== ${testName} ===`);

    const results = {
      murderous: this.getModsForJewelType("murderous"),
      searching: this.getModsForJewelType("searching"),
      hypnotic: this.getModsForJewelType("hypnotic"),
      ghastly: this.getModsForJewelType("ghastly"),
    };

    let passed = 0;
    let failed = 0;
    const failures = [];

    // Expected minimum mod counts for each jewel type (adjusted for mock data)
    const expectedMinimums = {
      murderous: 3, // Should have melee weapon mods
      searching: 2, // Should have bow/wand mods
      hypnotic: 3, // Should have caster mods
      ghastly: 3, // Should have minion mods
    };

    Object.entries(results).forEach(([jewelType, mods]) => {
      const modCount = Object.keys(mods).length;
      const expected = expectedMinimums[jewelType];

      console.log(
        `  ${JEWEL_TYPE_CONFIG[jewelType].displayName}: ${modCount} mods`
      );

      if (modCount >= expected) {
        passed++;
      } else {
        failed++;
        failures.push(
          `❌ ${jewelType} has only ${modCount} mods, expected at least ${expected}`
        );
      }
    });

    // Test for expected key mods
    const keyModTests = [
      {
        jewelType: "murderous",
        mustHave: ["life", "physical damage", "melee"],
        description: "melee essentials",
      },
      {
        jewelType: "searching",
        mustHave: ["bow", "wand"],
        description: "ranged weapons",
      },
      {
        jewelType: "hypnotic",
        mustHave: ["spell", "cast"],
        description: "caster mods",
      },
      {
        jewelType: "ghastly",
        mustHave: ["minion"],
        description: "summoner mods",
      },
    ];

    keyModTests.forEach((test) => {
      const mods = results[test.jewelType];
      const hasKeyMods = test.mustHave.some((keyword) =>
        Object.values(mods).some(
          (mod) =>
            (mod.text || "").toLowerCase().includes(keyword) ||
            (mod.name || "").toLowerCase().includes(keyword)
        )
      );

      if (hasKeyMods) {
        passed++;
        console.log(`  ✅ ${test.jewelType} has ${test.description}`);
      } else {
        failed++;
        failures.push(
          `❌ ${test.jewelType} missing ${
            test.description
          } (keywords: ${test.mustHave.join(", ")})`
        );
      }
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Helper method to simulate getModsForJewelType from popup.js
  getModsForJewelType(jewelType) {
    if (!this.allAbyssModsData || !JEWEL_TYPE_CONFIG[jewelType]) return {};

    const jewelConfig = JEWEL_TYPE_CONFIG[jewelType];
    const modGroups = {};

    // Group mods by base type (simplified version of the actual function)
    Object.entries(this.allAbyssModsData).forEach(([modId, modData]) => {
      if (!modData.spawn_weights) return;

      const canSpawnOnJewel = modData.spawn_weights.some((spawnWeight) => {
        if (!spawnWeight.weight || spawnWeight.weight <= 0) return false;
        return (
          jewelConfig.tags.some((tag) => spawnWeight.tag === tag) ||
          spawnWeight.tag === "default"
        );
      });

      if (canSpawnOnJewel) {
        const baseModType = this.extractBaseModType(modId, modData.text);

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

    // Convert to final format
    const relevantMods = {};
    Object.entries(modGroups).forEach(([baseModType, modVariants]) => {
      if (modVariants.length === 0) return;

      const sortedVariants = modVariants.sort((a, b) => {
        return (b.requiredLevel || 0) - (a.requiredLevel || 0);
      });

      const tiers = {};
      sortedVariants.forEach((variant, index) => {
        tiers[`T${index + 1}`] = {
          min: variant.modData.stats?.[0]?.min,
          max: variant.modData.stats?.[0]?.max,
          text: variant.modData.text,
          requiredLevel: variant.requiredLevel,
        };
      });

      const primaryVariant = sortedVariants[0];
      relevantMods[baseModType] = {
        modId: baseModType,
        baseModType: baseModType,
        name: this.createFriendlyModName(
          primaryVariant.modData.text || baseModType
        ),
        text: primaryVariant.modData.text,
        tiers: tiers,
        stats: primaryVariant.modData.stats,
        required_level: primaryVariant.modData.required_level,
      };
    });

    return relevantMods;
  }

  // Helper methods (simplified versions)
  extractBaseModType(modId, modText) {
    if (!modText) return modId || "UnknownMod";

    const textLower = modText.toLowerCase();

    // Minion patterns FIRST (to avoid collision with regular life/damage mods)
    if (
      textLower.includes("minions have") &&
      textLower.includes("maximum life")
    )
      return "MinionMaximumLife";
    if (textLower.includes("minions deal") && textLower.includes("damage"))
      return "MinionDamage";
    if (
      textLower.includes("minions have") &&
      textLower.includes("attack speed")
    )
      return "MinionAttackSpeed";
    if (textLower.includes("minion")) return "MinionMod";

    // Life/Mana/ES patterns (after minion check)
    if (textLower.includes("maximum life")) return "MaximumLife";
    if (textLower.includes("maximum mana")) return "MaximumMana";
    if (textLower.includes("maximum energy shield"))
      return "MaximumEnergyShield";

    // Weapon-specific damage patterns
    if (textLower.includes("chaos damage to attacks with claws"))
      return "ChaosDamageWithClaws";
    if (textLower.includes("chaos damage to attacks with bows"))
      return "ChaosDamageWithBows";
    if (textLower.includes("physical damage to attacks with swords"))
      return "PhysicalDamageWithSwords";
    if (textLower.includes("fire damage to attacks with wands"))
      return "FireDamageWithWands";

    // Spell patterns
    if (textLower.includes("spell damage")) return "SpellDamage";
    if (textLower.includes("cast speed")) return "CastSpeed";

    // Fallback using modId pattern
    return modId.replace(/\d+$/, "") || "UnknownMod";
  }

  createFriendlyModName(text) {
    if (!text) return "Unknown Mod";
    return text
      .replace(/\(\d+-\d+\)/g, "#")
      .replace(/\b\d+\b/g, "#")
      .replace(/\s+/g, " ")
      .trim();
  }

  calculateDamageRange(tierData) {
    const text = tierData.text;
    const damageRangeMatch = text?.match(/\((\d+)-(\d+)\) to \((\d+)-(\d+)\)/);

    if (damageRangeMatch) {
      const lowMin = parseFloat(damageRangeMatch[1]);
      const lowMax = parseFloat(damageRangeMatch[2]);
      const highMin = parseFloat(damageRangeMatch[3]);
      const highMax = parseFloat(damageRangeMatch[4]);

      return {
        min: (lowMin + highMin) / 2,
        max: (lowMax + highMax) / 2,
      };
    }

    return { min: tierData.min, max: tierData.max };
  }

  recordTestResult(testName, passed, failed, failures) {
    this.testResults.push({
      name: testName,
      passed,
      failed,
      total: passed + failed,
      failures: failures,
    });
  }

  // Run all tests
  async runAllTests(modData = null) {
    console.log("🧪 Starting Abyss Jewel Mod Validation Tests");
    console.log("=".repeat(50));

    await this.loadModData(modData);

    // Run all test suites
    this.testWeaponSpecificMods();
    this.testMinionModRestrictions();
    this.testTierRangeCalculations();
    this.testNoDuplicateBaseMods();
    this.testSpawnWeightLogic();
    this.testComprehensiveCoverage();

    // Summary
    this.printTestSummary();
    return this.testResults;
  }

  printTestSummary() {
    console.log("\n" + "=".repeat(50));
    console.log("🏁 TEST SUMMARY");
    console.log("=".repeat(50));

    let totalPassed = 0;
    let totalFailed = 0;

    this.testResults.forEach((result) => {
      const status = result.failed === 0 ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${result.name}: ${result.passed}/${result.total}`);

      if (result.failures.length > 0) {
        result.failures.forEach((failure) => console.log(`    ${failure}`));
      }

      totalPassed += result.passed;
      totalFailed += result.failed;
    });

    console.log("\n" + "-".repeat(30));
    console.log(`Total: ${totalPassed + totalFailed} tests`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(
      `Success Rate: ${(
        (totalPassed / (totalPassed + totalFailed)) *
        100
      ).toFixed(1)}%`
    );

    if (totalFailed === 0) {
      console.log(
        "\n🎉 All tests passed! Your mod data is properly configured."
      );
    } else {
      console.log(
        `\n⚠️ ${totalFailed} test(s) failed. Please review the data integrity.`
      );
    }
  }
}

// JEWEL_TYPE_CONFIG for testing (from constants.js)
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

// Example usage:
async function runTests() {
  const tester = new AbyssJewelModTester();

  // Run with real data (will attempt to fetch from GitHub)
  // const results = await tester.runAllTests();

  // Or run with mock data for testing
  const results = await tester.runAllTests();

  return results;
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AbyssJewelModTester, runTests };
}

// For browser usage
if (typeof window !== "undefined") {
  window.AbyssJewelModTester = AbyssJewelModTester;
  window.runAbyssJewelTests = runTests;
}

// Enhanced Abyss Jewel Test Suite - Additional Validation Tests

class EnhancedAbyssJewelTester extends AbyssJewelModTester {
  // Test 7: Verify weapon-specific restrictions are complete
  testCompleteWeaponRestrictions() {
    const testName = "Complete Weapon Restrictions";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    const weaponTests = [
      // Melee weapons should ONLY be on Murderous
      {
        weapons: ["claws", "daggers", "swords", "axes", "maces", "staves"],
        expectedJewel: "murderous",
        forbiddenJewels: ["searching", "hypnotic", "ghastly"],
      },
      // Ranged weapons should ONLY be on Searching
      {
        weapons: ["bows", "wands"],
        expectedJewel: "searching",
        forbiddenJewels: ["murderous", "hypnotic", "ghastly"],
      },
    ];

    weaponTests.forEach((test) => {
      test.weapons.forEach((weapon) => {
        Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
          const availableMods = this.getModsForJewelType(jewelType);

          Object.values(availableMods).forEach((mod) => {
            const modText = (mod.text || "").toLowerCase();

            if (modText.includes(`with ${weapon}`)) {
              if (jewelType === test.expectedJewel) {
                passed++;
                console.log(
                  `  ✅ ${weapon} mod correctly on ${test.expectedJewel}`
                );
              } else if (test.forbiddenJewels.includes(jewelType)) {
                failed++;
                failures.push(
                  `❌ ${weapon} mod "${mod.text}" incorrectly on ${JEWEL_TYPE_CONFIG[jewelType].displayName}`
                );
              }
            }
          });
        });
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 8: Verify spell mods appear correctly
  testSpellModDistribution() {
    const testName = "Spell Mod Distribution";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
      const availableMods = this.getModsForJewelType(jewelType);

      Object.values(availableMods).forEach((mod) => {
        const modText = (mod.text || "").toLowerCase();

        // Test spell damage mods
        if (modText.includes("spell damage") && !modText.includes("minion")) {
          if (jewelType === "hypnotic") {
            passed++;
            console.log(`  ✅ Spell damage mod correctly on Hypnotic`);
          } else {
            // Check if this is a conditional spell mod that might appear elsewhere
            const isConditional =
              modText.includes("if") ||
              modText.includes("while") ||
              modText.includes("recently");
            if (!isConditional) {
              failed++;
              failures.push(
                `❌ Pure spell damage mod "${mod.text}" incorrectly on ${JEWEL_TYPE_CONFIG[jewelType].displayName}`
              );
            }
          }
        }

        // Test cast speed mods
        if (modText.includes("cast speed") && !modText.includes("minion")) {
          const isConditional =
            modText.includes("if") ||
            modText.includes("while") ||
            modText.includes("recently");

          if (
            jewelType === "hypnotic" ||
            jewelType === "ghastly" ||
            isConditional
          ) {
            passed++;
          } else {
            failed++;
            failures.push(
              `❌ Cast speed mod "${mod.text}" incorrectly on ${JEWEL_TYPE_CONFIG[jewelType].displayName}`
            );
          }
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 9: Verify no cross-contamination between jewel types
  testCrossContamination() {
    const testName = "Cross-Contamination Prevention";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    const exclusivePatterns = [
      {
        pattern: "minion",
        exclusiveJewel: "ghastly",
        description: "minion mods",
      },
      {
        pattern: "spell damage",
        exclusiveJewel: "hypnotic",
        description: "spell damage mods (non-conditional)",
      },
      {
        pattern: "with claws",
        exclusiveJewel: "murderous",
        description: "claw-specific mods",
      },
      {
        pattern: "with bows",
        exclusiveJewel: "searching",
        description: "bow-specific mods",
      },
    ];

    exclusivePatterns.forEach((test) => {
      Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
        const availableMods = this.getModsForJewelType(jewelType);

        Object.values(availableMods).forEach((mod) => {
          const modText = (mod.text || "").toLowerCase();

          if (modText.includes(test.pattern)) {
            const isConditional =
              modText.includes("if") ||
              modText.includes("while") ||
              modText.includes("recently");

            if (jewelType === test.exclusiveJewel) {
              passed++;
            } else if (!isConditional || test.pattern.includes("with ")) {
              // Allow conditional mods on other jewels, but not weapon-specific mods
              failed++;
              failures.push(
                `❌ ${test.description} "${mod.text}" leaked to ${JEWEL_TYPE_CONFIG[jewelType].displayName}`
              );
            }
          }
        });
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 10: Validate base mod type consistency
  testBaseModTypeConsistency() {
    const testName = "Base Mod Type Consistency";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    const expectedBaseTypes = {
      murderous: [
        "MaximumLife",
        "AttackSpeed",
        "CriticalStrikeChance",
        "PhysicalDamageWithClaws",
        "ChaosDamageWithDaggers",
      ],
      searching: [
        "MaximumLife",
        "AttackSpeed",
        "ChaosDamageWithBows",
        "PhysicalDamageWithWands",
      ],
      hypnotic: [
        "MaximumMana",
        "CastSpeed",
        "SpellDamage",
        "MaximumEnergyShield",
      ],
      ghastly: [
        "MinionDamage",
        "MinionAttackSpeed",
        "MinionMaximumLife",
        "MinionLifeRegeneration",
      ],
    };

    Object.entries(expectedBaseTypes).forEach(([jewelType, expectedTypes]) => {
      const availableMods = this.getModsForJewelType(jewelType);

      expectedTypes.forEach((expectedType) => {
        const hasType = Object.values(availableMods).some(
          (mod) =>
            mod.baseModType === expectedType ||
            mod.baseModType.includes(expectedType)
        );

        if (hasType) {
          passed++;
          console.log(
            `  ✅ ${jewelType} has expected base type: ${expectedType}`
          );
        } else {
          failed++;
          failures.push(
            `❌ ${jewelType} missing expected base type: ${expectedType}`
          );
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 11: Verify conditional mods work correctly
  testConditionalMods() {
    const testName = "Conditional Mod Behavior";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    const conditionalKeywords = ["if", "while", "recently", "when", "on"];

    Object.keys(JEWEL_TYPE_CONFIG).forEach((jewelType) => {
      const availableMods = this.getModsForJewelType(jewelType);

      Object.values(availableMods).forEach((mod) => {
        const modText = (mod.text || "").toLowerCase();

        const isConditional = conditionalKeywords.some((keyword) =>
          modText.includes(keyword)
        );

        if (isConditional) {
          // Conditional mods should have specific base types
          const hasConditionalBaseType =
            mod.baseModType &&
            (mod.baseModType.includes("Conditional") ||
              mod.baseModType.includes("If") ||
              mod.baseModType.includes("While") ||
              mod.baseModType.includes("Recently") ||
              mod.baseModType.includes("When"));

          if (hasConditionalBaseType || modText.includes("minion")) {
            passed++;
            console.log(
              `  ✅ Conditional mod properly categorized: ${mod.baseModType}`
            );
          } else {
            // Check if it's a known exception (some conditional mods might use generic base types)
            const isKnownException =
              modText.includes("damage vs") || modText.includes("against");
            if (!isKnownException) {
              failed++;
              failures.push(
                `❌ Conditional mod not properly categorized: "${mod.text}" → ${mod.baseModType}`
              );
            }
          }
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Test 12: Verify all jewel types have essential mods
  testEssentialModCoverage() {
    const testName = "Essential Mod Coverage";
    console.log(`\n=== ${testName} ===`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    const essentialMods = {
      murderous: [
        { pattern: "maximum life", description: "life mods" },
        { pattern: "physical damage", description: "physical damage mods" },
        { pattern: "attack speed", description: "attack speed mods" },
        { pattern: "accuracy", description: "accuracy mods" },
      ],
      searching: [
        { pattern: "maximum life", description: "life mods" },
        { pattern: "with bows", description: "bow-specific mods" },
        { pattern: "with wands", description: "wand-specific mods" },
        { pattern: "attack speed", description: "attack speed mods" },
      ],
      hypnotic: [
        { pattern: "maximum mana", description: "mana mods" },
        { pattern: "spell", description: "spell mods" },
        { pattern: "cast speed", description: "cast speed mods" },
        { pattern: "energy shield", description: "energy shield mods" },
      ],
      ghastly: [
        { pattern: "minion", description: "minion mods" },
        { pattern: "minions have", description: "minion stat mods" },
        { pattern: "minions deal", description: "minion damage mods" },
      ],
    };

    Object.entries(essentialMods).forEach(([jewelType, requirements]) => {
      const availableMods = this.getModsForJewelType(jewelType);

      requirements.forEach((requirement) => {
        const hasRequiredMod = Object.values(availableMods).some(
          (mod) =>
            (mod.text || "").toLowerCase().includes(requirement.pattern) ||
            (mod.name || "").toLowerCase().includes(requirement.pattern)
        );

        if (hasRequiredMod) {
          passed++;
          console.log(`  ✅ ${jewelType} has ${requirement.description}`);
        } else {
          failed++;
          failures.push(
            `❌ ${jewelType} missing ${requirement.description} (pattern: "${requirement.pattern}")`
          );
        }
      });
    });

    this.recordTestResult(testName, passed, failed, failures);
    return { passed, failed, failures };
  }

  // Enhanced test runner
  async runAllEnhancedTests(modData = null) {
    console.log("🧪 Starting Enhanced Abyss Jewel Validation Tests");
    console.log("=".repeat(60));

    await this.loadModData(modData);

    // Run original tests
    this.testWeaponSpecificMods();
    this.testMinionModRestrictions();
    this.testTierRangeCalculations();
    this.testNoDuplicateBaseMods();
    this.testSpawnWeightLogic();
    this.testComprehensiveCoverage();

    // Run new enhanced tests
    this.testCompleteWeaponRestrictions();
    this.testSpellModDistribution();
    this.testCrossContamination();
    this.testBaseModTypeConsistency();
    this.testConditionalMods();
    this.testEssentialModCoverage();

    // Enhanced summary
    this.printEnhancedTestSummary();
    return this.testResults;
  }

  printEnhancedTestSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 ENHANCED TEST SUMMARY");
    console.log("=".repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    const categories = {
      "Core Functionality": [],
      "Weapon Restrictions": [],
      "Data Integrity": [],
      "Advanced Validation": [],
    };

    this.testResults.forEach((result) => {
      const status = result.failed === 0 ? "✅ PASS" : "❌ FAIL";

      // Categorize tests
      if (
        [
          "Weapon-Specific Mod Restrictions",
          "Complete Weapon Restrictions",
        ].includes(result.name)
      ) {
        categories["Weapon Restrictions"].push(
          `${status} ${result.name}: ${result.passed}/${result.total}`
        );
      } else if (
        [
          "Tier Range Calculations",
          "No Duplicate Base Mod Types",
          "Base Mod Type Consistency",
        ].includes(result.name)
      ) {
        categories["Data Integrity"].push(
          `${status} ${result.name}: ${result.passed}/${result.total}`
        );
      } else if (
        [
          "Cross-Contamination Prevention",
          "Conditional Mod Behavior",
          "Essential Mod Coverage",
        ].includes(result.name)
      ) {
        categories["Advanced Validation"].push(
          `${status} ${result.name}: ${result.passed}/${result.total}`
        );
      } else {
        categories["Core Functionality"].push(
          `${status} ${result.name}: ${result.passed}/${result.total}`
        );
      }

      if (result.failures.length > 0 && result.failures.length <= 5) {
        result.failures.forEach((failure) => console.log(`    ${failure}`));
      } else if (result.failures.length > 5) {
        console.log(
          `    ... ${result.failures.length} failures (showing first 3):`
        );
        result.failures
          .slice(0, 3)
          .forEach((failure) => console.log(`    ${failure}`));
      }

      totalPassed += result.passed;
      totalFailed += result.failed;
    });

    // Print categorized results
    Object.entries(categories).forEach(([category, results]) => {
      if (results.length > 0) {
        console.log(`\n📋 ${category}:`);
        results.forEach((result) => console.log(`  ${result}`));
      }
    });

    console.log("\n" + "-".repeat(40));
    console.log(`📊 OVERALL RESULTS:`);
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(
      `Success Rate: ${(
        (totalPassed / (totalPassed + totalFailed)) *
        100
      ).toFixed(1)}%`
    );

    if (totalFailed === 0) {
      console.log("\n🎉 Perfect! All enhanced tests passed!");
      console.log("Your mod data integrity is completely validated.");
    } else if (totalFailed <= 5) {
      console.log(`\n⚠️ Minor issues: ${totalFailed} test(s) failed.`);
      console.log(
        "Your extension should work correctly with minimal edge cases."
      );
    } else {
      console.log(`\n🔥 Significant issues: ${totalFailed} test(s) failed.`);
      console.log(
        "Consider reviewing the data integrity before production deployment."
      );
    }
  }
}

// Usage
window.EnhancedAbyssJewelTester = EnhancedAbyssJewelTester;
window.runEnhancedAbyssJewelTests = async function () {
  const tester = new EnhancedAbyssJewelTester();
  return await tester.runAllEnhancedTests();
};

console.log("Enhanced test suite loaded! Run: runEnhancedAbyssJewelTests()");
