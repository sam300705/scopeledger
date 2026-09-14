# ScopeLedger

A working B2B pilot for fixed-scope service firms: preserve the agreed scope, price additional work, obtain/record decisions and track commercial delivery state without rewriting history.

## What works

- Company workspaces with tenant isolation checked on API reads/writes.
- Owner, editor, reviewer and viewer roles, plus expiring/revocable invitations whose acceptance requires the invited authenticated email.
- Original project scope/budget/rate/date preserved as the baseline; corrections and commercial changes use versioned amendments instead of overwriting history.
- Project archiving/restoration with active-work safeguards.
- Draft change estimates that can be edited before submission.
- Hourly, fixed-fee and itemized proposal pricing with exclusions and server-side amount calculation.
- Immutable submitted proposal versions containing the exact project baseline/amendment snapshot used when the proposal was issued.
- Pending → approved/declined/withdrawn; approved → delivered, with role and optimistic-version checks.
- Separate estimated, approved, delivered, invoiced and paid amounts. Approved value is never described as collected revenue.
- Staff-recorded decision evidence distinguished from direct client-portal decisions.
- Expiring/revocable one-time client approval links bound to one proposal version. Stale/replayed links fail closed and revisions invalidate outstanding links.
- Client portal for approve, decline or clarification, with intended-email verification and explicit scope/fee/schedule confirmation. It is not described as a certified electronic signature.
- Authenticated downloadable proposal/change-summary HTML using immutable proposal snapshots and current commercial status.
- Atomic record/history writes, activity history, CSV exports with formula-injection protection, and a privacy-safe database health endpoint.
- Explicitly labelled, separately created fictional sample workspaces.

## Scope and honest limitations

This remains an **internal-pilot codebase**, not a general-customer production service. The currently deployed ChatGPT Site is owner-private. Workspace invitations do not expand the hosting platform's audience, so external company access still requires migration to a host/authentication model designed for commercial customer sign-in.

Authentication currently uses the hosting platform's ChatGPT sign-in and trusted identity context. **Do not redeploy this identity adapter behind a public endpoint that trusts caller-controlled identity headers.** A commercial host must validate sessions/tokens server-side and pass a verified identity into the authorization layer.

The client approval portal is implemented in the application, but it must not be sent to real clients until the application is deployed at an externally reachable, reviewed host. Client decisions are workflow records, not certified electronic signatures.

Email sending and reminders are intentionally not faked: no provider is configured, so there is no claim of delivery. File uploads, AI classification and subscriptions are also not required for the core product. Payment collection/subscriptions must wait for an approved payment-provider business account and verified webhook implementation.

A production D1 backup/restore has not been demonstrated because this repository/session does not have the required hosting data-plane credentials. Existing CSV export is not a full database backup. Automated customer deletion/retention and production monitoring/error-reporting still require rollout work. See `docs/OPERATIONS.md` for the exact readiness gates.

The pilot has soft caps of 20 workspaces/account, 200 projects/workspace and 2,000 change requests/workspace. The activity API returns the latest 500 entries; export contains full activity history.

No live external multi-company browser acceptance test has been completed for this hardening branch because the current Site is private and this branch has not been deployed. Passing CI is not proof of production readiness.

## Stack and setup

React 19, TypeScript, Vinext, accessible UI components, Cloudflare Workers and D1, with Drizzle schema/migrations. JavaScript/TypeScript throughout the application; no paid AI service is required.

Use Node 22.13+ and the package-manager version declared in `package.json`. The pnpm lockfile is authoritative.

```sh
pnpm install --frozen-lockfile
node --test tests/integration.cjs
node node_modules/typescript/bin/tsc --noEmit
pnpm run build
```

Within ChatGPT Sites, keep the logical D1 binding `DB` and existing project identity in `.openai/hosting.json`. Never commit credentials or local runtime databases.

Schema changes belong in `db/schema.ts` plus additive migration files under `drizzle/`. Do not rewrite migrations after they have been applied to a real environment. Migration application is owned by the hosting workflow; request handlers never create/alter tables at runtime.

## Test coverage

`tests/integration.cjs` executes the actual TypeScript API handlers against in-memory SQLite, substituting only the hosting identity transport and D1 adapter. Coverage includes anonymous access, persistence, cross-company isolation, origin rejection, validation, project-id isolation, role permissions, staff approval evidence, stale updates, delivery/history preservation, immutable amendments, draft editing/submission, proposal snapshots, expiring client links, replay protection, client email/confirmation checks, direct-vs-staff decision provenance, separate approved/invoiced/paid values, project archiving, invitation identity matching, CSV safety, access revocation, sample-data isolation and indexed queries.

It is not a substitute for Cloudflare D1 behaviour, the hosting identity dispatcher or browser testing of a deployed customer-facing host.

## Repository guide

- `app/workspace-app.tsx`: existing internal workspace UI and original staff workflow.
- `app/client-approval/page.tsx`: direct client proposal review/decision portal.
- `app/api/changes/`: drafts, revisions, proposal snapshots and staff decisions.
- `app/api/client-links/`, `app/api/client-approval/`: one-time client access and decisions.
- `app/api/invitations/`: invitation creation/revocation/acceptance.
- `app/api/projects/`: baseline creation, amendments and archive/restore.
- `app/api/finance/`: invoiced/paid tracking after approval.
- `app/api/proposal/`: downloadable proposal/change summary.
- `app/api/health/`: privacy-safe datastore readiness check.
- `lib/domain.ts`: validation, transitions and pricing.
- `lib/server.ts`: identity, authorization, D1, token hashing and API error boundaries.
- `db/schema.ts`, `drizzle/`: schema and additive migrations.
- `docs/OPERATIONS.md`: deployment, recovery, provider and readiness gates.
- `docs/RESEARCH.md`: research, alternatives and limits of evidence.
- `docs/SALES_PLAYBOOK.md`: buyer hypothesis, pilot offer, demo and discovery.

## GitHub and deployed pilot

Repository: https://github.com/sam300705/scopeledger

Existing owner-private pilot: https://scopeledger-sambhav.joseph22012004.chatgpt.site

GitHub Actions runs the integration suite, TypeScript checks and production build. Pushing to GitHub alone does not deploy this application, and the owner-private pilot should not be represented as a commercial customer deployment.

## Ownership

No open-source licence is granted by this repository. Application-specific work is intended for the project owner; dependencies retain their own licences. Review dependency notices before redistribution or commercial deployment.
