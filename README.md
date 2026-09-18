# ScopeLedger

A working B2B pilot for fixed-scope service firms: preserve the agreed scope, price additional work, obtain/record decisions and track commercial delivery state without rewriting history.

## What works

- Company workspaces with tenant isolation checked on API reads/writes.
- Owner, editor, reviewer and viewer roles. Accepted invitations bind membership to the authenticated provider user ID; legacy email-only memberships are bound on first verified sign-in so later email changes do not transfer access to a different account.
- A real invitation acceptance page; invitation capability values are hashed at rest and never returned in owner listing/export records.
- Original project scope/budget/rate/date preserved as the baseline; corrections and commercial changes use versioned amendments instead of overwriting history.
- Project archiving/restoration with active-work safeguards.
- Draft change estimates that can be edited before submission.
- Hourly, fixed-fee and itemized proposal pricing with exclusions and server-side amount calculation.
- Immutable submitted proposal versions containing the exact project baseline/amendment snapshot used when the proposal was issued.
- Pending → approved/declined/withdrawn; approved → delivered, with role and optimistic-version checks.
- Separate estimated, approved, delivered, invoiced and paid amounts. Invoices and payments are append-only commercial records with explicit void/reversal history; aggregate invoiced/paid totals remain derived compatibility fields. Approved value is never described as collected revenue.
- Staff-recorded decision evidence distinguished from direct client-portal decisions.
- Expiring/revocable one-time client approval links bound to one proposal version. Stale/replayed links fail closed and revisions invalidate outstanding links. Newly created links carry the raw capability in the URL fragment rather than the request query; the client page removes that fragment immediately and sends the token to the API only in a JSON body. Authorized staff can reload safe link metadata and revoke active links without exposing raw tokens or token hashes.
- Client portal for approve, decline or clarification, with intended-email verification and explicit scope/fee/schedule confirmation. It is not described as a certified electronic signature.
- Durable rate limiting for public invitation/client-approval capability attempts without storing raw IP addresses.
- Authenticated downloadable proposal/change-summary HTML using immutable proposal snapshots and current commercial status.
- CSV exports with formula-injection protection plus an owner-only full company JSON export that excludes capability hashes.
- Controlled workspace deletion: explicit owner request, 24-hour cool-off, cancellation and second permanent-deletion confirmation.
- Privacy-safe database health endpoint, defensive API response headers and non-sensitive correlation references for unexpected server failures.
- `/manage` commercial/operations control center for drafts, revisions, client links, finance, baseline amendments, invitations, access, exports and lifecycle controls.
- Explicit capability state: email/reminders/payments show disabled until real providers are configured rather than returning fake success.
- Explicitly labelled, separately created fictional sample workspaces.

## Scope and honest limitations

This remains an **internal-pilot codebase**, not a general-customer production service. The currently deployed Site is owner-private. Current ChatGPT Sites sharing can support selected external viewers where the owner's plan/workspace permits it, but Site audience and ScopeLedger workspace membership are separate controls. A company user needs both Site access and the appropriate ScopeLedger membership/invitation. Production audience changes must be deliberate and browser-tested with the intended visitor account.

Authentication currently uses the hosting platform's ChatGPT sign-in/trusted identity context behind a small identity-provider abstraction. That abstraction makes a future commercial identity migration possible without changing workspace authorization semantics, but it is not itself a new authentication system. **Do not redeploy the ChatGPT Sites identity adapter behind a public endpoint that trusts caller-controlled identity headers.** If Sites sharing/sign-in cannot meet the commercial audience requirements for this account, migrate to a host/authentication system that validates sessions/tokens server-side before the ScopeLedger authorization layer.

The client approval portal and invitation acceptance flow are implemented in the application, but they must not be sent to real clients/users until this branch is deployed, migrations are applied, and the selected audience/sign-in behavior has been verified from independent test accounts. Client decisions are workflow records, not certified electronic signatures.

Email sending and reminders are intentionally not faked: no provider is configured, so there is no claim of delivery. File uploads, AI classification and subscriptions are also not required for the core product. Payment collection/subscriptions must wait for an approved payment-provider business account and verified webhook implementation.

A production D1 backup/restore has not been demonstrated because this repository/session does not have the required hosting data-plane controls. Application-level full JSON export improves data portability but is still not a database backup. Production monitoring currently consists of privacy-safe health checks plus server error correlation references; external error aggregation/alerting is not configured.

Application-level deletion is implemented, but hosting-provider backup retention must still be verified separately before contractual deletion promises are made. See `docs/OPERATIONS.md` for the exact readiness gates.

The pilot has soft caps of 20 workspaces/account, 200 projects/workspace and 2,000 change requests/workspace. The activity API returns the latest 500 entries; exports contain full activity history.

No live external multi-company browser acceptance test has been completed for this hardening branch because the branch has not been deployed and the current Site audience has not been expanded. Passing CI is not proof of production readiness.

## Stack and setup

React 19, TypeScript, Vinext, accessible UI components, Cloudflare Workers and D1, with Drizzle schema/migrations. JavaScript/TypeScript throughout the application; no paid AI service is required.

Use Node 22.13+ and the package-manager version declared in `package.json`. The pnpm lockfile is authoritative.

```sh
pnpm install --frozen-lockfile
node --test tests/*.cjs
node node_modules/typescript/bin/tsc --noEmit
pnpm run lint
pnpm run build
```

Within ChatGPT Sites, keep the logical D1 binding `DB` and existing project identity in `.openai/hosting.json`. Never commit credentials or local runtime databases.

Schema changes belong in `db/schema.ts` plus additive migration files under `drizzle/`. Do not rewrite migrations after they have been applied to a real environment. Migration application is owned by the hosting workflow; request handlers never create/alter tables at runtime.

## Test coverage

`tests/integration.cjs` executes the actual TypeScript API handlers against in-memory SQLite, substituting only the hosting identity transport and D1 adapter. It covers the main workflow: anonymous access, persistence, cross-company isolation, origin rejection, validation, project-id isolation, role permissions, staff approval evidence, stale updates, delivery/history preservation, immutable amendments, draft editing/submission, proposal snapshots, expiring client links, replay protection, client email/confirmation checks, direct-vs-staff decision provenance, separate approved/invoiced/paid values, project archiving, invitation identity matching, CSV safety, access revocation, sample-data isolation and indexed queries.

`tests/readiness.cjs` adds operational gates: health/capability truthfulness, invitation-list secret exclusion, durable capability rate limiting, complete company export without raw/hash capability leakage, owner-only full export, deletion cool-off/finalization and deletion cancellation.

These tests are not substitutes for Cloudflare D1 behaviour, the hosting identity dispatcher or browser testing of a deployed customer-facing audience.

## Repository guide

- `app/workspace-app.tsx`: existing internal workspace UI and original staff workflow.
- `app/manage/page.tsx`: hardened staff commercial/operations control center.
- `app/accept-invite/page.tsx`: invitation acceptance with authenticated-email enforcement.
- `app/client-approval/page.tsx`: direct client proposal review/decision portal.
- `app/api/changes/`: drafts, revisions, proposal snapshots and staff decisions.
- `app/api/client-links/`, `app/api/client-approval/`: one-time client access and decisions.
- `app/api/invitations/`: invitation creation/listing/revocation/acceptance.
- `app/api/projects/`: baseline creation, amendments and archive/restore.
- `app/api/finance/`: auditable invoice/payment ledger actions after approval, including void and reversal history.
- `app/api/export/`: CSV and owner-only full company JSON export.
- `app/api/data-lifecycle/`: deletion request, cancellation and finalization.
- `app/api/capabilities/`: truthful external-integration availability.
- `app/api/proposal/`: downloadable proposal/change summary.
- `app/api/health/`: privacy-safe datastore readiness check.
- `lib/identity.ts`: current trusted-host identity provider boundary for future auth migration.
- `lib/domain.ts`: validation, transitions and pricing.
- `lib/server.ts`: identity, authorization, D1, token hashing, durable throttling and API error boundaries.
- `db/schema.ts`, `drizzle/`: schema and additive migrations.
- `docs/SHIP_READY_PROMPT.md`: autonomous readiness prompt used to drive hardening work.
- `docs/OPERATIONS.md`: deployment, recovery, provider and readiness gates.
- `docs/RESEARCH.md`: research, alternatives and limits of evidence.
- `docs/SALES_PLAYBOOK.md`: buyer hypothesis, pilot offer, demo and discovery.

## GitHub and deployed pilot

Repository: https://github.com/sam300705/scopeledger

Existing owner-private pilot: https://scopeledger-sambhav.joseph22012004.chatgpt.site

GitHub Actions runs every `tests/*.cjs` suite, TypeScript checks and the production build. Pushing to GitHub alone does not deploy this application, and the owner-private pilot should not be represented as a commercial customer deployment until its migrations, audience and real visitor flow are explicitly verified.

## Ownership

No open-source licence is granted by this repository. Application-specific work is intended for the project owner; dependencies retain their own licences. Review dependency notices before redistribution or commercial deployment.
