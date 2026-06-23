export type HnSearchSpec = {
  query?: string;
  tags?: string;
  /** Extra Algolia numeric filters (ANDed with created_at_i cutoff). */
  numericFilters?: string[];
};

/** Pain-signal keyword searches. */
export const PROBLEM_SEARCH_QUERIES = [
  "frustrated OR frustrating OR painful",
  "broken OR \"doesn't work\" OR bug OR outage",
  "wish OR \"I wish\" OR \"there should be\"",
  "annoying OR struggle OR struggling OR difficult",
  "terrible OR awful OR worst OR hate",
  "problem OR workaround OR \"unmet need\"",
  "Ask HN",
] as const;

/** High-engagement story searches (points + comments). */
export const HIGH_CREDIBILITY_SEARCH_SPECS: HnSearchSpec[] = [
  {
    tags: "story",
    numericFilters: ["points>30", "num_comments>20"],
  },
  {
    tags: "ask_hn",
    numericFilters: ["points>10", "num_comments>8"],
  },
  {
    tags: "story",
    query: "frustrated OR problem OR broken OR struggle",
    numericFilters: ["points>15", "num_comments>10"],
  },
];

export type ProblemSearchSpec = HnSearchSpec & {
  pages?: number;
};

export const PROBLEM_SEARCH_PAGES_PER_QUERY = 2;
export const HIGH_CREDIBILITY_PAGES_PER_QUERY = 2;
export const PROBLEM_SEARCH_HITS_PER_PAGE = 100;
export const MAX_EXTRACTION_CANDIDATES = 50;
export const MAX_STORIES_FOR_COMMENT_MINING = 5;
export const MAX_COMMENTS_PER_STORY = 4;
export const MIN_STORY_COMMENTS_FOR_MINING = 25;

export function buildProblemSearchSpecs(): ProblemSearchSpec[] {
  return [
    ...PROBLEM_SEARCH_QUERIES.map((query) => ({
      query,
      pages: PROBLEM_SEARCH_PAGES_PER_QUERY,
    })),
    ...HIGH_CREDIBILITY_SEARCH_SPECS.map((spec) => ({
      ...spec,
      pages: HIGH_CREDIBILITY_PAGES_PER_QUERY,
    })),
  ];
}
