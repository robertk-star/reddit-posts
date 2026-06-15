export type RelevanceResult = {
  score: number;
  why: string;
  riskLevel: "low" | "medium" | "high";
};

const riskWords = ["lawsuit", "kill", "suicide", "self harm", "medical emergency", "urgent", "illegal", "fraud", "scam"];

export function scoreThread(input: { title?: string | null; body?: string | null; keywords: string[] }): RelevanceResult {
  const text = `${input.title || ""}\n${input.body || ""}`.toLowerCase();
  const keywords = input.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);

  let matches = 0;
  const matchedKeywords: string[] = [];
  for (const keyword of keywords) {
    const parts = keyword.split(/\s+/).filter(Boolean);
    const exact = text.includes(keyword);
    const partial = parts.length > 1 && parts.some((part) => part.length > 4 && text.includes(part));
    if (exact || partial) {
      matches += exact ? 2 : 1;
      matchedKeywords.push(keyword);
    }
  }

  const questionBoost = /\?|how do i|what should|any advice|help|where can|can i|should i/.test(text) ? 0.15 : 0;
  const score = Math.min(1, Math.max(0.1, matches / Math.max(3, keywords.length) + questionBoost));
  const riskLevel = riskWords.some((word) => text.includes(word)) ? "high" : score > 0.75 ? "low" : "medium";

  return {
    score: Number(score.toFixed(2)),
    why: matchedKeywords.length
      ? `Matched: ${matchedKeywords.slice(0, 6).join(", ")}${questionBoost ? "; appears to be asking for help/advice" : ""}.`
      : "Weak semantic match; review before drafting.",
    riskLevel
  };
}
