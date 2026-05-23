# ClippyTwo

A Chrome browser extension for personal copy-paste efficiency. Select structured elements from any page and copy them as clean text — with live hyperlinks where you want them.

Built for repeated workflows on internal tools like Confluence, Jira, and Salesforce, where you're pulling the same fields into emails or docs and don't want to hand-copy anything.

---

## Features

- Toolbar icon opens the popup — click to enter selection mode on any page
- Hover highlights elements — orange for plain text, blue if a link is detected inside
- Click to select an element; Shift+Click captures its inner link
- Selected elements show a badge: ✓ for plain, ✓ 🔗 for link-aware
- Press `C` to copy, `Esc` to cancel selection mode
- Output is clean plain text joined by a configurable delimiter
- Link-aware elements paste as live hyperlinks in Google Docs and Outlook
- Delimiter options: none, `/`, `,`, `·`, or custom — saved per domain
- `Ctrl+Shift+G` toggles selection mode from the page without opening the popup

---

## Install

ClippyTwo is not on the Chrome Web Store. Load it as an unpacked extension:

1. Download or clone this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `clippytwo` folder

The ClippyTwo icon will appear in your toolbar. Pin it for easy access.

---

## How to use

**Basic copy**
1. Click the toolbar icon to open the popup
2. Set your delimiter if needed (default is ` / `, saved per domain)
3. Click **Start Selection Mode**
4. Hover over page elements — orange outline means plain text, blue means a link is inside
5. Click elements to select them (orange badge ✓)
6. Press `C` to copy — all selected elements join into one string with your delimiter between them

**Capturing a link**
Shift+Click any element that shows a blue hover outline. It selects with a blue badge (✓ 🔗). When you copy, that element pastes as a live hyperlink in rich text targets like Google Docs and Outlook. In plain text targets it falls back to `text (url)`.

**Keyboard shortcut**
`Ctrl+Shift+G` toggles selection mode from the page directly — no need to open the popup.

---

## Options

Click **Options →** at the bottom of the popup to view and manage your saved delimiter preferences per domain.

---

## Status

Personal tool, actively used. Not published to the Chrome Web Store.  
Contributions and issues welcome — though scope is intentionally narrow.

---

## Tech notes

- Manifest V3
- No external dependencies
- Storage: `chrome.storage.local` (delimiter preference per domain only)
- Clipboard: `execCommand('copy')` via a minimal off-screen `contenteditable` element — the only reliable path for writing `text/html` from a content script
