import type { EvidenceItem } from "../analysis/types";
import type { ExtractedProblem } from "../analysis/types";

export function hnSourceUrlForProblem(problem: ExtractedProblem) {
  if (problem.parentStoryId) {
    return `https://news.ycombinator.com/item?id=${problem.parentStoryId}`;
  }

  return problem.evidenceUrl;
}

export function hnSourceUrlForEvidence(item: EvidenceItem) {
  if (item.parentStoryId) {
    return `https://news.ycombinator.com/item?id=${item.parentStoryId}`;
  }

  return item.url;
}

export function uniqueHnSourceUrls(problems: ExtractedProblem[]) {
  return [...new Set(problems.map(hnSourceUrlForProblem))];
}

export function uniqueHnSourceUrlsFromEvidence(items: EvidenceItem[]) {
  return [...new Set(items.map(hnSourceUrlForEvidence))];
}
