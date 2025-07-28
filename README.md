# PoE Easy Search - Enhanced Trade Helper

A powerful Chrome extension that streamlines Path of Exile trading by providing an intuitive interface for searching items on the official trade site. Now supports both **base item searches** (without specific mods) and **detailed mod-based searches** with real RePoE data integration.

## 🆕 What's New in This Version

### 🎯 **No-Mods Search Support**
- **Base Item Only searches** - Perfect for finding high-quality bases, specific item levels, or corrupted items
- **Quality-based searches** - Find items with specific quality ranges (great for crafting bases)
- **Property-based filtering** - Search by item level, corruption status, fractured, synthesised properties
- **Simple base item trading** - No need to specify explicit mods for general item searches

### 🌐 **Real RePoE Data Integration**
- **Live data fetching** from the actively maintained [repoe-fork](https://github.com/repoe-fork/repoe) repository
- **Comprehensive item database** with all base items, mods, and their tier information
- **Automatic tier calculation** based on actual game data extracted from Content.ggpk
- **Smart mod grouping** that organizes similar mods by their stat effects

## ✨ Key Features

### 🔧 **Dual Search Modes**
1. **Base Items Only** - Search for items without requiring specific mods
   - High-quality bases for crafting
   - Specific item levels for meta-crafting
   - Corrupted/fractured/synthesised items
   - Price-based filtering

2. **With Specific Mods** - Traditional tier-based mod searching
   - Tier-based selection (T1-T5) instead of manual value ranges
   - Real mod data from RePoE
   - Multiple mod combinations
   - Precise value ranges

### 📊 **Smart Data Processing**
- **Real-time RePoE integration** - Always up-to-date with the latest game data
- **Intelligent tier calculation** - T1 = best possible rolls, automatically calculated
- **Mod compatibility checking** - Only shows mods that can actually appear on selected items
- **Comprehensive item categories** - Weapons, armor, jewels, flasks, and more

### 🎨 **Enhanced User Interface**
- **Clean, modern design** with dark theme optimized for PoE players
- **Collapsible sections** for organized configuration
- **Search type toggle** - Easy switching between base-only and mod-based searches
- **Real-time validation** with helpful error messages
- **Configuration persistence** - Remembers your settings between sessions

## 🚀 Installation & Setup

### Option 1: Build from Source (Recommended for Latest Features)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/poe-trade-helper
   cd poe-trade-helper
   ```

2. **Install Python dependencies:**
   ```bash
   pip install requests
   ```

3. **Build the extension:**
   ```bash
   # Build with live RePoE data (recommended)
   python build.py

   # Build offline with mock data
   python build.py --offline

   # Build specific version
   python build.py --version 2.0.0

   # Development build (no ZIP package)
   python build.py --no-package
   ```

4. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build/` folder

### Option 2: Load Pre-built Extension

1. Download the latest release ZIP file
2. Extract the contents
3. Load the extracted folder in Chrome as described above

## 📖 How to Use

### 🎯 Base Item Searches (No Mods Required)

Perfect for finding crafting bases or items with specific properties:

1. **Select "Base Items Only"** search mode
2. **Choose your base item** from the categorized dropdown
3. **Set item properties:**
   - Item level range (e.g., 86+ for top-tier crafting)
   - Quality range (e.g., 20%+ for high-quality bases)
   - Special properties (corrupted, fractured, synthesised)
4. **Set price range** if desired
5. **Click "Search Base Items"**

**Example Use Cases:**
- High item level Vaal Regalia for crafting Energy Shield gear
- 20%+ quality weapons for quality-dependent builds
- Corrupted items with specific implicit mods
- Fractured items with good fractured mods for crafting

### 🔧 Mod-Based Searches (Traditional)

For finding items with specific stat requirements:

1. **Select "With Specific Mods"** search mode
2. **Choose your base item**
3. **Add mods:**
   - Click "Add Mod"
   - Select the mod type (e.g., "+# to maximum Life")
   - Choose tier (T1 = best rolls, T2 = second best, etc.)
4. **Set additional properties** as needed
5. **Click "Search with Mods"**

## 🔧 Build System Features

### Enhanced Build Script

The build script now supports fetching live RePoE data:

```bash
# Standard build with RePoE data
python build.py

# Build without internet connection
python build.py --offline

# Clean build directories only
python build.py --clean-only

# Development build (faster, no packaging)
python build.py --no-package

# Custom version
python build.py --version 2.1.0

# Skip RePoE fetch, use local data
python build.py --no-repoe
```

### Data Processing Pipeline

The extension automatically:
1. **Fetches latest data** from repoe-fork.github.io
2. **Processes base items** with proper categorization
3. **Calculates mod tiers** based on stat value ranges
4. **Generates item-mod compatibility** mappings
5. **Creates optimized data files** for the extension

## 🗂️ Project Structure

```
poe-trade-helper/
├── manifest.json              # Extension configuration
├── popup.html                 # Enhanced UI with search mode toggle
├── popup.js                   # Enhanced interface logic
├── content.js                 # Trade site auto-fill engine
├── background.js              # Service worker
├── data-processor.js          # RePoE integration & URL generation
├── build.py                   # Enhanced build script with RePoE
├── README.md                  # This file
├── build/                     # Generated extension files
├── dist/                      # Distribution packages
└── data/                      # Local data files (fallback)
```

## 🔍 Technical Details

### RePoE Data Integration

The extension uses data from the [repoe-fork](https://github.com/repoe-fork/repoe) project:

- **base_items.json** - All base item types with properties
- **mods.json** - Complete mod database with spawn weights
- **stat_translations.json** - Human-readable mod names
- **item_classes.json** - Item category definitions

### Search URL Generation

The extension generates proper pathofexile.com/trade URLs with:

- **Base item filtering** by exact type match
- **Property filters** (item level, quality, corruption, etc.)
- **Stat filters** with proper min/max value ranges
- **Price filters** with currency selection
- **Online-only filtering** for active listings

### Auto-Fill Technology

The content script uses:
- **CSS selector-based detection** for trade site form fields
- **Dynamic form field creation** for stat filters
- **Intelligent value mapping** from tiers to actual ranges
- **Error handling and retry mechanisms** for reliability

## 🛠️ Development

### Prerequisites

- Python 3.7+ for build script
- Chrome browser for testing
- Internet connection for RePoE data (optional)

### Development Workflow

1. **Make changes** to source files
2. **Run build script:**
   ```bash
   python build.py --no-package
   ```
3. **Reload extension** in Chrome
4. **Test functionality** on pathofexile.com/trade

### Adding New Features

- **Base item support**: Modify `process_base_items()` in the build script
- **New mod types**: Update `process_mods()` to handle additional mod categories
- **UI enhancements**: Edit `popup.html` and `popup.js`
- **Trade site changes**: Update selectors in `content.js`

## 🐛 Troubleshooting

### Common Issues

**"No base items loaded"**
- Check internet connection for RePoE data fetch
- Use `--offline` flag to build with mock data
- Verify RePoE endpoints are accessible

**"Search not working"**
- Ensure base item is selected
- Check that property ranges are valid (min ≤ max)
- Verify trade site hasn't changed their form structure

**"Extension won't load"**
- Check for manifest.json syntax errors
- Ensure all required files are in build directory
- Look for JavaScript errors in Chrome DevTools

### Debug Mode

Enable debug logging in the console:
```javascript
// In popup or content script console
window.debugMode = true;
```

## 📈 Roadmap

### Planned Features

- **🔮 Pseudo-mod support** (Total resistance, Life+ES, etc.)
- **💎 Unique item integration** with specific mod searches
- **🔗 Socket/link configuration** filtering
- **💰 poe.ninja price integration** for market prices
- **📋 Search preset management** for builds
- **🎯 Advanced base item filters** (influence types, etc.)
- **📊 Search result analysis** and statistics

### Performance Improvements

- **⚡ Caching layer** for RePoE data
- **🗜️ Data compression** for faster loading
- **🔄 Incremental updates** for data freshness
- **📱 Mobile-responsive design** improvements

## 🤝 Contributing

Contributions are welcome! Please feel free to:

1. **Report bugs** via GitHub issues
2. **Suggest features** for future versions
3. **Submit pull requests** with improvements
4. **Share feedback** on user experience

### Code Style

- Use modern JavaScript (ES6+)
- Follow existing code formatting
- Add comments for complex logic
- Test thoroughly before submitting

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Grinding Gear Games** for Path of Exile
- **RePoE contributors** for game data extraction
- **PoE community** for feedback and suggestions
- **All contributors** who help improve the extension

---

**Made with ❤️ for the Path of Exile community**

*Happy trading, Exile!* 🗡️⚡