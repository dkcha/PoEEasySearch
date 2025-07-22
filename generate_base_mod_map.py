import json
import os
import re
from collections import defaultdict

# Paths
BASE_PATH = os.path.dirname(__file__)
BASE_ITEMS_PATH = os.path.join(BASE_PATH, "data", "base_items.json")
MODS_PATH = os.path.join(BASE_PATH, "data", "mods.json")
MODS_BY_BASE_PATH = os.path.join(BASE_PATH, "data", "mods_by_base.json")
OUTPUT_PATH = os.path.join(BASE_PATH, "output", "class_base_mods.json")
MOD_MAP_OUTPUT_PATH = os.path.join(BASE_PATH, "output", "mod_tiers.json")

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def tags_joiner(tags):
    return ",".join(tags) if tags else ""

def split_by_capital_letters(text):
    return re.sub(r'(?=[A-Z])', ' ', text + 's').strip()

# Converts all text containing (...) to simply # for genericizing mod texts
def genericize_mod_text(mod_text):
    return re.sub(r"\(.*?\)", "#", mod_text)

def main():
    base_items = load_json(BASE_ITEMS_PATH)
    mods = load_json(MODS_PATH)
    mods_by_base = load_json(MODS_BY_BASE_PATH)

    print("🔍 Processing item and mod data...")

    result = {}
    items_by_class = defaultdict(lambda: defaultdict(dict))
    mods_by_tier = defaultdict(lambda: defaultdict(dict))

    # Build the base structure for released abyss jewels
    for base_key, base in base_items.items():
        if base.get("domain") != "abyss_jewel":
            continue

        item_class = split_by_capital_letters(base.get("item_class"))
        base_name = base.get("name")
        base_tags = tags_joiner(base.get("tags", []))
        released = base.get("release_state") == "released"

        if not item_class or not base_name or not base_tags or not released:
            continue

        if not items_by_class[item_class][base_tags].get("bases"):
            items_by_class[item_class][base_tags]["bases"] = []

        new_entry = {
            "full_name": base_key,
            "base_name": base_name,
            "released": released,
            "inherits_from": base.get("inherits_from", [])
        }

        items_by_class[item_class][base_tags]["bases"].append(new_entry)

    # Attach mod lists to each base group and collect group tier weights
    for domain, domain_data in mods_by_base.items():
        if domain not in items_by_class:
            continue

        for tag_combo, tag_data in domain_data.items():
            mod_entries = tag_data.get("mods", {}) 
            items_by_class[domain][tag_combo]["mods"] = mod_entries

            for mod_type, mods_list in mod_entries.items():
                # mod_type = corrupted, prefix, suffix, etc.
                mods_by_tier[mod_type] = defaultdict(lambda: defaultdict(list))

                for mod_group in mods_list:
                    # mod_group = "AvoidIgnite", "AvoidShock", etc.
                    num_mods = len(mods_list.get(mod_group, []))
                    for mod in mods_list.get(mod_group):
                        # mod = "V2AvoidIgniteAbyssalJewelCorrupted": 1000
                        #       "AbyssJewelAddedLife1": 3000,
                        #       "AbyssJewelAddedLife2": 3000,
                        #       "AbyssJewelAddedLife3": 1000,
                        #       "AbyssJewelAddedLife4": 500


                        # Create the tier mapping here for the mod

                        mod_data = mods.get(mod)
                        stats = mod_data.get("stats", 0)
                        mod_text = mod_data.get("text")
                        genericized_mod_text = genericize_mod_text(mod_text)
                        

                        # Create empty list if not exists
                        items_by_class[domain][tag_combo].setdefault("mods_by_tiers", [])

                        items_by_class[domain][tag_combo]["mods_by_tiers"].append({
                            "id": mod,
                            "text": mod_text,
                            "genericized_text": genericized_mod_text,
                            "stats": stats,
                            "tier": num_mods,  # Using num_mods as tier for now
                            # maybe insert tier here later
                        })
                        num_mods -= 1

    # Write final output
    with open(OUTPUT_PATH, "w", encoding='utf-8') as f:
        json.dump(items_by_class, f, indent=2, ensure_ascii=False)

    print(f"✅ Mod map successfully written to: {OUTPUT_PATH}")

    # with open(MOD_MAP_OUTPUT_PATH, "w", encoding="utf-8") as f:
    #     json.dump(tier_map, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Mod map successfully written to: {MOD_MAP_OUTPUT_PATH}")

if __name__ == "__main__":
    main()
