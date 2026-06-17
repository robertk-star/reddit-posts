export type ResultQualityInput = {
  url: string;
  title?: string | null;
  description?: string | null;
  preview?: string | null;
  keywords?: string[] | null;
  excludedTerms?: string[] | null;
  allowlist?: string[] | null;
  blocklist?: string[] | null;
};

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hasDomainMatch(host: string, domains?: string[] | null) {
  return (domains || []).some((domain) => {
    const clean = String(domain || "").trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
    return clean && (host === clean || host.endsWith(`.${clean}`));
  });
}

export function scoreResultQuality(input: ResultQualityInput) {
  const host = hostFromUrl(input.url);
  const text = `${input.title || ""} ${input.description || ""} ${input.preview || ""} ${input.url || ""}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0.25;

  if (!host) return { score: 0, reason: "Invalid URL", blocked: true, host: "" };
  if (hasDomainMatch(host, input.blocklist)) return { score: 0, reason: `Blocked domain: ${host}`, blocked: true, host };
  if ((input.allowlist || []).length > 0 && !hasDomainMatch(host, input.allowlist)) {
    return { score: 0, reason: `Not in allowlist: ${host}`, blocked: true, host };
  }

  if (input.title && input.title.length > 12) {
    score += 0.2;
    reasons.push("has title");
  }
  if (input.description && input.description.length > 40) {
    score += 0.2;
    reasons.push("has description");
  }
  if (input.preview && input.preview.length > 120) {
    score += 0.15;
    reasons.push("has page preview");
  }

  const keywordMatches = (input.keywords || []).filter((keyword) => keyword && text.includes(keyword.toLowerCase())).length;
  if (keywordMatches > 0) {
    score += Math.min(0.25, keywordMatches * 0.08);
    reasons.push(`${keywordMatches} keyword match${keywordMatches === 1 ? "" : "es"}`);
  }

  const excludedHit = (input.excludedTerms || []).find((term) => term && text.includes(term.toLowerCase()));
  if (excludedHit) {
    return { score: 0, reason: `Excluded term matched: ${excludedHit}`, blocked: true, host };
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  return { score, reason: reasons.join(", ") || "basic URL match", blocked: false, host };
}
