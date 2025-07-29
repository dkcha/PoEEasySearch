// Content script for Path of Exile trade site auto-fill
(function () {
  "use strict";

  // Trade site field selectors (these may need to be updated based on actual site structure)
  const SELECTORS = {
    // Base item search
    itemName: 'input[placeholder="Enter name or base"]',
    itemNameSuggestion: ".search-suggestion-item",

    // Item filters
    itemLevelMin: 'input[placeholder="Min"]',
    itemLevelMax: 'input[placeholder="Max"]',
    qualityMin: 'input[data-field="q.min"]',
    qualityMax: 'input[data-field="q.max"]',

    // Checkboxes
    corrupted: 'input[data-field="corrupted"]',
    fractured: 'input[data-field="fractured"]',
    synthesised: 'input[data-field="synthesised"]',

    // Stats section
    statsContainer: ".search-advanced-items",
    addStatButton: ".search-advanced-add",
    statDropdown: ".search-select-dropdown",
    statInput: 'input[placeholder="Enter stat here"]',
    statMinValue: 'input[data-field="stat.min"]',
    statMaxValue: 'input[data-field="stat.max"]',

    // Price filters
    priceContainer: ".price-filter",
    priceMin: 'input[data-field="price.min"]',
    priceMax: 'input[data-field="price.max"]',
    priceCurrency: 'select[data-field="price.currency"]',

    // Search button
    searchButton: ".btn-search",
    searchSubmit: 'button[type="submit"]',
  };

  // Mod name mappings from extension format to trade site format
  const MOD_NAME_MAPPINGS = {
    energy_shield_flat: "+# to maximum Energy Shield",
    energy_shield_percent: "#% increased Energy Shield",
    life_flat: "+# to maximum Life",
    resistances_all: "+#% to all Resistances",
    melee_damage: "#% increased Melee Damage",
    added_life_jewel: "+# to maximum Life",
    attack_speed: "#% increased Attack Speed",
    damage_percent: "#% increased Damage",
    life_percent: "#% increased maximum Life",
  };

  // Tier value mappings (will be populated from RePoE data)
  const TIER_VALUES = {
    energy_shield_flat: {
      T1: { min: 80, max: 89 },
      T2: { min: 70, max: 79 },
      T3: { min: 60, max: 69 },
      T4: { min: 50, max: 59 },
      T5: { min: 40, max: 49 },
    },
    life_flat: {
      T1: { min: 90, max: 99 },
      T2: { min: 80, max: 89 },
      T3: { min: 70, max: 79 },
      T4: { min: 60, max: 69 },
      T5: { min: 50, max: 59 },
    },
    energy_shield_percent: {
      T1: { min: 18, max: 20 },
      T2: { min: 15, max: 17 },
      T3: { min: 12, max: 14 },
      T4: { min: 9, max: 11 },
      T5: { min: 6, max: 8 },
    },
  };

  // Main message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fillTradeForm") {
      fillTradeForm(request.configuration)
        .then((result) => sendResponse({ success: true, result }))
        .catch((error) => {
          console.error("Auto-fill error:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
    }
  });

  // Main function to fill the trade form
  async function fillTradeForm(config) {
    console.log("Starting trade form auto-fill with config:", config);

    try {
      // Wait for page to be ready
      await waitForElement("body");

      // Clear existing search first
      await clearExistingSearch();

      // Fill base item
      if (config.baseItem) {
        await fillBaseItem(config.baseItem);
      }

      // Fill item properties
      await fillItemProperties(config);

      // Fill mods
      if (config.mods && config.mods.length > 0) {
        await fillMods(config.mods);
      }

      // Fill price range
      if (config.price && (config.price.min || config.price.max)) {
        await fillPriceRange(config.price);
      }

      // Optional: Auto-submit the search
      // await submitSearch();

      return { message: "Form filled successfully" };
    } catch (error) {
      console.error("Error filling trade form:", error);
      throw error;
    }
  }

  // Utility function to wait for elements
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // Clear existing search parameters
  async function clearExistingSearch() {
    // Look for clear/reset button
    const clearButton = document.querySelector(
      '[data-clear="true"], .btn-clear, .search-clear'
    );
    if (clearButton) {
      clearButton.click();
      await sleep(500);
    }
  }

  // Fill base item selection
  async function fillBaseItem(baseItemId) {
    const itemNameInput = await waitForElement(SELECTORS.itemName, 3000);

    // Map base item ID to display name
    const baseItemNames = {
      "twilight-regalia": "Twilight Regalia",
      "abyss-jewel-melee": "Abyss Jewel",
      "cobalt-jewel": "Cobalt Jewel",
      "searching-eye-jewel": "Searching Eye Jewel",
    };

    const itemName = baseItemNames[baseItemId] || baseItemId;

    // Clear and type item name
    itemNameInput.value = "";
    itemNameInput.focus();
    await typeText(itemNameInput, itemName);

    // Wait for and select from dropdown suggestions
    await sleep(1000);
    const suggestion = document.querySelector(SELECTORS.itemNameSuggestion);
    if (suggestion) {
      suggestion.click();
      await sleep(500);
    }
  }

  // Fill item properties (level, quality, corrupted, etc.)
  async function fillItemProperties(config) {
    // Item level range
    if (config.itemLevel.min || config.itemLevel.max) {
      const levelSection = await findOrExpandSection("Item Level");
      if (config.itemLevel.min) {
        const minInput = levelSection.querySelector(
          'input[placeholder*="Min"]'
        );
        if (minInput) fillInput(minInput, config.itemLevel.min);
      }
      if (config.itemLevel.max) {
        const maxInput = levelSection.querySelector(
          'input[placeholder*="Max"]'
        );
        if (maxInput) fillInput(maxInput, config.itemLevel.max);
      }
    }

    // Quality range
    if (config.quality.min || config.quality.max) {
      const qualitySection = await findOrExpandSection("Quality");
      if (config.quality.min) {
        const minInput = qualitySection.querySelector(
          'input[placeholder*="Min"]'
        );
        if (minInput) fillInput(minInput, config.quality.min);
      }
      if (config.quality.max) {
        const maxInput = qualitySection.querySelector(
          'input[placeholder*="Max"]'
        );
        if (maxInput) fillInput(maxInput, config.quality.max);
      }
    }

    // Checkboxes
    if (config.corrupted) {
      await toggleCheckbox("corrupted", true);
    }
    if (config.fractured) {
      await toggleCheckbox("fractured", true);
    }
    if (config.synthesised) {
      await toggleCheckbox("synthesised", true);
    }
  }

  // Fill explicit mods
  async function fillMods(mods) {
    const statsSection = await findOrExpandSection("Stats");

    for (const mod of mods) {
      await addStatFilter(mod);
      await sleep(800); // Wait between adding stats
    }
  }

  // Add a single stat filter
  async function addStatFilter(mod) {
    // Click "Add" button to add new stat
    const addButton = document.querySelector(SELECTORS.addStatButton);
    if (addButton) {
      addButton.click();
      await sleep(500);
    }

    // Find the newly added stat row (usually the last one)
    const statRows = document.querySelectorAll(".search-advanced-item");
    const newRow = statRows[statRows.length - 1];

    if (!newRow) {
      throw new Error("Could not find new stat row");
    }

    // Fill stat name
    const statInput = newRow.querySelector('input[placeholder*="stat"]');
    if (statInput) {
      const modName = MOD_NAME_MAPPINGS[mod.id] || mod.name;
      await typeText(statInput, modName);
      await sleep(1000);

      // Select from dropdown
      const suggestion = document.querySelector(".search-suggestion-item");
      if (suggestion) {
        suggestion.click();
        await sleep(300);
      }
    }

    // Fill min/max values based on tier
    const tierValues = TIER_VALUES[mod.id];
    if (tierValues && tierValues[mod.tier]) {
      const { min, max } = tierValues[mod.tier];

      const minInput = newRow.querySelector('input[data-field*="min"]');
      const maxInput = newRow.querySelector('input[data-field*="max"]');

      if (minInput) fillInput(minInput, min);
      if (maxInput) fillInput(maxInput, max);
    }
  }

  // Fill price range
  async function fillPriceRange(price) {
    const priceSection = await findOrExpandSection("Price");

    if (price.min) {
      const minInput = priceSection.querySelector(SELECTORS.priceMin);
      if (minInput) fillInput(minInput, price.min);
    }

    if (price.max) {
      const maxInput = priceSection.querySelector(SELECTORS.priceMax);
      if (maxInput) fillInput(maxInput, price.max);
    }

    if (price.currency) {
      const currencySelect = priceSection.querySelector(
        SELECTORS.priceCurrency
      );
      if (currencySelect) {
        currencySelect.value = price.currency;
        currencySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  // Utility functions
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function typeText(element, text) {
    element.focus();
    element.value = text;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillInput(element, value) {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function toggleCheckbox(name, checked) {
    const checkbox =
      document.querySelector(`input[data-field="${name}"]`) ||
      document.querySelector(`input[name="${name}"]`) ||
      document.querySelector(`#${name}`);

    if (checkbox && checkbox.checked !== checked) {
      checkbox.click();
      await sleep(200);
    }
  }

  async function findOrExpandSection(sectionName) {
    // Look for section headers or expand buttons
    const headers = document.querySelectorAll(
      "h3, h4, .section-header, .filter-title"
    );

    for (const header of headers) {
      if (
        header.textContent.toLowerCase().includes(sectionName.toLowerCase())
      ) {
        // Check if section is collapsed and expand it
        const expandButton =
          header.querySelector(".expand-btn, .toggle-btn") ||
          header.parentElement.querySelector(".expand-btn, .toggle-btn");

        if (
          expandButton &&
          !header.parentElement.classList.contains("expanded")
        ) {
          expandButton.click();
          await sleep(300);
        }

        return header.parentElement;
      }
    }

    // Fallback: return document body if section not found
    return document.body;
  }

  async function submitSearch() {
    const searchButton =
      document.querySelector(SELECTORS.searchButton) ||
      document.querySelector(SELECTORS.searchSubmit) ||
      document.querySelector('button[type="submit"]');

    if (searchButton) {
      searchButton.click();
      await sleep(1000);
    }
  }

  // Initialize content script
  console.log("PoE Trade Helper content script loaded");
})();
