# ScopeLedger

A working B2B pilot for fixed-scope service firms: record the original agreement, price additional work, and preserve evidence of client decisions.

## What works

- Company workspaces, with isolation checked on every API read/write.
- Owner, editor, reviewer and viewer roles; member access granted by matching sign-in email.
- Project scope, original budget, hourly change rate, and original delivery date.
- Extra-work requests with source excerpts, estimated minutes, deadline and schedule impact.
- Server-calculated prices stored in integer currency minor units.
- Pending → approved/declined/withdrawn; approved → delivered, with role and version checks.
- Required approval evidence and client approver email; delivery notes preserve earlier approval evidence.
- Atomic record/history writes, an activity view and full history export.
- Search and status/project filters, copied client proposals and CSV exports with formula-injection protection.
- Explicitly labelled, separately created fictional sample workspaces.
- Responsive interface with accessible primitives, recoverable errors and retained form input.

## Scope and honest limitations

This is an internal pilot, not a self-service billing platform or a certified enterprise product. The delivered Site is owner-private. Team members cannot use it until Site access also permits them. Workspace membership is separate from hosting audience.

Authentication uses the hosting platform’s ChatGPT sign-in and trusted forwarded identity headers. The Cloudflare Worker must stay behind that trusted dispatcher. **Do not deploy this Worker directly on an untrusted public endpoint accepting spoofable identity headers.** For another host, replace the identity adapter with properly validated sessions/tokens before use.

A staff member records a client's existing written approval. This is not a client signature or proof that the client personally used this app. Email sending, reminders, file uploads, AI classification, subscriptions, invoices and payment collection are not implemented. Proposals are copied for manual review/sending. Approved value is not revenue collected. Schedule impact is not automatically summed into delivery dates because requests may overlap.

Baselines and requests are not editable after creation; withdraw pending mistakes with a reason and create a replacement. There is no automated customer data deletion or full backup/restore workflow yet. Record content should be limited to what the workflow needs. The pilot has soft caps of 20 workspaces/account, 200 projects/workspace and 2,000 change requests/workspace. The activity screen shows the latest 500 entries; export includes full activity history.

No browser/visual or live multi-account acceptance test has been run in this turn. The WebMCP filter tool is feature-detected, but supported-browser invocation validation was unavailable. Production deployment success is distinct from verification of real customer sign-in and usage.

## Stack and setup

React 19, TypeScript, Vinext, bundled accessible UI components, Cloudflare Workers and D1, generated Drizzle migrations. JavaScript/TypeScript throughout the application; no paid AI service is required.

Use Node 22.13+ and the package-manager version declared in package.json. The pnpm lockfile is authoritative. Install dependencies with the repository's supported setup or `pnpm install --frozen-lockfile` in an ordinary development environment.

```sh
node --test tests/integration.cjs
node node_modules/typescript/bin/tsc --noEmit
pnpm run build
```

Within ChatGPT Sites, use the installed Sites skill build/deployment scripts. Keep the logical D1 binding `DB` and existing project identity in `.openai/hosting.json`. Never commit credentials or local runtime databases.

Schema changes belong in `db/schema.ts`. Generate migrations with `pnpm run db:generate`, inspect the SQL and commit it. Do not rewrite already applied migrations. Migration application is owned by the hosting workflow; do not issue CREATE TABLE at request time.

## Test coverage

`tests/integration.cjs` loads the actual TypeScript API handlers and executes them against in-memory SQLite. Only the hosting identity transport and D1 adapter are substituted. It covers anonymous access, persistence, company isolation, cross-origin rejection, validation, foreign project rejection, integer pricing, role permissions, evidence requirements, stale updates, delivery/history preservation, terminal transitions, CSV safety, access revocation, separate sample data and indexed query use. It is not a substitute for testing Cloudflare D1 itself or the real authentication dispatcher.

## Repository guide

- `app/workspace-app.tsx`: working interface, forms, proposal copy and WebMCP filter.
- `app/api/`: authenticated workspace, project, change, membership and export APIs.
- `lib/domain.ts`: validation, permission transitions, pricing and CSV protection.
- `lib/server.ts`: identity, authorization, D1 and API error boundaries.
- `db/schema.ts`, `drizzle/`: schema and migrations.
- `docs/RESEARCH.md`: research, alternatives and limits of evidence.
- `docs/SALES_PLAYBOOK.md`: buyer hypothesis, pilot offer, demo and discovery.
- `docs/BUILD_PROMPT.md`: reusable autonomous development brief.

## GitHub and live pilot

Repository: https://github.com/sam300705/scopeledger

Private deployed pilot: https://scopeledger-sambhav.joseph22012004.chatgpt.site

Imported from the validated application source. GitHub Actions runs the API integration suite, TypeScript checks and production build on pushes and pull requests. Deployment still uses the existing Sites hosting workflow; pushing to GitHub alone does not deploy.

## Ownership

No open-source licence is granted by this repository. Application-specific work is intended for the project owner; dependencies retain their own licences. Review their notices before redistribution or a commercial deployment.
