# 🚀 Quick Setup Guide - Get Your PoE Extension Working

## Step 1: Create Project Structure

Run the build script to create your project folder:

```bash
python build.py
```

This creates:
```
poe-trade-helper-abyss/
├── data/
│   ├── abyss_jewels.json (placeholder)
│   └── abyss_jewels_mods.json (placeholder)
├── icons/
│   └── (placeholder text files)
└── README.md
```

## Step 2: Copy the Core Files

Copy these files from the artifacts above into your project directory:

### Required Files:
1. **manifest.json** (from "Working manifest.json" artifact)
2. **popup.html** (from "Working popup.html" artifact) 
3. **popup.js** (from "Working popup.js" artifact)
4. **content.js** (from "PoE Trade Site Auto-Fill Content Script" artifact)
5. **background.js** (from "Background Service Worker" artifact)

Your final structure should look like:
```
poe-trade-helper-abyss/
├── manifest.json       ✅
├── popup.html          ✅  
├── popup.js            ✅
├── content.js          ✅
├── background.js       ✅
├── data/
│   ├── abyss_jewels.json
│   └── abyss_jewels_mods.json
├── icons/
└── README.md
```

## Step 3: Add Basic Icons (Optional for Testing)

Create simple PNG icons or download any 16x16, 32x32, 48x48, and 128x128 PNG files and rename them:
- `icons/icon16.png`
- `icons/icon32.png`  
- `icons/icon48.png`
- `icons/icon128.png`

## Step 4: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select your `poe-trade-helper-abyss` folder
5. Extension should load with no errors

## Step 5: Test Basic Functionality

1. **Click the extension icon** in your browser toolbar
2. **Select a jewel type** from the dropdown (e.g., "Murderous Eye Jewel")
3. **Switch to "With Specific Mods"** mode
4. **Type "life"** in the search box
5. **Select "Added Life"** from suggestions
6. **Choose a tier** (e.g., T1) in the modal
7. **Click "Auto-Fill with 1 Mod(s)"**

## What Should Work Right Now:

✅ **Jewel Type Selection** - All 4 Abyss Jewel types  
✅ **Fuzzy Search** - Type "life", "es", "fire res", "attack speed", "minion damage"  
✅ **Tier Selection** - Pick T1-T4 with exact value ranges shown  
✅ **Mod Management** - Add/remove multiple mods  
✅ **UI Interactions** - Keyboard navigation, visual feedback  
✅ **Debug Logging** - See what's happening in real-time  

## What Needs Real Data:

⚠️ **Mod Database** - Currently using mock data with ~6 mods  
⚠️ **Tier Values** - Placeholder ranges, need actual game values  
⚠️ **Auto-Fill Selectors** - May need adjustment for current trade site layout  

## Testing the Auto-Fill:

1. **Open pathofexile.com/trade** in another tab
2. **Use the extension** to select jewel + mods
3. **Check browser console** (F12) for auto-fill debug messages
4. **Verify if form gets filled** correctly

If auto-fill doesn't work, check:
- Console errors in both extension popup and trade site tabs
- Trade site layout changes (selectors in content.js may need updates)
- Chrome permissions granted

## Debug Information:

The extension shows real-time debug info in the popup. Watch for:
- **"Extension ready!"** - Initialization successful
- **Search results** - Fuzzy matching working  
- **Tier selection** - Modal interactions
- **Auto-fill messages** - Communication with trade site

## Success Criteria:

🎯 **You have a working extension when**:
1. Popup opens without errors
2. Jewel selection works
3. Mod search shows suggestions  
4. Tier selection modal opens
5. Selected mods display correctly
6. Search button becomes enabled

The auto-fill functionality can be refined once the core workflow is solid!

---

**This gives you a fully functional extension for testing the core features before we dive into real data integration and trade site compatibility fixes.**