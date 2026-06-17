import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ saved?: string; error?: string }> };

export default async function EditRulePage({ params, searchParams }: Params) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { id } = await params;
  const qs = searchParams ? await searchParams : {};

  const [{ data: rule }, { data: projects }, { data: sources }] = await Promise.all([
    supabaseAdmin.from("monitoring_rules").select("*").eq("id", id).single(),
    supabaseAdmin.from("projects").select("id,name").order("name"),
    supabaseAdmin.from("sources").select("id,name,type").eq("active", true).order("name")
  ]);

  if (!rule) redirect("/admin/rules");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/rules" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Monitoring Rules</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Edit Monitoring Rule</h1>
          {qs.saved ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Rule saved.</p> : null}
          {qs.error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Missing required rule fields.</p> : null}
          <form action={`/api/admin/rules/${id}`} method="post" className="mt-6 grid gap-4">
            <select name="project_id" defaultValue={rule.project_id} className="rounded-xl border border-slate-300 px-4 py-3" required>
              {(projects || []).map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select name="source_id" defaultValue={rule.source_id} className="rounded-xl border border-slate-300 px-4 py-3" required>
              {(sources || []).map((source: any) => <option key={source.id} value={source.id}>{source.name} ({source.type})</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={rule.active} /> Active</label>
            <input name="min_relevance_score" type="number" step="0.05" min="0" max="1" defaultValue={rule.min_relevance_score || 0.45} className="rounded-xl border border-slate-300 px-4 py-3" />
            <textarea name="keywords" defaultValue={(rule.keywords || []).join("\n")} placeholder="Keywords, one per line" className="min-h-36 rounded-xl border border-slate-300 px-4 py-3" required />
            <textarea name="target_locations" defaultValue={(rule.target_locations || []).join("\n")} placeholder="Targets, one per line" className="min-h-28 rounded-xl border border-slate-300 px-4 py-3" required />
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Save Rule</button>
          </form>
          <form action={`/api/admin/rules/${id}`} method="post" className="mt-6 border-t border-slate-200 pt-6">
            <input type="hidden" name="_action" value="delete" />
            <button className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete Rule</button>
          </form>
        </div>
      </div>
    </main>
  );
}