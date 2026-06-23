import OpenAI from "openai";

import { uniqueHnSourceUrls } from "../hn/source-url";
import type { EvidenceItem, ExtractedProblem, ProblemCluster } from "./types";

export type CompletionCreator = (input: {
  model: string;
  response_format: { type: "json_object" };
  messages: Array<{ role: "system" | "user"; content: string }>;
}) => Promise<{
  choices: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}>;

type LlmProblemCluster = {
  title: string;
  severity: "High" | "Medium" | "Low";
  summary: string;
  problemIds: string[];
};

type LlmProblemClusterResponse = {
  clusters: LlmProblemCluster[];
};

function scoreEvidence(item: EvidenceItem) {
  return item.points + item.comments * 2;
}

function tractionForProblems(problems: ExtractedProblem[]) {
  return problems.reduce((sum, problem) => sum + problem.tractionScore, 0);
}

function buildProblemsPrompt(query: string, problems: ExtractedProblem[]) {
  const payload = problems.map((problem) => ({
    id: problem.id,
    statement: problem.statement,
    products: problem.products ?? [],
    evidenceUrl: problem.evidenceUrl,
    tractionScore: problem.tractionScore,
  }));

  return `Cluster these validated pain points into ranked problem themes for the query: "${query}".

Rules:
- Only use problem ids from the input list.
- Each problem id can appear in at most one cluster.
- Skip news, product updates, and non-buildable complaints.
- Group related pains into 1-5 specific themes with product names when known.
- Severity must be High, Medium, or Low.
- Return JSON only:
{
  "clusters": [
    {
      "title": "Stripe billing workflow pain",
      "severity": "High",
      "summary": "Small teams struggle with Stripe invoicing and billing sync.",
      "problemIds": ["p-1", "p-2"]
    }
  ]
}

Problems:
${JSON.stringify(payload, null, 2)}`;
}

function toClustersFromProblems(
  llmClusters: LlmProblemCluster[],
  problems: ExtractedProblem[],
  evidenceById: Map<string, EvidenceItem>,
): ProblemCluster[] {
  const problemsById = new Map(problems.map((problem) => [problem.id, problem]));
  const usedProblemIds = new Set<string>();

  return llmClusters
    .map((cluster) => {
      const linkedProblems = (cluster.problemIds ?? [])
        .filter((id) => problemsById.has(id) && !usedProblemIds.has(id))
        .map((id) => {
          usedProblemIds.add(id);
          return problemsById.get(id)!;
        });

      if (linkedProblems.length === 0) {
        return null;
      }

      const evidence = linkedProblems
        .map((problem) => evidenceById.get(problem.evidenceId))
        .filter((item): item is EvidenceItem => Boolean(item));
      const tractionScore = tractionForProblems(linkedProblems);
      const score = evidence.reduce((total, item) => total + scoreEvidence(item), 0);

      return {
        title: cluster.title,
        severity: cluster.severity,
        summary: cluster.summary,
        source: "Hacker News" as const,
        score: Math.max(score, tractionScore),
        tractionScore,
        sourceUrls: uniqueHnSourceUrls(linkedProblems),
        evidence,
      };
    })
    .filter((cluster): cluster is ProblemCluster => Boolean(cluster))
    .sort((left, right) => right.tractionScore - left.tractionScore);
}

export async function synthesizeClustersFromProblems({
  query,
  problems,
  evidenceById,
  createCompletion,
}: {
  query: string;
  problems: ExtractedProblem[];
  evidenceById: Map<string, EvidenceItem>;
  createCompletion?: CompletionCreator;
}): Promise<ProblemCluster[]> {
  if (problems.length === 0) {
    return [];
  }

  const completion =
    createCompletion ??
    (async (input) => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return client.chat.completions.create(input);
    });

  const response = await completion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You cluster validated user pain points into specific, buildable themes. Reject vague or news-like groupings.",
      },
      {
        role: "user",
        content: buildProblemsPrompt(query, problems),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const parsed = content
    ? (JSON.parse(content) as LlmProblemClusterResponse)
    : { clusters: [] };

  const clusters = toClustersFromProblems(
    parsed.clusters ?? [],
    problems,
    evidenceById,
  );

  if (clusters.length > 0) {
    return clusters;
  }

  return problems.map((problem) => {
    const evidence = evidenceById.get(problem.evidenceId);
    const evidenceList = evidence ? [evidence] : [];

    return {
      title: problem.products?.[0]
        ? `${problem.products[0]} — ${problem.statement.slice(0, 80)}`
        : problem.statement.slice(0, 100),
      severity: "Medium" as const,
      summary: problem.statement,
      source: "Hacker News" as const,
      score: problem.tractionScore,
      tractionScore: problem.tractionScore,
      sourceUrls: uniqueHnSourceUrls([problem]),
      evidence: evidenceList,
    };
  });
}
