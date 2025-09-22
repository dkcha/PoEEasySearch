// === CONFIGURATION ===
const CONFIG = {
  SELECTORS: {
    BASE_ITEM_SEARCH: [
      '.search-select input[placeholder="Search Items..."]',
      '.multiselect.search-select input[type="text"]',
      'input[placeholder="Search Items..."]',
    ],
    STAT_FILTER_INPUT: [
      '.search-advanced-pane.brown input[placeholder*="Add Stat Filter"]',
      '.filter-select-mutate input[type="text"]',
      '.search-advanced-pane input[placeholder*="Add Stat Filter"]',
    ],
    BASE_ITEM_OPTIONS:
      ".search-select .multiselect__option:not(.multiselect__option--disabled)",
    STAT_FILTER_OPTIONS:
      ".search-advanced-pane.brown .multiselect__option:not(.multiselect__option--disabled)",
    ADD_STAT_BUTTON: [
      ".search-advanced-pane.brown .filter-select-mutate",
      '.search-advanced-pane.brown input[placeholder*="Add Stat Filter"]',
      '.search-advanced-pane input[placeholder*="Add Stat Filter"]',
    ],
  },
  JEWEL_MAPPINGS: {
    murderous: "Murderous Eye Jewel",
    searching: "Searching Eye Jewel",
    hypnotic: "Hypnotic Eye Jewel",
    ghastly: "Ghastly Eye Jewel",
  },
  GITHUB_URLS: {
    ALL_ABYSS_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/all_abyss_jewel_mods.json",
  },
};
