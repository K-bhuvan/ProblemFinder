"use client";

import { FormEvent, useRef, useState } from "react";

import { ANALYSIS_DISCLAIMER } from "../lib/copy/disclaimer";
import {
  ACTIVE_SOURCES_LABEL,
  formatActiveSources,
  formatSourceLinkLabel,
  HERO_COPY,
  HERO_TITLE,
  MANUAL_SECTION_COPY,
  MANUAL_SECTION_TITLE,
  MANUAL_SUBMIT_LABEL,
  PRODUCT_EYEBROW,
  TRACTION_NOTE,
} from "../lib/copy/ui";
import { AutoModePanel } from "./auto-mode-panel";
import { SourceAttribution } from "./source-attribution";
import type { ProblemCluster } from "../lib/analysis/types";

type AnalyzeResponse = {
  query: string;
  searchTerms: string[];
  source: "Hacker News";
  lookbackDays: number;
  fetchedCount: number;
  hnRequestsUsed: number;
  tractionQualifiedCount: number;
  painClassifiedCount: number;
  validatedProblemCount: number;
  clusters: ProblemCluster[];
};

export function ProblemFinderMvp() {
  const [query, setQuery] = useState("");
  const [lookbackDays, setLookbackDays] = useState("30");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          lookbackDays: Number(lookbackDays),
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to run analysis right now.");
      }

      setAnalysis(payload);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to run analysis right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">{PRODUCT_EYEBROW}</p>
        <h1>{HERO_TITLE}</h1>
        <p className="hero-copy">{HERO_COPY}</p>
        <p className="source-badge">
          {ACTIVE_SOURCES_LABEL}: {formatActiveSources()}
        </p>
      </section>

      <section className="analysis-card" aria-labelledby="analysis-form-title">
        <div>
          <p className="eyebrow">Input</p>
          <h2 id="analysis-form-title">{MANUAL_SECTION_TITLE}</h2>
          <p className="hero-copy">{MANUAL_SECTION_COPY}</p>
        </div>

        <form className="analysis-form" onSubmit={handleSubmit}>
          <label>
            <span>Research query</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="robotics, or: What problems do founders have with billing tools?"
              required
            />
          </label>

          <label>
            <span>Lookback window</span>
            <select
              value={lookbackDays}
              onChange={(event) => setLookbackDays(event.target.value)}
            >
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Analyzing..." : MANUAL_SUBMIT_LABEL}
          </button>
        </form>

        {isLoading ? (
          <p className="analysis-status" role="status">
            Running analysis — fetching posts, classifying pain, and clustering
            problems. This usually takes 30–90 seconds.
          </p>
        ) : null}

        {error ? <p className="error-message">{error}</p> : null}
      </section>

      {analysis ? (
        <section
          ref={resultsRef}
          className="results-grid"
          aria-live="polite"
        >
          <div className="summary-panel">
            <p className="eyebrow">Analysis run</p>
            <h2>{analysis.query}</h2>
            <p>
              {ACTIVE_SOURCES_LABEL}: {formatActiveSources()}
            </p>
            <p>{analysis.lookbackDays} day lookback</p>
            <p>Search terms: {analysis.searchTerms.join(", ")}</p>
            <p>
              {analysis.fetchedCount} posts fetched ({analysis.hnRequestsUsed}{" "}
              API calls) → {analysis.tractionQualifiedCount}{" "}
              traction-qualified → {analysis.painClassifiedCount} LLM pain
              signals → {analysis.validatedProblemCount} validated problems →{" "}
              {analysis.clusters.length} clusters.
            </p>
            <p className="pipeline-note">{TRACTION_NOTE}</p>
          </div>

          <div className="clusters-panel">
            <div className="section-heading">
              <p className="eyebrow">Output</p>
              <h2>Ranked problem clusters</h2>
              <p>Original source links stay attached to every insight.</p>
            </div>

            <div className="cluster-list">
              {analysis.clusters.length === 0 ? (
                <p>
                  {analysis.fetchedCount === 0
                    ? "No matching posts were found in this lookback window. Try a longer window (30–90 days) or a more specific query like robotics firmware or IoT device management."
                    : "No strong complaint clusters found for this query in the selected window. Try a broader query or longer lookback."}
                </p>
              ) : (
                analysis.clusters.map((cluster) => (
                  <article className="cluster-card" key={cluster.title}>
                    <div className="cluster-header">
                      <h3>{cluster.title}</h3>
                      <span>{cluster.severity}</span>
                    </div>
                    <p>
                      Traction {cluster.tractionScore}
                      {cluster.sourceUrls.length > 0 ? (
                        <>
                          {" "}
                          · Sources:{" "}
                          {cluster.sourceUrls.map((url, index) => (
                            <a
                              key={url}
                              className="evidence-link"
                              href={url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {formatSourceLinkLabel(index)}
                            </a>
                          ))}
                        </>
                      ) : null}
                    </p>
                    <p>{cluster.summary}</p>
                    <strong>Representative evidence</strong>
                    {cluster.evidence.map((evidence) => (
                      <div className="evidence-item" key={evidence.id}>
                        <a
                          className="evidence-link"
                          href={evidence.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {evidence.title}
                        </a>
                        {evidence.text ? (
                          <p className="evidence-snippet">{evidence.text}</p>
                        ) : null}
                      </div>
                    ))}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="empty-state">
          <p>
            Start with a research query and a 30 day lookback to generate the
            first problem evidence pack.
          </p>
        </section>
      )}

      <AutoModePanel />

      <SourceAttribution />
      <p className="analysis-disclaimer">{ANALYSIS_DISCLAIMER}</p>
    </main>
  );
}
