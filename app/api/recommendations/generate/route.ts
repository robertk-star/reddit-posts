import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { optionalEnv, requireEnv } from "@/lib/env";
import { buildRecommendationPrompt, parseRecommendation } from "@/lib/recommendations";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const candidateThreadId = String(form.get("candidate_thread_id") || "");
    if (!candidateThreadId) return NextResponse.json({ error: "Missing candidate_thread_id" }, { status: 400 });

    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("candidate_threads")
      .select("*, projects(*), sources(*), search_profiles(*)")
      .eq("id", candidateThreadId)
      .single();
    if (candidateError) throw candidateError;

    const { data: voice } = await supabaseAdmin.from("voice_profiles").select("*").eq("project_id", candidate.project_id).maybeSingle();

    const model = optionalEnv("OPENAI_MODEL", "gpt-5.4-mini");
    const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    const prompt = buildRecommendationPrompt({
      projectName: candidate.projects?.name || "Project",
      linkToPromote: candidate.projects?.link_to_promote || candidate.projects?.site_url || "",
      voiceTone: voice?.tone_description,
      keyPoints: voice?.key_points,
      avoidPhrases: voice?.avoid_phrases,
      title: candidate.title,
      body: candidate.full_body || candidate.body_excerpt,
      source: candidate.sources?.name || candidate.imported_from || "Unknown",
      whyRelevant: candidate.why_relevant,
      riskLevel: candidate.risk_level
    });

    const response = await client.responses.create({ model, input: prompt, max_output_tokens: 700 });
    const recommendation = parseRecommendation(response.output_text || "");

    const { error: updateError } = await supabaseAdmin.from("candidate_threads").update({
      ai_recommendation: recommendation.recommendation,
      ai_recommendation_reason: recommendation.reason,
      ai_reply_angle: recommendation.reply_angle,
      ai_risk_warning: recommendation.risk_warning,
      ai_link_guidance: recommendation.link_guidance,
      ai_recommendation_model: model,
      ai_recommendation_at: new Date().toISOString()
    }).eq("id", candidateThreadId);
    if (updateError) throw updateError;

    return NextResponse.redirect(new URL("/admin/candidates", request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate recommendation" }, { status: 500 });
  }
}
