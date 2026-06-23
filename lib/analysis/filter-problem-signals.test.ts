import { describe, expect, it } from "vitest";

import type { EvidenceItem } from "./types";
import { filterUsableEvidenceItems } from "./filter-problem-signals";

const baseItem: EvidenceItem = {
  id: "1",
  title: "Show HN: My startup",
  text: "We launched today.",
  url: "https://news.ycombinator.com/item?id=1",
  author: "a",
  createdAt: "2026-06-21T12:00:00.000Z",
  points: 5,
  comments: 1,
  type: "story",
  source: "Hacker News",
};

describe("filterUsableEvidenceItems", () => {
  it("drops empty and structurally noisy evidence", () => {
    const items: EvidenceItem[] = [
      baseItem,
      {
        ...baseItem,
        id: "2",
        title: "Comment on: thread",
        text: "> ...",
        type: "comment",
      },
      {
        ...baseItem,
        id: "3",
        title: "Ask HN: Better billing tools?",
        text: "Invoicing is frustrating for small teams.",
      },
    ];

    const filtered = filterUsableEvidenceItems(items);

    expect(filtered.map((item) => item.id)).toEqual(["1", "3"]);
  });
});
