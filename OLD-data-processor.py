import json
import os
import re
from collections import defaultdict

class RePoEDataProcessor:
    def __init__(self, data_path):
        self.data_path = data_path
        self.base_items = {}
        self.mods = {}
        self.mods_by_base = {}
        self.processed_data = {
            'baseItems': {},
            'mods': {},
            'modsByBase': {},
            'tierMappings': {}
        }
    
    def load_json(self, filename):
        """Load JSON file from data directory"""
        path = os.path.join(self.data_path, filename)
        with open(path, 'utf-8') as f:
            return json.load(f)
    
    def extract_stat_ranges(self, stat_text):
        """Extract min/max ranges from stat text like '+(10-20) to maximum Life'"""
        if not stat_text:
            return None, None
            
        # Look for patterns like (10-20) or (#-#)
        range_match = re.search(r'\((\d+)-(\d+)\)', stat_text)
        if range_match:
            return int(range_match.group(1)), int(range_match.group(2))
        
        # Look for single values like +20 to maximum Life
        single_match = re.search(r'[+\-]?(\d+)', stat_text)
        if single_match:
            val = int(single_match.group(1))
            return val, val
            
        return None, None
    
    def normalize_item_name(self, name):
        """Convert item name to consistent format for lookups"""
        return re.sub(r'[^a-zA-Z0-9]', '-', name.lower()).strip('-')
    
    def determine_mod_tier(self, mod_group_mods, mod_key):
        """Determine tier based on mod's position in spawn weight order"""
        # Sort by spawn weight (higher weight = better tier = lower tier number)
        sorted_mods = sorted(mod_group_mods.items(), key=lambda x: x[1], reverse=True)
        
        for i, (mod_id, weight) in enumerate(sorted_mods):
            if mod_id == mod_key:
                return i + 1  # Tier 1 is best, tier 2 is second best, etc.
        return len(sorted_mods)  # Default to worst tier
    
    def process_base_items(self):
        """Process base_items.json into usable format"""
        print("🔍 Processing base items...")
        
        base_items_raw = self.load_json('base_items.json')
        
        for item_key, item_data in base_items_raw.items():
            # Only process released items
            if item_data.get('release_state') != 'released':
                continue
                
            normalized_key = self.normalize_item_name(item_data.get('name', ''))
            
            self.processed_data['baseItems'][normalized_key] = {
                'name': item_data.get('name'),
                'display_name': item_data.get('name'),
                'item_class': item_data.get('item_class'),
                'domain': item_data.get('domain'),
                'tags': item_data.get('tags', []),
                'inherits_from': item_data.get('inherits_from', []),
                'original_key': item_key
            }
    
    def process_mods(self):
        """Process mods.json into usable format with tier information"""
        print("🔍 Processing mods...")
        
        mods_raw = self.load_json('mods.json')
        mods_by_base_raw = self.load_json('mods_by_base.json')
        
        # First pass: collect all mod data
        for mod_key, mod_data in mods_raw.items():
            mod_name = mod_data.get('name', '')
            mod_text = mod_data.get('text', '')
            
            # Extract stat information
            stats = mod_data.get('stats', [])
            stat_text = mod_text
            min_val, max_val = self.extract_stat_ranges(stat_text)
            
            self.processed_data['mods'][mod_key] = {
                'name': mod_name,
                'text': mod_text,
                'domain': mod_data.get('domain'),
                'generation_type': mod_data.get('generation_type'),
                'group': mod_data.get('group'),
                'spawn_weights': mod_data.get('spawn_weights', []),
                'stats': stats,
                'stat_text': stat_text,
                'base_min': min_val,
                'base_max': max_val
            }
        
        # Second pass: create tier mappings from mods_by_base
        for domain, domain_data in mods_by_base_raw.items():
            if domain not in self.processed_data['modsByBase']:
                self.processed_data['modsByBase'][domain] = {}
                
            for tag_combo, tag_data in domain_data.items():
                mod_entries = tag_data.get('mods', {})
                
                if tag_combo not in self.processed_data['modsByBase'][domain]:
                    self.processed_data['modsByBase'][domain][tag_combo] = {
                        'mods': {},
                        'tier_mappings': {}
                    }
                
                # Process each mod type (prefix, suffix, corrupted, etc.)
                for mod_type, mod_groups in mod_entries.items():
                    tier_mappings = {}
                    
                    for group_name, group_mods in mod_groups.items():
                        # Sort mods by spawn weight to determine tiers
                        sorted_mods = sorted(group_mods.items(), key=lambda x: x[1], reverse=True)
                        
                        # Assign tiers (T1 = highest weight = best)
                        for tier_index, (mod_id, spawn_weight) in enumerate(sorted_mods):
                            tier_num = tier_index + 1
                            tier_label = f"T{tier_num}"
                            
                            if mod_id in self.processed_data['mods']:
                                mod_data = self.processed_data['mods'][mod_id]
                                
                                tier_mappings[mod_id] = {
                                    'tier': tier_num,
                                    'tier_label': tier_label,
                                    'spawn_weight': spawn_weight,
                                    'group': group_name,
                                    'min': mod_data.get('base_min'),
                                    'max': mod_data.get('base_max'),
                                    'name': mod_data.get('name'),
                                    'text': mod_data.get('text')
                                }
                    
                    self.processed_data['modsByBase'][domain][tag_combo]['tier_mappings'][mod_type] = tier_mappings
                    self.processed_data['modsByBase'][domain][tag_combo]['mods'][mod_type] = mod_entries[mod_type]
    
    def create_searchable_mod_index(self):
        """Create a searchable index of mods for the frontend"""
        print("🔍 Creating searchable mod index...")
        
        mod_index = {}
        
        for domain, domain_data in self.processed_data['modsByBase'].items():
            for tag_combo, tag_data in domain_data.items():
                for mod_type, tier_mappings in tag_data.get('tier_mappings', {}).items():
                    for mod_id, tier_data in tier_mappings.items():
                        mod_name = tier_data.get('name', '').lower()
                        
                        # Create searchable entries
                        search_terms = [
                            mod_name,
                            tier_data.get('text', '').lower(),
                            tier_data.get('group', '').lower()
                        ]
                        
                        # Add variations
                        if 'life' in mod_name:
                            search_terms.extend(['hp', 'health'])
                        if 'energy shield' in mod_name:
                            search_terms.extend(['es'])
                        if 'resistance' in mod_name:
                            search_terms.extend(['res'])
                        
                        for term in search_terms:
                            if term and term not in mod_index:
                                mod_index[term] = []
                            
                            if term:
                                mod_index[term].append({
                                    'mod_id': mod_id,
                                    'name': tier_data['name'],
                                    'text': tier_data['text'],
                                    'domain': domain,
                                    'tags': tag_combo,
                                    'type': mod_type,
                                    'tiers_available': self.get_available_tiers(domain, tag_combo, mod_type, tier_data['group'])
                                })
        
        self.processed_data['modIndex'] = mod_index
    
    def get_available_tiers(self, domain, tag_combo, mod_type, group_name):
        """Get all available tiers for a mod group"""
        tiers = {}
        
        tier_mappings = self.processed_data['modsByBase'].get(domain, {}).get(tag_combo, {}).get('tier_mappings', {}).get(mod_type, {})
        
        for mod_id, tier_data in tier_mappings.items():
            if tier_data.get('group') == group_name:
                tier_label = tier_data['tier_label']
                tiers[tier_label] = {
                    'min': tier_data.get('min'),
                    'max': tier_data.get('max'),
                    'tier': tier_data.get('tier')
                }
        
        return tiers
    
    def create_base_to_mods_mapping(self):
        """Create mapping from base items to their available mods"""
        print("🔍 Creating base item to mods mapping...")
        
        base_to_mods = {}
        
        for base_key, base_data in self.processed_data['baseItems'].items():
            base_tags = set(base_data.get('tags', []))
            base_domain = base_data.get('domain')
            
            available_mods = []
            
            # Find matching mod groups based on tags and domain
            if base_domain in self.processed_data['modsByBase']:
                for tag_combo, tag_data in self.processed_data['modsByBase'][base_domain].items():
                    # Check if base item tags match the tag combination
                    required_tags = set(tag_combo.split(',')) if ',' in tag_combo else {tag_combo}
                    
                    if required_tags.issubset(base_tags):
                        tier_mappings = tag_data.get('tier_mappings', {})
                        
                        for mod_type, mods in tier_mappings.items():
                            for mod_id, tier_data in mods.items():
                                available_mods.append({
                                    'mod_id': mod_id,
                                    'name': tier_data['name'],
                                    'text': tier_data['text'],
                                    'type': mod_type,
                                    'group': tier_data['group'],
                                    'tier': tier_data['tier'],
                                    'tier_label': tier_data['tier_label'],
                                    'min': tier_data.get('min'),
                                    'max': tier_data.get('max')
                                })
            
            base_to_mods[base_key] = available_mods
        
        self.processed_data['baseToMods'] = base_to_mods
    
    def generate_poe_trade_stat_ids(self):
        """Generate mapping to PoE trade stat IDs (you'll need to map these manually)"""
        print("🔍 Generating PoE trade stat ID mappings...")
        
        # This is a placeholder - you'd need to manually map these or scrape them
        # from the PoE trade site's API endpoints
        stat_id_mappings = {
            'IncreasedLife': 'pseudo.pseudo-total-life',
            'IncreasedEnergyShield': 'pseudo.pseudo-total-energy-shield', 
            'IncreasedPhysicalDamage': 'explicit.stat_1509134228',
            # Add more mappings as needed
        }
        
        self.processed_data['statIdMappings'] = stat_id_mappings
    
    def save_processed_data(self, output_path):
        """Save all processed data to JSON files"""
        print("💾 Saving processed data...")
        
        os.makedirs(output_path, exist_ok=True)
        
        # Save individual files
        with open(os.path.join(output_path, 'processed_base_items.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data['baseItems'], f, indent=2, ensure_ascii=False)
        
        with open(os.path.join(output_path, 'processed_mods.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data['mods'], f, indent=2, ensure_ascii=False)
        
        with open(os.path.join(output_path, 'mods_by_base_processed.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data['modsByBase'], f, indent=2, ensure_ascii=False)
        
        with open(os.path.join(output_path, 'mod_search_index.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data['modIndex'], f, indent=2, ensure_ascii=False)
        
        with open(os.path.join(output_path, 'base_to_mods.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data['baseToMods'], f, indent=2, ensure_ascii=False)
        
        with open(os.path.join(output_path, 'stat_id_mappings.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data['statIdMappings'], f, indent=2, ensure_ascii=False)
        
        # Save complete dataset
        with open(os.path.join(output_path, 'complete_processed_data.json'), 'w', encoding='utf-8') as f:
            json.dump(self.processed_data, f, indent=2, ensure_ascii=False)
    
    def process_all(self, output_path):
        """Run the complete processing pipeline"""
        print("🚀 Starting RePoE data processing...")
        
        self.process_base_items()
        self.process_mods()
        self.create_searchable_mod_index()
        self.create_base_to_mods_mapping()
        self.generate_poe_trade_stat_ids()
        self.save_processed_data(output_path)
        
        print("✅ Processing complete!")
        print(f"📊 Processed {len(self.processed_data['baseItems'])} base items")
        print(f"📊 Processed {len(self.processed_data['mods'])} mods")
        print(f"📊 Created {len(self.processed_data['modIndex'])} searchable mod terms")

def main():
    # Configuration
    DATA_PATH = "data"  # Path to your RePoE data files
    OUTPUT_PATH = "processed_data"  # Where to save processed files
    
    processor = RePoEDataProcessor(DATA_PATH)
    processor.process_all(OUTPUT_PATH)

if __name__ == "__main__":
    main()
            