import { describe, expect, it, vi } from "vitest";

import type { EvidenceItem } from "./types";
import { buildProblemId } from "./filter-problem-signals";
import { classifyPainEvidence } from "./classify-pain-evidence";

const baseItem: EvidenceItem = {
  id: "1",
  title: "Is Fable Back?",
  text: "Curious if the company is returning.",
  url: "https://news.ycombinator.com/item?id=1",
  author: "a",
  createdAt: "2026-06-21T12:00:00.000Z",
  points: 40,
  comments: 20,
  type: "story",
  source: "Hacker News",
};

describe("classifyPainEvidence", () => {
  it("keeps only LLM-labeled pain_point evidence", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              classifications: [
                {
                  evidenceId: "1",
                  label: "news_update",
                  reason: "Company comeback question.",
                },
                {
                  evidenceId: "2",
                  label: "pain_point",
                  reason: "Billing workflow frustration.",
                },
              ],
            }),
          },
        },
      ],
    });

    const filtered = await classifyPainEvidence({
      items: [
        baseItem,
        {
          ...baseItem,
          id: "2",
          title: "Ask HN: Billing tools are painful",
          text: "Invoicing is frustrating for small teams.",
        },
      ],
      createCompletion,
    });

    expect(filtered.map((item) => item.id)).toEqual(["2"]);
  });
});
