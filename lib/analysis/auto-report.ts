import OpenAI from "openai";

import {
  buildParetoTable,
  getParetoHeadlineRows,
  type ParetoRow,
} from "./pareto";
import { isCatchallTheme, sortThemesForDisplay } from "./theme-ranking";
import { isStructurallyNoisy } from "./problem-statement-quality";
import type { CompletionCreator } from "./synthesize-clusters";
import type { ExtractedProblem } from "./types";
import { tractionForProblems } from "../hn/engagement";
import {
  hnSourceUrlForProblem,
  uniqueHnSourceUrls,
} from "../hn/source-url";
import { getMinThemeTractionScore } from "./pipeline-thresholds";

export type ThemeExample = {
  statement: string;
  url: string;
};

export type AutoReportTheme = {
  title: string;
  products: string[];
  examples: ThemeExample[];
  sourceUrls: string[];
  /** Distinct extracted problems (posts or mined comments). */
  discussionCount: number;
  /** Distinct HN threads represented in this theme. */
  threadCount: number;
  /** HN engagement score: thread points + comments x 3, deduped per thread. */
  tractionScore: number;
  sharePercent: number;
  summary: string;
  severity: "High" | "Medium" | "Low";
};

export type AutoReport = {
  periodLabel: string;
  totalProblemsDiscussed: number;
  themes: AutoReportTheme[];
  paretoTable: ParetoRow[];
  headlineThemes: AutoReportTheme[];
  generatedAt: string;
};

type LlmTheme = {
  title: string;
  summary: string;
  severity: "High" | "Medium" | "Low";
  products?: string[];
  problemIds: string[];
};

type LlmAutoReport = {
  themes: LlmTheme[];
};

export type AutoReportFrequency = "daily" | "weekly";

function buildAutoPrompt(problems: ExtractedProblem[], periodLabel: string) {
  const payload = problems.map((problem) => ({
    id: problem.id,
    statement: problem.statement,
    products: problem.products ?? [],
    evidenceUrl: problem.evidenceUrl,
  }));

  return `Cluster these extracted Hacker News problems into distinct themes for ${periodLabel}.

Rules:
- Create 4-10 themes when possible by merging related problems.
- Prefer fewer, stronger themes over many singleton themes.
- Only cluster actionable problems someone could build a product or feature around.
- Never cluster news headlines, product updates, or curiosity questions without user pain.
- Group by product, domain, or pain type when problems are related (e.g. AI inbox spam, developer workflow friction).
- Each theme must reference only problem ids from the input list.
- A problem id can appear in at most one theme.
- Never create catch-all themes (no "Other", "Misc", "General", or similar umbrella labels).
- Standalone themes are allowed only when a problem is truly unrelated.
- Titles must name the primary product, company, or tool when known.
- Use the exact problem id strings from the input.
- products must list the concrete products/companies/tools in that theme.
- Summaries must be specific: say which product fails and how.
- Severity must be High, Medium, or Low.
- Return JSON only:
{
  "themes": [
    {
      "title": "Cursor IDE overheating on MacBooks",
      "summary": "Developers report Cursor causing overheating and fan noise during routine coding.",
      "severity": "High",
      "products": ["Cursor"],
      "problemIds": ["p-1", "p-2"]
    }
  ]
}

Problems:
${JSON.stringify(payload, null, 2)}`;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function examplesFromProblems(
  problems: ExtractedProblem[],
  limit = 3,
): ThemeExample[] {
  return problems.slice(0, limit).map((problem) => ({
    statement: problem.statement,
    url: hnSourceUrlForProblem(problem),
  }));
}

function themeMetrics(problems: ExtractedProblem[], totalTraction: number) {
  const metrics = tractionForProblems(problems);

  return {
    discussionCount: metrics.mentionCount,
    threadCount: metrics.threadCount,
    tractionScore: metrics.tractionScore,
    sharePercent:
      totalTraction > 0
        ? Math.round((metrics.tractionScore / totalTraction) * 100)
        : 0,
  };
}

function totalTractionForProblems(problems: ExtractedProblem[]) {
  return tractionForProblems(problems).tractionScore;
}

function problemToStandaloneTheme(
  problem: ExtractedProblem,
  totalTraction: number,
): AutoReportTheme {
  const products = problem.products ?? [];
  const shortStatement =
    problem.statement.length > 90
      ? `${problem.statement.slice(0, 87)}...`
      : problem.statement;
  const title =
    products.length > 0 ? `${products[0]} — ${shortStatement}` : shortStatement;

  return {
    title,
    summary: problem.statement,
    severity: "Medium",
    products,
    examples: examplesFromProblems([problem]),
    sourceUrls: uniqueHnSourceUrls([problem]),
    ...themeMetrics([problem], totalTraction),
  };
}

function groupUnassignedProblems(
  problems: ExtractedProblem[],
  totalTraction: number,
): AutoReportTheme[] {
  const grouped = new Map<string, ExtractedProblem[]>();
  const singles: ExtractedProblem[] = [];

  for (const problem of problems) {
    const product = problem.products?.[0];
    if (!product) {
      singles.push(problem);
      continue;
    }

    const bucket = grouped.get(product) ?? [];
    bucket.push(problem);
    grouped.set(product, bucket);
  }

  const themes: AutoReportTheme[] = [];

  for (const [product, bucket] of grouped) {
    if (bucket.length === 1) {
      singles.push(bucket[0]!);
      continue;
    }

    themes.push({
      title: `${product} pain points`,
      summary: `Multiple complaints about ${product} surfaced in recent Hacker News discussions.`,
      severity: "Medium",
      products: [product],
      examples: examplesFromProblems(bucket),
      sourceUrls: uniqueHnSourceUrls(bucket),
      ...themeMetrics(bucket, totalTraction),
    });
  }

  for (const problem of singles) {
    themes.push(problemToStandaloneTheme(problem, totalTraction));
  }

  return themes;
}

function toAutoReportThemes(
  parsed: LlmAutoReport,
  problems: ExtractedProblem[],
): AutoReportTheme[] {
  const problemsById = new Map(problems.map((problem) => [problem.id, problem]));
  const usedProblemIds = new Set<string>();
  const totalTraction = totalTractionForProblems(problems);

  const themes = (parsed.themes ?? [])
    .map((theme) => {
      const problemIds = (theme.problemIds ?? []).filter((id) => {
        if (!problemsById.has(id) || usedProblemIds.has(id)) {
          return false;
        }

        usedProblemIds.add(id);
        return true;
      });

      if (problemIds.length === 0) {
        return null;
      }

      const linkedProblems = problemIds
        .map((id) => problemsById.get(id))
        .filter((problem): problem is ExtractedProblem => Boolean(problem));

      const products = uniqueStrings([
        ...(theme.products ?? []),
        ...linkedProblems.flatMap((problem) => problem.products ?? []),
      ]);
      return {
        title: theme.title,
        summary: theme.summary,
        severity: theme.severity,
        products,
        examples: examplesFromProblems(linkedProblems),
        sourceUrls: uniqueHnSourceUrls(linkedProblems),
        ...themeMetrics(linkedProblems, totalTraction),
      };
    })
    .filter((theme): theme is AutoReportTheme => Boolean(theme));

  const unassigned = problems.filter((problem) => !usedProblemIds.has(problem.id));

  themes.push(...groupUnassignedProblems(unassigned, totalTraction));

  return sortThemesForDisplay(themes);
}

function finalizeAutoReport({
  periodLabel,
  problems,
  themes,
}: {
  periodLabel: string;
  problems: ExtractedProblem[];
  themes: AutoReportTheme[];
}): AutoReport {
  const rankedThemes = sortThemesForDisplay(themes).filter(
    (theme) =>
      theme.tractionScore >= getMinThemeTractionScore() &&
      !isStructurallyNoisy(theme.title) &&
      !isStructurallyNoisy(theme.summary),
  );
  const paretoTable = buildParetoTable(rankedThemes);
  const specificParetoRows = paretoTable.filter((row) => {
    const theme = rankedThemes.find((entry) => entry.title === row.title);
    return theme ? !isCatchallTheme(theme) : true;
  });
  const headlineRanks = new Set(
    getParetoHeadlineRows(specificParetoRows).map((row) => row.rank),
  );
  const headlineThemes = rankedThemes.filter((theme) => {
    if (isCatchallTheme(theme)) {
      return false;
    }

    const row = paretoTable.find((entry) => entry.title === theme.title);
    return row ? headlineRanks.has(row.rank) : false;
  });

  return {
    periodLabel,
    totalProblemsDiscussed: problems.length,
    themes: rankedThemes,
    paretoTable,
    headlineThemes,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateAutoReport({
  problems,
  periodLabel,
  createCompletion,
}: {
  problems: ExtractedProblem[];
  periodLabel: string;
  createCompletion?: CompletionCreator;
}): Promise<AutoReport> {
  if (problems.length === 0) {
    return finalizeAutoReport({ periodLabel, problems, themes: [] });
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
          "You cluster extracted user pain points into specific, product-named themes. Never use catch-all or umbrella labels.",
      },
      {
        role: "user",
        content: buildAutoPrompt(problems, periodLabel),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const parsed = content
    ? (JSON.parse(content) as LlmAutoReport)
    : { themes: [] };

  return finalizeAutoReport({
    periodLabel,
    problems,
    themes: toAutoReportThemes(parsed, problems),
  });
}

export function shouldRunScheduledReport({
  frequency,
  now = new Date(),
}: {
  frequency: AutoReportFrequency;
  now?: Date;
}) {
  if (frequency === "daily") {
    return true;
  }

  return now.getUTCDay() === 1;
}

export function lookbackDaysForFrequency(frequency: AutoReportFrequency) {
  return frequency === "weekly" ? 7 : 1;
}

export function periodLabelForFrequency(frequency: AutoReportFrequency) {
  return frequency === "weekly" ? "last 7 days" : "last 1 day";
}
