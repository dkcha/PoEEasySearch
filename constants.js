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
    // NEW: COUNT mode selectors
    STAT_FILTER_EDIT_BUTTON: [
      ".search-advanced-pane.brown .btn.edit-btn",
      ".search-advanced-pane .btn.edit-btn",
      ".stat-filters .btn.edit-btn",
    ],
    STAT_FILTER_MODE_DROPDOWN: [
      ".search-advanced-pane.brown select",
      ".stat-filters select",
    ],
    COUNT_VALUE_INPUT: [
      ".search-advanced-pane.brown input[type='number']",
      ".stat-filters input[type='number']",
    ],
  },
  JEWEL_MAPPINGS: {
    murderous: "Murderous Eye Jewel",
    searching: "Searching Eye Jewel",
    hypnotic: "Hypnotic Eye Jewel",
    ghastly: "Ghastly Eye Jewel",
  },
  GITHUB_URLS: {
    BASE_URL:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/",
    ALL_ABYSS_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/all_abyss_jewel_mods.json",
  },
  // NEW: Search mode configuration
  SEARCH_MODES: {
    AND: "and",
    COUNT: "count",
  },
  // NEW: Count mode settings
  COUNT_SETTINGS: {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    DEFAULT_VALUE: 3,
  },
};
