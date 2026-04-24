# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A macOS menu bar plugin (SwiftBar) that polls GitHub and Claude service status APIs and renders live health indicators in the menu bar. Written in TypeScript, compiled to a single JS file executed directly by SwiftBar on a cron schedule.

**Runtime requirements:** macOS, Node.js ≥ 18, pnpm, [SwiftBar](https://github.com/swiftbar/SwiftBar)

## Commands

```bash
pnpm dev             # Build and run in terminal (test output without SwiftBar)
pnpm build           # Compile TypeScript → dist/
pnpm typecheck       # Type-check without emitting
pnpm install-plugin  # Build, chmod +x, copy to SwiftBar plugins folder
pnpm bootstrap       # Full first-time setup: install SwiftBar, build, launch
```

There is no test suite and no linter configured.

## Architecture

The entire application is `src/dev-status.ts` (~215 lines). There are no other source modules.

**Execution flow:**
1. SwiftBar runs `dist/dev-status.js` every minute (configured via `<swiftbar.schedule>` metadata comment)
2. `main()` calls `fetchServiceStatus()` for each entry in the `SERVICES` array — two parallel HTTPS requests per service (Atlassian Statuspage `/status.json` + `/components.json`)
3. `worstIndicator()` ranks status strings to determine the overall health state
4. Output is written to stdout in SwiftBar pipe-delimited format (`| key=value`); SwiftBar renders it as menu bar icon + dropdown

**Key invariants:**
- Zero production dependencies — HTTP uses Node's built-in `https` module only
- Targets the Atlassian Statuspage API shape; adding a new service means adding one entry to the `SERVICES` array
- The `#!/usr/bin/env node` shebang lets SwiftBar execute the compiled file directly

## SwiftBar Output Format

SwiftBar reads stdout line by line. The first line becomes the menu bar label/icon. A `---` separator splits the menu bar title from dropdown items. Parameters use `| key=value` syntax (e.g., `| sfimage=checkmark.circle.fill color=green`).

## Customization Points

- **Add/remove services:** Edit the `SERVICES` array in `src/dev-status.ts` (must be Atlassian Statuspage-compatible)
- **Refresh interval:** Edit the `<swiftbar.schedule>` cron comment at the top of `src/dev-status.ts`
- **Request timeout:** Adjust `TIMEOUT_MS` constant
- **Icons/colors:** Edit the `INDICATOR_MAP` and `SF_SYMBOL_MAP` lookup objects
