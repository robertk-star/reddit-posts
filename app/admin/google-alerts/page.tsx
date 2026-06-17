import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";

export default async function GoogleAlertsPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/phase3" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Phase 3</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3B</p>
          <h1 className="mt-2 text-2xl font-bold">Google Alerts Import</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">This will be the next build. It will let you paste Google Alert emails or result blocks, assign them to a Search Profile, extract URLs, dedupe them, and send good matches into the opportunity queue.</p>
          <Link href="/admin/search-profiles" className="mt-6 inline-block rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Manage Search Profiles</Link>
        </section>
      </div>
    </main>
  );
}
