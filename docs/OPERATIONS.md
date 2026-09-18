# ScopeLedger operations and commercial rollout

This document describes what is implemented in the repository and what still requires external platform setup. It deliberately avoids claiming production readiness, compliance certifications, successful customer communications, backup recovery or customer access that have not been verified.

## Current hosting boundary

The existing ChatGPT Site uses the hosting platform's authenticated user context and D1 binding. Workspace roles are enforced by ScopeLedger, but they do not expand the hosting platform's audience. A person can be invited to a workspace and still be unable to reach the Site if the Site audience does not permit them.

Current ChatGPT Sites sharing supports selected external viewers where enabled for the owner's plan/workspace. A paid pilot therefore does not automatically require a hosting migration: the safer first option is selected external viewers plus matching ScopeLedger workspace membership, followed by real visitor verification. Site audience changes remain an owner-controlled production access change and must be explicitly authorized.

Do not deploy the current ChatGPT identity adapter to a public server that accepts user identity through arbitrary request headers. If Sites sharing/sign-in cannot satisfy the required customer access model, a migration must use a host-supported authentication mechanism that validates sessions/tokens server-side before `authorize()` is reached.

## Staff operations surface

The hardening branch includes `/manage`, an authenticated staff control center. It exposes the commercial workflows that previously existed mainly as server APIs: draft creation/editing, submitted proposal revision, client-link generation, versioned project amendments, archive/restore, invoiced/paid tracking, invitations, member role changes/removal, exports and the controlled data-deletion workflow.

The main workspace links to this control center. The control center exposes persistent client-link metadata plus invoice/payment ledger recording and correction workflows. The UI deliberately shows external email, reminders and subscription/payment-collection integrations as disabled when their providers are unavailable instead of implying that an external action succeeded.

## Invitation rollout

The repository supports expiring, revocable workspace invitations. The raw invitation token is returned only when created; only its SHA-256 hash is stored. Owner invitation listings and company exports exclude the stored token hash. Acceptance is handled by `/accept-invite` and requires a signed-in identity whose normalized email exactly matches the invitation email. On acceptance the membership is bound to the authenticated provider user ID. Legacy email-only memberships are claimed once on first matching authenticated use; after binding, the stable user ID is authoritative, so reusing the old email from another account does not inherit access while the same account can continue after an email change. Revoked, expired and already accepted invitations fail closed.

Invitation creation is throttled per owner/workspace. Public capability attempts use independent token, trusted-edge IP and IP+token buckets, with stale rate-limit rows pruned automatically. `CF-Connecting-IP` is hashed when supplied by the trusted Cloudflare edge; raw IP addresses are not stored and arbitrary `X-Forwarded-For` is not trusted for this control.

On the currently owner-private Site, the owner must separately grant the intended company user Site viewing access using the supported sharing controls. Before external customers are invited at scale, verify the combined Site-sharing + ScopeLedger-invitation flow with at least two independent test accounts from different companies. If the necessary external-viewer controls are unavailable for this account/workspace, migrate to a supported commercial authentication host instead of trusting spoofable identity headers.

## Client approval portal

Client approval links are random one-time capability links with a stored hash, expiry, revocation and proposal-version binding. Newly created links place the raw capability in a URL fragment rather than the HTTP query; the client page removes the fragment immediately and loads proposal data by sending the token in a JSON request body, reducing request-URL/proxy-log leakage. This does not yet replace the in-browser capability with a separate HttpOnly scoped session. Public reads and decision attempts are durably throttled. The client must enter the intended contact email and explicitly confirm the proposal's scope, fee and schedule impact for approve/decline. Clarification requires a meaningful message. A later proposal revision revokes outstanding links. Used, expired, revoked and stale-version links fail closed.

The proposal shown to the client contains the immutable project scope/budget/date snapshot that existed when that proposal version was issued. Later project amendments do not silently change an already-issued proposal.

Client decisions are labelled `client_portal`; staff-recorded evidence is labelled `staff_recorded`. The portal is not described as a certified electronic-signature service.

Do not send real client links until the hardening build, migrations and intended Site audience/sign-in flow have been approved and browser-tested.

## Company export and deletion

Owners can download a full application-level JSON export containing workspace metadata, members, safe invitation metadata, projects, project amendments, changes, proposal snapshots, safe client-link metadata, invoice/payment ledger history, events and deletion-request history. Raw capability tokens and token hashes are excluded. Existing CSV exports remain formula-injection protected and distinguish estimated, approved, delivered, invoiced and paid values. Commercial corrections do not silently overwrite invoice/payment history: payments are reversed explicitly and invoices are voided explicitly; the change-level totals are maintained as derived compatibility fields.

Workspace deletion is controlled rather than immediate. An owner must create a deletion request by typing the exact workspace name plus `DELETE`. A 24-hour cool-off follows and can be cancelled. Permanent finalization requires the same owner context, exact workspace name and `DELETE PERMANENTLY`; dependent application records are deleted in foreign-key-safe order. The test suite exercises finalization only against isolated test workspaces.

Application deletion does not prove deletion from hosting-provider backups. Before making contractual retention/deletion promises, verify the hosting platform's backup retention and deletion behavior separately.

## Email and reminders

No email provider is configured. `/api/capabilities` and `/manage` therefore show email/reminders as unavailable. The application does not return fake delivery success and no real recipient is contacted by these workflows.

A future provider integration must include an idempotency key per notification event, retry state with bounded exponential backoff, provider message id and delivery/failure status, deduplication on retried jobs, cancellation when a proposal is resolved/revised/revoked or the recipient opts out, notification preferences and sandbox recipients during verification.

## Payments

Subscriptions are intentionally not implemented. `/api/capabilities` reports payments disabled. Add billing only after the core workflow is deployed with verified customer access and a payment-provider business account is available. Verified webhook signatures, idempotent/out-of-order event handling and server-side entitlement checks are mandatory. Never use test success states as proof of a paid subscription and never charge real customers during verification.

## Health, failures and monitoring

`/api/health` checks datastore reachability without exposing customer records. Defensive API responses disable caching and framing, use `nosniff`, no-referrer and a restrictive Permissions Policy. Unexpected server failures return a random non-sensitive correlation reference and log the same reference server-side without logging request bodies or capability tokens.

This is useful operational instrumentation but not a substitute for an external error aggregation/alerting service. Such a service is not currently configured, so automated production alerting remains an external rollout gate.

## Backup and restore

The current production datastore is managed D1 through the hosting workflow. This repository/session does not contain the data-plane access required to create and restore a production backup. Therefore a production restore has **not** been demonstrated.

Before a paid pilot:

1. Confirm the hosting platform's supported D1 backup/export mechanism and retention period.
2. Create a backup from a non-production database containing representative records.
3. Restore into a separate non-production database.
4. Compare critical record counts/invariants.
5. Run all `tests/*.cjs`, TypeScript checks, the production build and a browser smoke test against the restored data.
6. Record the backup identifier, restore timestamp, record counts and verification result in an incident/recovery log.

Application-level full JSON/CSV exports improve portability but are not a database backup.

## Deployment and rollback

Before promotion:

1. All GitHub CI checks must pass: every `tests/*.cjs` suite, TypeScript no-emit and production build.
2. Apply additive migrations through the hosting platform's supported migration workflow. Do not rewrite migrations that have already been applied.
3. Verify `/api/health` returns database `reachable` without exposing customer data.
4. Run deployed browser tests for owner, editor, reviewer, viewer, invited user, unauthorized outsider and client-link visitor.
5. Verify workspace/project/change persistence across refresh and new sessions.
6. Check mobile layout, keyboard-only navigation, focus visibility, downloads, expired/revoked links, stale updates and failure states.
7. Confirm the deployed commit SHA and migration state before sharing links externally.

For rollback, redeploy the last known-good application commit. Database rollback is not automatic: additive schema changes should normally remain in place while application code is rolled back. Never drop new columns/tables as part of an emergency application rollback without an explicit data-retention decision and a verified backup.

## Incident response

For suspected tenant leakage, account compromise, incorrect client approval or data-integrity issue:

1. Stop access expansion and external communications.
2. Revoke affected invitation/client links and remove compromised workspace membership where appropriate.
3. Preserve relevant application/hosting logs and correlation references without copying unnecessary customer content.
4. Identify affected workspace ids, operations and time window.
5. Patch and verify tenant isolation or transition safety with regression tests before restoring normal access.
6. Notify customers according to contractual and legal obligations; do not speculate about impact before evidence is established.
7. Document root cause, containment, recovery and prevention actions.

## Automated verification

CI executes `node --test tests/*.cjs`, TypeScript `--noEmit` and the production Vinext build on push and pull request. The integration suite covers the main tenant/commercial lifecycle. The readiness suite covers capability truthfulness, secret-free invitation listing, durable public throttling, owner-only full export, capability-secret exclusion, deletion cool-off/finalization and cancellation.

These tests use in-memory SQLite with the production TypeScript route handlers and a substituted identity/D1 transport. They do not replace testing real Cloudflare D1, the hosting identity dispatcher or a deployed browser session.

## Readiness gates

### Internal pilot

The codebase is suitable to move into an isolated internal pilot **after** both additive hardening migrations are applied and the deployed build passes a basic owner smoke test. CI alone does not apply migrations or prove the live identity/database path.

### Paid pilot

Requires, at minimum: verified customer access (selected external Sites viewers where supported, or a migrated commercial auth host), deployed migration verification, real browser multi-account testing, successful non-production backup/restore evidence, external monitoring/error alerting appropriate to the pilot, and approved email-provider setup only if email/reminders are part of the paid offer. The implemented application deletion flow must also be reconciled with hosting-provider backup retention.

### General customer use

Also requires sustained operational evidence from pilots, incident/rollback exercises, capacity/pagination/rate-limit review, customer support procedures, privacy/legal review appropriate to target markets, and billing only after payment-provider verification. Passing a build or a single successful pilot is not sufficient.
