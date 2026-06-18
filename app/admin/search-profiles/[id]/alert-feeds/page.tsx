import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ saved?: string }> };

export default async function AlertFeedsPage({ params, searchParams }: Params) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { id } = await params;
  const qs = searchParams ? await searchParams : {};
  const { data: profile } = await supabaseAdmin.from("search_profiles").select("*").eq("id", id).single();
  if (!profile) redirect("/admin/search-profiles");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/search-profiles" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Search Profiles</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Google Alerts</p>
          <h1 className="mt-2 text-2xl font-bold">Alert Feed Settings</h1>
          <p className="mt-2 text-sm text-slate-600">Paste the RSS/feed URLs for {profile.name}. The Hybrid Scanner will ingest these automatically and send results into Opportunities.</p>
          {qs.saved ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Google Alert feed settings saved.</p> : null}
          <form action={`/api/admin/search-profiles/${id}/alert-feeds`} method="post" className="mt-6 grid gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="google_alert_feed_enabled" defaultChecked={profile.google_alert_feed_enabled ?? true} /> Enable Google Alert feed scanning</label>
            <label className="grid gap-1 text-sm font-semibold">
              Google Alert RSS/feed URLs, one per line
              <textarea name="google_alert_feed_urls" defaultValue={(profile.google_alert_feed_urls || []).join("\n")} placeholder={'https://www.google.com/alerts/feeds/...'} className="min-h-40 rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
            <button className="rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">Save Feed URLs</button>
          </form>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">How this works:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Create your Google Alert.</li>
              <li>Set delivery to RSS/feed if Google offers that option.</li>
              <li>Copy the feed URL here.</li>
              <li>Run Hybrid Scanner or let the scheduled scan pull results.</li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
