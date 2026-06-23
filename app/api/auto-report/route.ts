import {
  lookbackDaysForFrequency,
  shouldRunScheduledReport,
  type AutoReportFrequency,
} from "../../../lib/analysis/auto-report";
import { runAutoReport } from "../../../lib/auto/run-auto-report";

export const maxDuration = 60;

function normalizeFrequency(value: unknown): AutoReportFrequency {
  return value === "weekly" ? "weekly" : "daily";
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is required for auto reports." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      frequency?: unknown;
      email?: unknown;
    };

    const frequency = normalizeFrequency(body.frequency);
    const email =
      typeof body.email === "string" && body.email.trim().length > 0
        ? body.email.trim()
        : process.env.AUTO_REPORT_EMAIL?.trim();

    if (!email) {
      return Response.json(
        { error: "An email address is required for auto reports." },
        { status: 400 },
      );
    }

    const result = await runAutoReport({ frequency, email });

    return Response.json({
      frequency,
      lookbackDays: lookbackDaysForFrequency(frequency),
      email,
      fetchedCount: result.stats.fetchedCount,
      tractionQualifiedCount: result.stats.tractionQualifiedCount,
      painClassifiedCount: result.stats.painClassifiedCount,
      validatedProblemCount: result.stats.validatedProblemCount,
      hnRequestsUsed: result.stats.hnRequestsUsed,
      report: result.report,
      emailSent: result.emailResult.sent,
      emailReason: result.emailResult.reason,
      emailMessageId: result.emailResult.messageId,
    });
  } catch (error) {
    console.error("Auto report failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Auto report failed.",
      },
      { status: 500 },
    );
  }
}
