import { describe, expect, it } from "vitest";

import type { AutoReportTheme } from "./auto-report";
import { sortThemesForDisplay } from "./theme-ranking";

const theme = (overrides: Partial<AutoReportTheme>): AutoReportTheme => ({
  title: "Stripe billing sync failures",
  products: ["Stripe"],
  examples: [],
  sourceUrls: [],
  sharePercent: 10,
  discussionCount: 2,
  threadCount: 2,
  tractionScore: 20,
  summary: "Stripe webhooks fail during billing sync.",
  severity: "High",
  ...overrides,
});

describe("sortThemesForDisplay", () => {
  it("keeps specific themes first and catch-alls last", () => {
    const ranked = sortThemesForDisplay([
      theme({
        title: "Other pain points",
        tractionScore: 5,
      }),
      theme({
        title: "Cursor IDE overheating",
        tractionScore: 80,
      }),
      theme({
        title: "Stripe billing sync failures",
        tractionScore: 40,
      }),
    ]);

    expect(ranked[0]?.title).toBe("Cursor IDE overheating");
    expect(ranked.at(-1)?.title).toBe("Other pain points");
  });
});
