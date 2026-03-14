# Blend Originations

AI-powered cloud lending origination platform built with Next.js App Router and Supabase.

## Requirements

- Node.js 20+
- Supabase project (Postgres + Auth + Storage)
- Vercel deployment target

## Environment Variables

Create a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JOB_SECRET=optional
PARTNER_RATE_LIMIT=optional
```

## Database

Run the migrations in `supabase/migrations/0001_init.sql` and `supabase/migrations/0002_risk_and_comparison.sql` in your Supabase SQL editor.

Create a Supabase Storage bucket named `documents` with private access.

## Seed Demo Data

```
npm run seed
```

This creates:
- Tenant `Northwind Credit Union`
- Admin user `admin@northwind.demo`
- Borrower user `borrower@northwind.demo`
- Loan products, workflows, jobs, and a demo application
- A borrower invite token (printed in the console)

## Development

```
npm run dev
```

## Borrower Invite Flow

- Generate an invite from `Tenant Settings`.
- Borrower logs in and visits `/portal/invite/<token>`.
- Accept invite to access `/portal/apply/<token>`.

## Partner API

- `GET /api/partner/applications` (requires `x-api-key` header)
- `POST /api/partner/applications` (requires `x-api-key` header)

## Batch Jobs

Call `POST /api/jobs` with JSON body `{ "tenantId": "...", "jobName": "daily-credit-pull" }`
and optional `x-job-secret` header if configured.
