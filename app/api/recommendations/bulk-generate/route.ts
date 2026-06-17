import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { optionalEnv, requireEnv } from "@/lib/env";
import { buildRecommendationPrompt, parseRecommendation } from "@/lib/recommendations";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function recommendOne(client: OpenAI, model: string, id: string) {
  const { data: candidate, error } = await supabaseAdmin.from("candidate_threads").select("*, projects(*), sources(*)").eq("id", id).single();
  if (error || !candidate) return false;
  const { data: voice } = await supabaseAdmin.from("voice_profiles").select("*").eq("project_id", candidate.project_id).maybeSingle();
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
  const rec = parseRecommendation(response.output_text || "");
  const { error: updateError } = await supabaseAdmin.from("candidate_threads").update({
    ai_recommendation: rec.recommendation,
    ai_recommendation_reason: rec.reason,
    ai_reply_angle: rec.reply_angle,
    ai_risk_warning: rec.risk_warning,
    ai_link_guidance: rec.link_guidance,
    ai_recommendation_model: model,
    ai_recommendation_at: new Date().toISOString()
  }).eq("id", id);
  return !updateError;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const ids = form.getAll("candidate_ids").map((value) => String(value)).filter(Boolean).slice(0, 10);
    if (ids.length === 0) return NextResponse.redirect(new URL("/admin/candidates?bulk=missing", request.url), { status: 303 });
    const model = optionalEnv("OPENAI_MODEL", "gpt-5.4-mini");
    const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    let count = 0;
    for (const id of ids) {
      if (await recommendOne(client, model, id)) count += 1;
    }
    return NextResponse.redirect(new URL(`/admin/candidates?bulk=recommended&count=${count}`, request.url), { status: 303 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate bulk recommendations" }, { status: 500 });
  }
}
