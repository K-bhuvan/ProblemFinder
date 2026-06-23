import { describe, expect, it, vi } from "vitest";

import { createHnRateLimiter } from "./rate-limiter";
import { createHnRequestBudget } from "./request-budget";
import {
  fetchProblemFocusedHackerNewsItems,
  fetchQueryFocusedHackerNewsItems,
} from "./fetch-hacker-news";

const testRateLimiter = createHnRateLimiter({
  maxRequestsPerHour: 10_000,
  minIntervalMs: 0,
});

describe("fetchQueryFocusedHackerNewsItems", () => {
  it("queries Algolia by search term and lookback cutoff", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            objectID: "123",
            title: "Ask HN: I wish deploy previews were simpler",
            comment_text: null,
            story_text: "Every setup is annoying for small teams.",
            author: "builder",
            created_at: "2026-06-21T12:00:00.000Z",
            points: 25,
            num_comments: 8,
            url: null,
            _tags: ["story"],
          },
        ],
      }),
    });

    const { items } = await fetchQueryFocusedHackerNewsItems({
      queries: ["deploy previews"],
      lookbackDays: 7,
      now: new Date("2026-06-22T12:00:00.000Z"),
      fetcher,
      rateLimiter: testRateLimiter,
      pagesPerQuery: 1,
      includeStoryComments: false,
      budget: createHnRequestBudget(10),
    });

    const requestedUrl = new URL(fetcher.mock.calls[0][0]);
    expect(requestedUrl.origin).toBe("https://hn.algolia.com");
    expect(requestedUrl.searchParams.get("query")).toBe("deploy previews");
    expect(items[0]).toMatchObject({
      id: "123",
      text: "Every setup is annoying for small teams.",
      url: "https://news.ycombinator.com/item?id=123",
    });
  });

  it("deduplicates items fetched across multiple search terms", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: "123",
              title: "Billing pain",
              story_text: "Stripe is frustrating.",
              author: "a",
              created_at: "2026-06-21T12:00:00.000Z",
              points: 5,
              num_comments: 1,
              _tags: ["story"],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: "123",
              title: "Billing pain",
              story_text: "Stripe is frustrating.",
              author: "a",
              created_at: "2026-06-21T12:00:00.000Z",
              points: 5,
              num_comments: 1,
              _tags: ["story"],
            },
            {
              objectID: "456",
              title: "SaaS billing",
              story_text: "Invoices are annoying.",
              author: "b",
              created_at: "2026-06-20T12:00:00.000Z",
              points: 3,
              num_comments: 2,
              _tags: ["story"],
            },
          ],
        }),
      });

    const { items } = await fetchQueryFocusedHackerNewsItems({
      queries: ["billing tools", "saas billing"],
      lookbackDays: 7,
      now: new Date("2026-06-22T12:00:00.000Z"),
      fetcher,
      rateLimiter: testRateLimiter,
      pagesPerQuery: 1,
      includeStoryComments: false,
      budget: createHnRequestBudget(10),
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual(["123", "456"]);
  });
});

describe("fetchProblemFocusedHackerNewsItems", () => {
  it("queries multiple pain-focused searches sequentially and deduplicates results", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            objectID: "999",
            title: "Ask HN: Why is billing so painful?",
            story_text: "Invoicing is frustrating.",
            author: "a",
            created_at: "2026-06-21T12:00:00.000Z",
            points: 5,
            num_comments: 1,
            _tags: ["story"],
          },
        ],
      }),
    });

    const { items, hnRequestsUsed } = await fetchProblemFocusedHackerNewsItems({
      lookbackDays: 1,
      now: new Date("2026-06-22T12:00:00.000Z"),
      fetcher,
      rateLimiter: testRateLimiter,
      budget: createHnRequestBudget(10),
      searchSpecs: [
        { query: "billing pain", pages: 1 },
        { query: "frustrated", pages: 1 },
      ],
      includeStoryComments: false,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("999");
    expect(hnRequestsUsed).toBe(2);
  });

  it("applies high-credibility numeric filters when configured", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hits: [] }),
    });

    await fetchProblemFocusedHackerNewsItems({
      lookbackDays: 7,
      now: new Date("2026-06-22T12:00:00.000Z"),
      fetcher,
      rateLimiter: testRateLimiter,
      budget: createHnRequestBudget(10),
      searchSpecs: [
        {
          tags: "story",
          numericFilters: ["points>30", "num_comments>20"],
          pages: 1,
        },
      ],
      includeStoryComments: false,
    });

    const requestedUrl = new URL(fetcher.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get("tags")).toBe("story");
    expect(requestedUrl.searchParams.get("numericFilters")).toContain("points>30");
    expect(requestedUrl.searchParams.get("numericFilters")).toContain(
      "num_comments>20",
    );
  });
});
