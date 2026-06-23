import { describe, expect, it } from "vitest";

import { tractionForProblems, tractionScoreForEvidence } from "./engagement";
import type { EvidenceItem } from "../analysis/types";

const story = (overrides: Partial<EvidenceItem>): EvidenceItem => ({
  id: "1",
  title: "Story",
  text: "text",
  url: "https://news.ycombinator.com/item?id=1",
  author: "a",
  createdAt: "2026-06-21T12:00:00.000Z",
  points: 0,
  comments: 0,
  type: "story",
  source: "Hacker News",
  ...overrides,
});

describe("tractionScoreForEvidence", () => {
  it("uses points and comments for stories", () => {
    expect(
      tractionScoreForEvidence(
        story({
          points: 40,
          comments: 20,
        }),
      ),
    ).toBe(100);
  });

  it("uses parent thread engagement for mined comments", () => {
    expect(
      tractionScoreForEvidence(
        story({
          id: "99",
          type: "comment",
          parentStoryId: "1",
          threadPoints: 40,
          threadComments: 20,
        }),
      ),
    ).toBe(100);
  });
});

describe("tractionForProblems", () => {
  it("dedupes traction by thread", () => {
    const metrics = tractionForProblems([
      {
        evidenceId: "c1",
        parentStoryId: "story-1",
        tractionScore: 100,
      },
      {
        evidenceId: "c2",
        parentStoryId: "story-1",
        tractionScore: 100,
      },
      {
        evidenceId: "story-2",
        tractionScore: 30,
      },
    ]);

    expect(metrics.mentionCount).toBe(3);
    expect(metrics.threadCount).toBe(2);
    expect(metrics.tractionScore).toBe(130);
  });
});
