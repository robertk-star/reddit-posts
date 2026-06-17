import { createHash } from "crypto";

export type WebCandidate = {
  url: string;
  externalId: string;
  title: string;
  host: string;
  sourceUrl: string;
  pageTitle: string;
  pageDescription: string;
  pagePreview: string;
  pageFetchedAt: string | null;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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
      if (lower.startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(lower)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function textFromHtml(value: string) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function attr(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function titleFromUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean).slice(0, 3).map((part) => decodeURIComponent(part).replace(/[-_]+/g, " "));
  return `${host} — ${parts.join(" / ") || "home page"}`;
}

async function fetchPageDetails(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpportunityRadar/0.3 ResultEnricher",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();
    const title = attr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const text = textFromHtml(html).slice(0, 700);
    return { pageTitle: title, pageDescription: description, pagePreview: text, pageFetchedAt: new Date().toISOString() };
  } catch {
    return { pageTitle: "", pageDescription: "", pagePreview: "", pageFetchedAt: null };
  }
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
    const keywordMatch = lowerKeywords.length === 0 || lowerKeywords.some((term) => {
      const dashed = term.split(" ").join("-");
      return lowerUrl.includes(dashed) || lowerUrl.includes(term) || pageText.includes(term);
    });
    if (!keywordMatch) continue;

    const parsed = new URL(normalized);
    const details = await fetchPageDetails(normalized);
    const fallbackTitle = titleFromUrl(normalized);
    results.push({
      url: normalized,
      externalId: hash(normalized),
      title: details.pageTitle || fallbackTitle,
      host: parsed.hostname.replace(/^www\./, ""),
      sourceUrl: startUrl,
      pageTitle: details.pageTitle || fallbackTitle,
      pageDescription: details.pageDescription,
      pagePreview: details.pagePreview,
      pageFetchedAt: details.pageFetchedAt
    });

    if (results.length >= 20) break;
  }

  return results;
}
