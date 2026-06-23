import { describe, expect, it, vi } from "vitest";

import { buildProblemId } from "./filter-problem-signals";
import type { ExtractedProblem } from "./types";
import { validatePainProblems } from "./validate-pain-problems";

const sampleProblems: ExtractedProblem[] = [
  {
    id: buildProblemId("1"),
    statement: "Is Fable Back?",
    evidenceId: "1",
    evidenceUrl: "https://news.ycombinator.com/item?id=1",
    products: [],
    evidenceType: "story",
    points: 40,
    comments: 20,
    tractionScore: 100,
  },
  {
    id: buildProblemId("2"),
    statement: "Stripe invoicing is painful for small teams.",
    evidenceId: "2",
    evidenceUrl: "https://news.ycombinator.com/item?id=2",
    products: ["Stripe"],
    evidenceType: "story",
    points: 30,
    comments: 10,
    tractionScore: 60,
  },
];

describe("validatePainProblems", () => {
  it("keeps only LLM-validated pain points", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              validations: [
                {
                  problemId: buildProblemId("1"),
                  isPainPoint: false,
                  reason: "News headline, not a user pain.",
                },
                {
                  problemId: buildProblemId("2"),
                  isPainPoint: true,
                  reason: "Concrete billing workflow pain.",
                },
              ],
            }),
          },
        },
      ],
    });

    const validated = await validatePainProblems({
      problems: sampleProblems,
      createCompletion,
    });

    expect(validated).toHaveLength(1);
    expect(validated[0]?.id).toBe(buildProblemId("2"));
  });
});
