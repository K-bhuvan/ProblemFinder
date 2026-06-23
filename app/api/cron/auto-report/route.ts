import {
  shouldRunScheduledReport,
  type AutoReportFrequency,
} from "../../../../lib/analysis/auto-report";
import { verifyCronSecret } from "../../../../lib/auth/verify-cron-secret";
import { runAutoReport } from "../../../../lib/auto/run-auto-report";

export const maxDuration = 60;

function normalizeFrequency(value: string | undefined): AutoReportFrequency {
  return value === "weekly" ? "weekly" : "daily";
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is required for auto reports." },
      { status: 500 },
    );
  }

  const frequency = normalizeFrequency(process.env.AUTO_REPORT_FREQUENCY);

  if (!shouldRunScheduledReport({ frequency })) {
    return Response.json({
      skipped: true,
      reason: "Weekly schedule skips non-Monday runs.",
      frequency,
    });
  }

  const email = process.env.AUTO_REPORT_EMAIL?.trim();

  if (!email) {
    return Response.json(
      { error: "AUTO_REPORT_EMAIL is required for scheduled reports." },
      { status: 500 },
    );
  }

  try {
    const result = await runAutoReport({ frequency, email });

    return Response.json({
      frequency,
      lookbackDays: frequency === "weekly" ? 7 : 1,
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
    console.error("Scheduled auto report failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Scheduled auto report failed.",
      },
      { status: 500 },
    );
  }
}
