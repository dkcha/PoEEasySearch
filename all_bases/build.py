#!/usr/bin/env python3
"""
Enhanced build script for PoE Trade Helper extension with RePoE data integration.
Supports fetching live data from RePoE repositories and processing it for the extension.
"""

import os
import json
import shutil
import zipfile
import argparse
import requests
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

class RePoEDataProcessor:
    """Processes RePoE data for the extension."""
    
    def __init__(self, use_github_repo=True):
        self.use_github_repo = use_github_repo
        
        if use_github_repo:
            # Use your GitHub repo as data source
            self.base_url = "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data"
            self.file_mapping = {
                "base_items.json": "base_items.json",
                "mods.json": "mods.json", 
                "stat_translations.json": "stat_translations.json",
                "item_classes.json": "item_classes.json",
                "tags.json": "tags.json"
            }
        else:
            # Fallback to original RePoE (if needed)
            self.base_url = "https://repoe-fork.github.io/RePoE/data"
            self.file_mapping = {
                "base_items.json": "base_items.json",
                "mods.json": "mods.json",
                "stat_translations.json": "stat_translations.json", 
                "item_classes.json": "item_classes.json",
                "tags.json": "tags.json"
            }
    
    def fetch_repoe_file(self, filename: str) -> Dict[str, Any]:
        """Fetch a data file from the configured source."""
        # Map the requested filename to actual filename
        actual_filename = self.file_mapping.get(filename, filename)
        url = f"{self.base_url}/{actual_filename}"
        
        print(f"📥 Fetching {filename} from {url}")
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Failed to fetch {filename}: {e}")
            return {}
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse {filename}: {e}")
            return {}
    
    def process_base_items(self, base_items_data: Dict) -> Dict[str, Any]:
        """Process base items data for the extension."""
        if not base_items_data:
            return {}
        
        processed = {}
        for item_id, item_data in base_items_data.items():
            # Skip items without essential data
            if not item_data.get('name') or not item_data.get('item_class'):
                continue
            
            processed[item_id] = {
                'name': item_data['name'],
                'item_class': item_data['item_class'],
                'required_level': item_data.get('required_level', 1),
                'tags': item_data.get('tags', []),
                'implicits': item_data.get('implicits', []),
                'properties': item_data.get('properties', {}),
                'requirements': {
                    'str': item_data.get('required_strength', 0),
                    'dex': item_data.get('required_dexterity', 0),
                    'int': item_data.get('required_intelligence', 0)
                }
            }
        
        print(f"✅ Processed {len(processed)} base items")
        return processed
    
    def process_mods(self, mods_data: Dict, stat_translations: Dict = None) -> Dict[str, Any]:
        """Process mods data for the extension."""
        if not mods_data:
            return {}
        
        processed = {}
        mod_groups = {}
        
        for mod_id, mod_data in mods_data.items():
            # Skip non-prefix/suffix mods for now
            generation_type = mod_data.get('generation_type')
            if generation_type not in ['prefix', 'suffix']:
                continue
            
            # Skip mods without stats
            stats = mod_data.get('stats', [])
            if not stats:
                continue
            
            # Get primary stat for grouping
            primary_stat = stats[0]
            stat_id = primary_stat['id']
            
            # Create mod group if it doesn't exist
            if stat_id not in mod_groups:
                mod_groups[stat_id] = {
                    'id': stat_id,
                    'name': self.get_stat_translation(stat_id, stat_translations),
                    'type': generation_type,
                    'tiers': []
                }
            
            # Add this mod as a tier
            tier_data = {
                'mod_id': mod_id,
                'values': {
                    'min': primary_stat.get('min', 0),
                    'max': primary_stat.get('max', 0)
                },
                'spawn_weights': mod_data.get('spawn_weights', []),
                'domain': mod_data.get('domain', ''),
                'group': mod_data.get('group', ''),
                'level_requirement': mod_data.get('required_level', 1)
            }
            
            mod_groups[stat_id]['tiers'].append(tier_data)
        
        # Sort tiers within each group and assign tier numbers
        for group_id, group_data in mod_groups.items():
            # Sort by max value (descending) - T1 should be highest
            group_data['tiers'].sort(key=lambda x: x['values']['max'], reverse=True)
            
            # Assign tier numbers
            for i, tier in enumerate(group_data['tiers']):
                tier['tier'] = f"T{i + 1}"
        
        print(f"✅ Processed {len(mod_groups)} mod groups with {sum(len(g['tiers']) for g in mod_groups.values())} total tiers")
        return mod_groups
    
    def get_stat_translation(self, stat_id: str, stat_translations: Dict = None) -> str:
        """Get human-readable translation for a stat ID."""
        if not stat_translations or stat_id not in stat_translations:
            # Fallback to cleaned up stat ID
            return stat_id.replace('_', ' ').title()
        
        translation_data = stat_translations[stat_id]
        
        # Navigate the translation structure to find English text
        for key, value in translation_data.items():
            if isinstance(value, dict) and 'English' in value:
                english_translations = value['English']
                if isinstance(english_translations, list) and english_translations:
                    return english_translations[0].get('string', stat_id)
        
        return stat_id.replace('_', ' ').title()
    
    def process_item_classes(self, item_classes_data: Dict) -> Dict[str, str]:
        """Process item classes data."""
        if not item_classes_data:
            return {}
        
        processed = {}
        for class_id, class_data in item_classes_data.items():
            if isinstance(class_data, dict) and 'name' in class_data:
                processed[class_id] = class_data['name']
            else:
                processed[class_id] = class_id
        
        print(f"✅ Processed {len(processed)} item classes")
        return processed


class ExtensionBuilder:
    """Main builder class for the PoE Trade Helper extension."""
    
    def __init__(self, version="1.0.0", clean_only=False, no_package=False, fetch_repoe=True):
        self.version = version
        self.clean_only = clean_only
        self.no_package = no_package
        self.fetch_repoe = fetch_repoe
        
        self.project_root = Path(__file__).parent
        self.build_dir = self.project_root / "build"
        self.dist_dir = self.project_root / "dist"
        self.data_dir = self.project_root / "data"
        
        self.repoe_processor = RePoEDataProcessor() if fetch_repoe else None
    
    def clean_directories(self):
        """Clean build and dist directories."""
        print("🧹 Cleaning build directories...")
        
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        
        if self.dist_dir.exists():
            shutil.rmtree(self.dist_dir)
        
        self.build_dir.mkdir(exist_ok=True)
        self.dist_dir.mkdir(exist_ok=True)
        
        print("✅ Directories cleaned")
    
    def copy_extension_files(self):
        """Copy core extension files to build directory."""
        print("📂 Copying extension files...")
        
        files_to_copy = [
            "manifest.json",
            "popup.html",
            "popup.js",
            "content.js",
            "background.js",
            "data-processor.js"
        ]
        
        for filename in files_to_copy:
            src_file = self.project_root / filename
            if src_file.exists():
                shutil.copy2(src_file, self.build_dir / filename)
                print(f"  ✓ {filename}")
            else:
                print(f"  ⚠️ {filename} not found, skipping")
        
        # Update manifest version
        self.update_manifest_version()
        
        print("✅ Extension files copied")
    
    def update_manifest_version(self):
        """Update version in manifest.json."""
        manifest_path = self.build_dir / "manifest.json"
        if manifest_path.exists():
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            manifest['version'] = self.version
            
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            print(f"  ✓ Updated manifest version to {self.version}")
    
    def fetch_and_process_repoe_data(self):
        """Fetch and process RePoE data."""
        if not self.fetch_repoe or not self.repoe_processor:
            print("⏭️ Skipping RePoE data fetch")
            return
        
        print("🌐 Fetching RePoE data...")
        
        # Fetch required data files
        base_items = self.repoe_processor.fetch_repoe_file("base_items.json")
        mods = self.repoe_processor.fetch_repoe_file("mods.json")
        stat_translations = self.repoe_processor.fetch_repoe_file("stat_translations.json")
        item_classes = self.repoe_processor.fetch_repoe_file("item_classes.json")
        tags = self.repoe_processor.fetch_repoe_file("tags.json")
        
        # Process the data
        processed_data = {
            'base_items': self.repoe_processor.process_base_items(base_items),
            'mods': self.repoe_processor.process_mods(mods, stat_translations),
            'item_classes': self.repoe_processor.process_item_classes(item_classes),
            'tags': tags,
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'version': self.version,
                'source': 'repoe-fork.github.io'
            }
        }
        
        # Save processed data
        data_output_dir = self.build_dir / "data"
        data_output_dir.mkdir(exist_ok=True)
        
        for data_type, data_content in processed_data.items():
            output_file = data_output_dir / f"{data_type}.json"
            with open(output_file, 'w') as f:
                json.dump(data_content, f, indent=2)
            print(f"  ✓ Saved {data_type}.json ({len(str(data_content))} chars)")
        
        print("✅ RePoE data processed and saved")
    
    def copy_local_data(self):
        """Copy local data files if RePoE fetch is disabled."""
        if self.fetch_repoe:
            return
        
        print("📁 Copying local data files...")
        
        if not self.data_dir.exists():
            print("  ⚠️ Local data directory not found, creating with mock data")
            self.create_mock_data()
            return
        
        build_data_dir = self.build_dir / "data"
        build_data_dir.mkdir(exist_ok=True)
        
        for data_file in self.data_dir.glob("*.json"):
            shutil.copy2(data_file, build_data_dir / data_file.name)
            print(f"  ✓ {data_file.name}")
        
        print("✅ Local data files copied")
    
    def create_mock_data(self):
        """Create mock data for development."""
        mock_data = {
            'base_items': {
                'crystal-belt': {
                    'name': 'Crystal Belt',
                    'item_class': 'Belt',
                    'required_level': 79,
                    'tags': ['belt', 'default'],
                    'implicits': [],
                    'properties': {}
                },
                'leather-belt': {
                    'name': 'Leather Belt',
                    'item_class': 'Belt',
                    'required_level': 1,
                    'tags': ['belt', 'default'],
                    'implicits': ['life'],
                    'properties': {}
                }
            },
            'mods': {
                'energy_shield_flat': {
                    'id': 'energy_shield_flat',
                    'name': '+# to maximum Energy Shield',
                    'type': 'prefix',
                    'tiers': [
                        {'tier': 'T1', 'values': {'min': 80, 'max': 89}, 'mod_id': 'es_flat_t1'},
                        {'tier': 'T2', 'values': {'min': 70, 'max': 79}, 'mod_id': 'es_flat_t2'}
                    ]
                }
            },
            'item_classes': {
                'Belt': 'Belts',
                'Ring': 'Rings'
            },
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'version': self.version,
                'source': 'mock_data'
            }
        }
        
        data_output_dir = self.build_dir / "data"
        data_output_dir.mkdir(exist_ok=True)
        
        for data_type, data_content in mock_data.items():
            output_file = data_output_dir / f"{data_type}.json"
            with open(output_file, 'w') as f:
                json.dump(data_content, f, indent=2)
        
        print("✅ Mock data created")
    
    def create_icons(self):
        """Create placeholder PNG icons for the extension."""
        print("🎨 Creating extension icons...")
        
        icons_dir = self.build_dir / "icons"
        icons_dir.mkdir(exist_ok=True)
        
        try:
            from PIL import Image, ImageDraw, ImageFont
            use_pil = True
        except ImportError:
            use_pil = False
            print("  ⚠️ PIL not available, creating minimal PNG files")
        
        icon_sizes = [16, 32, 48, 128]
        
        if use_pil:
            # Create proper PNG icons with PIL
            for size in icon_sizes:
                # Create new image with transparent background
                img = Image.new('RGBA', (size, size), (26, 26, 46, 255))  # #1a1a2e background
                draw = ImageDraw.Draw(img)
                
                # Draw circle
                circle_radius = size // 3
                circle_center = size // 2
                circle_bbox = [
                    circle_center - circle_radius,
                    circle_center - circle_radius,
                    circle_center + circle_radius,
                    circle_center + circle_radius
                ]
                draw.ellipse(circle_bbox, fill=(233, 69, 96, 255))  # #e94560
                
                # Draw text "P"
                try:
                    # Try to use a system font
                    font_size = max(size // 4, 8)
                    font = ImageFont.truetype("arial.ttf", font_size)
                except (OSError, IOError):
                    try:
                        # Fallback to default font
                        font = ImageFont.load_default()
                    except:
                        font = None
                
                if font:
                    # Get text size and center it
                    text = "P"
                    bbox = draw.textbbox((0, 0), text, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_height = bbox[3] - bbox[1]
                    text_x = (size - text_width) // 2
                    text_y = (size - text_height) // 2 - 2  # Slight adjustment
                    
                    draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
                
                # Save PNG file
                icon_path = icons_dir / f"icon{size}.png"
                img.save(icon_path, "PNG")
                
        else:
            # Create minimal PNG files without PIL
            # This creates very basic PNG files that Chrome will accept
            for size in icon_sizes:
                # Create a minimal 1x1 pixel PNG and save it
                # This is a base64 encoded 1x1 transparent PNG
                minimal_png_data = bytes([
                    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
                    0x00, 0x00, 0x00, 0x0D,  # IHDR chunk length
                    0x49, 0x48, 0x44, 0x52,  # IHDR
                    0x00, 0x00, 0x00, 0x01,  # Width: 1
                    0x00, 0x00, 0x00, 0x01,  # Height: 1
                    0x08, 0x06, 0x00, 0x00, 0x00,  # Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
                    0x1F, 0x15, 0xC4, 0x89,  # CRC
                    0x00, 0x00, 0x00, 0x0A,  # IDAT chunk length
                    0x49, 0x44, 0x41, 0x54,  # IDAT
                    0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,  # Compressed data
                    0xE2, 0x21, 0xBC, 0x33,  # CRC
                    0x00, 0x00, 0x00, 0x00,  # IEND chunk length
                    0x49, 0x45, 0x4E, 0x44,  # IEND
                    0xAE, 0x42, 0x60, 0x82   # CRC
                ])
                
                icon_path = icons_dir / f"icon{size}.png"
                with open(icon_path, 'wb') as f:
                    f.write(minimal_png_data)
        
        print(f"  ✓ Created PNG icons for sizes: {', '.join(map(str, icon_sizes))}")
        if not use_pil:
            print("  💡 Install Pillow (pip install Pillow) for better quality icons")
        print("✅ Icons created")
    
    def validate_build(self):
        """Validate the build output."""
        print("🔍 Validating build...")
        
        required_files = [
            "manifest.json",
            "popup.html",
            "popup.js",
            "content.js",
            "background.js",
            "data-processor.js"
        ]
        
        missing_files = []
        for filename in required_files:
            if not (self.build_dir / filename).exists():
                missing_files.append(filename)
        
        if missing_files:
            print(f"❌ Missing required files: {', '.join(missing_files)}")
            return False
        
        # Validate manifest
        try:
            with open(self.build_dir / "manifest.json") as f:
                manifest = json.load(f)
            
            required_manifest_keys = ["manifest_version", "name", "version", "permissions"]
            for key in required_manifest_keys:
                if key not in manifest:
                    print(f"❌ Manifest missing required key: {key}")
                    return False
        
        except json.JSONDecodeError:
            print("❌ Invalid manifest.json")
            return False
        
        print("✅ Build validation passed")
        return True
    
    def create_package(self):
        """Create distributable ZIP package."""
        if self.no_package:
            print("⏭️ Skipping package creation")
            return
        
        print("📦 Creating extension package...")
        
        package_name = f"poe-trade-helper-v{self.version}.zip"
        package_path = self.dist_dir / package_name
        
        with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in self.build_dir.rglob('*'):
                if file_path.is_file():
                    arc_name = file_path.relative_to(self.build_dir)
                    zipf.write(file_path, arc_name)
        
        file_size = package_path.stat().st_size / 1024  # KB
        print(f"✅ Package created: {package_name} ({file_size:.1f} KB)")
    
    def build(self):
        """Execute the complete build process."""
        print(f"🚀 Building PoE Trade Helper Extension v{self.version}")
        print(f"📅 Build started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            # Clean directories
            self.clean_directories()
            
            if self.clean_only:
                print("✅ Clean-only build completed")
                return
            
            # Copy core files
            self.copy_extension_files()
            
            # Handle data
            if self.fetch_repoe:
                self.fetch_and_process_repoe_data()
            else:
                self.copy_local_data()
            
            # Create icons
            self.create_icons()
            
            # Validate build
            if not self.validate_build():
                print("❌ Build validation failed")
                sys.exit(1)
            
            # Create package
            self.create_package()
            
            print("🎉 Build completed successfully!")
            print(f"📂 Build output: {self.build_dir}")
            if not self.no_package:
                print(f"📦 Package output: {self.dist_dir}")
        
        except Exception as e:
            print(f"❌ Build failed: {e}")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Build PoE Trade Helper Extension")
    parser.add_argument("--version", default="1.0.0", help="Extension version")
    parser.add_argument("--clean-only", action="store_true", help="Only clean directories")
    parser.add_argument("--no-package", action="store_true", help="Skip ZIP package creation")
    parser.add_argument("--no-repoe", action="store_true", help="Skip RePoE data fetch")
    parser.add_argument("--offline", action="store_true", help="Build without internet (implies --no-repoe)")
    
    args = parser.parse_args()
    
    # Handle offline mode
    if args.offline:
        args.no_repoe = True
        print("🔌 Offline mode enabled")
    
    builder = ExtensionBuilder(
        version=args.version,
        clean_only=args.clean_only,
        no_package=args.no_package,
        fetch_repoe=not args.no_repoe
    )
    
    builder.build()


if __name__ == "__main__":
    main()