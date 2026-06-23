import { describe, expect, it, vi } from "vitest";

import { createHnRateLimiter } from "./rate-limiter";

describe("createHnRateLimiter", () => {
  it("spaces requests by the minimum interval", async () => {
    const now = vi.fn();
    const sleep = vi.fn(async (ms: number) => {
      current += ms;
    });
    let current = 0;

    now.mockImplementation(() => current);

    const limiter = createHnRateLimiter({
      maxRequestsPerHour: 100,
      minIntervalMs: 200,
      now,
      sleep,
    });

    const task = vi.fn(async () => "ok");

    await limiter.schedule(task);
    current += 50;
    await limiter.schedule(task);

    expect(task).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(150);
  });

  it("waits when the hourly budget is exhausted", async () => {
    const now = vi.fn();
    const sleep = vi.fn(async (ms: number) => {
      current += ms;
    });
    let current = 1_000;

    now.mockImplementation(() => current);

    const limiter = createHnRateLimiter({
      maxRequestsPerHour: 2,
      minIntervalMs: 0,
      now,
      sleep,
    });

    const task = vi.fn(async () => "ok");

    await limiter.schedule(task);
    await limiter.schedule(task);
    await limiter.schedule(task);

    expect(sleep).toHaveBeenCalled();
    expect(task).toHaveBeenCalledTimes(3);
  });
});
