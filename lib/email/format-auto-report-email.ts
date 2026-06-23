import type { AutoReport } from "../analysis/auto-report";
import { ANALYSIS_DISCLAIMER, HACKER_NEWS_URL, SOURCE_ATTRIBUTION_TEXT } from "../copy/disclaimer";
import { formatSourceLinkLabel } from "../copy/ui";
import { formatParetoTableText } from "../analysis/pareto";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatProducts(products: string[]) {
  return products.length > 0 ? products.join(", ") : "—";
}

function formatSourceLinks(urls: string[]) {
  if (urls.length === 0) {
    return "—";
  }

  return urls
    .map((url, index) => `<a href="${escapeHtml(url)}" style="color:#6941c6;">${escapeHtml(formatSourceLinkLabel(index))}</a>`)
    .join(" · ");
}

export function formatAutoReportEmailText(report: AutoReport) {
  const paretoText = formatParetoTableText(report.paretoTable);
  const detailLines = report.headlineThemes
    .map((theme, index) => {
      const products = formatProducts(theme.products);
      const sources =
        theme.sourceUrls.length > 0
          ? theme.sourceUrls.map((url, sourceIndex) => `  - ${formatSourceLinkLabel(sourceIndex)}: ${url}`).join("\n")
          : "";
      const examples = theme.examples
        .map((example) => `  - ${example.statement}\n    ${example.url}`)
        .join("\n");

      return `${index + 1}. ${theme.title} (${theme.sharePercent}%, products: ${products})
${theme.summary}
Sources:
${sources || "  - —"}
Examples:
${examples || "  - —"}`;
    })
    .join("\n\n");

  return `Problem Finder auto report (${report.periodLabel})

${report.totalProblemsDiscussed} distinct problems extracted from public discussions.

PARETO BREAKDOWN
${paretoText}

HEADLINE THEMES (~80% of traction)
${detailLines || "No strong pain themes were detected in this period."}

Generated at ${report.generatedAt}

${SOURCE_ATTRIBUTION_TEXT}

Disclaimer: ${ANALYSIS_DISCLAIMER}`;
}

export function formatAutoReportEmailHtml(report: AutoReport) {
  const paretoRows = report.paretoTable
    .map(
      (row) => `<tr>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${row.rank}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${escapeHtml(row.title)}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${escapeHtml(formatProducts(row.products))}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${formatSourceLinks(row.sourceUrls)}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${row.discussionCount}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${row.threadCount}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${row.tractionScore}</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${row.sharePercent}%</td>
          <td style="border:1px solid #d7dce5;padding:8px 10px;">${row.cumulativePercent}%</td>
        </tr>`,
    )
    .join("");

  const headlineBlocks = report.headlineThemes
    .map((theme) => {
      const examples = theme.examples
        .map(
          (example) =>
            `<li style="margin:0 0 6px;"><a href="${escapeHtml(example.url)}" style="color:#6941c6;">${escapeHtml(example.statement)}</a></li>`,
        )
        .join("");
      const sources = formatSourceLinks(theme.sourceUrls);

      return `<div style="margin:0 0 18px;padding:14px 16px;border:1px solid #e4e7ec;border-radius:10px;background:#fafbfc;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1f2a3d;">${escapeHtml(theme.title)}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#667085;">
            <strong>${theme.sharePercent}%</strong> traction · ${theme.discussionCount} problems · ${theme.threadCount} threads · score ${theme.tractionScore}
            ${theme.products.length > 0 ? ` · Products: ${escapeHtml(formatProducts(theme.products))}` : ""}
          </p>
          <p style="margin:0 0 10px;color:#344054;">${escapeHtml(theme.summary)}</p>
          <p style="margin:0 0 10px;font-size:13px;color:#475467;">
            <strong>Sources:</strong> ${sources}
          </p>
          ${
            examples
              ? `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#475467;">Examples</p><ul style="margin:0;padding-left:18px;color:#475467;">${examples}</ul>`
              : ""
          }
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#344054;line-height:1.6;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e4e7ec;border-radius:14px;padding:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6941c6;">Problem Finder</p>
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#101828;">Auto report (${escapeHtml(report.periodLabel)})</h1>
        <p style="margin:0 0 20px;color:#667085;">
          ${report.totalProblemsDiscussed} distinct problems extracted from public discussions.
        </p>

        <h2 style="margin:0 0 10px;font-size:18px;color:#1f2a3d;">Pareto breakdown</h2>
        <div style="overflow-x:auto;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f5f7fb;">
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">#</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Theme</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Products</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Sources</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Problems</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Threads</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Traction</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Share</th>
                <th style="border:1px solid #d7dce5;padding:8px 10px;text-align:left;">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              ${paretoRows || `<tr><td colspan="9" style="border:1px solid #d7dce5;padding:10px;">No themes to display.</td></tr>`}
            </tbody>
          </table>
        </div>

        <h2 style="margin:0 0 12px;font-size:18px;color:#1f2a3d;">Headline themes (~80% of specific volume)</h2>
        ${headlineBlocks || `<p style="color:#667085;">No strong pain themes were detected in this period.</p>`}

        <p style="margin:24px 0 0;font-size:12px;color:#98a2b3;">Generated at ${escapeHtml(report.generatedAt)}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#98a2b3;">Discussion data from <a href="${escapeHtml(HACKER_NEWS_URL)}" style="color:#6941c6;">Hacker News</a>. Not affiliated with Y Combinator.</p>
        <p style="margin:12px 0 0;font-size:12px;color:#98a2b3;border-top:1px solid #e4e7ec;padding-top:12px;">${escapeHtml(ANALYSIS_DISCLAIMER)}</p>
      </div>
    </div>
  </body>
</html>`;
}
