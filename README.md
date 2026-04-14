# Status Monitor

A macOS menu bar plugin that shows the live status of **GitHub** and **Claude** at a glance. Refreshes automatically every minute in the background — no manual action needed.

> **Menu bar:** a single icon (no text). Click it to open the status dropdown.

The icon changes based on the worst status across all services:

| Menu bar icon | Meaning |
|---------------|---------|
| Blue checkmark | All services operational |
| Yellow exclamation circle | Minor issue / degraded performance |
| Orange exclamation triangle | Partial or major outage |
| Red X | Critical outage or network error |
| Blue wrench | Maintenance in progress |

Built with TypeScript, runs via [SwiftBar](https://github.com/swiftbar/SwiftBar) (installed automatically).

---

## Requirements

- macOS
- [Homebrew](https://brew.sh) — if you don't have it:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

---

## Setup

### Step 1 — Install Node.js and pnpm

```bash
brew install node
brew install pnpm
```

### Step 2 — Clone the repo

```bash
git clone <repo-url> ~/Documents/status-monitor
cd ~/Documents/status-monitor
```

### Step 3 — Run bootstrap

```bash
pnpm bootstrap
```

This single command handles everything:
- Installs **SwiftBar** (if not already installed)
- Creates the SwiftBar plugins folder
- Configures SwiftBar to point at that folder
- Installs dependencies, builds, and copies the plugin
- Launches SwiftBar

After it completes, look for a **blue checkmark icon** in the top-right of your macOS menu bar. Click it to see the live status breakdown.

> **If SwiftBar shows a "Choose Plugin Folder" dialog on first launch**, select this folder:
> ```
> /Users/<your-username>/Library/Application Support/SwiftBar/Plugins
> ```
> You can find your username by running `echo $HOME` in the terminal.

---

## Daily workflow

After making any code change, run:

```bash
pnpm install-plugin
```

This rebuilds and reinstalls the plugin in one step. Then click the menu bar icon → **Refresh** to see the update immediately.

### Testing without SwiftBar

To verify the plugin output directly in your terminal:

```bash
pnpm dev
```

You'll see the raw SwiftBar output format — this is what SwiftBar reads to render the menu bar. The first line is the menu bar icon, `---` is a separator, and everything after renders as the dropdown:

```
 | sfimage=checkmark.circle.fill color=#007AFF
---
Status Monitor | color=#8E8E93 size=11
---
🟢 GitHub: All Systems Operational | href=https://www.githubstatus.com
--🟢 Git Operations: operational | size=12
--🟢 Actions: operational | size=12
...
🟢 Claude: All Systems Operational | href=https://status.claude.com
--🟢 Claude API (api.anthropic.com): operational | size=12
...
---
Updated 05:05:23 PM | color=#8E8E93 size=11
Refresh | refresh=true
```

---

## How it works

SwiftBar runs the plugin on a cron schedule and uses its stdout to render the menu bar item and dropdown. The plugin fetches two public Statuspage APIs per service — no API keys required.

| Service | APIs used |
|---------|-----------|
| GitHub  | `githubstatus.com/api/v2/status.json` + `components.json` |
| Claude  | `status.claude.com/api/v2/status.json` + `components.json` |

The refresh schedule lives at the top of `src/dev-status.ts` as a comment SwiftBar reads from the compiled file:

```ts
// <swiftbar.schedule>*/1 * * * *</swiftbar.schedule>
```

---

## Customization

### Change the refresh interval

Edit the cron expression in `src/dev-status.ts`:

| Value | Interval |
|-------|----------|
| `*/1 * * * *` | Every 1 minute (default) |
| `*/5 * * * *` | Every 5 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour |

Then reinstall: `pnpm install-plugin`

### Add more services

Open `src/dev-status.ts` and add an entry to the `SERVICES` array. Any service using an Atlassian Statuspage works:

```ts
const SERVICES = [
  {
    name: "GitHub",
    statusUrl: "https://www.githubstatus.com/api/v2/status.json",
    componentsUrl: "https://www.githubstatus.com/api/v2/components.json",
    pageUrl: "https://www.githubstatus.com",
  },
  {
    name: "My Service",
    statusUrl: "https://status.example.com/api/v2/status.json",
    componentsUrl: "https://status.example.com/api/v2/components.json",
    pageUrl: "https://status.example.com",
  },
];
```

Then reinstall: `pnpm install-plugin`

---

## Project structure

```
status-monitor/
├── scripts/
│   └── setup.sh          # Full onboarding script (run via pnpm bootstrap)
├── src/
│   └── dev-status.ts     # TypeScript source — edit this
├── dist/                  # Compiled JS output — generated, not committed
│   └── dev-status.js
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

---

## Troubleshooting

**Nothing appears in the menu bar**
- Make sure SwiftBar is running: `open -a SwiftBar`
- Re-run `pnpm bootstrap` — it reconfigures everything from scratch
- Check the file is executable:
  ```bash
  chmod +x "$HOME/Library/Application Support/SwiftBar/Plugins/dev-status.js"
  ```
- Try: SwiftBar menu bar icon → **Refresh All**

**Icon appears but shows a red X**
- The API requests are failing. Check your internet connection.
- Run `pnpm dev` to see the full error in your terminal.

**Plugin shows stale data**
- Click the menu bar icon → **Refresh**

**Made a code change and nothing updated**
- Run `pnpm install-plugin`, then click the menu bar icon → **Refresh**
