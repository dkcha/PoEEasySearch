fetch(chrome.runtime.getURL("data/mods.json"))
  .then((response) => response.json())
  .then((modsData) => {
    console.log("Loaded mods:", modsData);

    document.querySelectorAll("div.filter.full-span").forEach((groupEl) => {
      const typeEl = groupEl.querySelector(".filter-title .mutate-type");
      const modLabelEl = groupEl.querySelector(".filter-title span");
      const minInput = groupEl.querySelector('input[placeholder="min"]');
      const maxInput = groupEl.querySelector('input[placeholder="max"]');

      if (
        !modLabelEl ||
        !minInput ||
        !maxInput ||
        !typeEl ||
        !typeEl.textContent.includes("explicit")
      ) {
        return; // skip non-mod blocks (like sockets, properties, etc.)
      }

      const modName = modLabelEl.textContent.trim();
      console.log("Checking mod:", modName);

      const modMatch = modsData.find((mod) => mod.name === modName);
      if (!modMatch || !modMatch.tier_values) {
        console.log("No tier data for:", modName);
        return;
      }

      const dropdown = document.createElement("select");
      dropdown.className = "tier-dropdown";
      dropdown.style.marginLeft = "6px";
      dropdown.style.padding = "4px";
      dropdown.style.fontSize = "12px";

      dropdown.innerHTML = `
        <option value="">Tier</option>
        ${Object.entries(modMatch.tier_values)
          .map(([tier, values]) => `<option value="${tier}">${tier}</option>`)
          .join("")}
      `;

      minInput.insertAdjacentElement("afterend", dropdown);

      dropdown.addEventListener("change", (e) => {
        const tier = e.target.value;
        const values = modMatch.tier_values[tier];

        if (values) {
          minInput.value = values.min;
          maxInput.value = values.max;
          console.log(`Set ${modName} to Tier ${tier}`, values);
        }
      });
    });
  })
  .catch((err) => console.error("Failed to load mod data:", err));
