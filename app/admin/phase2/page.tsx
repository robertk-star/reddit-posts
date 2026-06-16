import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";

export default async function Phase2Page() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const links = [
    ["Candidate Filters", "/admin/candidates", "Filter by status, risk, and project. Copy draft replies."],
    ["Projects", "/admin/projects", "Edit project links, voice, key points, and avoid phrases."],
    ["Rules", "/admin/rules", "Edit Reddit keywords, subreddits, score threshold, and active status."],
    ["UTM Builder", "/admin/tools/utm", "Create a trackable link for manual replies."]
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm font-semibold text-cyan-700 hover:underline">Back to main dashboard</Link>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">Opportunity Radar</p>
          <h1 className="mt-2 text-2xl font-bold">Phase 2 Tools</h1>
          <p className="mt-2 text-sm text-slate-600">Use these pages for the Phase 2 workflow improvements.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {links.map(([title, href, description]) => (
              <Link key={href} href={href} className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50">
                <h2 className="font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
