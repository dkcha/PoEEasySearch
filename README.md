# PoE Trade Helper - Abyss Jewels Edition

A specialized Chrome extension for Path of Exile that streamlines Abyss Jewel trading with advanced fuzzy search, intelligent tier range selection, and seamless auto-fill integration with the official trade site.

## Features

### Core Functionality
- **Instant Auto-Fill**: Automatically configure trade site searches with selected mods and tier ranges
- **4 Jewel Types Supported**: Murderous, Searching, Hypnotic, and Ghastly Eye Jewels
- **548 Curated Mods**: Complete database of all Abyss Jewel modifiers with accurate spawning rules
- **Intelligent Tier Selection**: Visual tier range picker (T1-T4) with automatic value calculation
- **Smart Value Calculation**: Flat damage mods use proper averaging for precise searches

### Advanced Search
- **Fuzzy Matching**: Find mods quickly with partial text or abbreviations
  - "phys" → Physical Damage
  - "res" → Resistance
  - "regen" → Regeneration
- **Real-time Filtering**: Instant search results as you type
- **Jewel-Specific Filtering**: Only shows mods that can actually spawn on selected jewel type
- **Multi-Mod Support**: Add up to 6 mod filters per search

### Smart Features
- **Damage Averaging**: Complex damage ranges like "(14-15) to (25-28)" automatically calculate to 19.5-21.5
- **Lowest Tier Optimization**: Automatically sets minimum to 0 for broader results when searching lowest tiers
- **Abbreviation Support**: Built-in shortcuts for common mod types
- **Status Messages**: Clear feedback on actions and errors

## Installation

### From Chrome Web Store
*Coming Soon*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## Usage

### Basic Workflow
1. Click the extension icon in your Chrome toolbar
2. Select an Abyss Jewel type (Murderous, Searching, Hypnotic, or Ghastly)
3. Search for mods using the search box
4. Click a mod to select it and choose tier range
5. Repeat for additional mods (up to 6)
6. Click "Search" to open and auto-fill the trade site

### Tier Range Selection
- Select exact tier (T1, T2, T3, T4) for precise searches
- Select tier range (T1-T3) for flexible searches
- Lowest tier searches automatically set min to 0 for broader results
- Damage mods show averaged values for accuracy

### Search Tips
- Use partial text: "life" finds "maximum Life" and "Life Regeneration"
- Use abbreviations: "phys" for physical damage, "res" for resistance
- Search is case-insensitive
- Real-time results update as you type

## Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Efficient background processing
- **Content Script**: Seamless trade site integration
- **GitHub Data Source**: Always up-to-date mod database

### Browser Compatibility
- Chrome 88+
- Edge 88+ (Chromium-based)
- Opera 74+ (Chromium-based)
- Brave (Latest version)

### Permissions Required
- `activeTab`: Interact with trade site pages
- `tabs`: Manage trade site tabs
- `storage`: Save extension settings
- Host permissions for:
  - `pathofexile.com` (trade site integration)
  - `raw.githubusercontent.com` (mod data loading)

## Supported Jewel Types

### Murderous Eye Jewel (Melee)
- Melee weapon mods
- Attack-based modifiers
- Physical damage bonuses
- Life/Defense mods

### Searching Eye Jewel (Ranged)
- Bow and wand mods
- Projectile modifiers
- Ranged attack bonuses
- Phasing and movement

### Hypnotic Eye Jewel (Caster)
- Spell damage mods
- Cast speed bonuses
- Elemental damage
- Mana and energy shield

### Ghastly Eye Jewel (Summoner)
- All minion modifiers
- Minion damage and survivability
- Minion utility effects
- Summoner-specific bonuses

## Data Source

Mod data is fetched from the official Path of Exile game data and curated for accuracy. The extension always uses the latest data from the GitHub repository, ensuring up-to-date information for current leagues.

## Privacy

This extension:
- Does NOT collect any personal data
- Does NOT track your usage
- Does NOT send data to third-party servers
- Only fetches mod data from GitHub
- Only interacts with pathofexile.com when you initiate a search

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Setup
1. Clone the repository
2. Make your changes
3. Test thoroughly in Chrome Developer Mode
4. Submit a pull request with a clear description

### Reporting Issues
- Use GitHub Issues for bug reports
- Include Chrome version and extension version
- Provide steps to reproduce
- Screenshots are helpful

## Roadmap

### Planned Features
- COUNT mode search (X out of Y mods must match)
- Search templates and saved searches
- Inline tier selection
- Price estimation integration
- Additional jewel type support (future leagues)

## License

MIT License - See LICENSE file for details

## Disclaimer

This is a third-party tool and is not affiliated with or endorsed by Grinding Gear Games. Path of Exile is a trademark of Grinding Gear Games.

## Support

If you find this extension helpful, consider:
- Starring the repository on GitHub
- Reporting bugs and suggesting features
- Contributing code improvements
- Sharing with other Path of Exile players

## Acknowledgments

- Path of Exile and all game data are property of Grinding Gear Games
- Mod data structure based on official game files
- Built with modern web extension APIs

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: [@dkcha](https://github.com/dkcha)