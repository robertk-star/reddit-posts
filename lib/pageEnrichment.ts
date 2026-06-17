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

function attr(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function textFromHtml(value: string) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function titleFromUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean).slice(0, 3).map((part) => decodeURIComponent(part).replace(/[-_]+/g, " "));
    return `${host} — ${parts.join(" / ") || "home page"}`;
  } catch {
    return "Untitled result";
  }
}

export function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export async function enrichPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "OpportunityRadar/0.3 BackfillEnricher", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();
    const pageTitle = attr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || titleFromUrl(url);
    const pageDescription = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || attr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const pagePreview = textFromHtml(html).slice(0, 700);
    return { sourceHost: hostFromUrl(url), pageTitle, pageDescription, pagePreview, pageFetchedAt: new Date().toISOString(), ok: true, error: null };
  } catch (error: any) {
    return { sourceHost: hostFromUrl(url), pageTitle: titleFromUrl(url), pageDescription: "", pagePreview: "", pageFetchedAt: null, ok: false, error: error?.message || String(error) };
  }
}
