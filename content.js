// content.js — ClippyTwo v2
(function () {
  if (window.__pageClipperLoaded) return;
  window.__pageClipperLoaded = true;

  let selectionMode = false;
  let selections = []; // [{ el, linkAware }]
  let hoveredEl = null;
  let banner = null;

  // ── Text extraction ───────────────────────────────────────────

  function extractText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  function getFirstHref(el) {
    // Check the element itself, its descendants, and its anchor ancestors
    const candidates = [
      el.tagName === "A" ? el : null,
      el.querySelector("a[href]"),
      el.closest("a[href]")
    ];
    for (const a of candidates) {
      if (a?.getAttribute("href")) {
        try { return new URL(a.getAttribute("href"), location.href).href; }
        catch (_) {}
      }
    }
    return null;
  }

  function hasLink(el) {
    return !!getFirstHref(el);
  }

  // Returns { html, plain } for one element
  function renderElement(el, linkAware) {
    const text = extractText(el);
    if (!linkAware) {
      return { html: escapeHtml(text), plain: text };
    }
    const href = getFirstHref(el);
    if (!href) {
      return { html: escapeHtml(text), plain: text };
    }
    return {
      html:  `<a href="${href}">${escapeHtml(text)}</a>`,
      plain: `${text} (${href})`
    };
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Write both text/html and text/plain to clipboard via execCommand.
  // This is the only reliable path from a content script — navigator.clipboard.write
  // silently drops text/html in this context.
  function copyWithExecCommand(html, plain) {
    return new Promise((resolve, reject) => {
      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      div.innerHTML = html;
      Object.assign(div.style, {
        position: "fixed", top: "-9999px", left: "-9999px",
        opacity: "0", pointerEvents: "none", whiteSpace: "pre-wrap"
      });
      document.body.appendChild(div);

      try {
        const range = document.createRange();
        range.selectNodeContents(div);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        const ok = document.execCommand("copy");
        sel.removeAllRanges();
        document.body.removeChild(div);
        ok ? resolve() : reject(new Error("execCommand returned false"));
      } catch (err) {
        document.body.removeChild(div);
        reject(err);
      }
    });
  }

  // ── Storage ───────────────────────────────────────────────────

  function getDomain() { return location.hostname; }

  /* PATTERN STORAGE — commented out, reserved for future use
  function getPattern() {
    return new Promise(resolve => {
      chrome.storage.local.get("patterns", (data) => {
        resolve((data.patterns || {})[getDomain()] || null);
      });
    });
  }

  function savePattern(entries) {
    return new Promise(resolve => {
      chrome.storage.local.get("patterns", (data) => {
        const patterns = data.patterns || {};
        patterns[getDomain()] = { entries, savedAt: Date.now() };
        chrome.storage.local.set({ patterns }, resolve);
      });
    });
  }
  */

  // ── UI helpers ────────────────────────────────────────────────

  function showToast(msg, type = "info", duration = 2400) {
    document.querySelector(".pc-toast")?.remove();
    const t = document.createElement("div");
    t.className = `pc-toast pc-toast--${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
  }

  function updateBanner() {
    if (!banner) return;
    const count = selections.length;
    const linkCount = selections.filter(s => s.linkAware).length;
    if (count === 0) {
      banner.textContent = "ClippyTwo — Click to select · Shift+Click to capture link · C to copy · Esc to cancel";
    } else {
      const parts = [`${count} selected`];
      if (linkCount) parts.push(`${linkCount} with link`);
      parts.push("· C to copy · Esc to cancel");
      banner.textContent = parts.join(" · ");
    }
  }

  function showBanner() {
    if (banner) return;
    banner = document.createElement("div");
    banner.className = "pc-banner";
    document.body.prepend(banner);
    updateBanner();
  }

  function removeBanner() {
    banner?.remove();
    banner = null;
  }

  // ── Selection mode ────────────────────────────────────────────

  function enable() {
    if (selectionMode) return; // already active
    selectionMode = true;
    selections = [];           // always fresh — pattern only applied on explicit re-apply
    showBanner();
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.body.style.cursor = "crosshair";
  }

  function disable() {
    selectionMode = false;
    removeBanner();
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("mouseout", onOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    document.body.style.cursor = "";
    clearAllHighlights();
    selections = [];
    hoveredEl = null;
    chrome.runtime.sendMessage({ type: "SELECTION_MODE_OFF" });
  }

  function clearAllHighlights() {
    document.querySelectorAll(".pc-hover, .pc-hover--link, .pc-sel, .pc-sel--link")
      .forEach(el => el.classList.remove("pc-hover", "pc-hover--link", "pc-sel", "pc-sel--link"));
  }

  // ── Event handlers ────────────────────────────────────────────

  function onOver(e) {
    if (!selectionMode) return;
    const el = e.target;
    if (el === document.body || el === document.documentElement) return;
    if (el.closest(".pc-banner")) return;

    if (hoveredEl && hoveredEl !== el) {
      hoveredEl.classList.remove("pc-hover", "pc-hover--link");
    }
    hoveredEl = el;

    const isSelected = el.classList.contains("pc-sel") || el.classList.contains("pc-sel--link");
    if (!isSelected) {
      el.classList.add(hasLink(el) ? "pc-hover--link" : "pc-hover");
    }
  }

  function onOut(e) {
    if (!selectionMode) return;
    const el = e.target;
    const isSelected = el.classList.contains("pc-sel") || el.classList.contains("pc-sel--link");
    if (!isSelected) el.classList.remove("pc-hover", "pc-hover--link");
    hoveredEl = null;
  }

  function onClick(e) {
    if (!selectionMode) return;
    if (e.target.closest(".pc-banner")) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    const linkAware = e.shiftKey;
    const existing = selections.findIndex(s => s.el === el);

    if (existing !== -1) {
      // Deselect
      el.classList.remove("pc-sel", "pc-sel--link");
      selections.splice(existing, 1);
    } else {
      el.classList.remove("pc-hover", "pc-hover--link");
      el.classList.add(linkAware ? "pc-sel--link" : "pc-sel");
      selections.push({ el, linkAware });
    }
    updateBanner();
  }

  function onKey(e) {
    if (!selectionMode) return;
    if (e.key === "Escape") {
      disable();
      return;
    }
    if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (selections.length === 0) { showToast("Nothing selected"); return; }
      copySelections();
    }
  }

  // ── Copy ──────────────────────────────────────────────────────

  function getDelimiter() {
    return new Promise(resolve => {
      chrome.storage.local.get("delimiters", (data) => {
        const saved = (data.delimiters || {})[getDomain()];
        resolve(saved !== undefined ? saved : " / ");
      });
    });
  }

  async function copySelections() {
    const delimiter = await getDelimiter();
    const rendered  = selections.map(({ el, linkAware }) => renderElement(el, linkAware));
    const html  = rendered.map(r => r.html).join(escapeHtml(delimiter));
    const plain = rendered.map(r => r.plain).join(delimiter);

    try {
      await copyWithExecCommand(html, plain);
      showToast("Copied", "success");
      disable();
    } catch (err) {
      showToast("Copy failed: " + err.message);
      console.error("[PageClipper]", err);
    }
  }

  /* CSS SELECTOR BUILDER — commented out, reserved for future pattern use
  function getCSSSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body) {
      let seg = cur.tagName.toLowerCase();
      const classes = [...cur.classList]
        .filter(c => !c.startsWith("pc-"))
        .slice(0, 2).join(".");
      if (classes) seg += `.${classes}`;
      const parent = cur.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) seg += `:nth-child(${[...parent.children].indexOf(cur) + 1})`;
      }
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }
  */

  /* PATTERN RE-APPLY — commented out, reserved for future use
  async function applyPattern() {
    const pattern = await getPattern();
    if (!pattern?.entries?.length) return;

    const matched = [];
    for (const { selector, linkAware } of pattern.entries) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          el.classList.add(linkAware ? "pc-sel--link" : "pc-sel");
          matched.push({ el, linkAware });
        }
      } catch (_) {}
    }

    if (!matched.length) { showToast("Pattern found no matching elements"); return; }
    selections = matched;
    updateBanner();
    showToast(`${matched.length} element(s) matched · press C to copy`, "info", 3500);
  }
  */

  // ── Message listener ──────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SET_SELECTION_MODE") {
      if (msg.active) enable();
      else disable();
      sendResponse({ ok: true });
    }
    /* APPLY_PATTERN — commented out, reserved for future use
    if (msg.type === "APPLY_PATTERN") {
      if (!selectionMode) enable();
      applyPattern().then(() => sendResponse({ ok: true }));
      return true;
    }
    */
  });

  // Ctrl+Shift+G page-level shortcut
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "G" && !selectionMode) {
      chrome.runtime.sendMessage({ type: "TOGGLE_SELECTION_MODE" }, (res) => {
        if (res?.active) enable();
      });
    }
  });
})();
