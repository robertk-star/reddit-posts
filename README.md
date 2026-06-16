# Opportunity Radar

A standalone Next.js + Supabase app that scans Reddit for relevant conversations, scores candidate threads, generates OpenAI draft replies, and keeps posting manual/human-reviewed.

## What this build includes

- Admin login
- Project setup
- Voice profile setup
- Reddit monitoring rules
- Manual Reddit scan endpoint
- GitHub Actions scheduled scan workflow
- Candidate thread queue
- Relevance score and risk level
- OpenAI draft generation
- Manual posting workflow
- Posted/skipped/snoozed action tracking
- DBS starter seed project and Reddit rule
- Phase 2 tools at `/admin/phase2`

## What this build does not do

- It does not auto-post to Reddit.
- It does not store Reddit passwords.
- It does not scrape Quora.
- It does not use a browser-side Supabase client.
- It does not support multiple admin users yet.

## Install locally

```bash
npm install
npm run dev
```

## Supabase SQL

Run this migration in Supabase SQL Editor:

```text
supabase/migrations/001_phase1_opportunity_radar.sql
```

This creates all Phase 1 tables and seeds:

- Reddit source
- DBS starter project
- DBS voice profile
- DBS starter Reddit monitoring rule

## Vercel environment variables

Add these in Vercel before testing:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=OpportunityRadar/0.1 by your_reddit_username
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

Legacy Supabase fallback:

```text
SUPABASE_SERVICE_ROLE_KEY=
```

The app checks `SUPABASE_SECRET_KEY` first, then falls back to `SUPABASE_SERVICE_ROLE_KEY`.

## GitHub Actions scheduled scan

Vercel Cron is not used. The scheduled scan runs from GitHub Actions using:

```text
.github/workflows/reddit-scan.yml
```

The workflow runs daily at:

```text
13:17 UTC
```

It also supports manual runs from GitHub Actions with `workflow_dispatch`.

Add these GitHub repository secrets:

```text
OPPORTUNITY_RADAR_URL=https://your-vercel-site.vercel.app
CRON_SECRET=same-value-you-put-in-vercel-cron-secret
```

`CRON_SECRET` must match the Vercel environment variable named `CRON_SECRET` because the app endpoint checks it before running the scan.

## Reddit setup

Create a Reddit app from your Reddit account. For Phase 1, this app uses read-only application credentials to search Reddit. Use a descriptive User-Agent, for example:

```text
OpportunityRadar/0.1 by robertk
```

The app searches subreddit posts with:

```text
/r/{subreddit}/search.json?restrict_sr=1&sort=new&t=week
```

## Admin URLs

```text
/admin
/admin/phase2
/admin/candidates
/admin/projects
/admin/rules
/admin/tools/utm
```

## How to test

1. Run the Supabase SQL migration.
2. Add all Vercel environment variables.
3. Add the two GitHub repository secrets.
4. Deploy the app.
5. Go to `/admin`.
6. Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
7. Confirm the seeded DBS project and Reddit rule are visible.
8. Click `Scan Reddit Now`.
9. Candidate threads should appear if Reddit returns matching posts.
10. Click `Generate Draft` on a candidate.
11. Review the draft, open the Reddit thread manually, and copy/edit/post manually.
12. Mark the item as posted, skipped, or snoozed.
13. Open GitHub Actions and manually run `Reddit Opportunity Scan` once to confirm the scheduled scan works.

## Scan endpoint security

The endpoint accepts:

- Admin cookie from the dashboard
- `x-cron-secret: CRON_SECRET`
- `Authorization: Bearer CRON_SECRET`
- `?secret=CRON_SECRET`

## Recommended next build

Phase 3 should add:

- Better AI relevance scoring before inserting candidates
- AI recommendation: answer only, soft link, no link, or skip
- Duplicate/similar thread detection
- Response quality scoring
- Basic traffic/result tracking
