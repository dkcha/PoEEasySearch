// === CONFIGURATION ===
const CONFIG = {
  JEWEL_MAPPINGS: {
    murderous: "Murderous Eye Jewel",
    searching: "Searching Eye Jewel",
    hypnotic: "Hypnotic Eye Jewel",
    ghastly: "Ghastly Eye Jewel",
  },
  SELECTORS: {
    BASE_ITEM_SEARCH: [
      '.search-select input[type="text"]',
      'input[placeholder*="Search Items"]',
      ".multiselect__input",
    ],
    STAT_FILTER_SECTION: [".search-advanced-pane.brown", ".filter-group-body"],
    ADD_STAT_INPUT: [
      'input[placeholder="+ Add Stat Filter"]',
      '.multiselect__input[placeholder*="Add Stat Filter"]',
    ],
    STAT_DROPDOWN_OPTIONS: [
      ".multiselect__option",
      "li.multiselect__element .multiselect__option",
    ],
    FILTER_CONTAINERS: [
      ".filter-group-body .filter.full-span",
      ".filter.full-span",
    ],
  },
  GITHUB_URLS: {
    JEWEL_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/abyss_jewel_mods.json",
    STATIC_MODS:
      "https://raw.githubusercontent.com/dkcha/PoEEasySearch/refs/heads/main/data/mods.json",
  },
};

// Speed configuration
const SPEED_MULTIPLIER = 0.3;

const BASE_TIMING = {
  BETWEEN_MODS: 600,
  DROPDOWN_WAIT: 400,
  TYPING_CHAR: 30,
  CLICK_DELAY: 100,
  INPUT_FOCUS: 80,
  SCROLL_WAIT: 100,
  VERIFY_WAIT: 500,
  INITIAL_WAIT: 1000,
};
