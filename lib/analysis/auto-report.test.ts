import { describe, expect, it, vi } from "vitest";

import type { ExtractedProblem } from "./types";
import { buildProblemId } from "./filter-problem-signals";
import {
  generateAutoReport,
  shouldRunScheduledReport,
} from "./auto-report";

const sampleProblems: ExtractedProblem[] = [
  {
    id: buildProblemId("1"),
    statement: "Stripe invoicing is painful for small teams.",
    evidenceId: "1",
    evidenceUrl: "https://news.ycombinator.com/item?id=1",
    products: ["Stripe"],
    evidenceType: "story",
    parentStoryId: undefined,
    points: 30,
    comments: 10,
    tractionScore: 60,
  },
  {
    id: buildProblemId("2"),
    statement: "Stripe billing integrations are hard to maintain.",
    evidenceId: "2",
    evidenceUrl: "https://news.ycombinator.com/item?id=2",
    products: ["Stripe"],
    evidenceType: "story",
    parentStoryId: undefined,
    points: 20,
    comments: 5,
    tractionScore: 35,
  },
  {
    id: buildProblemId("3"),
    statement: "GitHub Actions deploy previews are hard to set up.",
    evidenceId: "3",
    evidenceUrl: "https://news.ycombinator.com/item?id=3",
    products: ["GitHub Actions"],
    evidenceType: "story",
    parentStoryId: undefined,
    points: 10,
    comments: 4,
    tractionScore: 22,
  },
  {
    id: buildProblemId("4"),
    statement: "GitHub Actions CI queues are slow for small repos.",
    evidenceId: "4",
    evidenceUrl: "https://news.ycombinator.com/item?id=4",
    products: ["GitHub Actions"],
    evidenceType: "story",
    parentStoryId: undefined,
    points: 8,
    comments: 2,
    tractionScore: 14,
  },
];

describe("generateAutoReport", () => {
  it("builds a pareto table ranked by traction", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              themes: [
                {
                  title: "Stripe billing and invoicing pain",
                  summary: "Founders complain about Stripe billing workflows.",
                  severity: "High",
                  products: ["Stripe"],
                  problemIds: [buildProblemId("1"), buildProblemId("2")],
                },
                {
                  title: "GitHub Actions workflow friction",
                  summary: "Teams struggle with GitHub Actions deploy and CI friction.",
                  severity: "Medium",
                  products: ["GitHub Actions"],
                  problemIds: [buildProblemId("3"), buildProblemId("4")],
                },
              ],
            }),
          },
        },
      ],
    });

    const report = await generateAutoReport({
      problems: sampleProblems,
      periodLabel: "last 1 day",
      createCompletion,
    });

    expect(report.totalProblemsDiscussed).toBe(4);
    expect(report.paretoTable[0]).toMatchObject({
      products: ["Stripe"],
      sourceUrls: [
        "https://news.ycombinator.com/item?id=1",
        "https://news.ycombinator.com/item?id=2",
      ],
      discussionCount: 2,
      threadCount: 2,
      tractionScore: 95,
      sharePercent: 100,
    });
  });
});

describe("shouldRunScheduledReport", () => {
  it("runs daily reports every day", () => {
    expect(
      shouldRunScheduledReport({
        frequency: "daily",
        now: new Date("2026-06-22T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("runs weekly reports only on monday", () => {
    expect(
      shouldRunScheduledReport({
        frequency: "weekly",
        now: new Date("2026-06-22T12:00:00.000Z"),
      }),
    ).toBe(true);

    expect(
      shouldRunScheduledReport({
        frequency: "weekly",
        now: new Date("2026-06-23T12:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
