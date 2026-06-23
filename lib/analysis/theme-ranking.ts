import type { AutoReportTheme } from "./auto-report";

const CATCHALL_TITLE_PATTERN =
  /\b(other|misc|miscellaneous|general|various|catch[- ]?all|uncategorized|technical errors?|technical issues?|technical frustrations?)\b/i;

export function isCatchallTheme(theme: Pick<AutoReportTheme, "title" | "summary">) {
  if (CATCHALL_TITLE_PATTERN.test(theme.title)) {
    return true;
  }

  return (
    theme.title.trim().toLowerCase() === "other pain points" ||
    theme.summary.trim().toLowerCase().includes("did not fit a larger theme")
  );
}

export function sortThemesForDisplay(themes: AutoReportTheme[]) {
  const specific = themes
    .filter((theme) => !isCatchallTheme(theme))
    .sort((left, right) => right.tractionScore - left.tractionScore);
  const catchalls = themes
    .filter((theme) => isCatchallTheme(theme))
    .sort((left, right) => right.tractionScore - left.tractionScore);

  return [...specific, ...catchalls];
}
