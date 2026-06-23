export type HnRequestBudget = {
  max: number;
  used: number;
  canSpend: (count?: number) => boolean;
  spend: (count?: number) => void;
  remaining: () => number;
};

export function getMaxHnRequestsPerRun() {
  const parsed = Number(process.env.HN_MAX_REQUESTS_PER_RUN ?? 60);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

export function createHnRequestBudget(max = getMaxHnRequestsPerRun()): HnRequestBudget {
  let used = 0;

  return {
    max,
    get used() {
      return used;
    },
    canSpend(count = 1) {
      return used + count <= max;
    },
    spend(count = 1) {
      used += count;
    },
    remaining() {
      return Math.max(max - used, 0);
    },
  };
}
