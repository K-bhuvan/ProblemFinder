import { describe, expect, it } from "vitest";

import type { EvidenceItem } from "../analysis/types";
import {
  filterTractionQualifiedItems,
  meetsMinTractionForExtraction,
} from "./pipeline-thresholds";

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

describe("meetsMinTractionForExtraction", () => {
  it("requires minimum engagement for regular stories", () => {
    expect(
      meetsMinTractionForExtraction(
        item({ points: 4, comments: 2 }),
        20,
      ),
    ).toBe(false);
    expect(
      meetsMinTractionForExtraction(
        item({ points: 10, comments: 4 }),
        20,
      ),
    ).toBe(true);
  });

  it("uses a lower threshold for Ask HN posts", () => {
    expect(
      meetsMinTractionForExtraction(
        item({
          title: "Ask HN: Better billing tools?",
          points: 8,
          comments: 2,
        }),
        20,
      ),
    ).toBe(true);
  });
});

describe("filterTractionQualifiedItems", () => {
  it("drops low-traction posts before extraction", () => {
    const filtered = filterTractionQualifiedItems(
      [
        item({ id: "low", points: 1, comments: 1 }),
        item({ id: "high", points: 20, comments: 10 }),
      ],
      20,
    );

    expect(filtered.map((entry) => entry.id)).toEqual(["high"]);
  });
});
