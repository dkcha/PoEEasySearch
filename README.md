# PoE Easy Search - Abyss Jewels Edition

## Quick Setup

1. **Copy the core files from artifacts to this directory:**
   - Copy `Fixed Manifest V3` → `manifest.json`
   - Copy `Fixed Popup HTML` → `popup.html`
   - Copy `Fixed Popup JavaScript` → `popup.js`
   - Copy `Fixed Background Service Worker` → `background.js`
   - Copy `Fixed Content Script` → `content.js`

2. **Replace icon placeholders with real PNG files:**
   - Add actual PNG files to `icons/` directory
   - Required sizes: 16x16, 32x32, 48x48, 128x128 pixels

3. **Load the extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this PoEEasySearch directory

4. **Test the extension:**
   - Click the extension icon in Chrome toolbar
   - Should see 4 Abyss Jewel types in dropdown
   - Try searching for mods like "life", "es", "fire res"
   - Test the tier selection modal

## Current Status

- ✅ Complete UI with fuzzy search
- ✅ Tier selection system
- ✅ Mock data for testing (~6 mods)
- ⚠️ Auto-fill needs testing on pathofexile.com/trade
- ⚠️ Icons need to be replaced with PNG files
- ⚠️ Real mod data needs to be added

## Testing Keywords

Try these in the mod search:
- `life` → Added Life
- `es` → Energy Shield  
- `fire res` → Fire Resistance
- `attack speed` → Attack Speed
- `minion damage` → Minion Damage

## Troubleshooting

If the extension doesn't work:
1. Check browser console (F12) for JavaScript errors
2. Verify all 5 core files are copied correctly
3. Make sure popup.js loads without syntax errors
4. Check that icons directory has PNG files (not text placeholders)

