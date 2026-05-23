// popup.js
const toggleBtn    = document.getElementById("toggleBtn");
const toggleIcon   = document.getElementById("toggleIcon");
const toggleLabel  = document.getElementById("toggleLabel");
const domainEl     = document.getElementById("domain");
const delimCustom  = document.getElementById("delimCustom");
const delimPresets = document.querySelectorAll(".delim-preset");

let domain = null;

// ── Selection mode toggle ─────────────────────────────────────

function setActive(active) {
  toggleBtn.classList.toggle("active", active);
  toggleIcon.textContent  = active ? "✕" : "⊹";
  toggleLabel.textContent = active ? "Stop Selection Mode" : "Start Selection Mode";
}

// ── Delimiter UI ──────────────────────────────────────────────

const PRESET_VALUES = Array.from(delimPresets).map(b => b.dataset.value);

function setDelimiterUI(value) {
  delimPresets.forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.value === value);
  });
  if (!PRESET_VALUES.includes(value)) {
    delimCustom.value = value;
  } else {
    delimCustom.value = "";
  }
}

function saveDelimiter(value) {
  chrome.storage.local.get("delimiters", (data) => {
    const delimiters = data.delimiters || {};
    delimiters[domain] = value;
    chrome.storage.local.set({ delimiters });
  });
}

delimPresets.forEach(btn => {
  btn.addEventListener("click", () => {
    setDelimiterUI(btn.dataset.value);
    saveDelimiter(btn.dataset.value);
    delimCustom.value = "";
  });
});

delimCustom.addEventListener("input", () => {
  delimPresets.forEach(btn => btn.classList.remove("selected"));
  saveDelimiter(delimCustom.value);
});

// ── Init ──────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try { domain = new URL(tab.url).hostname; } catch (_) {}
  domainEl.textContent = domain || "—";

  chrome.runtime.sendMessage({ type: "GET_SELECTION_MODE" }, (res) => {
    setActive(res?.active || false);
  });

  chrome.storage.local.get("delimiters", (data) => {
    const saved = (data.delimiters || {})[domain];
    const delimiter = saved !== undefined ? saved : " / ";
    setDelimiterUI(delimiter);
    if (saved === undefined) saveDelimiter(delimiter);
  });
}

// ── Button handlers ───────────────────────────────────────────

toggleBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "TOGGLE_SELECTION_MODE" }, (res) => {
    setActive(res?.active || false);
  });
  window.close();
});

init();
