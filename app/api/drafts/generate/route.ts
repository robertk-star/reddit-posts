import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { optionalEnv, requireEnv } from "@/lib/env";
import { buildDraftPrompt } from "@/lib/prompts";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const candidateThreadId = String(form.get("candidate_thread_id") || "");
    if (!candidateThreadId) {
      return NextResponse.json({ error: "Missing candidate_thread_id" }, { status: 400 });
    }

    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("candidate_threads")
      .select("*, projects(*), monitoring_rules(*), sources(*)")
      .eq("id", candidateThreadId)
      .single();

    if (candidateError) throw candidateError;

    const { data: voice } = await supabaseAdmin
      .from("voice_profiles")
      .select("*")
      .eq("project_id", candidate.project_id)
      .maybeSingle();

    const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
    const model = optionalEnv("ANTHROPIC_MODEL", "claude-haiku-4-5");
    const prompt = buildDraftPrompt({
      projectName: candidate.projects?.name || "Project",
      siteUrl: candidate.projects?.site_url || "",
      linkToPromote: candidate.projects?.link_to_promote || candidate.projects?.site_url || "",
      voiceTone: voice?.tone_description,
      keyPoints: voice?.key_points,
      avoidPhrases: voice?.avoid_phrases,
      threadTitle: candidate.title || "",
      threadBody: candidate.full_body || candidate.body_excerpt || "",
      whyRelevant: candidate.why_relevant
    });

    const message = await anthropic.messages.create({
      model,
      max_tokens: 900,
      temperature: 0.6,
      messages: [{ role: "user", content: prompt }]
    });

    const draftText = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    const { error: insertError } = await supabaseAdmin.from("draft_versions").insert({
      candidate_thread_id: candidateThreadId,
      draft_text: draftText,
      draft_type: "two_options",
      model_used: model,
      risk_notes: candidate.risk_level === "high" ? "High-risk thread: review carefully before posting." : null,
      is_selected: false
    });
    if (insertError) throw insertError;

    await supabaseAdmin.from("candidate_threads").update({ status: "drafted" }).eq("id", candidateThreadId);

    return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate draft" }, { status: 500 });
  }
}
