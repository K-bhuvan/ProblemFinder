import OpenAI from "openai";

import { buildProblemId } from "./filter-problem-signals";
import type { CompletionCreator } from "./synthesize-clusters";
import type { EvidenceItem, ExtractedProblem } from "./types";
import { tractionScoreForEvidence } from "../hn/engagement";

type LlmExtractedProblem = {
  id: string;
  statement: string;
  evidenceId: string;
  products?: string[];
};

type LlmExtractResponse = {
  problems: LlmExtractedProblem[];
};

const ITEMS_PER_BATCH = 30;

function buildExtractPrompt(items: EvidenceItem[]) {
  const payload = items.map((item) => ({
    problemId: buildProblemId(item.id),
    evidenceId: item.id,
    title: item.title,
    text: item.text.slice(0, 500),
    points: item.points,
    comments: item.comments,
    url: item.url,
  }));

  return `Extract distinct, actionable startup problems from these Hacker News items (already classified as pain_point evidence).

Rules:
- Only extract when someone describes a real frustration, broken workflow, product failure, or unmet need.
- Return zero problems for news, product updates, comeback questions ("Is X back?"), launches, funding, or neutral discussion.
- Skip comment quotes, conversational filler, and HTML fragments.
- One item may yield 0 or 1 problem statement.
- Name the specific product, company, tool, or service when mentioned.
- Use the exact problemId and evidenceId from each item.
- Return JSON only:
{
  "problems": [
    {
      "id": "p-12345",
      "statement": "Cursor IDE causes MacBooks to overheat during normal use.",
      "evidenceId": "12345",
      "products": ["Cursor"]
    }
  ]
}

Items:
${JSON.stringify(payload, null, 2)}`;
}

function problemFromEvidence(
  evidence: EvidenceItem,
  statement: string,
  products: string[] = [],
): ExtractedProblem {
  return {
    id: buildProblemId(evidence.id),
    statement,
    evidenceId: evidence.id,
    evidenceUrl: evidence.url,
    products,
    evidenceType: evidence.type === "comment" ? "comment" : "story",
    parentStoryId: evidence.parentStoryId,
    points: evidence.points,
    comments: evidence.comments,
    tractionScore: tractionScoreForEvidence(evidence),
  };
}

function toExtractedProblem(
  problem: LlmExtractedProblem,
  itemsById: Map<string, EvidenceItem>,
): ExtractedProblem | null {
  const evidence = itemsById.get(problem.evidenceId);
  if (!evidence || !problem.statement?.trim()) {
    return null;
  }

  return problemFromEvidence(
    evidence,
    problem.statement.trim(),
    Array.isArray(problem.products)
      ? problem.products.map((product) => product.trim()).filter(Boolean)
      : [],
  );
}

async function extractProblemsBatch({
  items,
  createCompletion,
}: {
  items: EvidenceItem[];
  createCompletion: CompletionCreator;
}) {
  const response = await createCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract concrete, buildable user pain points. Never turn news headlines or product updates into problems.",
      },
      {
        role: "user",
        content: buildExtractPrompt(items),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const parsed = content
    ? (JSON.parse(content) as LlmExtractResponse)
    : { problems: [] };
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return (parsed.problems ?? [])
    .map((problem) => toExtractedProblem(problem, itemsById))
    .filter((problem): problem is ExtractedProblem => Boolean(problem));
}

export async function extractProblemsFromEvidence({
  items,
  createCompletion,
}: {
  items: EvidenceItem[];
  createCompletion?: CompletionCreator;
}): Promise<ExtractedProblem[]> {
  if (items.length === 0) {
    return [];
  }

  const completion =
    createCompletion ??
    (async (input) => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return client.chat.completions.create(input);
    });

  const problemsByEvidenceId = new Map<string, ExtractedProblem>();

  for (let offset = 0; offset < items.length; offset += ITEMS_PER_BATCH) {
    const batch = items.slice(offset, offset + ITEMS_PER_BATCH);
    const batchProblems = await extractProblemsBatch({
      items: batch,
      createCompletion: completion,
    });

    for (const problem of batchProblems) {
      problemsByEvidenceId.set(problem.evidenceId, problem);
    }
  }

  return [...problemsByEvidenceId.values()];
}
