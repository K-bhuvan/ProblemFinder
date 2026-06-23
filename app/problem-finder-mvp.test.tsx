import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProblemFinderMvp } from "./problem-finder-mvp";

describe("ProblemFinderMvp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("analyzes a Hacker News query with a 7 day lookback and shows problem clusters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "deploy previews",
        searchTerms: ["deploy previews"],
        source: "Hacker News",
        lookbackDays: 7,
        fetchedCount: 12,
        hnRequestsUsed: 8,
        tractionQualifiedCount: 10,
        painClassifiedCount: 6,
        validatedProblemCount: 4,
        clusters: [
          {
            title: "Missing or inadequate tools",
            severity: "High",
            summary: "HN users describe annoying deploy-preview workflows.",
            source: "Hacker News",
            score: 41,
            tractionScore: 50,
            sourceUrls: ["https://news.ycombinator.com/item?id=123"],
            evidence: [
              {
                id: "123",
                title: "Ask HN: I wish deploy previews were simpler",
                text: "Every setup is annoying for small teams.",
                url: "https://news.ycombinator.com/item?id=123",
              },
            ],
          },
        ],
      }),
    } as Response);

    render(<ProblemFinderMvp />);

    fireEvent.change(screen.getByLabelText(/research query/i), {
      target: { value: "deploy previews" },
    });
    fireEvent.change(screen.getByLabelText(/lookback window/i), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run analysis/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /deploy previews/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText(/active sources:\s*hacker news/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/7 day lookback/i)).toBeInTheDocument();
    expect(screen.getByText(/ranked problem clusters/i)).toBeInTheDocument();
    expect(screen.getByText(/ask hn: i wish deploy previews were simpler/i)).toBeInTheDocument();
  });
});
