import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function RulesPage({ searchParams }: { searchParams?: Promise<{ created?: string; deleted?: string; error?: string }> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const qs = searchParams ? await searchParams : {};
  const [{ data: rules }, { data: projects }, { data: sources }] = await Promise.all([
    supabaseAdmin.from("monitoring_rules").select("*, projects(name), sources(name,type)").order("created_at", { ascending: false }),
    supabaseAdmin.from("projects").select("id,name").order("name"),
    supabaseAdmin.from("sources").select("id,name,type").eq("active", true).order("name")
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
          <Link href="/admin/hybrid-scanner" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Hybrid Scanner</Link>
        </div>
        {qs.created ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Rule created.</p> : null}
        {qs.deleted ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Rule deleted.</p> : null}
        {qs.error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Missing rule fields.</p> : null}

        <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold">Add Monitoring Rule</h1>
            <p className="mt-2 text-sm text-slate-600">For Hybrid Web Scanner, targets can be topics or source groups. For Reddit API, targets are subreddits.</p>
            <form action="/api/admin/rules" method="post" className="mt-6 grid gap-4">
              <select name="project_id" className="rounded-xl border border-slate-300 px-4 py-3" required>
                <option value="">Choose project</option>
                {(projects || []).map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <select name="source_id" className="rounded-xl border border-slate-300 px-4 py-3" required>
                <option value="">Choose source</option>
                {(sources || []).map((source: any) => <option key={source.id} value={source.id}>{source.name} ({source.type})</option>)}
              </select>
              <textarea name="keywords" placeholder={'apply for disability\nSSDI medical records\nbackground check taking too long'} className="min-h-32 rounded-xl border border-slate-300 px-4 py-3" required />
              <textarea name="target_locations" placeholder={'SocialSecurity\ndisability\nbackground screening forums'} className="min-h-28 rounded-xl border border-slate-300 px-4 py-3" required />
              <input name="min_relevance_score" type="number" step="0.05" min="0" max="1" defaultValue="0.45" className="rounded-xl border border-slate-300 px-4 py-3" />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked /> Active</label>
              <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Create Rule</button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold">Monitoring Rules</h2>
            <div className="mt-6 grid gap-4">
              {(rules || []).length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No monitoring rules yet.</p> : null}
              {(rules || []).map((rule: any) => (
                <div key={rule.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                        <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">{rule.projects?.name || "Project"}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{rule.sources?.name || "Source"}</span>
                        <span className={rule.active ? "rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"}>{rule.active ? "Active" : "Paused"}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600"><strong>Targets:</strong> {(rule.target_locations || []).join(", ")}</p>
                      <p className="mt-1 text-sm text-slate-500"><strong>Keywords:</strong> {(rule.keywords || []).join(", ")}</p>
                      <p className="mt-1 text-xs text-slate-500">Min score: {rule.min_relevance_score}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/rules/${rule.id}`} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Edit</Link>
                      <form action={`/api/admin/rules/${rule.id}`} method="post">
                        <input type="hidden" name="_action" value="delete" />
                        <button className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete</button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
