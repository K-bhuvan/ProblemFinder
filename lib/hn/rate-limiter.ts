const DEFAULT_MAX_REQUESTS_PER_HOUR = 8_000;
const DEFAULT_MIN_INTERVAL_MS = 250;
const HOUR_MS = 60 * 60 * 1000;

export type HnRateLimiterConfig = {
  maxRequestsPerHour: number;
  minIntervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export type HnRateLimiter = {
  schedule: <T>(task: () => Promise<T>) => Promise<T>;
  getStats: () => { requestsInLastHour: number; maxRequestsPerHour: number };
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createHnRateLimiter(
  config: Partial<HnRateLimiterConfig> = {},
): HnRateLimiter {
  const maxRequestsPerHour =
    config.maxRequestsPerHour ??
    Number(process.env.HN_RATE_LIMIT_PER_HOUR ?? DEFAULT_MAX_REQUESTS_PER_HOUR);
  const minIntervalMs =
    config.minIntervalMs ??
    Number(process.env.HN_MIN_REQUEST_INTERVAL_MS ?? DEFAULT_MIN_INTERVAL_MS);
  const now = config.now ?? Date.now;
  const sleep = config.sleep ?? defaultSleep;

  const requestTimestamps: number[] = [];
  let lastRequestAt: number | null = null;

  async function waitForSlot() {
    while (true) {
      const currentTime = now();
      const hourAgo = currentTime - HOUR_MS;

      while (requestTimestamps.length > 0 && requestTimestamps[0]! <= hourAgo) {
        requestTimestamps.shift();
      }

      if (requestTimestamps.length >= maxRequestsPerHour) {
        const oldest = requestTimestamps[0]!;
        await sleep(oldest + HOUR_MS - currentTime + 50);
        continue;
      }

      const elapsed = lastRequestAt === null ? minIntervalMs : currentTime - lastRequestAt;
      if (elapsed < minIntervalMs) {
        await sleep(minIntervalMs - elapsed);
      }

      return;
    }
  }

  function recordRequest() {
    const currentTime = now();
    lastRequestAt = currentTime;
    requestTimestamps.push(currentTime);
  }

  return {
    async schedule<T>(task: () => Promise<T>) {
      await waitForSlot();
      const result = await task();
      recordRequest();
      return result;
    },
    getStats() {
      const currentTime = now();
      const hourAgo = currentTime - HOUR_MS;
      const requestsInLastHour = requestTimestamps.filter(
        (timestamp) => timestamp > hourAgo,
      ).length;

      return { requestsInLastHour, maxRequestsPerHour };
    },
  };
}

const sharedLimiter = createHnRateLimiter();

export function getSharedHnRateLimiter() {
  return sharedLimiter;
}

export async function hnRateLimitedFetch(
  input: string,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
  rateLimiter: HnRateLimiter = sharedLimiter,
) {
  return rateLimiter.schedule(() => fetcher(input, init));
}
