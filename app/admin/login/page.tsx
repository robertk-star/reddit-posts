export default async function AdminLoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Opportunity Radar</p>
        <h1 className="mt-4 text-3xl font-bold">Admin Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Use the ADMIN_EMAIL and ADMIN_PASSWORD values from Vercel.</p>
        {params?.error ? (
          <div className="mt-5 rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">Login failed. Check the email and password.</div>
        ) : null}
        <form className="mt-6 space-y-4" action="/api/admin/login" method="post">
          <label className="block text-sm font-medium text-slate-200">
            Email
            <input name="email" type="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900" />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Password
            <input name="password" type="password" required className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-900" />
          </label>
          <button className="w-full rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">Log In</button>
        </form>
      </div>
    </main>
  );
}
