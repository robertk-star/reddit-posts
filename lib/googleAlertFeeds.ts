import { createHash } from "crypto";

export type GoogleAlertFeedItem = {
  url: string;
  externalId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  host: string;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : "";
}

function attr(block: string, name: string) {
  const match = block.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ? decodeXml(match[1]) : "";
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeLink(value: string) {
  try {
    const url = new URL(value.replace(/&amp;/g, "&"));
    const redirect = url.searchParams.get("url") || url.searchParams.get("q");
    if (url.hostname.includes("google.") && redirect?.startsWith("http")) return normalizeLink(redirect);
    for (const key of Array.from(url.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(lower)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

export async function fetchGoogleAlertFeed(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "OpportunityRadar/0.4 GoogleAlertFeedScanner", Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status}`);
  const xml = await response.text();
  const itemBlocks = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map((m) => m[0]);
  const entryBlocks = Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map((m) => m[0]);
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;
  const seen = new Set<string>();
  const results: GoogleAlertFeedItem[] = [];

  for (const block of blocks) {
    const title = tag(block, "title") || "Untitled alert result";
    const description = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const rawLink = tag(block, "link") || attr(block.match(/<link[^>]*>/i)?.[0] || "", "href");
    const url = normalizeLink(rawLink);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    results.push({
      url,
      externalId: hash(url),
      title,
      description,
      publishedAt: tag(block, "pubDate") || tag(block, "updated") || tag(block, "published") || null,
      host: hostFromUrl(url)
    });
  }

  return results.slice(0, 50);
}
