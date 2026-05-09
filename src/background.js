/**
 * Flipkart Full Name — background.js (Service Worker)
 *
 * Responsibilities:
 *   - Set extension icon badge when active on a Flipkart tab.
 *   - Handle install / update events.
 *   - Relay messages between popup and content script.
 */

const FLIPKART_PATTERN = /^https?:\/\/([a-z0-9-]+\.)*flipkart\.com\//;

/* ── On install: set defaults ── */
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.sync.set({
      enabled: true,
      expandTitles: true,
      expandDescriptions: true,
      expandSpecifications: true,
      autoClickReadMore: true,
    });
    console.log("[Flipkart Full Name] Installed & defaults set.");
  }
});

/* ── Update badge when user switches tabs ── */
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateBadge(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") updateBadge(tabId);
});

function updateBadge(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;

    if (FLIPKART_PATTERN.test(tab.url)) {
      chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
        chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF", tabId });
        chrome.action.setBadgeBackgroundColor({
          color: enabled ? "#2874f0" : "#999999",
          tabId,
        });
      });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  });
}

/* ── Message relay: popup → content script ── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SETTINGS_UPDATED") {
    /* Broadcast to all Flipkart tabs */
    chrome.tabs.query({ url: "*://*.flipkart.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
        updateBadge(tab.id);
      });
    });
  }
  sendResponse({ ok: true });
  return true;
});
