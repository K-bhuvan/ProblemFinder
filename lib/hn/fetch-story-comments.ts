import type { EvidenceItem } from "../analysis/types";
import { meetsMinTractionForExtraction } from "../analysis/pipeline-thresholds";
import { tractionScoreForEvidence } from "./engagement";
import type { HnRequestBudget } from "./request-budget";
import type { HnRateLimiter } from "./rate-limiter";
import { getSharedHnRateLimiter, hnRateLimitedFetch } from "./rate-limiter";

type Fetcher = typeof fetch;

type FirebaseItem = {
  id?: number;
  type?: string;
  kids?: number[];
  text?: string;
  title?: string;
  by?: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFirebaseItem({
  id,
  fetcher,
  rateLimiter,
  budget,
}: {
  id: string;
  fetcher: Fetcher;
  rateLimiter: HnRateLimiter;
  budget?: HnRequestBudget;
}) {
  if (budget && !budget.canSpend()) {
    return null;
  }

  const response = await hnRateLimitedFetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
    undefined,
    fetcher,
    rateLimiter,
  );

  budget?.spend();

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as FirebaseItem | null;
}

function toCommentEvidence({
  comment,
  story,
}: {
  comment: FirebaseItem;
  story: EvidenceItem;
}): EvidenceItem | null {
  const text = stripHtml(comment.text ?? "");

  if (!text) {
    return null;
  }

  return {
    id: String(comment.id),
    title: `Comment on: ${story.title}`,
    text,
    url: `https://news.ycombinator.com/item?id=${comment.id}`,
    author: comment.by ?? "unknown",
    createdAt: new Date(0).toISOString(),
    points: 0,
    comments: 0,
    type: "comment",
    source: "Hacker News",
    parentStoryId: story.id,
    threadPoints: story.points,
    threadComments: story.comments,
  };
}

export async function fetchTopStoryComments({
  stories,
  maxStories = 5,
  maxCommentsPerStory = 4,
  minStoryComments = 25,
  fetcher = fetch,
  rateLimiter = getSharedHnRateLimiter(),
  budget,
}: {
  stories: EvidenceItem[];
  maxStories?: number;
  maxCommentsPerStory?: number;
  minStoryComments?: number;
  fetcher?: Fetcher;
  rateLimiter?: HnRateLimiter;
  budget?: HnRequestBudget;
}): Promise<EvidenceItem[]> {
  const commentReadyStories = stories
    .filter(
      (story) =>
        story.type !== "comment" &&
        story.comments >= minStoryComments &&
        meetsMinTractionForExtraction(story),
    )
    .sort(
      (left, right) =>
        tractionScoreForEvidence(right) - tractionScoreForEvidence(left),
    )
    .slice(0, maxStories);

  const comments: EvidenceItem[] = [];

  for (const story of commentReadyStories) {
    if (budget && !budget.canSpend()) {
      break;
    }

    const storyItem = await fetchFirebaseItem({
      id: story.id,
      fetcher,
      rateLimiter,
      budget,
    });

    const childIds = (storyItem?.kids ?? []).slice(0, maxCommentsPerStory);

    for (const childId of childIds) {
      if (budget && !budget.canSpend()) {
        break;
      }

      const commentItem = await fetchFirebaseItem({
        id: String(childId),
        fetcher,
        rateLimiter,
        budget,
      });

      if (!commentItem || commentItem.type !== "comment") {
        continue;
      }

      const evidence = toCommentEvidence({
        comment: commentItem,
        story,
      });

      if (evidence) {
        comments.push(evidence);
      }
    }
  }

  return comments;
}
