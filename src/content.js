/**
 * Flipkart Full Name — content.js (v1.0.7)
 *
 * CONFIRMED FROM DIAGNOSTICS:
 *
 * PDP (product page):
 *   - h1 class contains "v1zwn" + "_1psv1ze"
 *   - Full title available in document.title → strip " - Flipkart.com"
 *   - "...more" div class "RG5Slk" sibling, color #1162F2 — just hide it
 *
 * LISTING (search/category page):
 *   - Truncated title in div.RG5SIk / div.RG5Slk
 *   - No title/aria-label attrs anywhere in the tree
 *   - line-clamp: none, overflow: visible — it's TEXT truncation in DOM
 *   - Full name IS in the closest <a> href as a URL slug
 *   - e.g. /asus-tuf-gaming-a15-2025-amd-ryzen-7-7445hs-16-gb-512-g.../p/...
 *   - Parse slug → convert hyphens to spaces → title case → done
 */

(function () {
  "use strict";

  /* ════════════════════════════════════════════════════════
     SHARED UTILITY: parse a Flipkart URL slug into a title
  ════════════════════════════════════════════════════════ */
  function slugToTitle(href) {
    try {
      const url = new URL(href);
      // Flipkart URL: /product-name-here/p/ITEMID
      const parts = url.pathname.split("/").filter(Boolean);
      // First segment is the slug, last before /p/ is the product segment
      const slug = parts[0] || "";
      if (slug.length < 5) return null;

      // Convert slug to readable title
      return slug
        .split("-")
        .map((word) => {
          // Preserve uppercase tokens like "GB", "SSD", "AMD", "RTX", "16GB"
          if (/^\d/.test(word)) return word.toUpperCase(); // starts with digit
          if (word.length <= 2) return word.toUpperCase(); // short = acronym
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } catch (_) {
      return null;
    }
  }

  /* ════════════════════════════════════════════════════════
     LISTING PAGE — fix Flipkart listing titles
  ════════════════════════════════════════════════════════ */
  function fixListingTitles() {
    document.querySelectorAll("div.RG5SIk, div.RG5Slk").forEach((el) => {
      if (el.dataset.ffnDone === "1") return;

      const anchor = el.closest("a") || el.parentElement?.closest("a");
      if (!anchor || !anchor.href) return;

      const full = slugToTitle(anchor.href);
      if (!full || full.length < 10) return;

      const current = (el.innerText || "").trim();
      // Only replace if current text is shorter (i.e. truncated)
      if (current.length >= full.length) return;

      el.dataset.ffnDone = "1";
      el.textContent = full;
      el.style.setProperty("white-space", "normal", "important");
      el.style.setProperty("-webkit-line-clamp", "unset", "important");
      el.style.setProperty("overflow", "visible", "important");
      el.style.setProperty("max-height", "none", "important");
    });
  }

  /* ════════════════════════════════════════════════════════
     PDP — replace truncated h1 with full title from document.title
  ════════════════════════════════════════════════════════ */
  let pdpApplied = false;

  function fixPdpTitle() {
    // Full title is always in document.title as "Product Name - Flipkart.com"
    const fullTitle = document.title
      .replace(/\s*[-|]\s*(flipkart\.com|flipkart)\s*$/i, "")
      .replace(/\s*[-|]\s*buy\s+.*/i, "")   // strip "- Buy X Online" suffix
      .trim();

    if (!fullTitle || fullTitle.length < 10) return;

    // Find the truncated h1
    const h1 = document.querySelector("h1");
    if (!h1) return;

    const current = (h1.innerText || "").trim();

    // Don't replace if already showing full title
    if (current === fullTitle) { pdpApplied = true; return; }

    // Replace
    h1.textContent = fullTitle;
    h1.style.setProperty("white-space", "normal", "important");
    h1.style.setProperty("-webkit-line-clamp", "unset", "important");
    h1.style.setProperty("overflow", "visible", "important");
    h1.style.setProperty("max-height", "none", "important");
    pdpApplied = true;

    // Hide the "...more" element (don't click — it navigates away)
    hideMoreElements();
  }

  /* ════════════════════════════════════════════════════════
     HIDE "...more" elements (PDP sidebar + listing cards)
     Just hide — never click — clicking navigates to Q&A page
  ════════════════════════════════════════════════════════ */
  function hideMoreElements() {
    document.querySelectorAll("div, span, a").forEach((el) => {
      if (el.dataset.ffnHidden === "1") return;
      const text = (el.innerText || "").trim();
      if (text !== "...more" && text !== "more" && text !== "...") return;
      try {
        const color = getComputedStyle(el).color;
        // Only hide the blue link-colored ones (#1162F2)
        if (color === "rgb(17, 98, 242)" || text === "...more") {
          el.dataset.ffnHidden = "1";
          el.style.setProperty("display", "none", "important");
        }
      } catch (_) {}
    });
  }

  /* ════════════════════════════════════════════════════════
     DETECT PAGE TYPE & RUN APPROPRIATE FIX
  ════════════════════════════════════════════════════════ */
  function isPdp() {
    return /\/p\/itm|\/p\/[a-z0-9]{10,}/i.test(window.location.pathname);
  }

  function runAll() {
    if (isPdp()) {
      fixPdpTitle();
    } else {
      fixListingTitles();
    }
    hideMoreElements();
  }

  /* ════════════════════════════════════════════════════════
     MUTATIONOBSERVER
  ════════════════════════════════════════════════════════ */
  let debounce = null;
  function startObserver() {
    const obs = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(runAll, 120);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ════════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════════ */
  function init() {
    runAll();
    startObserver();
    [300, 800, 1500, 3000, 5000].forEach((ms) =>
      setTimeout(runAll, ms)
    );
  }

  let settings = { enabled: true };
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.sync.get(settings, (stored) => {
      settings = { ...settings, ...stored };
      if (settings.enabled) init();
    });
  } else {
    init();
  }

  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "SETTINGS_UPDATED") {
        settings = { ...settings, ...msg.settings };
        if (settings.enabled) init();
      }
    });
  }

})();
