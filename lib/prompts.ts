export function buildDraftPrompt(input: {
  projectName: string;
  siteUrl: string;
  linkToPromote: string;
  voiceTone?: string | null;
  keyPoints?: string[] | null;
  avoidPhrases?: string[] | null;
  threadTitle: string;
  threadBody: string;
  whyRelevant?: string | null;
}) {
  return `You are writing a helpful public reply for a discussion thread.

Rules:
- Do not pretend to be the original poster's lawyer, doctor, representative, or official advisor.
- Do not make guarantees.
- Keep the response practical and human.
- Avoid sounding promotional.
- Do not force a link. Include the link only if it naturally helps.
- If the topic seems risky, legal, medical, or personal, keep the advice general and suggest checking official/professional sources.
- Write in first person plural only if it fits naturally. Do not overuse "we."

Project:
${input.projectName}

Site URL:
${input.siteUrl}

Preferred link, only if helpful:
${input.linkToPromote}

Voice:
${input.voiceTone || "plain, practical, helpful, non-salesy"}

Key points to use when relevant:
${(input.keyPoints || []).map((point) => `- ${point}`).join("\n") || "- Be helpful first. Link second."}

Avoid these phrases:
${(input.avoidPhrases || []).map((phrase) => `- ${phrase}`).join("\n") || "- guaranteed approval\n- qualify instantly\n- best service"}

Thread title:
${input.threadTitle}

Thread body:
${input.threadBody || "No body provided."}

Why this thread was flagged:
${input.whyRelevant || "Keyword/relevance match."}

Return exactly two draft options:
1. No-link helpful answer
2. Soft-link answer

Keep each option under 180 words.`;
}
