import {
  generateAutoReport,
  lookbackDaysForFrequency,
  periodLabelForFrequency,
  type AutoReport,
  type AutoReportFrequency,
} from "../analysis/auto-report";
import { runPainPipeline } from "../analysis/pain-pipeline";
import { sendAutoReportEmail } from "../email/send-auto-report";
import { fetchProblemFocusedHackerNewsItems } from "../hn/fetch-hacker-news";

export type AutoReportPipelineStats = {
  fetchedCount: number;
  tractionQualifiedCount: number;
  painClassifiedCount: number;
  validatedProblemCount: number;
  hnRequestsUsed: number;
};

export async function runAutoReport({
  frequency,
  email,
}: {
  frequency: AutoReportFrequency;
  email: string;
}): Promise<{
  report: AutoReport;
  emailResult: { sent: boolean; reason?: string; messageId?: string };
  stats: AutoReportPipelineStats;
}> {
  const lookbackDays = lookbackDaysForFrequency(frequency);
  const periodLabel = periodLabelForFrequency(frequency);
  const { items: fetchedItems, hnRequestsUsed } =
    await fetchProblemFocusedHackerNewsItems({ lookbackDays });
  const { stats: pipelineStats, problems } = await runPainPipeline({
    items: fetchedItems,
  });
  const report = await generateAutoReport({ problems, periodLabel });
  const emailResult = await sendAutoReportEmail({ to: email, report });

  return {
    report,
    emailResult,
    stats: {
      fetchedCount: fetchedItems.length,
      ...pipelineStats,
      hnRequestsUsed,
    },
  };
}
