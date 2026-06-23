import { describe, expect, it } from "vitest";

import { isStructurallyNoisy } from "./problem-statement-quality";

describe("isStructurallyNoisy", () => {
  it("rejects HTML-encoded quote fragments", () => {
    expect(isStructurallyNoisy("&gt; ...")).toBe(true);
    expect(isStructurallyNoisy("> ...")).toBe(true);
  });

  it("does not reject substantive statements on semantics alone", () => {
    expect(isStructurallyNoisy("Is Fable Back?")).toBe(false);
    expect(
      isStructurallyNoisy(
        "Stripe billing webhooks are painful to debug for small teams.",
      ),
    ).toBe(false);
  });
});
