"use client";

import { FormEvent, useState } from "react";

import type { AutoReport } from "../lib/analysis/auto-report";
import { formatSourceLinkLabel, TRACTION_NOTE } from "../lib/copy/ui";

type AutoReportResponse = {
  frequency: "daily" | "weekly";
  lookbackDays: number;
  email: string;
  fetchedCount: number;
  tractionQualifiedCount: number;
  painClassifiedCount: number;
  validatedProblemCount: number;
  hnRequestsUsed: number;
  report: AutoReport;
  emailSent: boolean;
  emailReason?: string;
  emailMessageId?: string;
};

export function AutoModePanel() {
  const [email, setEmail] = useState("jetshop8900@gmail.com");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [result, setResult] = useState<AutoReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auto-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, frequency }),
      });

      const payload = (await response.json()) as AutoReportResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to run auto report.");
      }

      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to run auto report.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="analysis-card auto-mode-card" aria-labelledby="auto-mode-title">
      <div>
        <p className="eyebrow">Auto mode</p>
        <h2 id="auto-mode-title">Daily or weekly pain radar</h2>
        <p className="hero-copy">
          No topic needed. LLM classifies real pain points (not news or updates),
          extracts buildable problems, and emails a Pareto breakdown.
        </p>
      </div>

      <form className="analysis-form auto-mode-form" onSubmit={handleSubmit}>
        <label>
          <span>Report email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Schedule</span>
          <select
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as "daily" | "weekly")
            }
          >
            <option value="daily">Daily (last 1 day)</option>
            <option value="weekly">Weekly (last 7 days)</option>
          </select>
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Run auto report now"}
        </button>
      </form>

      {error ? <p className="error-message">{error}</p> : null}

      {result ? (
        <div className="auto-report-result">
          <p>
            {result.fetchedCount} posts fetched ({result.hnRequestsUsed} API
            calls) → {result.tractionQualifiedCount} traction-qualified →{" "}
            {result.painClassifiedCount} LLM pain signals →{" "}
            {result.validatedProblemCount} validated problems for{" "}
            {result.report.periodLabel}.
          </p>
          <p className="pipeline-note">{TRACTION_NOTE}</p>

          <h3>Pareto breakdown</h3>
          <div className="pareto-table-wrap">
            <table className="pareto-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Theme</th>
                  <th>Products</th>
                  <th>Sources</th>
                  <th>Problems</th>
                  <th>Threads</th>
                  <th>Traction</th>
                  <th>Share</th>
                  <th>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {result.report.paretoTable.map((row) => (
                  <tr key={`${row.rank}-${row.title}`}>
                    <td>{row.rank}</td>
                    <td>{row.title}</td>
                    <td>{row.products.length > 0 ? row.products.join(", ") : "—"}</td>
                    <td>
                      {row.sourceUrls.length > 0 ? (
                        <span className="source-links">
                          {row.sourceUrls.map((url, index) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {formatSourceLinkLabel(index)}
                            </a>
                          ))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.discussionCount}</td>
                    <td>{row.threadCount}</td>
                    <td>{row.tractionScore}</td>
                    <td>{row.sharePercent}%</td>
                    <td>{row.cumulativePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Headline themes (~80% of traction)</h3>
          <ul>
            {result.report.headlineThemes.map((theme) => (
              <li key={theme.title}>
                <strong>{theme.title}</strong>
                {theme.products.length > 0
                  ? ` (${theme.products.join(", ")})`
                  : ""}{" "}
                — {theme.sharePercent}% traction · {theme.discussionCount}{" "}
                problems · {theme.threadCount} threads · score{" "}
                {theme.tractionScore}: {theme.summary}
                {theme.sourceUrls.length > 0 ? (
                  <p className="theme-sources">
                    Sources:{" "}
                    {theme.sourceUrls.map((url, index) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {formatSourceLinkLabel(index)}
                      </a>
                    ))}
                  </p>
                ) : null}
                {theme.examples.length > 0 ? (
                  <ul>
                    {theme.examples.map((example) => (
                      <li key={`${example.url}-${example.statement}`}>
                        <a href={example.url} target="_blank" rel="noreferrer">
                          {example.statement}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>

          <p className={result.emailSent ? "email-status-ok" : "email-status-error"}>
            {result.emailSent ? (
              <>
                Email sent to {result.email}
                {result.emailMessageId ? ` (id: ${result.emailMessageId})` : ""}
              </>
            ) : (
              <>
                <strong>Email not sent.</strong> {result.emailReason}
              </>
            )}
          </p>
        </div>
      ) : null}
    </section>
  );
}
