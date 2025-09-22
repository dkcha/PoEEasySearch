// Enhanced Mock Data Generator for Comprehensive Testing
// This creates a realistic dataset that matches your actual mod distribution

class MockAbyssJewelDataGenerator {
  static generateComprehensiveMockData() {
    return {
      // === MURDEROUS EYE JEWEL MODS (Melee) ===
      
      // Life mods
      AbyssJewelMeleeLife1: {
        text: "+(25-30) to maximum Life",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 1000 },
          { tag: "abyss_jewel_ranged", weight: 500 },
          { tag: "abyss_jewel_caster", weight: 500 },
          { tag: "abyss_jewel_summoner", weight: 500 }
        ],
        required_level: 20,
        stats: [{ id: "base_maximum_life", min: 25, max: 30 }]
      },

      // Attack Speed mods
      AbyssJewelMeleeAttackSpeed1: {
        text: "(8-12)% increased Attack Speed",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 },
          { tag: "abyss_jewel_ranged", weight: 300 }
        ],
        required_level: 25,
        stats: [{ id: "attack_speed_+%", min: 8, max: 12 }]
      },

      // Critical Strike Chance
      AbyssJewelMeleeCriticalStrike1: {
        text: "+(18-22)% to Critical Strike Chance",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 400 },
          { tag: "abyss_jewel_ranged", weight: 400 }
        ],
        required_level: 30,
        stats: [{ id: "critical_strike_chance_+%", min: 18, max: 22 }]
      },

      // Accuracy
      AbyssJewelMeleeAccuracy1: {
        text: "+(120-150) to Accuracy Rating",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 600 },
          { tag: "abyss_jewel_ranged", weight: 600 }
        ],
        required_level: 15,
        stats: [{ id: "accuracy_rating_+", min: 120, max: 150 }]
      },

      // Weapon-specific damage mods
      AbyssJewelChaosDamageClaws1: {
        text: "Adds (6-7) to (11-13) Chaos Damage to Attacks with Claws",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 },
          { tag: "abyss_jewel_ranged", weight: 0 },
          { tag: "abyss_jewel_caster", weight: 0 },
          { tag: "abyss_jewel_summoner", weight: 0 }
        ],
        required_level: 30,
        stats: [{ id: "local_add_chaos_damage_with_claws", min: 6, max: 13 }]
      },

      AbyssJewelPhysicalDamageClaws1: {
        text: "Adds (8-10) to (15-18) Physical Damage to Attacks with Claws",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 }
        ],
        required_level: 25,
        stats: [{ id: "local_add_physical_damage_with_claws", min: 8, max: 18 }]
      },

      AbyssJewelPhysicalDamageSwords1: {
        text: "Adds (8-10) to (15-18) Physical Damage to Attacks with Swords",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 }
        ],
        required_level: 25,
        stats: [{ id: "local_add_physical_damage_with_swords", min: 8, max: 18 }]
      },

      AbyssJewelFireDamageAxes1: {
        text: "Adds (5-7) to (12-15) Fire Damage to Attacks with Axes",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 500 }
        ],
        required_level: 28,
        stats: [{ id: "local_add_fire_damage_with_axes", min: 5, max: 15 }]
      },

      // === SEARCHING EYE JEWEL MODS (Ranged) ===
      
      AbyssJewelChaosDamageBows1: {
        text: "Adds (8-10) to (14-16) Chaos Damage to Attacks with Bows",
        spawn_weights: [
          { tag: "abyss_jewel_ranged", weight: 500 }
        ],
        required_level: 35,
        stats: [{ id: "local_add_chaos_damage_with_bows", min: 8, max: 16 }]
      },

      AbyssJewelPhysicalDamageBows1: {
        text: "Adds (6-8) to (12-14) Physical Damage to Attacks with Bows",
        spawn_weights: [
          { tag: "abyss_jewel_ranged", weight: 500 }
        ],
        required_level: 25,
        stats: [{ id: "local_add_physical_damage_with_bows", min: 6, max: 14 }]
      },

      AbyssJewelFireDamageWands1: {
        text: "Adds (5-7) to (12-15) Fire Damage to Attacks with Wands",
        spawn_weights: [
          { tag: "abyss_jewel_ranged", weight: 500 }
        ],
        required_level: 28,
        stats: [{ id: "local_add_fire_damage_with_wands", min: 5, max: 15 }]
      },

      AbyssJewelLightningDamageWands1: {
        text: "Adds (3-5) to (18-22) Lightning Damage to Attacks with Wands",
        spawn_weights: [
          { tag: "abyss_jewel_ranged", weight: 500 }
        ],
        required_level: 32,
        stats: [{ id: "local_add_lightning_damage_with_wands", min: 3, max: 22 }]
      },

      AbyssJewelRangedAttackSpeed1: {
        text: "(8-12)% increased Attack Speed with Bows",
        spawn_weights: [
          { tag: "abyss_jewel_ranged", weight: 400 }
        ],
        required_level: 25,
        stats: [{ id: "attack_speed_with_bows_+%", min: 8, max: 12 }]
      },

      // === HYPNOTIC EYE JEWEL MODS (Caster) ===
      
      AbyssJewelSpellDamage1: {
        text: "(12-18)% increased Spell Damage",
        spawn_weights: [
          { tag: "abyss_jewel_caster", weight: 500 }
        ],
        required_level: 25,
        stats: [{ id: "spell_damage_+%", min: 12, max: 18 }]
      },

      AbyssJewelCastSpeed1: {
        text: "(8-12)% increased Cast Speed",
        spawn_weights: [
          { tag: "abyss_jewel_caster", weight: 500 }
        ],
        required_level: 30,
        stats: [{ id: "base_cast_speed_+%", min: 8, max: 12 }]
      },

      AbyssJewelMana1: {
        text: "+(35-45) to maximum Mana",
        spawn_weights: [
          { tag: "abyss_jewel_caster", weight: 800 },
          { tag: "abyss_jewel_melee", weight: 200 },
          { tag: "abyss_jewel_ranged", weight: 200 },
          { tag: "abyss_jewel_summoner", weight: 400 }
        ],
        required_level: 15,
        stats: [{ id: "base_maximum_mana", min: 35, max: 45 }]
      },

      AbyssJewelEnergyShield1: {
        text: "+(15-20) to maximum Energy Shield",
        spawn_weights: [
          { tag: "abyss_jewel_caster", weight: 600 }
        ],
        required_level: 20,
        stats: [{ id: "base_maximum_energy_shield", min: 15, max: 20 }]
      },

      AbyssJewelElementalSpellDamage1: {
        text: "(10-15)% increased Elemental Damage with Spells",
        spawn_weights: [
          { tag: "abyss_jewel_caster", weight: 400 }
        ],
        required_level: 28,
        stats: [{ id: "elemental_damage_with_spells_+%", min: 10, max: 15 }]
      },

      // === GHASTLY EYE JEWEL MODS (Summoner) ===
      
      AbyssJewelMinionLife1: {
        text: "Minions have +(20-25) to maximum Life",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 500 }
        ],
        required_level: 20,
        stats: [{ id: "minion_maximum_life_+", min: 20, max: 25 }]
      },

      AbyssJewelMinionDamage1: {
        text: "Minions deal (15-20)% increased Damage",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 500 }
        ],
        required_level: 25,
        stats: [{ id: "minion_damage_+%", min: 15, max: 20 }]
      },

      AbyssJewelMinionAttackSpeed1: {
        text: "Minions have (8-12)% increased Attack Speed",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 500 }
        ],
        required_level: 30,
        stats: [{ id: "minion_attack_speed_+%", min: 8, max: 12 }]
      },

      AbyssJewelMinionCastSpeed1: {
        text: "Minions have (8-12)% increased Cast Speed",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 400 }
        ],
        required_level: 30,
        stats: [{ id: "minion_cast_speed_+%", min: 8, max: 12 }]
      },

      AbyssJewelMinionAccuracy1: {
        text: "Minions have +(120-150) to Accuracy Rating",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 400 }
        ],
        required_level: 25,
        stats: [{ id: "minion_accuracy_rating_+", min: 120, max: 150 }]
      },

      AbyssJewelMinionCriticalStrike1: {
        text: "Minions have +(15-20)% to Critical Strike Chance",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 300 }
        ],
        required_level: 35,
        stats: [{ id: "minion_critical_strike_chance_+%", min: 15, max: 20 }]
      },

      AbyssJewelMinionLifeRegeneration1: {
        text: "Minions regenerate (8-12) Life per second",
        spawn_weights: [
          { tag: "abyss_jewel_summoner", weight: 350 }
        ],
        required_level: 28,
        stats: [{ id: "minion_life_regeneration_rate_per_minute_%", min: 8, max: 12 }]
      },

      // === CONDITIONAL/SPECIAL MODS ===
      
      AbyssJewelConditionalDamage1: {
        text: "(12-18)% increased Damage if you haven't Crit Recently",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 200 },
          { tag: "abyss_jewel_ranged", weight: 200 }
        ],
        required_level: 35,
        stats: [{ id: "conditional_damage_+%", min: 12, max: 18 }]
      },

      AbyssJewelConditionalAttackSpeed1: {
        text: "(8-12)% increased Attack Speed while stationary",
        spawn_weights: [
          { tag: "abyss_jewel_melee", weight: 150 },
          { tag: "abyss_jewel_ranged", weight: 150 }
        ],
        required_level: 30,
        stats: [{ id: "conditional_attack_speed_+%", min: 8, max: 12 }]
      }
    };
  }

  // Generate test-specific subsets for focused testing
  static generateMinimalTestData() {
    const fullData = this.generateComprehensiveMockData();
    return {
      // One mod per jewel type for basic functionality tests
      AbyssJewelChaosDamageClaws1: fullData.AbyssJewelChaosDamageClaws1,
      AbyssJewelChaosDamageBows1: fullData.AbyssJewelChaosDamageBows1,
      AbyssJewelSpellDamage1: fullData.AbyssJewelSpellDamage1,
      AbyssJewelMinionLife1: fullData.AbyssJewelMinionLife1
    };
  }
}

// Usage in your tests:
// const mockData = MockAbyssJewelDataGenerator.generateComprehensiveMockData();
// await tester.runAllEnhancedTests(mockData);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockAbyssJewelDataGenerator;
}

if (typeof window !== 'undefined') {
  window.MockAbyssJewelDataGenerator = MockAbyssJewelDataGenerator;
}