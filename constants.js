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
    STAT_FILTER_EDIT_BUTTON: [
      ".search-advanced-pane.brown .btn.edit-btn",
      ".search-advanced-pane .btn.edit-btn",
      ".stat-filters .btn.edit-btn",
    ],
    STAT_FILTER_MODE_DROPDOWN: [
      ".multiselect.filter-select.filter-select-title.filter-select-mutate.multiselect--active",
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
  JEWEL_TYPE_CONFIG: {
    murderous: {
      displayName: "Murderous Eye Jewel",
      domain: "abyss_jewel",
      tags: ["abyss_jewel_melee"],
    },
    searching: {
      displayName: "Searching Eye Jewel",
      domain: "abyss_jewel",
      tags: ["abyss_jewel_ranged"],
    },
    hypnotic: {
      displayName: "Hypnotic Eye Jewel",
      domain: "abyss_jewel",
      tags: ["abyss_jewel_caster"],
    },
    ghastly: {
      displayName: "Ghastly Eye Jewel",
      domain: "abyss_jewel",
      tags: ["abyss_jewel_summoner"],
    },
  },
  GITHUB_URLS: {
    BASE_URL:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/",
    ALL_ABYSS_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/all_abyss_jewel_mods.json",
  },
  SEARCH_MODES: {
    AND: "and",
    COUNT: "count",
    WEIGHTED_SUM: "weighted_sum",
    WEIGHTED_SUM_V2: "weighted_sum_v2",
    NOT: "not",
    IF: "if",
  },
  COUNT_SETTINGS: {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    DEFAULT_VALUE: 3,
  },
  SEARCH_MODE_LABELS: {
    and: "All Mods (AND)",
    count: "At Least X (COUNT)",
    weighted_sum_v2: "Weighted Sum v2",
    not: "NOT",
    if: "IF",
  },
};
