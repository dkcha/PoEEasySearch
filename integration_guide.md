# PoE Trade Helper - Real Data Integration Guide

## 🎯 Overview
This guide will help you transition from mock data to real data using your `abyss_jewels.json` and `abyss_jewel_mods.json` files.

## 📋 Prerequisites
- Working extension with mock data (as documented in your bootstrap file)
- `data/abyss_jewels.json` file with jewel definitions
- `data/abyss_jewel_mods.json` file with mod data structure you described

## 🔧 Implementation Steps

### Step 1: Update File Structure
```
PoEEasySearch/
├── popup.js                    ← Replace with "Updated Popup JavaScript - Real Data Integration"
├── manifest.json               ← Replace with "Updated Manifest with Data Files Access"
├── data/
│   ├── abyss_jewels.json      ← Your existing file
│   └── abyss_jewel_mods.json  ← Your existing file
└── ... (other existing files)
```

### Step 2: Replace Core Files
1. **Replace `popup.js`** with the "Updated Popup JavaScript - Real Data Integration" artifact
2. **Replace `manifest.json`** with the "Updated Manifest with Data Files Access" artifact

### Step 3: Test Data Loading
1. Open Chrome DevTools (F12) when testing the extension
2. Run the data migration tester:
```javascript
// In browser console:
const tester = new DataMigrationTester();
await tester.runCompleteTest();
```

### Step 4: Validate Jewel Type Mapping
The extension expects these tag combinations in your `abyss_jewel_mods.json`:

```json
{
  "Abyss Jewels": {
    "not_for_sale,abyss_jewel_melee,abyss_jewel,default": { /* Murderous Eye Jewel mods */ },
    "not_for_sale,abyss_jewel_ranged,abyss_jewel,default": { /* Searching Eye Jewel mods */ },
    "not_for_sale,abyss_jewel_caster,abyss_jewel,default": { /* Hypnotic Eye Jewel mods */ },
    "not_for_sale,abyss_jewel_minion,abyss_jewel,default": { /* Ghastly Eye Jewel mods */ }
  }
}
```

## 🔍 Testing Process

### Test 1: Extension Loading
1. Loa