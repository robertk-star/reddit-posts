import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ saved?: string; error?: string }> };

export default async function EditSearchProfilePage({ params, searchParams }: Params) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { id } = await params;
  const qs = searchParams ? await searchParams : {};

  const [{ data: profile }, { data: projects }] = await Promise.all([
    supabaseAdmin.from("search_profiles").select("*").eq("id", id).single(),
    supabaseAdmin.from("projects").select("id,name").order("name")
  ]);

  if (!profile) redirect("/admin/search-profiles");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/search-profiles" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Search Profiles</Link>
          <Link href="/admin/phase3" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Phase 3 Hub</Link>
        </div>

        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Edit Search Profile</h1>
          <p className="mt-1 text-sm text-slate-600">Update the search rules and hybrid scan settings for this profile.</p>
          {qs.saved ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Search profile saved.</p> : null}
          {qs.error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Missing required information.</p> : null}

          <form action={`/api/admin/search-profiles/${id}`} method="post" className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm font-semibold">
              Profile name
              <input name="name" defaultValue={profile.name || ""} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Project
              <select name="project_id" defaultValue={profile.project_id || ""} className="rounded-xl border border-slate-300 px-4 py-3 font-normal">
                <option value="">No project / general</option>
                {(projects || []).map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Description
              <textarea name="description" defaultValue={profile.description || ""} className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Search intent
              <textarea name="intent" defaultValue={profile.intent || ""} className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Link to promote
              <input name="link_to_promote" defaultValue={profile.link_to_promote || ""} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Voice instructions
              <textarea name="voice_instructions" defaultValue={profile.voice_instructions || ""} className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="font-bold">Hybrid Scan Settings</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="web_scan_enabled" defaultChecked={profile.web_scan_enabled ?? true} /> Web scan enabled</label>
                <label className="grid gap-1 text-sm font-semibold">
                  Frequency
                  <select name="web_scan_frequency" defaultValue={profile.web_scan_frequency || "daily"} className="rounded-xl border border-slate-300 px-4 py-3 font-normal">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual only</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Max sources per scan
                  <input name="max_sources_per_scan" type="number" min="1" max="25" defaultValue={profile.max_sources_per_scan || 10} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" />
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500">Last scan: {profile.last_web_scan_at || "Never"} · {profile.last_web_scan_status || "No status yet"}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                Keywords, one per line
                <textarea name="keywords" defaultValue={(profile.keywords || []).join("\n")} className="min-h-40 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Exclude terms, one per line
                <textarea name="excluded_terms" defaultValue={(profile.excluded_terms || []).join("\n")} className="min-h-40 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Sources/domains, one per line
                <textarea name="source_domains" defaultValue={(profile.source_domains || []).join("\n")} className="min-h-40 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Google Alert queries, one per line
                <textarea name="google_alert_queries" defaultValue={(profile.google_alert_queries || []).join("\n")} className="min-h-40 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={profile.active} /> Active</label>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Save Search Profile</button>
          </form>
        </section>
      </div>
    </main>
  );
}