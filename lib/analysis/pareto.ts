import type { AutoReportTheme } from "./auto-report";

export type ParetoRow = {
  rank: number;
  title: string;
  products: string[];
  sourceUrls: string[];
  discussionCount: number;
  threadCount: number;
  tractionScore: number;
  sharePercent: number;
  cumulativePercent: number;
};

export function buildParetoTable(themes: AutoReportTheme[]): ParetoRow[] {
  const sorted = [...themes].sort(
    (left, right) => right.tractionScore - left.tractionScore,
  );
  const totalTraction = sorted.reduce((sum, theme) => sum + theme.tractionScore, 0);

  if (totalTraction === 0) {
    return [];
  }

  let cumulative = 0;

  return sorted.map((theme, index) => {
    cumulative += theme.tractionScore;

    return {
      rank: index + 1,
      title: theme.title,
      products: theme.products,
      sourceUrls: theme.sourceUrls,
      discussionCount: theme.discussionCount,
      threadCount: theme.threadCount,
      tractionScore: theme.tractionScore,
      sharePercent: Math.round((theme.tractionScore / totalTraction) * 100),
      cumulativePercent: Math.round((cumulative / totalTraction) * 100),
    };
  });
}

export function getParetoHeadlineRows(
  rows: ParetoRow[],
  cumulativeThreshold = 80,
): ParetoRow[] {
  const selected: ParetoRow[] = [];

  for (const row of rows) {
    selected.push(row);
    if (row.cumulativePercent >= cumulativeThreshold) {
      break;
    }
  }

  return selected;
}

export function formatParetoTableText(rows: ParetoRow[]) {
  if (rows.length === 0) {
    return "No themes to display.";
  }

  const header =
    "Rank | Theme | Products | Sources | Problems | Threads | Traction | Share | Cumulative";
  const divider =
    "-----|-------|----------|---------|----------|---------|----------|-------|------------";
  const lines = rows.map((row) => {
    const products = row.products.length > 0 ? row.products.join(", ") : "—";
    const sources =
      row.sourceUrls.length > 0 ? row.sourceUrls.join(" ") : "—";
    return `${row.rank} | ${row.title} | ${products} | ${sources} | ${row.discussionCount} | ${row.threadCount} | ${row.tractionScore} | ${row.sharePercent}% | ${row.cumulativePercent}%`;
  });

  return [header, divider, ...lines].join("\n");
}
