import { describe, expect, it, vi } from "vitest";

import { buildProblemId } from "./filter-problem-signals";
import type { EvidenceItem, ExtractedProblem } from "./types";
import { synthesizeClustersFromProblems } from "./synthesize-clusters";

const evidenceById = new Map<string, EvidenceItem>([
  [
    "123",
    {
      id: "123",
      title: "Ask HN: I wish deploy previews were simpler",
      text: "Every setup is annoying for small teams.",
      url: "https://news.ycombinator.com/item?id=123",
      author: "builder",
      createdAt: "2026-06-21T12:00:00.000Z",
      points: 25,
      comments: 8,
      type: "story",
      source: "Hacker News",
    },
  ],
]);

const sampleProblems: ExtractedProblem[] = [
  {
    id: buildProblemId("123"),
    statement: "Deploy preview setups are annoying for small teams.",
    evidenceId: "123",
    evidenceUrl: "https://news.ycombinator.com/item?id=123",
    products: [],
    evidenceType: "story",
    points: 25,
    comments: 8,
    tractionScore: 49,
  },
];

describe("synthesizeClustersFromProblems", () => {
  it("maps LLM cluster output back to validated problems and evidence", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              clusters: [
                {
                  title: "Deploy preview workflows are too painful",
                  severity: "High",
                  summary:
                    "Small teams find deploy preview setups annoying and overly complex.",
                  problemIds: [buildProblemId("123")],
                },
              ],
            }),
          },
        },
      ],
    });

    const clusters = await synthesizeClustersFromProblems({
      query: "deploy previews",
      problems: sampleProblems,
      evidenceById,
      createCompletion,
    });

    expect(createCompletion).toHaveBeenCalledOnce();
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      title: "Deploy preview workflows are too painful",
      severity: "High",
      source: "Hacker News",
      evidence: [
        expect.objectContaining({
          id: "123",
          url: "https://news.ycombinator.com/item?id=123",
        }),
      ],
    });
  });
});
