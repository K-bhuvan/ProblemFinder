import { describe, expect, it } from "vitest";

import { buildProblemId } from "../analysis/filter-problem-signals";
import type { ExtractedProblem } from "../analysis/types";
import { hnSourceUrlForProblem } from "./source-url";

describe("hnSourceUrlForProblem", () => {
  it("links comments to the parent thread", () => {
    const problem: ExtractedProblem = {
      id: buildProblemId("99"),
      statement: "Billing is painful.",
      evidenceId: "99",
      evidenceUrl: "https://news.ycombinator.com/item?id=99",
      evidenceType: "comment",
      parentStoryId: "12",
      points: 0,
      comments: 0,
      tractionScore: 40,
    };

    expect(hnSourceUrlForProblem(problem)).toBe(
      "https://news.ycombinator.com/item?id=12",
    );
  });
});
