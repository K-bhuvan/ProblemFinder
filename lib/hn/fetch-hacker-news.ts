import type { EvidenceItem } from "../analysis/types";
import { fetchTopStoryComments } from "./fetch-story-comments";
import {
  buildProblemSearchSpecs,
  MAX_COMMENTS_PER_STORY,
  MAX_STORIES_FOR_COMMENT_MINING,
  MIN_STORY_COMMENTS_FOR_MINING,
  PROBLEM_SEARCH_HITS_PER_PAGE,
  type ProblemSearchSpec,
  type HnSearchSpec,
} from "./problem-search-queries";
import {
  createHnRequestBudget,
  type HnRequestBudget,
} from "./request-budget";
import type { HnRateLimiter } from "./rate-limiter";
import { getSharedHnRateLimiter, hnRateLimitedFetch } from "./rate-limiter";

type Fetcher = typeof fetch;

type HnHit = {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
  author?: string | null;
  created_at?: string | null;
  points?: number | null;
  num_comments?: number | null;
  url?: string | null;
  _tags?: string[];
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toEvidenceItem(hit: HnHit): EvidenceItem {
  const title = hit.title ?? hit.story_title ?? "Hacker News discussion";
  const text = stripHtml(hit.comment_text ?? hit.story_text ?? "");

  return {
    id: hit.objectID,
    title,
    text,
    url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    author: hit.author ?? "unknown",
    createdAt: hit.created_at ?? new Date(0).toISOString(),
    points: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
    type: hit._tags?.includes("comment") ? "comment" : "story",
    source: "Hacker News",
  };
}

function sinceSeconds(lookbackDays: number, now: Date) {
  return Math.floor((now.getTime() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);
}

function buildNumericFilters(since: number, extra: string[] = []) {
  return [`created_at_i>${since}`, ...extra].join(",");
}

async function fetchHackerNewsPage({
  spec,
  lookbackDays,
  page,
  now = new Date(),
  fetcher = fetch,
  rateLimiter = getSharedHnRateLimiter(),
  budget,
}: {
  spec: HnSearchSpec;
  lookbackDays: number;
  page: number;
  now?: Date;
  fetcher?: Fetcher;
  rateLimiter?: HnRateLimiter;
  budget?: HnRequestBudget;
}): Promise<EvidenceItem[]> {
  if (budget && !budget.canSpend()) {
    return [];
  }

  const url = new URL("https://hn.algolia.com/api/v1/search_by_date");

  if (spec.query) {
    url.searchParams.set("query", spec.query);
  }

  url.searchParams.set("tags", spec.tags ?? "(story,comment,ask_hn)");
  url.searchParams.set(
    "numericFilters",
    buildNumericFilters(sinceSeconds(lookbackDays, now), spec.numericFilters),
  );
  url.searchParams.set("hitsPerPage", String(PROBLEM_SEARCH_HITS_PER_PAGE));
  url.searchParams.set("page", String(page));

  const response = await hnRateLimitedFetch(
    url.toString(),
    undefined,
    fetcher,
    rateLimiter,
  );

  budget?.spend();

  if (!response.ok) {
    throw new Error("Unable to fetch Hacker News results");
  }

  const payload = (await response.json()) as { hits?: HnHit[] };

  return (payload.hits ?? []).map(toEvidenceItem);
}

export async function fetchQueryFocusedHackerNewsItems({
  queries,
  lookbackDays,
  now = new Date(),
  fetcher = fetch,
  rateLimiter = getSharedHnRateLimiter(),
  pagesPerQuery = 2,
  includeStoryComments = true,
  budget = createHnRequestBudget(),
}: {
  queries: string[];
  lookbackDays: number;
  now?: Date;
  fetcher?: Fetcher;
  rateLimiter?: HnRateLimiter;
  pagesPerQuery?: number;
  includeStoryComments?: boolean;
  budget?: HnRequestBudget;
}): Promise<ProblemFocusedFetchResult> {
  const uniqueQueries = [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
  const itemsById = new Map<string, EvidenceItem>();

  for (const query of uniqueQueries) {
    const pages = Array.from({ length: pagesPerQuery }, (_, index) => index);

    for (const page of pages) {
      if (!budget.canSpend()) {
        break;
      }

      const items = await fetchHackerNewsPage({
        spec: { query },
        lookbackDays,
        page,
        now,
        fetcher,
        rateLimiter,
        budget,
      });

      for (const item of items) {
        itemsById.set(item.id, item);
      }
    }
  }

  const stories = [...itemsById.values()];

  if (includeStoryComments && budget.remaining() > 5) {
    const comments = await fetchTopStoryComments({
      stories,
      fetcher,
      rateLimiter,
      budget,
      maxStories: MAX_STORIES_FOR_COMMENT_MINING,
      maxCommentsPerStory: MAX_COMMENTS_PER_STORY,
      minStoryComments: MIN_STORY_COMMENTS_FOR_MINING,
    });

    for (const comment of comments) {
      itemsById.set(comment.id, comment);
    }
  }

  return {
    items: [...itemsById.values()],
    hnRequestsUsed: budget.used,
  };
}

export type ProblemFocusedFetchResult = {
  items: EvidenceItem[];
  hnRequestsUsed: number;
};

export async function fetchProblemFocusedHackerNewsItems({
  lookbackDays,
  now = new Date(),
  fetcher = fetch,
  rateLimiter = getSharedHnRateLimiter(),
  searchSpecs = buildProblemSearchSpecs(),
  includeStoryComments = true,
  budget = createHnRequestBudget(),
}: {
  lookbackDays: number;
  now?: Date;
  fetcher?: Fetcher;
  rateLimiter?: HnRateLimiter;
  searchSpecs?: ProblemSearchSpec[];
  includeStoryComments?: boolean;
  budget?: HnRequestBudget;
}): Promise<ProblemFocusedFetchResult> {
  const itemsById = new Map<string, EvidenceItem>();

  for (const spec of searchSpecs) {
    const pages = Array.from({ length: spec.pages ?? 2 }, (_, index) => index);

    for (const page of pages) {
      if (!budget.canSpend()) {
        break;
      }

      const items = await fetchHackerNewsPage({
        spec,
        lookbackDays,
        page,
        now,
        fetcher,
        rateLimiter,
        budget,
      });

      for (const item of items) {
        itemsById.set(item.id, item);
      }
    }
  }

  const stories = [...itemsById.values()];

  if (includeStoryComments && budget.remaining() > 5) {
    const comments = await fetchTopStoryComments({
      stories,
      fetcher,
      rateLimiter,
      budget,
      maxStories: MAX_STORIES_FOR_COMMENT_MINING,
      maxCommentsPerStory: MAX_COMMENTS_PER_STORY,
      minStoryComments: MIN_STORY_COMMENTS_FOR_MINING,
    });

    for (const comment of comments) {
      itemsById.set(comment.id, comment);
    }
  }

  return {
    items: [...itemsById.values()],
    hnRequestsUsed: budget.used,
  };
}
