import type { EvidenceItem } from "../analysis/types";

export function tractionScoreForEvidence(item: EvidenceItem) {
  if (
    item.type === "comment" &&
    item.threadPoints !== undefined &&
    item.threadComments !== undefined
  ) {
    return item.threadPoints + item.threadComments * 3;
  }

  return item.points + item.comments * 3;
}

export function tractionForProblems(
  problems: Array<{
    evidenceId: string;
    parentStoryId?: string;
    tractionScore: number;
  }>,
) {
  const threads = new Map<string, number>();

  for (const problem of problems) {
    const threadId = problem.parentStoryId ?? problem.evidenceId;
    const existing = threads.get(threadId) ?? 0;
    threads.set(threadId, Math.max(existing, problem.tractionScore));
  }

  const tractionScore = [...threads.values()].reduce((sum, score) => sum + score, 0);

  return {
    tractionScore,
    threadCount: threads.size,
    mentionCount: problems.length,
  };
}
