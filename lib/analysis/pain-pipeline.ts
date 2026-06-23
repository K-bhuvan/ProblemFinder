import { classifyPainEvidence } from "./classify-pain-evidence";
import { extractProblemsFromEvidence } from "./extract-problems";
import { filterUsableEvidenceItems } from "./filter-problem-signals";
import { filterTractionQualifiedItems } from "./pipeline-thresholds";
import type { EvidenceItem, ExtractedProblem } from "./types";
import { validatePainProblems } from "./validate-pain-problems";
import { prioritizeCredibilityItems } from "../hn/credibility";
import { MAX_EXTRACTION_CANDIDATES } from "../hn/problem-search-queries";

export type PainPipelineStats = {
  tractionQualifiedCount: number;
  painClassifiedCount: number;
  extractedProblemCount: number;
  validatedProblemCount: number;
};

export async function runPainPipeline({
  items,
  maxCandidates = MAX_EXTRACTION_CANDIDATES,
}: {
  items: EvidenceItem[];
  maxCandidates?: number;
}): Promise<{
  stats: PainPipelineStats;
  problems: ExtractedProblem[];
  evidenceById: Map<string, EvidenceItem>;
}> {
  const evidenceById = new Map(items.map((item) => [item.id, item]));
  const usableItems = filterUsableEvidenceItems(items);
  const tractionQualified = filterTractionQualifiedItems(usableItems);
  const rankedCandidates = prioritizeCredibilityItems(
    tractionQualified,
    maxCandidates,
  );
  const painEvidence = await classifyPainEvidence({ items: rankedCandidates });
  const extractedProblems = await extractProblemsFromEvidence({
    items: painEvidence,
  });
  const problems = await validatePainProblems({ problems: extractedProblems });

  return {
    stats: {
      tractionQualifiedCount: tractionQualified.length,
      painClassifiedCount: painEvidence.length,
      extractedProblemCount: extractedProblems.length,
      validatedProblemCount: problems.length,
    },
    problems,
    evidenceById,
  };
}
