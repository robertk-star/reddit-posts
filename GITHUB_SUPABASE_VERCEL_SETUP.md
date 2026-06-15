# Opportunity Radar Phase 1 Setup

Use this when uploading the build to GitHub and connecting it to Vercel.

## 1. GitHub

Create a new repository, for example:

```text
opportunity-radar
```

Upload the ZIP contents into the repository root. The repository root must contain:

```text
package.json
app/
lib/
supabase/
vercel.json
```

## 2. Supabase

Create a new Supabase project.

Open Supabase SQL Editor and run:

```text
supabase/migrations/001_phase1_opportunity_radar.sql
```

This creates all Phase 1 tables and seeds the starter DBS Reddit monitoring rule.

## 3. Supabase API key

Preferred current setup:

```text
NEXT_PUBLIC_SUPABASE_URL = your Supabase project URL
SUPABASE_SECRET_KEY = your Supabase secret key
```

Legacy fallback also works:

```text
SUPABASE_SERVICE_ROLE_KEY = your legacy service_role key
```

Do not expose the secret key in browser code. This project only uses it in server-side route handlers.

## 4. Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=OpportunityRadar/0.1 by your_reddit_username
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

If your Supabase project only provides legacy keys, use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY`.

## 5. Vercel cron

`vercel.json` schedules this route once per day:

```text
/api/scan/reddit
```

The schedule is:

```text
0 13 * * *
```

That means 13:00 UTC daily.

## 6. Admin login

After deployment, open:

```text
/admin
```

Log in with:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
```

## 7. First test

1. Confirm the DBS starter project appears.
2. Confirm the Reddit source appears.
3. Confirm the DBS Reddit monitoring rule appears.
4. Click **Scan Reddit Now**.
5. If matches are found, open one candidate thread.
6. Click **Generate Draft**.
7. Review the draft manually.
8. Open Reddit yourself, edit/post manually, then mark posted/skipped/snoozed in the dashboard.

## 8. What this phase intentionally does not do

- No auto-posting.
- No Reddit password storage.
- No Quora scraping.
- No client accounts yet.
- No billing yet.

## 9. Recommended next phase

Phase 2 should add:

- Copy Draft button
- UTM builder per project
- Project detail/edit page
- Better AI relevance scoring
- RSS/manual source support
- Basic result tracking
