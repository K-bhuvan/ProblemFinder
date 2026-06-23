import { describe, expect, it } from "vitest";

import type { AutoReportTheme } from "./auto-report";
import { buildParetoTable } from "./pareto";

const themes: AutoReportTheme[] = [
  {
    title: "Cursor IDE overheating",
    products: ["Cursor"],
    examples: [],
    sourceUrls: [],
    summary: "Developers report Cursor causing thermal issues.",
    severity: "High",
    discussionCount: 2,
    threadCount: 2,
    tractionScore: 120,
    sharePercent: 0,
  },
  {
    title: "Stripe billing sync",
    products: ["Stripe"],
    examples: [],
    sourceUrls: [],
    summary: "Teams struggle with Stripe billing sync.",
    severity: "Medium",
    discussionCount: 1,
    threadCount: 1,
    tractionScore: 30,
    sharePercent: 0,
  },
];

describe("buildParetoTable", () => {
  it("ranks by traction and computes share from engagement", () => {
    const rows = buildParetoTable(themes);

    expect(rows[0]).toMatchObject({
      title: "Cursor IDE overheating",
      discussionCount: 2,
      threadCount: 2,
      tractionScore: 120,
      sharePercent: 80,
      cumulativePercent: 80,
    });
    expect(rows[1]?.sharePercent).toBe(20);
  });
});
