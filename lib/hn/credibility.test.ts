import { describe, expect, it } from "vitest";

import type { EvidenceItem } from "../analysis/types";
import {
  credibilityScore,
  prioritizeCredibilityItems,
} from "./credibility";

const item = (overrides: Partial<EvidenceItem>): EvidenceItem => ({
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

describe("credibilityScore", () => {
  it("ranks high-engagement and Ask HN posts higher", () => {
    const low = item({ id: "low", points: 2, comments: 1 });
    const high = item({ id: "high", points: 80, comments: 40 });
    const ask = item({
      id: "ask",
      title: "Ask HN: Why is billing painful?",
      points: 12,
      comments: 6,
    });

    expect(credibilityScore(high)).toBeGreaterThan(credibilityScore(low));
    expect(credibilityScore(ask)).toBeGreaterThan(credibilityScore(low));
    expect(credibilityScore(high)).toBeGreaterThanOrEqual(25);
  });

  it("prioritizes the most credible items first", () => {
    const ranked = prioritizeCredibilityItems(
      [
        item({ id: "a", points: 5, comments: 2 }),
        item({ id: "b", points: 100, comments: 50 }),
        item({ id: "c", points: 20, comments: 10 }),
      ],
      2,
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["b", "c"]);
  });
});
