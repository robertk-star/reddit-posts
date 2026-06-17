import { createHash } from "crypto";

export type WebCandidate = {
  url: string;
  externalId: string;
  title: string;
  host: string;
  sourceUrl: string;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toStartUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function normalizeUrl(raw: string, baseUrl: string) {
  try {
    const url = new URL(raw.replace(/&amp;/g, "&"), baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    for (const key of Array.from(url.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(lower)) {
        url.searchParams.delete(key);
      }
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function textFromHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean).slice(0, 3);
  return `${host} — ${parts.join(" / ") || "home page"}`;
}

export async function scanSourceUrl(sourceValue: string, keywords: string[], excludedTerms: string[]) {
  const startUrl = toStartUrl(sourceValue);
  if (!startUrl) return [];

  const response = await fetch(startUrl, {
    headers: {
      "User-Agent": "OpportunityRadar/0.3 HybridWebScanner",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) throw new Error(`Fetch failed for ${startUrl}: ${response.status}`);
  const html = await response.text();
  const pageText = textFromHtml(html).toLowerCase();
  const lowerKeywords = keywords.map((item) => item.toLowerCase()).filter(Boolean);
  const lowerExcluded = excludedTerms.map((item) => item.toLowerCase()).filter(Boolean);

  const hrefMatches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]);
  const seen = new Set<string>();
  const results: WebCandidate[] = [];

  for (const href of hrefMatches) {
    const normalized = normalizeUrl(href, startUrl);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const lowerUrl = normalized.toLowerCase();
    if (lowerExcluded.some((term) => lowerUrl.includes(term) || pageText.includes(term))) continue;

    const keywordMatch = lowerKeywords.length === 0 || lowerKeywords.some((term) => lowerUrl.includes(term.replaceAll(" ", "-")) || lowerUrl.includes(term) || pageText.includes(term));
    if (!keywordMatch) continue;

    const parsed = new URL(normalized);
    results.push({
      url: normalized,
      externalId: hash(normalized),
      title: titleFromUrl(normalized),
      host: parsed.hostname.replace(/^www\./, ""),
      sourceUrl: startUrl
    });
  }

  return results.slice(0, 25);
}
