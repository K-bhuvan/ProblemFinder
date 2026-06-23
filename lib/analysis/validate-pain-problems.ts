import OpenAI from "openai";

import { isStructurallyNoisy } from "./problem-statement-quality";
import type { CompletionCreator } from "./synthesize-clusters";
import type { ExtractedProblem } from "./types";

type LlmValidation = {
  problemId: string;
  isPainPoint: boolean;
  reason: string;
};

type LlmValidateResponse = {
  validations: LlmValidation[];
};

const PROBLEMS_PER_BATCH = 30;

function buildValidatePrompt(problems: ExtractedProblem[]) {
  const payload = problems.map((problem) => ({
    problemId: problem.id,
    statement: problem.statement,
    products: problem.products ?? [],
    evidenceUrl: problem.evidenceUrl,
  }));

  return `Validate extracted problem statements for a startup problem-discovery tool.

Mark isPainPoint=true only when the statement describes a concrete user frustration or unmet need that someone could realistically build a product, tool, or feature to solve.

Mark isPainPoint=false for:
- news headlines or company updates ("Is X back?", funding, launches)
- curiosity questions without a complaint
- macro trends, career musing, politics
- comment filler, quotes, or meta discussion
- vague discussion without a specific buildable pain

Use the exact problemId from input.
Return JSON only:
{
  "validations": [
    {
      "problemId": "p-123",
      "isPainPoint": true,
      "reason": "Concrete Stripe billing workflow pain."
    }
  ]
}

Problems:
${JSON.stringify(payload, null, 2)}`;
}

async function validatePainProblemsBatch({
  problems,
  createCompletion,
}: {
  problems: ExtractedProblem[];
  createCompletion: CompletionCreator;
}) {
  const response = await createCompletion({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You validate whether statements are real buildable user pain points. Reject news, updates, and noise strictly.",
      },
      {
        role: "user",
        content: buildValidatePrompt(problems),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const parsed = content
    ? (JSON.parse(content) as LlmValidateResponse)
    : { validations: [] };

  return parsed.validations ?? [];
}

export async function validatePainProblems({
  problems,
  createCompletion,
}: {
  problems: ExtractedProblem[];
  createCompletion?: CompletionCreator;
}): Promise<ExtractedProblem[]> {
  const structurallyValid = problems.filter(
    (problem) =>
      problem.statement.trim().length >= 20 &&
      !isStructurallyNoisy(problem.statement),
  );

  if (structurallyValid.length === 0) {
    return [];
  }

  const completion =
    createCompletion ??
    (async (input) => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return client.chat.completions.create(input);
    });

  const validatedIds = new Set<string>();

  for (let offset = 0; offset < structurallyValid.length; offset += PROBLEMS_PER_BATCH) {
    const batch = structurallyValid.slice(offset, offset + PROBLEMS_PER_BATCH);
    const validations = await validatePainProblemsBatch({
      problems: batch,
      createCompletion: completion,
    });

    for (const entry of validations) {
      if (entry.isPainPoint) {
        validatedIds.add(entry.problemId);
      }
    }
  }

  return structurallyValid.filter((problem) => validatedIds.has(problem.id));
}
