import { describe, expect, it } from "vitest";

import {
  formatAutoReportEmailHtml,
  formatAutoReportEmailText,
} from "./format-auto-report-email";

const sampleReport = {
  periodLabel: "last 1 day",
  totalProblemsDiscussed: 12,
  themes: [],
  paretoTable: [
    {
      rank: 1,
      title: "Stripe billing and invoicing pain",
      products: ["Stripe"],
      sourceUrls: ["https://news.ycombinator.com/item?id=1"],
      discussionCount: 3,
      threadCount: 2,
      tractionScore: 90,
      sharePercent: 75,
      cumulativePercent: 75,
    },
  ],
  headlineThemes: [
    {
      title: "Stripe billing and invoicing pain",
      products: ["Stripe"],
      examples: [
        {
          statement: "Stripe invoicing is painful for small teams.",
          url: "https://news.ycombinator.com/item?id=1",
        },
      ],
      sourceUrls: ["https://news.ycombinator.com/item?id=1"],
      sharePercent: 75,
      discussionCount: 3,
      threadCount: 2,
      tractionScore: 90,
      summary: "Founders complain about Stripe billing workflows.",
      severity: "High" as const,
    },
  ],
  generatedAt: "2026-06-22T12:00:00.000Z",
};

describe("formatAutoReportEmailHtml", () => {
  it("renders an html table and headline theme blocks", () => {
    const html = formatAutoReportEmailHtml(sampleReport);

    expect(html).toContain("<table");
    expect(html).toContain("Pareto breakdown");
    expect(html).toContain("Stripe billing and invoicing pain");
    expect(html).toContain("Stripe invoicing is painful for small teams.");
    expect(html).toContain("https://news.ycombinator.com/item?id=1");
    expect(html).toContain("Not affiliated with Y Combinator");
    expect(html).not.toContain("Rank | Theme | Products");
  });
});

describe("formatAutoReportEmailText", () => {
  it("keeps a plain-text fallback", () => {
    const text = formatAutoReportEmailText(sampleReport);

    expect(text).toContain("PARETO BREAKDOWN");
    expect(text).toContain("Stripe billing and invoicing pain");
    expect(text).toContain("https://news.ycombinator.com/item?id=1");
    expect(text).toContain("Not affiliated with Y Combinator");
    expect(text).toContain("can make mistakes");
  });
});
