import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Opportunity Radar</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Find real questions your business can answer.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Scan Reddit for relevant conversations, score the best opportunities, draft helpful responses with Claude, and manually review before posting.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/admin" className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">
            Open Dashboard
          </Link>
          <a href="https://www.disabilitybenefitsscreening.com" className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/10">
            DBS Example Site
          </a>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ["Scan", "Find fresh Reddit posts by project keywords."],
            ["Draft", "Generate human-review drafts in your voice."],
            ["Track", "Mark posted, skipped, or snoozed so nothing repeats."]
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="font-semibold text-cyan-200">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
