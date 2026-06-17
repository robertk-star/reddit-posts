import { createHash } from "crypto";

export type ExtractedAlertUrl = {
  url: string;
  externalId: string;
  title: string;
  host: string;
  pageTitle: string;
  pageDescription: string;
  pagePreview: string;
  pageFetchedAt: string | null;
};

function cleanRawUrl(value: string) {
  return value.replace(/&amp;/g, "&").replace(/[),.;\]>]+$/g, "").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value: string) {
  try {
    const original = new URL(cleanRawUrl(value));
    const possibleRedirect = original.searchParams.get("url") || original.searchParams.get("q");
    if (original.hostname.includes("google.") && possibleRedirect?.startsWith("http")) return normalizeUrl(possibleRedirect);
    if (original.protocol !== "http:" && original.protocol !== "https:") return null;
    if (original.hostname.includes("google.") && original.pathname.includes("/alerts")) return null;
    if (original.hostname.includes("mail.google.")) return null;
    if (original.hostname.includes("accounts.google.")) return null;
    for (const key of Array.from(original.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || ["utm", "fbclid", "gclid", "mc_cid", "mc_eid"].includes(lower)) original.searchParams.delete(key);
    }
    original.hash = "";
    return original.toString();
  } catch {
    return null;
  }
}

function titleFromUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  const pathLabel = url.pathname && url.pathname !== "/" ? url.pathname.split("/").filter(Boolean).slice(0, 3).map((part) => decodeURIComponent(part).replace(/[-_]+/g, " ")).join(" / ") : "home page";
  return `${host} — ${pathLabel}`;
}

function textFromHtml(value: string) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function attr(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

async function fetchPageDetails(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "OpportunityRadar/0.3 AlertEnricher", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();
    const title = attr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const preview = textFromHtml(html).slice(0, 700);
    return { pageTitle: title, pageDescription: description, pagePreview: preview, pageFetchedAt: new Date().toISOString() };
  } catch {
    return { pageTitle: "", pageDescription: "", pagePreview: "", pageFetchedAt: null };
  }
}

export function urlHash(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

export async function extractGoogleAlertUrls(rawContent: string): Promise<ExtractedAlertUrl[]> {
  const matches = rawContent.match(/https?:\/\/[^\s<>"']+/g) || [];
  const seen = new Set<string>();
  const results: ExtractedAlertUrl[] = [];

  for (const match of matches) {
    const normalized = normalizeUrl(match);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    const details = await fetchPageDetails(normalized);
    const fallbackTitle = titleFromUrl(parsed);
    results.push({
      url: normalized,
      externalId: urlHash(normalized),
      title: details.pageTitle || fallbackTitle,
      host,
      pageTitle: details.pageTitle || fallbackTitle,
      pageDescription: details.pageDescription,
      pagePreview: details.pagePreview,
      pageFetchedAt: details.pageFetchedAt
    });
    if (results.length >= 25) break;
  }

  return results;
}
