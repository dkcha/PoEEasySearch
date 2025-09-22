// PoE Easy Search - Background Service Worker

// Handle extension installation and setup
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    const defaultSettings = {
      extensionVersion: "1.0.0",
      firstInstall: true,
      installDate: Date.now(),
      searchHistory: [],
    };

    // Delay to ensure service worker is fully initialized
    setTimeout(() => {
      chrome.storage.local.set(defaultSettings).catch((error) => {
        console.error("Error saving default settings:", error);
      });
    }, 100);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openTradeTab") {
    handleOpenTradeTab(message.config)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === "autoFillCurrentTab") {
    handleAutoFillCurrentTab(message.config)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  sendResponse({ success: false, error: "Unknown action: " + message.action });
});

// Wait for content script to be ready with retry logic
async function waitForContentScript(tabId, maxAttempts = 10) {
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
      return true;
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  return false;
}

// Inject content script if not already present
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    // Content script may already be loaded
  }
}

// Open new trade tab and auto-fill with retry mechanism
async function handleOpenTradeTab(config) {
  try {
    const tab = await chrome.tabs.create({
      url: "https://www.pathofexile.com/trade/search/Settlers",
      active: true,
    });

    return new Promise((resolve, reject) => {
      let timeoutId;
      let attempts = 0;
      const maxAttempts = 3;

      const tabUpdateListener = async (tabId, changeInfo, updatedTab) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(tabUpdateListener);
          if (timeoutId) clearTimeout(timeoutId);

          const attemptAutoFill = async () => {
            attempts++;

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

              resolve(
                response || {
                  success: true,
                  message: "Tab opened and auto-fill completed",
                }
              );
            } catch (error) {
              if (attempts < maxAttempts) {
                setTimeout(attemptAutoFill, 2000);
              } else {
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

      // Timeout fallback
      timeoutId = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
        resolve({
          success: true,
          message:
            "Tab opened but auto-fill timed out - try manually refreshing the page",
        });
      }, 15000);
    });
  } catch (error) {
    throw new Error("Failed to create new tab: " + error.message);
  }
}

// Auto-fill current active tab
async function handleAutoFillCurrentTab(config) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new Error("No active tab found");
    }

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
            reject(
              new Error(
                "Could not communicate with trade site: " +
                  chrome.runtime.lastError.message
              )
            );
          } else {
            resolve(
              response || { success: true, message: "Auto-fill attempted" }
            );
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
}
