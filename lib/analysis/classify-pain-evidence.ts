import OpenAI from "openai";

import type { CompletionCreator } from "./synthesize-clusters";
import type { EvidenceItem } from "./types";

export type PainEvidenceLabel =
  | "pain_point"
  | "news_update"
  | "announcement"
  | "off_topic"
  | "noise";

type PainEvidenceClassification = {
  evidenceId: string;
  label: PainEvidenceLabel;
  reason: string;
};

type LlmClassifyResponse = {
  classifications: PainEvidenceClassification[];
};

const ITEMS_PER_BATCH = 25;

function buildClassifyPrompt(items: EvidenceItem[]) {
  const payload = items.map((item) => ({
    evidenceId: item.id,
    title: item.title,
    text: item.text.slice(0, 500),
    type: item.type,
    points: item.points,
    comments: item.comments,
  }));

  return `Classify each Hacker News item for a startup problem-discovery tool.

Label each item exactly one of:
- pain_point: a real user frustration, broken workflow, product failure, unmet need, or complaint someone could build a solution for
- news_update: product/company news, comeback questions ("Is X back?"), funding, launches, version releases, industry updates
- announcement: Show HN, hiring posts, self-promotion without a clear user pain
- off_topic: career musing, politics, general discussion without a buildable pain
- noise: comment quotes, filler replies, empty signal, HTML fragments

Rules:
- Curiosity or news headlines about a company are NOT pain_point unless they describe a concrete user problem.
- Ask HN posts can be pain_point when they ask for help solving a workflow or product gap.
- Use the exact evidenceId from input.
- Return JSON only:
{
  "classifications": [
    {
      "evidenceId": "123",
      "label": "pain_point",
      "reason": "User complains Stripe invoicing is broken for small teams."
    }
  ]
}

Items:
${JSON.stringify(payload, null, 2)}`;
}

async function classifyPainEvidenceBatch({
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
          "You classify discussion evidence into pain points vs news, announcements, and noise. Be strict: only label pain_point when there is a concrete buildable user problem.",
      },
      {
        role: "user",
        content: buildClassifyPrompt(items),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const parsed = content
    ? (JSON.parse(content) as LlmClassifyResponse)
    : { classifications: [] };

  return parsed.classifications ?? [];
}

export async function classifyPainEvidence({
  items,
  createCompletion,
}: {
  items: EvidenceItem[];
  createCompletion?: CompletionCreator;
}): Promise<EvidenceItem[]> {
  if (items.length === 0) {
    return [];
  }

  const completion =
    createCompletion ??
    (async (input) => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return client.chat.completions.create(input);
    });

  const painIds = new Set<string>();

  for (let offset = 0; offset < items.length; offset += ITEMS_PER_BATCH) {
    const batch = items.slice(offset, offset + ITEMS_PER_BATCH);
    const classifications = await classifyPainEvidenceBatch({
      items: batch,
      createCompletion: completion,
    });

    for (const entry of classifications) {
      if (entry.label === "pain_point") {
        painIds.add(entry.evidenceId);
      }
    }
  }

  return items.filter((item) => painIds.has(item.id));
}
