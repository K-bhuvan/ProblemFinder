import { Resend } from "resend";

import type { AutoReport } from "../analysis/auto-report";
import {
  formatAutoReportEmailHtml,
  formatAutoReportEmailText,
} from "./format-auto-report-email";

export async function sendAutoReportEmail({
  to,
  report,
  resendApiKey = process.env.RESEND_API_KEY,
  fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
}: {
  to: string;
  report: AutoReport;
  resendApiKey?: string;
  fromEmail?: string;
}) {
  const apiKey = resendApiKey?.replace(/^['"]|['"]$/g, "").trim();
  const sender = fromEmail?.replace(/^['"]|['"]$/g, "").trim() ?? "onboarding@resend.dev";
  const recipient = to.trim();

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  const resend = new Resend(apiKey);
  const text = formatAutoReportEmailText(report);
  const html = formatAutoReportEmailHtml(report);

  const { data, error } = await resend.emails.send({
    from: sender,
    to: recipient,
    subject: `Problem Finder: top pain themes (${report.periodLabel})`,
    text,
    html,
  });

  if (error) {
    const allowedMatch = error.message.match(
      /your own email address \(([^)]+)\)/i,
    );
    const sandboxHint = allowedMatch
      ? ` Resend sandbox only delivers to ${allowedMatch[1]} until you verify a domain.`
      : sender.includes("resend.dev")
        ? " Resend sandbox only delivers to your Resend signup email until you verify a domain."
        : "";

    return {
      sent: false,
      reason: `${error.message}${sandboxHint}`,
    };
  }

  return { sent: true, messageId: data?.id };
}
