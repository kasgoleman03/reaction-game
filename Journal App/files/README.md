# Daily Journal

A daily journal app. Atmospheric home page, distraction-free editor, auto-saving drafts, and entries that wait for you when you come back.

## Stack

- **Backend** — Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend** — Vanilla HTML/CSS/JS, no build step
- **Storage** — A single `journal.db` file in this folder. Back it up if it matters.

## Run it

You need **Node.js 18 or newer**. Then:

```bash
cd journal-app
npm install
npm start
```

Open <http://localhost:3000>.

The first run creates `journal.db` automatically. That's the only setup.

## What it does

**Home page** — warm, atmospheric background with drifting motes and slow color blobs. Sidebar shows your entries newest-first, with drafts surfaced at the top in italics with a small "Draft" pill. Click any card to open it.

**Click "New Entry"** — creates a draft on the server and fades into the editor. The page transitions feel intentional, not jarring.

**Editor** — title, body, and a row of mood pills (the same five colors as the home page). The header pill shows when you started the entry. Auto-save fires every 3 seconds while you type; the indicator on the top-right reads "Unsaved" → "Saving" → "Saved" with a pulsing dot during saves and a green dot when settled. The page shares the home page's atmosphere — same blobs, same motes, same fonts — so it feels like the same room.

**Click "Done"** — marks the entry as published and fades back home. If the entry is still empty, you get a confirm dialog asking whether to discard it.

**Click ← Journal** — flushes any pending changes (silently) and goes back. Empty drafts are auto-discarded so they don't clutter the sidebar.

**Past entries** — open in **read-only mode**. The unselected mood pills hide, the cursor disappears, and an "Edit" button appears in the top-right. Click Edit to flip back to editable.

## Resilience

- **3-second auto-save** while you type, with a debounce so a single keystroke doesn't fire a request.
- **`sendBeacon` fallback** on `beforeunload` and `visibilitychange` — closing the tab or switching apps mid-sentence still flushes your last keystrokes.
- **Retry-after-5s** if a save fails, with a toast that tells you the connection's down rather than a silent failure.
- **Draft preservation** — closing the tab during a draft means you'll see it at the top of the sidebar next time.

## Keyboard shortcuts (in the editor)

| Shortcut         | Action                            |
|------------------|-----------------------------------|
| `Cmd/Ctrl + S`   | Force save now                    |
| `Cmd/Ctrl + ↵`   | Done — publish & go home          |
| `Esc`            | Back to journal (or close dialog) |

A subtle hint appears at the bottom-right of the editor on desktop after a moment.

## Accessibility

- `prefers-reduced-motion` disables animations site-wide
- All interactive elements have aria labels and live regions for save status
- Focus is managed sensibly when modals open and when modes flip

## File layout

```
journal-app/
├── server.js          ← Express server + SQLite + REST API
├── package.json
├── public/
│   ├── index.html     ← Home page (greeting, sidebar, motes animation)
│   └── editor.html    ← Editor (title + body + mood, atmospheric)
└── journal.db         ← Created on first run; do not commit
```

## API (for reference)

| Method | Path                          | Purpose                               |
|--------|-------------------------------|---------------------------------------|
| GET    | `/api/entries`                | List all entries, newest first        |
| GET    | `/api/entries/:id`            | Get one entry                         |
| POST   | `/api/entries`                | Create a new (empty) draft            |
| PATCH  | `/api/entries/:id`            | Update any field (auto-save / publish)|
| DELETE | `/api/entries/:id`            | Delete entry (used to drop empties)   |
| POST   | `/api/entries/:id/beacon`     | sendBeacon endpoint for unload-time saves |
