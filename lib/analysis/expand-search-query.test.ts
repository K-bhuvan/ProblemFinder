import { describe, expect, it, vi } from "vitest";

import { expandSearchQuery } from "./expand-search-query";

describe("expandSearchQuery", () => {
  it("keeps short keyword queries unchanged", async () => {
    const createCompletion = vi.fn();

    const terms = await expandSearchQuery({
      query: "robotics",
      createCompletion,
    });

    expect(terms).toEqual(["robotics"]);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("expands natural language into Hacker News search terms", async () => {
    const createCompletion = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              searchTerms: [
                "billing tools indie hackers",
                "saas billing pain",
                "stripe alternative",
              ],
            }),
          },
        },
      ],
    });

    const terms = await expandSearchQuery({
      query: "What problems do indie hackers have with billing tools?",
      createCompletion,
    });

    expect(createCompletion).toHaveBeenCalledOnce();
    expect(terms).toEqual([
      "billing tools indie hackers",
      "saas billing pain",
      "stripe alternative",
    ]);
  });
});
