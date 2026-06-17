import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Search = { level?: string; profile?: string };

function dt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function qLabel(value?: number | null) {
  if (value === null || value === undefined) return "Missing";
  if (value >= 0.7) return `High ${value}`;
  if (value >= 0.35) return `Medium ${value}`;
  return `Low ${value}`;
}

export default async function QualityPage({ searchParams }: { searchParams?: Promise<Search> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const params = searchParams ? await searchParams : {};
  const level = params.level || "all";
  const profile = params.profile || "all";

  let query = supabaseAdmin
    .from("candidate_threads")
    .select("id,title,url,status,source_host,result_quality_score,result_quality_reason,page_title,page_description,page_fetched_at,projects(name),search_profiles(name)")
    .order("discovered_at", { ascending: false })
    .limit(100);

  if (level === "missing") query = query.is("result_quality_score", null);
  if (level === "high") query = query.gte("result_quality_score", 0.7);
  if (level === "medium") query = query.gte("result_quality_score", 0.35).lt("result_quality_score", 0.7);
  if (level === "low") query = query.lt("result_quality_score", 0.35);
  if (profile !== "all") query = query.eq("search_profile_id", profile);

  const [{ data: rows }, { data: profiles }] = await Promise.all([
    query,
    supabaseAdmin.from("search_profiles").select("id,name").order("name")
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to dashboard</Link>
          <Link href="/admin/candidates" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Opportunities</Link>
        </div>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3I</p>
          <h1 className="mt-2 text-2xl font-bold">Quality Review</h1>
          <p className="mt-2 text-sm text-slate-600">Review opportunity quality scores, source hosts, and enrichment status.</p>
          <form action="/admin/quality" className="mt-5 grid gap-3 md:grid-cols-3">
            <select name="level" defaultValue={level} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All quality</option>
              <option value="missing">Missing quality</option>
              <option value="high">High quality</option>
              <option value="medium">Medium quality</option>
              <option value="low">Low quality</option>
            </select>
            <select name="profile" defaultValue={profile} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
              <option value="all">All profiles</option>
              {(profiles || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700">Apply</button>
          </form>
        </section>

        <div className="mt-6 grid gap-4">
          {(rows || []).length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-slate-600 ring-1 ring-slate-200">No opportunities match this quality filter.</div> : null}
          {(rows || []).map((row: any) => (
            <article key={row.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">{row.projects?.name || "Project"}</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">{row.search_profiles?.name || "No profile"}</span>
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-800">Quality: {qLabel(row.result_quality_score)}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{row.status}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold"><a href={row.url} target="_blank" className="hover:underline">{row.page_title || row.title || "Untitled"}</a></h2>
                  <p className="mt-1 text-xs text-slate-500">Host {row.source_host || "—"} · Page fetched {dt(row.page_fetched_at)}</p>
                </div>
                <a href={row.url} target="_blank" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Open</a>
              </div>
              {row.result_quality_reason ? <p className="mt-4 rounded-2xl bg-purple-50 p-4 text-sm text-purple-800"><strong>Quality reason:</strong> {row.result_quality_reason}</p> : null}
              {row.page_description ? <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{row.page_description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
