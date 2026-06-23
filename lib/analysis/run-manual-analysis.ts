import { expandSearchQuery } from "./expand-search-query";
import { runPainPipeline } from "./pain-pipeline";
import { synthesizeClustersFromProblems } from "./synthesize-clusters";
import type { ProblemCluster } from "./types";
import { fetchQueryFocusedHackerNewsItems } from "../hn/fetch-hacker-news";

export type ManualAnalysisStats = {
  fetchedCount: number;
  hnRequestsUsed: number;
  tractionQualifiedCount: number;
  painClassifiedCount: number;
  validatedProblemCount: number;
};

export async function runManualAnalysis({
  query,
  lookbackDays,
}: {
  query: string;
  lookbackDays: number;
}): Promise<{
  query: string;
  searchTerms: string[];
  lookbackDays: number;
  clusters: ProblemCluster[];
  stats: ManualAnalysisStats;
}> {
  const searchTerms = await expandSearchQuery({ query });
  const { items: fetchedItems, hnRequestsUsed } =
    await fetchQueryFocusedHackerNewsItems({
      queries: searchTerms,
      lookbackDays,
    });
  const { stats: pipelineStats, problems, evidenceById } = await runPainPipeline({
    items: fetchedItems,
  });
  const clusters = await synthesizeClustersFromProblems({
    query,
    problems,
    evidenceById,
  });

  return {
    query,
    searchTerms,
    lookbackDays,
    clusters,
    stats: {
      fetchedCount: fetchedItems.length,
      hnRequestsUsed,
      ...pipelineStats,
    },
  };
}
