import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SearchParams = { created?: string; deleted?: string; error?: string };

export default async function SearchProfilesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const qs = searchParams ? await searchParams : {};

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    supabaseAdmin.from("search_profiles").select("*, projects(name)").order("created_at", { ascending: false }),
    supabaseAdmin.from("projects").select("id,name").order("name")
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
            <h1 className="mt-3 text-3xl font-bold">Search Profiles</h1>
            <p className="mt-1 text-sm text-slate-600">Create separate searches for Disability Benefits, Background Screening, CashOfferChat, or client campaigns.</p>
          </div>
          <Link href="/admin/phase3" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Phase 3 Hub</Link>
        </div>

        {qs.created ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Search profile created.</p> : null}
        {qs.deleted ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Search profile deleted.</p> : null}
        {qs.error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Missing required information.</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Add Search Profile</h2>
            <p className="mt-1 text-sm text-slate-600">Each profile gets its own keywords, source domains, Google Alert queries, and voice rules.</p>
            <form action="/api/admin/search-profiles" method="post" className="mt-5 grid gap-4">
              <label className="grid gap-1 text-sm font-semibold">Profile name<input name="name" placeholder="Disability Benefits" className="rounded-xl border border-slate-300 px-4 py-3 font-normal" required /></label>
              <label className="grid gap-1 text-sm font-semibold">Project<select name="project_id" className="rounded-xl border border-slate-300 px-4 py-3 font-normal"><option value="">No project / general</option>{(projects || []).map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold">Description<textarea name="description" placeholder="What this search is for" className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Search intent<textarea name="intent" placeholder="Find people asking about..." className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Link to promote<input name="link_to_promote" placeholder="https://example.com/resource" className="rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Voice instructions<textarea name="voice_instructions" placeholder="Helpful, practical, not legal advice..." className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Keywords, one per line<textarea name="keywords" placeholder={'SSDI denied\napply for disability\ndisability application checklist'} className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Exclude terms, one per line<textarea name="excluded_terms" placeholder={'guaranteed approval\nfree background check'} className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Sources/domains, one per line<textarea name="source_domains" placeholder={'reddit.com/r/SocialSecurity\nquora.com\nssdfacts.com/forum'} className="min-h-32 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">Google Alert queries, one per line<textarea name="google_alert_queries" placeholder={'"SSDI denied"\n"background check taking too long"'} className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked /> Active</label>
              <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Create Search Profile</button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">Existing Profiles</h2>
            <div className="mt-5 grid gap-4">
              {(profiles || []).length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No search profiles yet. Run the Phase 3A SQL migration or create one here.</p> : null}
              {(profiles || []).map((profile: any) => (
                <article key={profile.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide"><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">{profile.projects?.name || "General"}</span><span className={profile.active ? "rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"}>{profile.active ? "Active" : "Paused"}</span></div>
                      <h3 className="mt-3 text-lg font-bold">{profile.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{profile.description || "No description yet."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2"><Link href={`/admin/search-profiles/${profile.id}`} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Edit</Link><Link href={`/admin/search-profiles/${profile.id}/quality`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Quality</Link></div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><strong>Keywords:</strong><br />{(profile.keywords || []).slice(0, 6).join(", ") || "—"}</div><div className="rounded-xl bg-slate-50 p-3"><strong>Sources:</strong><br />{(profile.source_domains || []).slice(0, 6).join(", ") || "—"}</div><div className="rounded-xl bg-slate-50 p-3 md:col-span-2"><strong>Google Alerts:</strong><br />{(profile.google_alert_queries || []).slice(0, 6).join(", ") || "—"}</div></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
