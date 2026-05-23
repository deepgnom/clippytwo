// background.js
const activeTabIds = new Set();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TOGGLE_SELECTION_MODE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return sendResponse({ active: false });
      const isActive = activeTabIds.has(tab.id);
      if (isActive) {
        activeTabIds.delete(tab.id);
      } else {
        activeTabIds.add(tab.id);
      }
      chrome.tabs.sendMessage(tab.id, { type: "SET_SELECTION_MODE", active: !isActive });
      sendResponse({ active: !isActive });
    });
    return true;
  }

  if (msg.type === "GET_SELECTION_MODE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      sendResponse({ active: tab ? activeTabIds.has(tab.id) : false });
    });
    return true;
  }

  if (msg.type === "SELECTION_MODE_OFF") {
    if (sender.tab) activeTabIds.delete(sender.tab.id);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => activeTabIds.delete(tabId));
