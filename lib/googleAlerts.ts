import { createHash } from "crypto";

export type ExtractedAlertUrl = {
  url: string;
  externalId: string;
  title: string;
  host: string;
};

function cleanRawUrl(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/[),.;\]>]+$/g, "")
    .trim();
}

function normalizeUrl(value: string) {
  try {
    const original = new URL(cleanRawUrl(value));

    const possibleRedirect = original.searchParams.get("url") || original.searchParams.get("q");
    if (original.hostname.includes("google.") && possibleRedirect?.startsWith("http")) {
      return normalizeUrl(possibleRedirect);
    }

    if (original.protocol !== "http:" && original.protocol !== "https:") return null;
    if (original.hostname.includes("google.") && original.pathname.includes("/alerts")) return null;
    if (original.hostname.includes("mail.google.")) return null;
    if (original.hostname.includes("accounts.google.")) return null;

    for (const key of Array.from(original.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) original.searchParams.delete(key);
      if (["utm", "fbclid", "gclid", "mc_cid", "mc_eid"].includes(key.toLowerCase())) original.searchParams.delete(key);
    }

    original.hash = "";
    return original.toString();
  } catch {
    return null;
  }
}

export function urlHash(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

export function extractGoogleAlertUrls(rawContent: string): ExtractedAlertUrl[] {
  const matches = rawContent.match(/https?:\/\/[^\s<>"']+/g) || [];
  const seen = new Set<string>();
  const results: ExtractedAlertUrl[] = [];

  for (const match of matches) {
    const normalized = normalizeUrl(match);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    const pathLabel = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.split("/").filter(Boolean).slice(0, 2).join(" / ") : "home page";

    results.push({
      url: normalized,
      externalId: urlHash(normalized),
      title: `${host} — ${pathLabel}`,
      host
    });
  }

  return results;
}
