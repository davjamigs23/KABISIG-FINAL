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
