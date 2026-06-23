import { HACKER_NEWS_URL } from "../lib/copy/disclaimer";

export function SourceAttribution() {
  return (
    <p className="source-attribution">
      Discussion data from{" "}
      <a href={HACKER_NEWS_URL} rel="noreferrer" target="_blank">
        Hacker News
      </a>
      . Not affiliated with Y Combinator.
    </p>
  );
}
