import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Candidate = {
  id: string;
  title: string | null;
  url: string;
  body_excerpt: string | null;
  author: string | null;
  subreddit: string | null;
  relevance_score: number | null;
  why_relevant: string | null;
  risk_level: string | null;
  status: string;
  posted_at: string | null;
  discovered_at: string | null;
  platform_score: number | null;
  comment_count: number | null;
  projects?: { name: string } | null;
  draft_versions?: Array<{ id: string; draft_text: string; generated_at: string; model_used: string | null; risk_notes: string | null }>;
};

function dt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default async function AdminPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const [projectsRes, sourcesRes, rulesRes, candidatesRes, runsRes] = await Promise.all([
    supabaseAdmin.from("projects").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("sources").select("*").eq("active", true).order("name"),
    supabaseAdmin.from("monitoring_rules").select("*, projects(name), sources(name, type)").order("created_at", { ascending: false }),
    supabaseAdmin
      .from("candidate_threads")
      .select("*, projects(name), draft_versions(id,draft_text,generated_at,model_used,risk_notes)")
      .in("status", ["new", "drafted", "snoozed"])
      .order("discovered_at", { ascending: false })
      .limit(40),
    supabaseAdmin.from("scan_runs").select("*, monitoring_rules(projects(name))").order("started_at", { ascending: false }).limit(6)
  ]);

  const projects = projectsRes.data || [];
  const sources = sourcesRes.data || [];
  const rules = rulesRes.data || [];
  const candidates = (candidatesRes.data || []) as Candidate[];
  const runs = runsRes.data || [];

  const newCount = candidates.filter((c) => c.status === "new").length;
  const draftedCount = candidates.filter((c) => c.status === "drafted").length;
  const highRiskCount = candidates.filter((c) => c.risk_level === "high").length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Opportunity Radar</p>
            <h1 className="mt-1 text-2xl font-bold">Review Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <form action="/api/scan/reddit" method="post">
              <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Scan Reddit Now</button>
            </form>
            <form action="/api/admin/logout" method="post">
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Logout</button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Projects" value={projects.length} />
          <Stat label="Active Rules" value={rules.filter((r: any) => r.active).length} />
          <Stat label="New Threads" value={newCount} />
          <Stat label="Drafted / Risk" value={`${draftedCount} / ${highRiskCount}`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">Add Project</h2>
            <p className="mt-1 text-sm text-slate-600">Use this for DBS, SaffHire, CashOfferChat, or a client site.</p>
            <form action="/api/admin/projects" method="post" className="mt-5 grid gap-4">
              <input name="name" placeholder="Project name" className="rounded-xl border border-slate-300 px-4 py-3" required />
              <input name="site_url" placeholder="Site URL" className="rounded-xl border border-slate-300 px-4 py-3" required />
              <input name="link_to_promote" placeholder="Link to promote, optional" className="rounded-xl border border-slate-300 px-4 py-3" />
              <textarea name="tone_description" placeholder="Voice/tone" className="min-h-20 rounded-xl border border-slate-300 px-4 py-3" defaultValue="plain, practical, helpful, non-salesy" />
              <textarea name="key_points" placeholder="Key points, one per line" className="min-h-24 rounded-xl border border-slate-300 px-4 py-3" />
              <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Create Project</button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">Add Reddit Monitoring Rule</h2>
            <p className="mt-1 text-sm text-slate-600">Keywords and subreddits are entered one per line.</p>
            <form action="/api/admin/rules" method="post" className="mt-5 grid gap-4">
              <select name="project_id" className="rounded-xl border border-slate-300 px-4 py-3" required>
                <option value="">Choose project</option>
                {projects.map((project: any) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select name="source_id" className="rounded-xl border border-slate-300 px-4 py-3" required>
                <option value="">Choose source</option>
                {sources.map((source: any) => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
              <textarea name="keywords" placeholder={'apply for disability\nSSDI medical records\ndisability application checklist'} className="min-h-28 rounded-xl border border-slate-300 px-4 py-3" required />
              <textarea name="target_locations" placeholder={'SocialSecurity\ndisability\nSSDI'} className="min-h-24 rounded-xl border border-slate-300 px-4 py-3" required />
              <button className="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800">Create Rule</button>
            </form>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Candidate Threads</h2>
              <p className="mt-1 text-sm text-slate-600">Open the thread, review the draft, copy/edit manually, then mark the action.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5">
            {candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
                No candidates yet. Add a project and rule, then click “Scan Reddit Now.”
              </div>
            ) : (
              candidates.map((candidate) => {
                const latestDraft = candidate.draft_versions?.sort((a, b) => +new Date(b.generated_at) - +new Date(a.generated_at))[0];
                return (
                  <article key={candidate.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">{candidate.projects?.name || "Project"}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{candidate.subreddit || "Reddit"}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Score {candidate.relevance_score ?? "—"}</span>
                          <span className={`rounded-full px-2.5 py-1 ${candidate.risk_level === "high" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{candidate.risk_level || "low"} risk</span>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">{candidate.status}</span>
                        </div>
                        <h3 className="mt-3 text-lg font-bold leading-7"><a className="hover:underline" href={candidate.url} target="_blank">{candidate.title || "Untitled"}</a></h3>
                        <p className="mt-1 text-xs text-slate-500">By {candidate.author || "unknown"} · Posted {dt(candidate.posted_at)} · Found {dt(candidate.discovered_at)} · {candidate.comment_count ?? 0} comments · Reddit score {candidate.platform_score ?? 0}</p>
                      </div>
                      <a href={candidate.url} target="_blank" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Open Thread</a>
                    </div>

                    <p className="mt-4 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{candidate.body_excerpt || "No body text captured."}</p>
                    <p className="mt-3 text-sm text-slate-600"><strong>Why relevant:</strong> {candidate.why_relevant || "—"}</p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action="/api/drafts/generate" method="post">
                        <input type="hidden" name="candidate_thread_id" value={candidate.id} />
                        <button className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Generate Draft</button>
                      </form>
                      <form action={`/api/candidates/${candidate.id}/status`} method="post">
                        <input type="hidden" name="status" value="skipped" />
                        <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Skip</button>
                      </form>
                      <form action={`/api/candidates/${candidate.id}/status`} method="post">
                        <input type="hidden" name="status" value="snoozed" />
                        <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Snooze</button>
                      </form>
                    </div>

                    {latestDraft ? (
                      <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                        <div className="flex flex-wrap justify-between gap-2">
                          <h4 className="font-bold text-cyan-950">Latest Draft</h4>
                          <p className="text-xs text-cyan-800">{latestDraft.model_used || "Claude"} · {dt(latestDraft.generated_at)}</p>
                        </div>
                        {latestDraft.risk_notes ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm text-red-800">{latestDraft.risk_notes}</p> : null}
                        <textarea readOnly className="mt-3 min-h-72 w-full rounded-xl border border-cyan-200 bg-white p-4 text-sm leading-6" value={latestDraft.draft_text} />
                        <form action="/api/admin/actions" method="post" className="mt-3 grid gap-3">
                          <input type="hidden" name="candidate_thread_id" value={candidate.id} />
                          <input type="hidden" name="draft_id" value={latestDraft.id} />
                          <textarea name="edited_text" placeholder="Paste your final edited text here if you want to track it." className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                          <div className="flex flex-wrap gap-3">
                            <button name="action" value="posted" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Mark Posted</button>
                            <button name="action" value="skipped" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Mark Skipped</button>
                            <button name="action" value="snoozed" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Mark Snoozed</button>
                          </div>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">Monitoring Rules</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Project</th><th>Source</th><th>Targets</th><th>Keywords</th></tr></thead>
                <tbody>
                  {rules.map((rule: any) => (
                    <tr key={rule.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 font-medium">{rule.projects?.name}</td>
                      <td>{rule.sources?.name}</td>
                      <td>{(rule.target_locations || []).join(", ")}</td>
                      <td>{(rule.keywords || []).slice(0, 4).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold">Recent Scan Runs</h2>
            <div className="mt-4 space-y-3">
              {runs.length === 0 ? <p className="text-sm text-slate-600">No scans yet.</p> : runs.map((run: any) => (
                <div key={run.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="flex justify-between gap-3"><strong>{run.status}</strong><span>{dt(run.started_at)}</span></div>
                  <p className="mt-1 text-slate-600">Found {run.threads_found || 0} threads.</p>
                  {run.error_message ? <p className="mt-1 text-red-700">{run.error_message}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
