import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Search = { status?: string; risk?: string; project?: string };

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

  let query = supabaseAdmin
    .from("candidate_threads")
    .select("*, projects(name), draft_versions(id,draft_text,generated_at,model_used,risk_notes)")
    .order("discovered_at", { ascending: false })
    .limit(80);

  if (status === "active") query = query.in("status", ["new", "drafted", "snoozed"]);
  if (["new", "drafted", "posted", "skipped", "snoozed"].includes(status)) query = query.eq("status", status);
  if (["low", "medium", "high"].includes(risk)) query = query.eq("risk_level", risk);
  if (project !== "all") query = query.eq("project_id", project);

  const [{ data: candidates }, { data: projects }] = await Promise.all([
    query,
    supabaseAdmin.from("projects").select("id,name").order("name")
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Candidate Filters</h1>
          <p className="mt-1 text-sm text-slate-600">Filter Reddit opportunities and copy draft replies.</p>
          <form action="/admin/candidates" className="mt-5 grid gap-3 md:grid-cols-4">
            <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="active">Active</option>
              <option value="new">New</option>
              <option value="drafted">Drafted</option>
              <option value="snoozed">Snoozed</option>
              <option value="posted">Posted</option>
              <option value="skipped">Skipped</option>
            </select>
            <select name="risk" defaultValue={risk} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All risk</option>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
            </select>
            <select name="project" defaultValue={project} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All projects</option>
              {(projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700">Apply</button>
          </form>
        </div>

        <div className="mt-6 grid gap-5">
          {(candidates || []).length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-slate-600 ring-1 ring-slate-200">No candidates match this filter.</div> : null}
          {(candidates || []).map((candidate: any) => {
            const drafts = candidate.draft_versions || [];
            const latestDraft = drafts.sort((a: any, b: any) => +new Date(b.generated_at) - +new Date(a.generated_at))[0];
            return (
              <article key={candidate.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">{candidate.projects?.name || "Project"}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{candidate.subreddit || "Reddit"}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{candidate.status}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Risk {candidate.risk_level || "—"}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold"><a href={candidate.url} target="_blank" className="hover:underline">{candidate.title || "Untitled"}</a></h2>
                    <p className="mt-1 text-xs text-slate-500">Found {dt(candidate.discovered_at)} · Posted {dt(candidate.posted_at)} · {candidate.comment_count || 0} comments</p>
                  </div>
                  <a href={candidate.url} target="_blank" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Open Thread</a>
                </div>
                <p className="mt-4 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{candidate.body_excerpt || "No body text captured."}</p>
                <p className="mt-3 text-sm text-slate-600"><strong>Why relevant:</strong> {candidate.why_relevant || "—"}</p>
                {latestDraft ? (
                  <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-cyan-950">Latest Draft · {latestDraft.model_used || "Claude"} · {dt(latestDraft.generated_at)}</p>
                      <CopyButton text={latestDraft.draft_text} />
                    </div>
                    <textarea readOnly value={latestDraft.draft_text} className="mt-3 min-h-64 w-full rounded-xl border border-cyan-200 bg-white p-4 text-sm leading-6" />
                  </div>
                ) : (
                  <form action="/api/drafts/generate" method="post" className="mt-4">
                    <input type="hidden" name="candidate_thread_id" value={candidate.id} />
                    <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Generate Draft</button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
