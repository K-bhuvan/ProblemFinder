import { describe, expect, it } from "vitest";

import { verifyCronSecret } from "./verify-cron-secret";

describe("verifyCronSecret", () => {
  it("accepts a matching bearer token", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/auto-report", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(verifyCronSecret(request)).toBe(true);
  });

  it("rejects missing or wrong tokens", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/auto-report");

    expect(verifyCronSecret(request)).toBe(false);
  });
});
