import { NextResponse } from "next/server";
import { requireAdmin, isAdminRequest } from "@/lib/adminAuth";
import { optionalEnv } from "@/lib/env";
import { scoreThread } from "@/lib/relevance";
import { searchSubredditPosts } from "@/lib/reddit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const cronSecret = optionalEnv("CRON_SECRET");
  const headerSecret = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearerSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const querySecret = url.searchParams.get("secret");
  if (cronSecret && (headerSecret === cronSecret || bearerSecret === cronSecret || querySecret === cronSecret)) return true;
  return isAdminRequest();
}

async function runScan() {
  const { data: rules, error } = await supabaseAdmin
    .from("monitoring_rules")
    .select("*, sources(*), projects(*)")
    .eq("active", true);

  if (error) throw error;

  let totalFound = 0;
  const details: Array<{ ruleId: string; status: string; found: number; error?: string }> = [];

  for (const rule of rules || []) {
    const sourceType = rule.sources?.type;
    const startedAt = new Date().toISOString();
    let runId: string | null = null;
    try {
      const { data: run } = await supabaseAdmin
        .from("scan_runs")
        .insert({ monitoring_rule_id: rule.id, started_at: startedAt, status: "running" })
        .select("id")
        .single();
      runId = run?.id || null;

      if (sourceType !== "reddit_api") {
        throw new Error(`Unsupported source type in Phase 1: ${sourceType}`);
      }

      const keywords: string[] = rule.keywords || [];
      const locations: string[] = rule.target_locations || [];
      let foundForRule = 0;

      for (const subreddit of locations) {
        const posts = await searchSubredditPosts({ subreddit, keywords, limit: 25 });
        for (const post of posts) {
          const relevance = scoreThread({ title: post.title, body: post.body, keywords });
          if (relevance.score < Number(rule.min_relevance_score || 0.45)) continue;

          const { error: upsertError } = await supabaseAdmin.from("candidate_threads").upsert(
            {
              monitoring_rule_id: rule.id,
              source_id: rule.source_id,
              project_id: rule.project_id,
              external_id: post.externalId,
              url: post.url,
              title: post.title,
              body_excerpt: post.body?.slice(0, 1200) || "",
              full_body: post.body || "",
              author: post.author,
              posted_at: post.postedAt,
              subreddit: post.subreddit,
              platform_score: post.score,
              comment_count: post.commentCount,
              relevance_score: relevance.score,
              why_relevant: relevance.why,
              risk_level: relevance.riskLevel,
              last_checked_at: new Date().toISOString()
            },
            { onConflict: "source_id,external_id", ignoreDuplicates: false }
          );

          if (upsertError) throw upsertError;
          foundForRule += 1;
        }
      }

      totalFound += foundForRule;
      if (runId) {
        await supabaseAdmin
          .from("scan_runs")
          .update({ completed_at: new Date().toISOString(), threads_found: foundForRule, status: "success" })
          .eq("id", runId);
      }
      details.push({ ruleId: rule.id, status: "success", found: foundForRule });
    } catch (err: any) {
      if (runId) {
        await supabaseAdmin
          .from("scan_runs")
          .update({ completed_at: new Date().toISOString(), status: "error", error_message: err.message || String(err) })
          .eq("id", runId);
      }
      details.push({ ruleId: rule.id, status: "error", found: 0, error: err.message || String(err) });
    }
  }

  return { totalFound, details };
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runScan();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runScan();
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL(`/admin?scan=done&found=${result.totalFound}`, request.url), { status: 303 });
  }
  return NextResponse.json(result);
}
