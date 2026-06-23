export const PRODUCT_EYEBROW = "Problem discovery";

export const HERO_TITLE = "Find startup-worthy problems from real user discussions.";

export const HERO_COPY =
  "Surface buildable pain points from public forums with traction filtering, LLM classification, and source links on every insight.";

export const MANUAL_SECTION_TITLE = "Search by topic";

export const MANUAL_SECTION_COPY =
  "Topic-driven search. LLM separates real pain from news and updates, keeps traction-qualified threads, and attaches source links to every cluster.";

export const MANUAL_SUBMIT_LABEL = "Run analysis";

export const TRACTION_NOTE =
  "Share and ranking use traction: points + comments × 3, deduped per thread. News and low-traction threads are dropped before clustering.";

export const SOURCE_LINK_LABEL = "Source";

export function formatSourceLinkLabel(index: number) {
  return `${SOURCE_LINK_LABEL} ${index + 1}`;
}

export const ACTIVE_SOURCES_LABEL = "Active sources";

export const CURRENT_SOURCES = ["Hacker News"] as const;

export function formatActiveSources() {
  return CURRENT_SOURCES.join(", ");
}
