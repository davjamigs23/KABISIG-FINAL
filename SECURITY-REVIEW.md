# Security Review Findings

Review scope: dashboard data integrity, role access, statutory compliance metrics, and program scheduling. Findings below are addressed in the current working tree; the code changes have not been deployed.

| # | Severity | File | Lines | Finding | Remediation |
|---|----------|------|-------|---------|-------------|
| 1 | 🟠 HIGH | [backend/routes/user.routes.ts](./backend/routes/user.routes.ts) | 1662-1664 | The youth directory exposed same-tenant youth records to youth users. | Restricted access to staff roles while retaining tenant scoping. |
| 2 | 🟡 MEDIUM | [frontend/src/lib/intelligence.ts](./frontend/src/lib/intelligence.ts) | 88-105, 201-232 | Engagement scores used registration proxies and low-engagement alerts used a 50% cutoff rather than attendance divided by active programs and the requested `<20%` threshold. | Scores and alerts now use live attendance counts for active programs; periods with no active programs are not flagged. |
| 3 | 🟡 MEDIUM | [backend/routes/compliance.routes.ts](./backend/routes/compliance.routes.ts) | 145-173 | Q2 report detection could count unrelated reports. | Detection now matches the approved Q2 Financial Performance Report and returns `Not Yet Submitted` when absent. |
| 4 | 🟡 MEDIUM | [backend/routes/compliance.routes.ts](./backend/routes/compliance.routes.ts) | 46-68, 169-174 | Cash-advance liquidation counts were not derived from expense records. | The endpoint now counts approved expenses associated with cash-advance budget categories. |
| 5 | 🟡 MEDIUM | [backend/routes/program.routes.ts](./backend/routes/program.routes.ts) | 33-48, 243-255, 330-344 | Program creation and updates did not reject date overlaps with other active programs. | Both paths now check same-tenant active programs and reject overlaps. |

## Verification

- Frontend `npx tsc --noEmit` passed.
- Backend `npx tsc --noEmit` and `npm run build` passed.
- `git diff --check` passed.
- Engagement scoring assertions passed for the 20% boundary, below-threshold behavior, score cap, and zero active programs.

These findings document the fixes; this review does not certify production deployment or perform live-database verification.

## Grand Audit Addendum (2026-11-25)

The findings below were identified during the tenant-isolation, RBAC, data-integrity, and realtime review. All listed code findings are fixed in the current working tree; the changes have not been deployed.

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | backend/routes/barangay.routes.ts | 120-180 | Authenticated Barangay Admin/Official directory aggregation was not restricted to the caller's tenant. The query now scopes those roles to their tenant and returns only active, setup-complete officials. | 8/10 |
| 2 | 🟠 HIGH | backend/routes/user.routes.ts | 1358-1410 | Youth verification lookup fetched a target by ID before applying tenant authorization. The user and resident-profile queries now constrain non-Super-Admin requests to the caller's tenant before signed URLs are created. | 9/10 |
| 3 | 🟠 HIGH | backend/routes/document.routes.ts | 279-346 | Document detail and download lookups fetched by ID before applying tenant authorization. Both queries now constrain non-Super-Admin requests to their tenant before returning signed URLs. | 9/10 |
| 4 | 🟡 MEDIUM | backend/routes/program.routes.ts | 133-258, 943-986 | Program detail, registration, attendance, and self-registration reads did not consistently apply tenant scope at query time. They now constrain tenant-bound queries, while retaining Super Admin access. | 8/10 |
| 5 | 🟡 MEDIUM | backend/routes/program.routes.ts | 476-480 | SK Officials could delete programs through the API. Deletion is now limited to Barangay Admin and Super Admin; Kagawad delete controls were removed. | 9/10 |

### Other Grand Audit Corrections

- Public demographics now count attendance only for active Youth Constituents (role 4).
- Age-out profiles are surfaced in the compliance widget; unknown or missing ages are not treated as confirmed age-outs.
- Removed an unused fixture with fabricated zero-valued barangay metrics and replaced a hardcoded federation activity claim with directory wording. No `Math.random()` usage was found in the frontend source.
- The global Realtime hook now covers programs, budgets, expenses, documents, announcements, and feedback. Super Admin subscriptions are tenant-filtered per tenant; other authenticated roles are filtered to their own tenant. Subscription errors are logged.
- The Realtime publication migrations are present at `backend/supabase/migrations/024_realtime_multi_image_announcements.sql` and `backend/supabase/migrations/025_realtime_content_tables.sql`; they must be applied to the target Supabase database. Live event delivery was not tested.

### Scope Notes and Verification

- Public directory and transparency endpoints intentionally aggregate public-safe information across barangays; private authenticated reads for roles 2 and 3 are tenant-scoped.
- The Federation President lookup remains available to Barangay Admins for report sign-off and returns only the active central officeholder's name, not barangay records.
- Backend `npm run build`, frontend `npx tsc --noEmit`, and `git diff --check` passed.
- This review does not certify production deployment or live Supabase Realtime behavior.
