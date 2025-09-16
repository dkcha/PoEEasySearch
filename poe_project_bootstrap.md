# Path of Exile Trade Helper - Abyss Jewels Edition - Project Bootstrap v9.3

## Project Overview
A specialized browser extension focused exclusively on Abyss Jewel trading in Path of Exile. Features advanced fuzzy search, intelligent tier range selection, seamless auto-fill integration with the official trade site, **hardcoded ultra-speed operation**, **smart average damage calculation for accurate tier filtering**, and **complete weapon mod coverage using official game data**.

## 🎯 PROJECT SCOPE - ABYSS JEWELS ONLY
**Supported Items**: 4 Abyss Jewel types exclusively
- Murderous Eye Jewel (Melee builds) - All melee weapon mods available
- Searching Eye Jewel (Ranged builds) - Bow/Wand mods available  
- Hypnotic Eye Jewel (Caster builds)
- Ghastly Eye Jewel (Summoner builds)

## ⚠️ CURRENT STATUS - ACTIVE DEBUGGING SESSION (v9.3)

### Core Functionality Status
- ✅ **Extension loads and runs** without errors
- ✅ **Complete dataset loading** (`all_abyss_jewel_mods.json` - 28k lines)
- ✅ **Tier range selection** (From/To dropdowns for precise tier targeting)
- ✅ **Average damage calculation** for flat damage mods
- ✅ **Hardcoded ultra-speed operation** (3x faster, no user controls)
- ✅ **6 mod support** (3 prefixes + 3 suffixes)
- ✅ **Anti-bot detection** measures with human-like timing
- ✅ **Persistent settings** via Chrome storage
- ✅ **Complete weapon mod coverage** - All valid weapon combinations included in data
- ✅ **Auto-fill fully working** - All mods populate correctly on trade site
- 🔄 **SEARCH FUNCTIONALITY** - Under active investigation
- ✅ **MULTI-MOD SELECTION FIXED** - Previously overwriting, now works correctly

### 🔍 ACTIVE ISSUE: Life Regeneration Mods Not Appearing (v9.3)

**Problem Statement**: When searching for "life", only maximum life mods appear. Life regeneration mods are not showing up despite being present in the dataset.

**Specific Case**: 
- Mod: `AbyssFlatLifeRegenerationJewel1` 
- Text: "Regenerate (9-12) Life per second"
- Has valid spawn weights for all jewel types with weight > 0

### 🔍 ROOT CAUSE IDENTIFIED: Base Type Collision Bug (v9.3)

**CRITICAL DISCOVERY**: The search issue is caused by **base type collision** during mod aggregation, not search algorithm failure.

**Problem Identified**:
Multiple life regeneration mods get assigned the **same base type** `"LifeRegeneration"`:
- `AbyssFlatLifeRegenerationJewel1` (Player) → `"LifeRegeneration"`  
- `AbyssFlatMinionLifeRegenerationJewel1` (Minion) → `"LifeRegeneration"`
- `AbyssLifeRegenerationRateWhileMovingJewel1` (Moving) → `"LifeRegeneration"`

**What Happens**:
1. Player life regen mod gets processed first → stored as `relevantMods["LifeRegeneration"]`
2. Minion life regen mod gets processed later → **overwrites** `relevantMods["LifeRegeneration"]`
3. Final result: "LifeRegeneration" contains minion-specific text that doesn't match player "life" searches

**Debug Evidence**:
✅ Data loads correctly (548 mods)
✅ Spawn weight filtering works (passes `hasJewelSpecificTag: true`)
✅ Base type extraction works (correctly assigns `"LifeRegeneration"`)
✅ Mod makes it to 102 processed base mods
❌ **Gets overwritten by duplicate base types during aggregation**

**Required Fix**:
Make base types more specific in `extractBaseModType()`:
- Player life regeneration → `"PlayerLifeRegeneration"`
- Minion life regeneration → `"MinionLifeRegeneration"`  
- Moving life regeneration → `"MovingLifeRegeneration"`

This will prevent different types of life regeneration mods from overwriting each other during the aggregation process.

### Recent Changes Made (v9.2 → v9.3)

**Spawn Weight Filtering Enhancement**:
```javascript
// OLD: Accepted any "default" tag regardless of weight
const hasDefaultTag = spawnWeight.tag === "default";

// NEW: Only accepts spawn weights with positive weight values
if (!spawnWeight.weight || spawnWeight.weight <= 0) {
  return false;
}
```

**Abbreviation System Fix**:
```javascript
// REMOVED: Overly restrictive expansion
// life: "maximum life"  // This prevented "life regen" matches

// KEPT: Specific abbreviations that don't interfere
mana: "maximum mana",
regen: "regeneration", 
"life regen": "life regeneration"
```

**Debug Output Cleanup**:
- Removed verbose mod-by-mod checking logs
- Removed base type extraction debugging
- Kept essential search flow information
- Console output now manageable for copy-paste analysis

### 🔧 CURRENT DEBUGGING APPROACH

**Data Flow Analysis**:
1. **Raw Data** (28k mods) → **Spawn Weight Filter** → **Tier Aggregation** → **Search Results**
2. Need to verify each step for life regeneration mods specifically

**Key Debugging Questions**:
- Are life regen mods passing spawn weight filtering?
- Are they being properly aggregated into base types?
- Are they making it into the final `availableMods` for search?
- Is the search algorithm matching them correctly?

**Next Debugging Steps**:
1. Add targeted debug output for life regeneration mods only
2. Trace specific mod `AbyssFlatLifeRegenerationJewel1` through entire pipeline
3. Compare working mods (maximum life) vs non-working (life regen) processing

## 📋 RESOLVED ISSUES