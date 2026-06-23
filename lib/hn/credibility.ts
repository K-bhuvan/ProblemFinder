import type { EvidenceItem } from "../analysis/types";
import { tractionScoreForEvidence } from "./engagement";

export function credibilityScore(item: EvidenceItem) {  const askBonus = /^ask hn\b/i.test(item.title) ? 15 : 0;
  return tractionScoreForEvidence(item) + askBonus;
}

export function prioritizeCredibilityItems(items: EvidenceItem[], limit = 100) {
  return [...items]
    .sort(
      (left, right) => credibilityScore(right) - credibilityScore(left),
    )
    .slice(0, limit);
}
