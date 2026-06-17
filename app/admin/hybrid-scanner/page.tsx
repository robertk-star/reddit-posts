import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";

export default async function HybridScannerPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/phase3" className="text-sm font-semibold text-cyan-700 hover:underline">Back to Phase 3</Link>
        <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 3C</p>
          <h1 className="mt-2 text-2xl font-bold">Hybrid Web Scanner</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">This will be added after Google Alerts import. It will scan web/forum sources from active Search Profiles, dedupe URLs, score relevance with OpenAI, and save opportunities into the same candidate queue.</p>
          <Link href="/admin/search-profiles" className="mt-6 inline-block rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">Manage Search Profiles</Link>
        </section>
      </div>
    </main>
  );
}
