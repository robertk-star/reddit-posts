import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Search = { status?: string; risk?: string; project?: string; source?: string; profile?: string; bulk?: string; count?: string };

function dt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function CandidatesPage({ searchParams }: { searchParams?: Promise<Search> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const params = searchParams ? await searchParams : {};
  const status = params.status || "active";
  const risk = params.risk || "all";
  const project = params.project || "all";
  const source = params.source || "all";
  const profile = params.profile || "all";

  let query = supabaseAdmin
    .from("candidate_threads")
    .select("*, projects(name), sources(name,type), search_profiles(name), draft_versions(id,draft_text,generated_at,model_used,risk_notes)")
    .order("discovered_at", { ascending: false })
    .limit(100);

  if (status === "active") query = query.in("status", ["new", "drafted", "snoozed"]);
  if (["new", "drafted", "posted", "skipped", "snoozed"].includes(status)) query = query.eq("status", status);
  if (["low", "medium", "high"].includes(risk)) query = query.eq("risk_level", risk);
  if (project !== "all") query = query.eq("project_id", project);
  if (source !== "all") query = query.eq("source_id", source);
  if (profile !== "all") query = query.eq("search_profile_id", profile);

  const [{ data: candidates }, { data: projects }, { data: sources }, { data: profiles }] = await Promise.all([
    query,
    supabaseAdmin.from("projects").select("id,name").order("name"),
    supabaseAdmin.from("sources").select("id,name,type").eq("active", true).order("name"),
    supabaseAdmin.from("search_profiles").select("id,name").order("name")
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/hybrid-scanner" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Hybrid Scanner</Link>
            <Link href="/admin/google-alerts" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Google Alerts</Link>
          </div>
        </div>

        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Opportunities</h1>
          <p className="mt-1 text-sm text-slate-600">Filter Google Alerts, Hybrid Web, and Reddit results. Select rows for bulk actions.</p>
          {params.bulk ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Bulk update complete: {params.count || 0} item(s) set to {params.bulk}.</p> : null}
          <form action="/admin/candidates" className="mt-5 grid gap-3 md:grid-cols-6">
            <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="active">Active</option><option value="new">New</option><option value="drafted">Drafted</option><option value="snoozed">Snoozed</option><option value="posted">Posted</option><option value="skipped">Skipped</option>
            </select>
            <select name="risk" defaultValue={risk} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All risk</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <select name="project" defaultValue={project} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All projects</option>{(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select name="source" defaultValue={source} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All sources</option>{(sources || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="profile" defaultValue={profile} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All profiles</option>{(profiles || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700">Apply</button>
          </form>
        </section>

        <form action="/api/candidates/bulk-status" method="post" className="mt-6 grid gap-5">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Bulk action for selected:</span>
              <button name="status" value="skipped" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Skip</button>
              <button name="status" value="snoozed" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Snooze</button>
              <button name="status" value="posted" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Mark Posted</button>
            </div>
          </div>

          {(candidates || []).length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-slate-600 ring-1 ring-slate-200">No opportunities match this filter.</div> : null}
          {(candidates || []).map((candidate: any) => {
            const drafts = candidate.draft_versions || [];
            const latestDraft = drafts.sort((a: any, b: any) => +new Date(b.generated_at) - +new Date(a.generated_at))[0];
            return (
              <article key={candidate.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <input type="checkbox" name="candidate_ids" value={candidate.id} className="mt-1 h-5 w-5" />
                    <div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                        <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">{candidate.projects?.name || "Project"}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{candidate.sources?.name || candidate.imported_from || "Source"}</span>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">{candidate.search_profiles?.name || "No profile"}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{candidate.status}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Risk {candidate.risk_level || "—"}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-bold"><a href={candidate.url} target="_blank" className="hover:underline">{candidate.title || "Untitled"}</a></h2>
                      <p className="mt-1 text-xs text-slate-500">Found {dt(candidate.discovered_at)} · Posted {dt(candidate.posted_at)} · {candidate.comment_count || 0} comments</p>
                    </div>
                  </div>
                  <a href={candidate.url} target="_blank" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Open</a>
                </div>
                <p className="mt-4 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{candidate.body_excerpt || "No body text captured."}</p>
                <p className="mt-3 text-sm text-slate-600"><strong>Why relevant:</strong> {candidate.why_relevant || "—"}</p>
                {latestDraft ? (
                  <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-cyan-950">Latest Draft · {latestDraft.model_used || "OpenAI"} · {dt(latestDraft.generated_at)}</p><CopyButton text={latestDraft.draft_text} /></div>
                    <textarea readOnly value={latestDraft.draft_text} className="mt-3 min-h-64 w-full rounded-xl border border-cyan-200 bg-white p-4 text-sm leading-6" />
                  </div>
                ) : (
                  <form action="/api/drafts/generate" method="post" className="mt-4"><input type="hidden" name="candidate_thread_id" value={candidate.id} /><button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Generate Draft</button></form>
                )}
              </article>
            );
          })}
        </form>
      </div>
    </main>
  );
}