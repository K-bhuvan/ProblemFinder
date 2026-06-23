import { describe, expect, it, vi } from "vitest";

import type { EvidenceItem } from "./types";
import { buildProblemId } from "./filter-problem-signals";
import { extractProblemsFromEvidence } from "./extract-problems";

const sampleItems: EvidenceItem[] = [
  {
    id: "123",
    title: "Ask HN: Billing tools are painful",
    text: "Invoicing is frustrating for small teams.",
    url: "https://news.ycombinator.com/item?id=123",
    author: "a",
    createdAt: "2026-06-21T12:00:00.000Z",
    points: 20,
    comments: 10,
    type: "story",
    source: "Hacker News",
  },
];

describe("extractProblemsFromEvidence", () => {
  it("maps LLM extracted problems back to evidence with traction", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problems: [
                {
                  id: buildProblemId("123"),
                  statement: "Small teams struggle with invoicing.",
                  evidenceId: "123",
                  products: ["Stripe"],
                },
              ],
            }),
          },
        },
      ],
    });

    const problems = await extractProblemsFromEvidence({
      items: sampleItems,
      createCompletion,
    });

    expect(problems[0]).toMatchObject({
      id: buildProblemId("123"),
      statement: "Small teams struggle with invoicing.",
      evidenceId: "123",
      evidenceType: "story",
      tractionScore: 50,
    });
  });

  it("returns no problems when the LLM skips an item", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ problems: [] }),
          },
        },
      ],
    });

    const problems = await extractProblemsFromEvidence({
      items: sampleItems,
      createCompletion,
    });

    expect(problems).toHaveLength(0);
  });
});
