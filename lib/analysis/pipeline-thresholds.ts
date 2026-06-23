import type { EvidenceItem } from "./types";
import { tractionScoreForEvidence } from "../hn/engagement";

export function getMinTractionForExtraction() {
  const parsed = Number(process.env.MIN_TRACTION_SCORE ?? 20);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export function getMinThemeTractionScore() {
  const parsed = Number(process.env.MIN_THEME_TRACTION_SCORE ?? 40);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
}

export function meetsMinTractionForExtraction(
  item: EvidenceItem,
  minScore = getMinTractionForExtraction(),
) {
  const score = tractionScoreForEvidence(item);
  const threshold = /^ask hn\b/i.test(item.title)
    ? Math.max(12, Math.floor(minScore * 0.6))
    : minScore;

  return score >= threshold;
}

export function filterTractionQualifiedItems(
  items: EvidenceItem[],
  minScore = getMinTractionForExtraction(),
) {
  return items.filter((item) => meetsMinTractionForExtraction(item, minScore));
}
