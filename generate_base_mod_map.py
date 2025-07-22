import json
import os
import re # needed for regex operations
from collections import defaultdict

# Paths
BASE_PATH = os.path.dirname(__file__)
BASE_ITEMS_PATH = os.path.join(BASE_PATH, "data", "base_items.json")
MODS_PATH = os.path.join(BASE_PATH, "data", "mods.json")
MODS_BY_BASE_PATH = os.path.join(BASE_PATH, "data", "mods_by_base.json")
OUTPUT_PATH = os.path.join(BASE_PATH, "output", "class_base_mods.json")

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def is_natural_mod(mod):
    # Only natural prefix/suffix mods
    return (
        mod.get("generation_type") in (1, 2) and  # prefix/suffix
        not mod.get("is_essence_only", False) and
        not mod.get("is_atlas_base", False) and
        not mod.get("is_corrupted", False) and
        not mod.get("is_enchant", False) and
        not mod.get("is_temporary", False) and
        not mod.get("is_veiled", False) and
        not mod.get("is_crafted", False) and
        not mod.get("is_pseudo", False)
    )

def mod_matches_base(mod, base_tags):
    spawn_tags = mod.get("spawn_weights", [])
    if not spawn_tags:
        return False
    return any(weight["tag"] in base_tags and weight["weight"] > 0 for weight in spawn_tags)

def get_mod_tier_values(mod):
    tier = "1"
    stats = mod.get("stats", [])
    stat_range = {}

    for stat in stats:
        min_val = stat.get("min")
        max_val = stat.get("max")
        if min_val is not None and max_val is not None:
            stat_range["min"] = min_val
            stat_range["max"] = max_val

    return {tier: stat_range} if stat_range else None

def tags_joiner(tags):
    if not tags:
        return ""
    return ",".join((tags))

def split_by_capital_letters(text):
  """
  Splits a string into a list of substrings, where each substring starts with a capital letter.
  """
  # The pattern [A-Z][^A-Z]* matches an uppercase letter followed by zero or more non-uppercase letters.
  spaced_string = re.sub(r'(?=[A-Z])', ' ', text + 's')
  
  # Remove any leading space that might be added if the string starts with a capital letter
  return spaced_string.strip()

def main():
    base_items = load_json(BASE_ITEMS_PATH)
    mods = load_json(MODS_PATH)
    mods_by_base = load_json(MODS_BY_BASE_PATH)

    print("Base Path: " + str(BASE_PATH))
    print("Base item path: " + str(BASE_ITEMS_PATH))
    print("Mods path: " + str(MODS_PATH))
    print("Output path: " + str(OUTPUT_PATH))
    print("Mods by base path: " + str(MODS_BY_BASE_PATH))

    # base_items = [b for b in base_items if b.get("domain") == "item"]
    # if not base_items:
    #     print("⚠️ No base items found with domain 'item'")
    #     return

    # Filter only natural mods
    # natural_mods = [mod for mod in mods if is_natural_mod(mod)]
    # if not natural_mods:
    #     print("⚠️ No natural mods found")
    #     return

    result = {}

    items_by_class = defaultdict(lambda: defaultdict(dict)) 

    # mods can spawn on items based on their "spawn_weights" like "dex_int_armour" which is located
    # under base_tags in base_items


    # Start with basic abyss jewel items
    for base_key, base in base_items.items():
        if base.get("domain") != "abyss_jewel":
            continue

        item_class = split_by_capital_letters(base.get("item_class"))
        base_name = base.get("name")
        base_tags = tags_joiner(base.get("tags", []))
        #is_essence = base.get("is_essence_only", False)
        released = True if base.get("release_state") == "released" else False

        if not item_class or not base_name or not base_tags or not released:
            continue

        # Item class mapping -> { "Helmet": "dex_armour,helmet,...", "int_armour,top_tier_base_item_type, ..." } 
        if not items_by_class[item_class][base_tags].get("bases"):
            items_by_class[item_class][base_tags]["bases"] = []

        # Create a new entry for the item and ensure it doesn't get overwritten
        new_entry = {
            "full_name": base_key,
            "base_name": base_name,
            # "is_essence": is_essence,
            "released": released,
            "inherits_from": base.get("inherits_from", [])
        }

        items_by_class[item_class][base_tags]["bases"].append(new_entry)


    for domain, domain_data in mods_by_base.items():
        if domain not in items_by_class:
            continue

        for key in domain_data:
            # print(key) "sword,two_hand_weapon,twohand,weapon,default"
            # print(domain_data[key]) "bases": [...], "mods": [...]
            items_by_class[domain][key]["mods"] = domain_data[key].get("mods", [])

     
        # Create mapping for item types -> mods that can spawn
        # dict["dex_int_armour"] = {"key": "LocalBaseEvasionRatingAndEnergyShield1", "stats": [...] }

        # for mod in natural_mods:
        #     if not mod_matches_base(mod, base_tags):
        #         continue

        #     mod_name = mod.get("name")
        #     if not mod_name:
        #         continue

        #     tier_values = get_mod_tier_values(mod)
        #     if not tier_values:
        #         continue

        #     # Build nested dictionary
        #     result.setdefault(item_class, {}).setdefault(base_name, {})[mod_name] = {
        #         tier: {**values, "mod_id": mod["id"]}
        #         for tier, values in tier_values.items()
        #     }


    with open(OUTPUT_PATH, "w", encoding='utf-8') as f:
        #json.dump(result, f, indent=2, ensure_ascii=False)
        json.dump(items_by_class, f, indent=2, ensure_ascii=False)

    print(f"✅ Mod map successfully written to: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
