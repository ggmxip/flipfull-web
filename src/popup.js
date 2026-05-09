/**
 * Flipkart Full Name — popup.js
 * Manages the settings UI and syncs with chrome.storage.
 */

const KEYS = ["enabled", "expandTitles", "expandDescriptions", "expandSpecifications", "autoClickReadMore"];

const els = {
  enabled:            document.getElementById("enabledToggle"),
  expandTitles:       document.getElementById("expandTitles"),
  expandDescriptions: document.getElementById("expandDescriptions"),
  expandSpecifications: document.getElementById("expandSpecifications"),
  autoClickReadMore:  document.getElementById("autoClickReadMore"),
  statusLabel:        document.getElementById("statusLabel"),
  statusDot:          document.getElementById("statusDot"),
  statusMsg:          document.getElementById("statusMsg"),
  mainRow:            document.getElementById("mainToggleRow"),
};

/* ── Load settings from storage ── */
chrome.storage.sync.get(
  {
    enabled: true,
    expandTitles: true,
    expandDescriptions: true,
    expandSpecifications: true,
    autoClickReadMore: true,
  },
  (settings) => {
    KEYS.forEach((k) => {
      if (els[k]) els[k].checked = settings[k];
    });
    updateUI(settings.enabled);
    checkCurrentTab();
  }
);

/* ── Save & broadcast on any change ── */
function onSettingChange() {
  const settings = {};
  KEYS.forEach((k) => { settings[k] = els[k] ? els[k].checked : true; });

  chrome.storage.sync.set(settings);
  chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED", settings });
  updateUI(settings.enabled);
}

KEYS.forEach((k) => {
  if (els[k]) els[k].addEventListener("change", onSettingChange);
});

/* Clicking the row also toggles the master switch */
els.mainRow.addEventListener("click", (e) => {
  if (e.target === els.enabled || e.target.tagName === "LABEL") return;
  els.enabled.checked = !els.enabled.checked;
  onSettingChange();
});

/* ── Update UI state ── */
function updateUI(enabled) {
  if (enabled) {
    els.statusLabel.textContent = "Extension Active";
    els.statusDot.className = "status-dot active";
  } else {
    els.statusLabel.textContent = "Extension Paused";
    els.statusDot.className = "status-dot inactive";
  }

  /* Dim sub-options when disabled */
  document.querySelectorAll(".option-row").forEach((row) => {
    row.style.opacity = enabled ? "1" : "0.4";
    row.style.pointerEvents = enabled ? "auto" : "none";
  });
}

/* ── Check if current tab is Flipkart ── */
function checkCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url) return;

    if (/flipkart\.com/i.test(tab.url)) {
      const isSearch  = /search/.test(tab.url);
      const isPDP     = /p\//.test(tab.url) || /itm[A-Za-z0-9]+/.test(tab.url);
      const pageType  = isPDP ? "product page" : isSearch ? "search results" : "Flipkart";

      els.statusMsg.innerHTML = `Active on <strong>${pageType}</strong> — titles expanded automatically.`;
      els.statusDot.classList.add("active");
    } else {
      els.statusMsg.textContent = "Navigate to Flipkart.com to activate.";
      els.statusDot.className = "status-dot";
    }
  });
}
