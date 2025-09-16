// PoE Easy Search - Background Service Worker
console.log("Background script starting...");

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  if (details.reason === "install") {
    console.log("First time installation - initializing...");

    // Initialize storage with default settings (with error handling)
    const defaultSettings = {
      extensionVersion: "1.0.0",
      firstInstall: true,
      installDate: Date.now(),
      searchHistory: [],
    };

    // Use setTimeout to ensure service worker is fully initialized
    setTimeout(() => {
      chrome.storage.local
        .set(defaultSettings)
        .then(() => {
          console.log("Default settings saved successfully");
        })
        .catch((error) => {
          console.error("Error saving default settings:", error);
        });
    }, 100);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.action);

  if (message.action === "openTradeTab") {
    console.log("Opening new trade tab...");
    handleOpenTradeTab(message.config)
      .then((result) => {
        console.log("Trade tab opened successfully");
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error("Error opening trade tab:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (message.action === "autoFillCurrentTab") {
    console.log("Auto-filling current tab...");
    handleAutoFillCurrentTab(message.config)
      .then((result) => {
        console.log("Current tab auto-filled successfully");
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error("Error auto-filling current tab:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  console.log("Unknown action:", message.action);
  sendResponse({ success: false, error: "Unknown action: " + message.action });
});

// Enhanced function to check if content script is ready
async function waitForContentScript(tabId, maxAttempts = 10) {
  console.log(`Checking if content script is ready in tab ${tabId}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      console.log(
        `Content script is ready in tab ${tabId} (attempt ${attempt})`
      );
      return true;
    } catch (error) {
      console.log(
        `Content script not ready yet (attempt ${attempt}/${maxAttempts}):`,
        error.message
      );

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  console.warn(`Content script not ready after ${maxAttempts} attempts`);
  return false;
}

// Enhanced function to inject content script if needed
async function ensureContentScript(tabId) {
  console.log(`Ensuring content script is loaded in tab ${tabId}...`);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });

    console.log(`Content script injected/ensured in tab ${tabId}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.log(
      `Content script injection note for tab ${tabId}:`,
      error.message
    );
  }
}

// Handle opening new trade tab with enhanced error handling
async function handleOpenTradeTab(config) {
  console.log("Creating new trade tab with config:", config);

  try {
    const tab = await chrome.tabs.create({
      url: "https://www.pathofexile.com/trade/search/Settlers",
      active: true,
    });

    console.log("Created new tab:", tab.id);

    return new Promise((resolve, reject) => {
      let timeoutId;
      let attempts = 0;
      const maxAttempts = 3;

      const tabUpdateListener = async (tabId, changeInfo, updatedTab) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          console.log("Tab loaded, preparing auto-fill...");

          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          if (timeoutId) clearTimeout(timeoutId);

          const attemptAutoFill = async () => {
            attempts++;
            console.log(`Auto-fill attempt ${attempts}/${maxAttempts}...`);

            try {
              await ensureContentScript(tab.id);
              const isReady = await waitForContentScript(tab.id, 5);

              if (!isReady) {
                throw new Error(
                  "Content script not ready after multiple attempts"
                );
              }

              const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(
                  tab.id,
                  {
                    action: "autoFill",
                    config: config,
                  },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                    } else {
                      resolve(response);
                    }
                  }
                );
              });

              console.log("Auto-fill response:", response);
              resolve(
                response || {
                  success: true,
                  message: "Tab opened and auto-fill completed",
                }
              );
            } catch (error) {
              console.error(
                `Auto-fill attempt ${attempts} failed:`,
                error.message
              );

              if (attempts < maxAttempts) {
                console.log(`Retrying auto-fill in 2 seconds...`);
                setTimeout(attemptAutoFill, 2000);
              } else {
                console.error("All auto-fill attempts failed");
                resolve({
                  success: false,
                  message:
                    "Tab opened but auto-fill failed after multiple attempts. Try manually refreshing the page.",
                });
              }
            }
          };

          setTimeout(attemptAutoFill, 1500);
        }
      };

      chrome.tabs.onUpdated.addListener(tabUpdateListener);

      timeoutId = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
        console.log("Timeout waiting for tab to load");
        resolve({
          success: true,
          message:
            "Tab opened but auto-fill timed out - try manually refreshing the page",
        });
      }, 15000);
    });
  } catch (error) {
    console.error("Error creating tab:", error);
    throw new Error("Failed to create new tab: " + error.message);
  }
}

// Handle auto-filling current tab
async function handleAutoFillCurrentTab(config) {
  console.log("Auto-filling current tab with config:", config);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new Error("No active tab found");
    }

    console.log("Current tab:", tab.url);

    if (!tab.url || !tab.url.includes("pathofexile.com/trade")) {
      throw new Error(
        "Current tab is not the PoE trade site. Please navigate to pathofexile.com/trade first."
      );
    }

    await ensureContentScript(tab.id);
    const isReady = await waitForContentScript(tab.id);

    if (!isReady) {
      throw new Error("Content script not ready. Try refreshing the page.");
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "autoFill",
          config: config,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending auto-fill message:",
              chrome.runtime.lastError.message
            );
            reject(
              new Error(
                "Could not communicate with trade site: " +
                  chrome.runtime.lastError.message
              )
            );
          } else {
            console.log("Auto-fill response:", response);
            resolve(
              response || { success: true, message: "Auto-fill attempted" }
            );
          }
        }
      );
    });
  } catch (error) {
    console.error("Error auto-filling current tab:", error);
    throw error;
  }
}

// Handle tab updates for debugging
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("pathofexile.com/trade")
  ) {
    console.log("PoE trade tab loaded:", tabId, tab.url);
  }
});

// Test chrome.storage access with proper service worker initialization delay
setTimeout(() => {
  chrome.storage.local
    .get(["extensionVersion"])
    .then((result) => {
      console.log("Storage test successful:", result);
    })
    .catch((error) => {
      console.error("Storage test failed:", error);
    });
}, 500); // Wait 500ms for service worker to fully initialize

console.log("Background script loaded successfully");
