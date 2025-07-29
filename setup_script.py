#!/usr/bin/env python3
"""
PoE Trade Helper - Project Setup Script
Creates the directory structure and placeholder files for the extension.
"""

import os
import json
from pathlib import Path

def create_directory_structure():
    """Create the basic directory structure."""
    directories = [
        'poe-trade-helper-abyss',
        'poe-trade-helper-abyss/icons',
        'poe-trade-helper-abyss/data'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def create_icon_placeholders():
    """Create placeholder icon files."""
    icons = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png']
    
    for icon in icons:
        icon_path = Path(f'poe-trade-helper-abyss/icons/{icon}')
        if not icon_path.exists():
            # Create a minimal placeholder - you'll need to replace with real PNG files
            icon_path.write_text(f"Placeholder for {icon} - Replace with actual PNG file")
            print(f"⚠️  Created placeholder: {icon} (Replace with real PNG)")

def create_data_placeholders():
    """Create placeholder data files."""
    # Basic jewel data structure
    jewel_data = {
        "murderous-eye": {
            "name": "Murderous Eye Jewel",
            "type": "abyss_jewel",
            "category": "melee"
        },
        "searching-eye": {
            "name": "Searching Eye Jewel", 
            "type": "abyss_jewel",
            "category": "ranged"
        },
        "hypnotic-eye": {
            "name": "Hypnotic Eye Jewel",
            "type": "abyss_jewel", 
            "category": "caster"
        },
        "ghastly-eye": {
            "name": "Ghastly Eye Jewel",
            "type": "abyss_jewel",
            "category": "summoner"
        }
    }
    
    # Basic mod data structure (placeholder)
    mod_data = {
        "life": {
            "name": "Added Life",
            "stat_id": "base_maximum_life",
            "display_text": "+# to maximum Life",
            "tiers": {
                "T1": {"min": 36, "max": 40},
                "T2": {"min": 31, "max": 35},
                "T3": {"min": 26, "max": 30},
                "T4": {"min": 20, "max": 25}
            }
        }
    }
    
    # Write data files
    with open('poe-trade-helper-abyss/data/abyss_jewels.json', 'w') as f:
        json.dump(jewel_data, f, indent=2)
    print("✓ Created: data/abyss_jewels.json")
    
    with open('poe-trade-helper-abyss/data/abyss_jewels_mods.json', 'w') as f:
        json.dump(mod_data, f, indent=2)
    print("✓ Created: data/abyss_jewels_mods.json")

def create_readme():
    """Create a README with setup instructions."""
    readme_content = """# PoE Trade Helper - Abyss Jewels Edition

## Quick Setup

1. **Copy the core files from artifacts to this directory:**
   - Copy `Working Manifest V3` → `manifest.json`
   - Copy `Working Popup HTML` → `popup.html`
   - Copy `Working Popup JavaScript` → `popup.js`
   - Copy `Working Background Service Worker` → `background.js`
   - Copy `Working Content Script` → `content.js`

2. **Replace icon placeholders with real PNG files:**
   - Add actual PNG files to `icons/` directory
   - Required sizes: 16x16, 32x32, 48x48, 128x128 pixels

3. **Load the extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this directory

4. **Test the extension:**
   - Click the extension icon in Chrome toolbar
   - Select an Abyss Jewel type
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

## Next Steps

1. Test core functionality with mock data
2. Test auto-fill on PoE trade site
3. Replace mock data with real PoE mod database
4. Add proper icons

"""
    
    with open('poe-trade-helper-abyss/README.md', 'w') as f:
        f.write(readme_content)
    print("✓ Created: README.md")

def main():
    """Main setup function."""
    print("🚀 Setting up PoE Trade Helper project structure...")
    print()
    
    create_directory_structure()
    create_icon_placeholders()
    create_data_placeholders()
    create_readme()
    
    print()
    print("✅ Project structure created successfully!")
    print()
    print("📋 Next steps:")
    print("1. Copy the 5 core files from artifacts to poe-trade-helper-abyss/")
    print("2. Replace icon placeholders with real PNG files")
    print("3. Load extension in Chrome and test functionality")
    print()
    print("📁 Project ready at: ./poe-trade-helper-abyss/")

if __name__ == "__main__":
    main()
