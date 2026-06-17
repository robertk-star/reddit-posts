export type AiRecommendation = {
  recommendation: "answer" | "soft_link" | "no_link" | "skip";
  reason: string;
  reply_angle: string;
  risk_warning: string;
  link_guidance: string;
};

export function buildRecommendationPrompt(input: {
  projectName: string;
  linkToPromote?: string | null;
  voiceTone?: string | null;
  keyPoints?: string[] | null;
  avoidPhrases?: string[] | null;
  title?: string | null;
  body?: string | null;
  source?: string | null;
  whyRelevant?: string | null;
  riskLevel?: string | null;
}) {
  return `You are reviewing a public web/forum opportunity before a human decides whether to reply.

Decide the safest and most useful response strategy.

Allowed recommendation values:
- answer: reply with helpful information, no link needed
- soft_link: reply with helpful information and include a soft, optional link only if natural
- no_link: reply, but do not include a link because the thread is sensitive or link would feel promotional
- skip: do not reply

Rules:
- Avoid spammy or promotional behavior.
- Do not recommend a link if it would feel forced.
- If the post asks for legal, medical, financial, or personal advice, keep it general and cautious.
- If the user sounds distressed, vulnerable, angry, or the conversation is not a good fit, recommend skip or no_link.
- Do not make promises or guarantees.

Project: ${input.projectName}
Source: ${input.source || "Unknown"}
Preferred link: ${input.linkToPromote || "None"}
Voice: ${input.voiceTone || "plain, practical, helpful, non-salesy"}
Current risk: ${input.riskLevel || "medium"}

Key points:
${(input.keyPoints || []).map((item) => `- ${item}`).join("\n") || "- Be helpful first. Link second."}

Avoid phrases:
${(input.avoidPhrases || []).map((item) => `- ${item}`).join("\n") || "- guaranteed approval\n- qualify instantly\n- best service"}

Opportunity title:
${input.title || "Untitled"}

Opportunity body/excerpt:
${input.body || "No body provided."}

Why it was flagged:
${input.whyRelevant || "Keyword match."}

Return only valid JSON with these keys:
{
  "recommendation": "answer | soft_link | no_link | skip",
  "reason": "short reason",
  "reply_angle": "suggested angle for the human reply",
  "risk_warning": "risk or caution note, or empty string",
  "link_guidance": "how to handle the link, or empty string"
}`;
}

export function parseRecommendation(raw: string): AiRecommendation {
  const fallback: AiRecommendation = {
    recommendation: "answer",
    reason: "AI returned an unreadable recommendation, so review manually.",
    reply_angle: "Provide a short, helpful answer and avoid sounding promotional.",
    risk_warning: "Review manually before posting.",
    link_guidance: "Only include a link if it clearly helps."
  };

  try {
    const cleaned = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const allowed = new Set(["answer", "soft_link", "no_link", "skip"]);
    return {
      recommendation: allowed.has(parsed.recommendation) ? parsed.recommendation : fallback.recommendation,
      reason: String(parsed.reason || fallback.reason).slice(0, 1200),
      reply_angle: String(parsed.reply_angle || fallback.reply_angle).slice(0, 1200),
      risk_warning: String(parsed.risk_warning || "").slice(0, 1200),
      link_guidance: String(parsed.link_guidance || "").slice(0, 1200)
    };
  } catch {
    return fallback;
  }
}
