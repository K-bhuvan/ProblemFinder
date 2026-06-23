export function decodeHtmlEntities(text: string) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<");
}

function stripQuotePrefix(text: string) {
  return text.replace(/^(?:>\s*)+/g, "").trim();
}

const QUOTE_FRAGMENT_PATTERN = /^(\.{3}|…|\.{2,})\s*$/i;

const HTML_ENTITY_LEFTOVER_PATTERN = /^&(gt|lt|amp|quot)(;|\b)/i;

/** Structural garbage only — semantic pain vs news is handled by the LLM. */
export function isStructurallyNoisy(text: string) {
  const decoded = decodeHtmlEntities(text.trim());

  if (!decoded) {
    return true;
  }

  if (HTML_ENTITY_LEFTOVER_PATTERN.test(decoded)) {
    return true;
  }

  if (QUOTE_FRAGMENT_PATTERN.test(decoded)) {
    return true;
  }

  if (/^>\s*(\.{3}|…)?\s*$/i.test(decoded)) {
    return true;
  }

  const withoutQuotes = stripQuotePrefix(decoded);

  if (!withoutQuotes || QUOTE_FRAGMENT_PATTERN.test(withoutQuotes)) {
    return true;
  }

  return withoutQuotes.length < 12;
}
