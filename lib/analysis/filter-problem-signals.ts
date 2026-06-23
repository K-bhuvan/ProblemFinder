import type { EvidenceItem } from "./types";
import { isStructurallyNoisy } from "./problem-statement-quality";

function hasUsableEvidenceText(item: EvidenceItem) {
  const haystack = `${item.title} ${item.text}`.trim();

  if (!haystack) {
    return false;
  }

  if (item.text.trim() && isStructurallyNoisy(item.text)) {
    return false;
  }

  return true;
}

export function filterUsableEvidenceItems(items: EvidenceItem[]) {
  return items.filter(hasUsableEvidenceText);
}

export function buildProblemId(evidenceId: string) {
  return `p-${evidenceId}`;
}
