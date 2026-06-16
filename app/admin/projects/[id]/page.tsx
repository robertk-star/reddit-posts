import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ saved?: string; error?: string }> };

export default async function EditProjectPage({ params, searchParams }: Params) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { id } = await params;
  const qs = searchParams ? await searchParams : {};

  const [{ data: project }, { data: voice }] = await Promise.all([
    supabaseAdmin.from("projects").select("*").eq("id", id).single(),
    supabaseAdmin.from("voice_profiles").select("*").eq("project_id", id).maybeSingle()
  ]);

  if (!project) redirect("/admin");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold">Edit Project</h1>
          {qs.saved ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Project saved.</p> : null}
          {qs.error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Missing required project fields.</p> : null}
          <form action={`/api/admin/projects/${id}`} method="post" className="mt-6 grid gap-4">
            <input name="name" defaultValue={project.name || ""} placeholder="Project name" className="rounded-xl border border-slate-300 px-4 py-3" required />
            <input name="site_url" defaultValue={project.site_url || ""} placeholder="Site URL" className="rounded-xl border border-slate-300 px-4 py-3" required />
            <input name="link_to_promote" defaultValue={project.link_to_promote || ""} placeholder="Link to promote" className="rounded-xl border border-slate-300 px-4 py-3" />
            <textarea name="notes" defaultValue={project.notes || ""} placeholder="Notes" className="min-h-24 rounded-xl border border-slate-300 px-4 py-3" />
            <textarea name="tone_description" defaultValue={voice?.tone_description || ""} placeholder="Voice/tone" className="min-h-20 rounded-xl border border-slate-300 px-4 py-3" />
            <textarea name="key_points" defaultValue={(voice?.key_points || []).join("\n")} placeholder="Key points, one per line" className="min-h-32 rounded-xl border border-slate-300 px-4 py-3" />
            <textarea name="avoid_phrases" defaultValue={(voice?.avoid_phrases || []).join("\n")} placeholder="Avoid phrases, one per line" className="min-h-24 rounded-xl border border-slate-300 px-4 py-3" />
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Save Project</button>
          </form>
        </div>
      </div>
    </main>
  );
}
