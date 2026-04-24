#!/usr/bin/env node
// <swiftbar.title>Dev Status</swiftbar.title>
// <swiftbar.version>1.0.0</swiftbar.version>
// <swiftbar.desc>Live status of GitHub and Claude in your menu bar</swiftbar.desc>
// <swiftbar.schedule>*/1 * * * *</swiftbar.schedule>

/**
 * Dev Status Bar — SwiftBar Plugin
 *
 * Displays the live status of GitHub, Claude, and Proton services
 * in the macOS menu bar.
 *
 * Refresh schedule is set via <swiftbar.schedule> above using cron syntax.
 * Default: every 1 minute. To change, edit the cron value and reinstall.
 *
 * Status page APIs (Atlassian Statuspage format):
 *   - GitHub:  https://www.githubstatus.com/api/v2
 *   - Claude:  https://status.claude.com/api/v2
 *   - Proton:  https://status.proton.me/api/v2
 */

import https from "https";

// ── Types ────────────────────────────────────────────────────────

interface StatusPageResponse {
  page: { name: string; url: string };
  status: { indicator: string; description: string };
}

interface ComponentsResponse {
  components: Component[];
}

interface Component {
  id: string;
  name: string;
  status: string;
  description: string | null;
}

// ── Configuration ────────────────────────────────────────────────

const SERVICES = [
  {
    name: "Claude",
    statusUrl: "https://status.claude.com/api/v2/status.json",
    componentsUrl: "https://status.claude.com/api/v2/components.json",
    pageUrl: "https://status.claude.com",
  },
  {
    name: "GitHub",
    statusUrl: "https://www.githubstatus.com/api/v2/status.json",
    componentsUrl: "https://www.githubstatus.com/api/v2/components.json",
    pageUrl: "https://www.githubstatus.com",
  },
  {
    name: "Proton",
    statusUrl: "https://status.proton.me/api/v2/status.json",
    componentsUrl: "https://status.proton.me/api/v2/components.json",
    pageUrl: "https://status.proton.me",
  },
];

const TIMEOUT_MS = 10_000;

// ── Helpers ──────────────────────────────────────────────────────

/** SwiftBar-compatible emoji indicators */
const INDICATOR_ICON: Record<string, string> = {
  none: "🟢",
  operational: "🟢",
  minor: "🟡",
  degraded_performance: "🟡",
  partial_outage: "🟠",
  major: "🟠",
  major_outage: "🔴",
  critical: "🔴",
  maintenance: "🔵",
  under_maintenance: "🔵",
};

/** SF Symbol icon + color for the macOS menu bar title */
const MENU_BAR_ICON: Record<string, { symbol: string; color: string }> = {
  none:        { symbol: "checkmark.circle.fill",         color: "#007AFF" },
  maintenance: { symbol: "wrench.fill",                   color: "#007AFF" },
  minor:       { symbol: "exclamationmark.circle.fill",   color: "#FFD60A" },
  major:       { symbol: "exclamationmark.triangle.fill", color: "#FF9F0A" },
  critical:    { symbol: "xmark.circle.fill",             color: "#FF3B30" },
};

function icon(status: string): string {
  return INDICATOR_ICON[status] ?? "⚪";
}

function menuBarIcon(indicator: string): string {
  const s = MENU_BAR_ICON[indicator] ?? MENU_BAR_ICON.none;
  return ` | sfimage=${s.symbol} color=${s.color}`;
}

/** Simple HTTPS GET that returns parsed JSON. */
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      const { statusCode } = res;
      if (!statusCode || statusCode < 200 || statusCode >= 300) {
        reject(new Error(`HTTP ${statusCode ?? "unknown"} for ${url}`));
        res.resume();
        return;
      }
      res.setEncoding("utf8");
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("error", reject);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────

async function fetchServiceStatus(service: (typeof SERVICES)[number]) {
  try {
    const [status, components] = await Promise.all([
      fetchJson<StatusPageResponse>(service.statusUrl),
      fetchJson<ComponentsResponse>(service.componentsUrl),
    ]);
    return { service, status, components: components.components, error: null };
  } catch (err: unknown) {
    return {
      service,
      status: null,
      components: [] as Component[],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function worstIndicator(indicators: string[]): string {
  const order = ["none", "maintenance", "minor", "major", "critical"];
  let worst = 0;
  for (const ind of indicators) {
    const idx = order.indexOf(ind);
    if (idx > worst) worst = idx;
  }
  return order[worst] ?? "none";
}

async function main() {
  const results = await Promise.all(SERVICES.map(fetchServiceStatus));

  // ── Title bar line ──────────────────────────────────────────
  const indicators = results.map((r) =>
    r.error ? "critical" : r.status!.status.indicator
  );
  const overall = worstIndicator(indicators);

  console.log(menuBarIcon(overall));

  // ── Dropdown ────────────────────────────────────────────────
  console.log("---");
  console.log("Status Monitor | color=#8E8E93 size=11");
  console.log("---");

  for (const result of results) {
    const { service, status, components, error } = result;

    if (error) {
      console.log(
        `${service.name}: ⚠️ Error | color=red href=${service.pageUrl}`
      );
      console.log(`--${error} | color=gray size=11`);
      console.log("---");
      continue;
    }

    // Service header
    console.log(
      `${icon(status!.status.indicator)} ${service.name}: ${status!.status.description} | href=${service.pageUrl}`
    );

    // Component breakdown
    const visibleComponents = components.filter(
      (c) => !c.name.startsWith("Visit ")
    );
    for (const comp of visibleComponents) {
      const name = comp.name;
      const st = comp.status.replace(/_/g, " ");
      console.log(`--${icon(comp.status)} ${name}: ${st} | size=12`);
    }

    console.log("---");
  }

  // Footer
  const updatedAt = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`Updated ${updatedAt} | color=#8E8E93 size=11`);
  console.log("Refresh | refresh=true");
}

main().catch((err) => {
  // Fallback: show error in menu bar
  console.log(` | sfimage=xmark.circle.fill color=#FF3B30`);
  console.log("---");
  console.log(`Error: ${err.message} | color=red size=11`);
});
