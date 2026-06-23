import OpenAI from "openai";

import type { CompletionCreator } from "./synthesize-clusters";

type ExpandResponse = {
  searchTerms: string[];
};

function shouldExpandQuery(query: string) {
  const trimmed = query.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (/[?]/.test(trimmed)) {
    return true;
  }

  if (
    /^(what|how|why|find|show|tell|help me|i want|looking for)\b/i.test(trimmed)
  ) {
    return true;
  }

  if (wordCount >= 6) {
    return true;
  }

  return false;
}

function normalizeTerms(terms: string[], fallback: string) {
  const unique = [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
  return unique.length > 0 ? unique.slice(0, 3) : [fallback];
}

function parseExpandResponse(
  content: string | null | undefined,
  fallback: string,
): string[] {
  if (!content) {
    return [fallback];
  }

  const parsed = JSON.parse(content) as ExpandResponse;
  return normalizeTerms(
    Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [],
    fallback,
  );
}

export async function expandSearchQuery({
  query,
  createCompletion,
}: {
  query: string;
  createCompletion?: CompletionCreator;
}): Promise<string[]> {
  const trimmed = query.trim();

  if (!shouldExpandQuery(trimmed)) {
    return [trimmed];
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
          "You convert research questions into concise Hacker News search phrases.",
      },
      {
        role: "user",
        content: `Convert this research intent into 2-3 short Hacker News search phrases.

Research intent:
"${trimmed}"

Rules:
- Return phrases that would match real HN titles, Ask HN posts, or comments.
- Prefer concrete nouns and pain-related wording.
- Avoid full sentences in the search terms.
- Return JSON only:
{
  "searchTerms": ["term 1", "term 2", "term 3"]
}`,
      },
    ],
  });

  return parseExpandResponse(response.choices[0]?.message?.content, trimmed);
}
