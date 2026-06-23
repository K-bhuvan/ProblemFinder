import { runManualAnalysis } from "../../../lib/analysis/run-manual-analysis";

export const maxDuration = 60;

const DEFAULT_QUERY = "frustrated";
const DEFAULT_LOOKBACK_DAYS = 7;

function normalizeLookbackDays(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  return Math.min(parsed, 90);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: unknown;
      lookbackDays?: unknown;
    };
    const query =
      typeof body.query === "string" && body.query.trim().length > 0
        ? body.query.trim()
        : DEFAULT_QUERY;
    const lookbackDays = normalizeLookbackDays(body.lookbackDays);
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is required for analysis." },
        { status: 500 },
      );
    }

    const result = await runManualAnalysis({ query, lookbackDays });

    return Response.json({
      query: result.query,
      searchTerms: result.searchTerms,
      source: "Hacker News",
      lookbackDays: result.lookbackDays,
      fetchedCount: result.stats.fetchedCount,
      tractionQualifiedCount: result.stats.tractionQualifiedCount,
      painClassifiedCount: result.stats.painClassifiedCount,
      validatedProblemCount: result.stats.validatedProblemCount,
      hnRequestsUsed: result.stats.hnRequestsUsed,
      clusters: result.clusters,
    });
  } catch (error) {
    console.error("Manual analysis failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed. Restart the dev server and try again.",
      },
      { status: 500 },
    );
  }
}
