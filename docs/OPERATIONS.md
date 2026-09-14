# ScopeLedger operations and commercial rollout

This document describes what is implemented in the repository and what still requires external platform setup. It deliberately avoids claiming production readiness, compliance certifications, or successful customer communications that have not been verified.

## Current hosting boundary

The existing ChatGPT Site uses the hosting platform's authenticated user context and D1 binding. Workspace roles are enforced by ScopeLedger, but they do not expand the hosting platform's audience. A person can be invited to a workspace and still be unable to reach the Site if the hosting audience does not permit them.

Do not deploy the current ChatGPT identity adapter to a public server that accepts user identity through arbitrary request headers. A commercial migration must use a host-supported authentication mechanism that validates sessions/tokens server-side before `authorize()` is reached.

## Invitation rollout

The repository supports expiring, revocable workspace invitations. The raw invitation token is returned only when created; only its SHA-256 hash is stored. Acceptance requires a signed-in identity whose normalized email exactly matches the invitation email. Revoked, expired and already accepted invitations fail closed.

On the current private Site this does not solve hosting audience restrictions. Before external customers are invited, migrate to supported commercial authentication and verify sign-in with at least two independent test accounts from different companies.

## Client approval portal

Client approval links are random one-time capability links with a stored hash, expiry, revocation and proposal-version binding. The client must enter the intended contact email and explicitly confirm the proposal's scope, fee and schedule impact. A later proposal revision revokes outstanding links. Used, expired, revoked and stale-version links fail closed.

The proposal shown to the client contains the immutable project scope/budget/date snapshot that existed when that proposal version was issued. Later project amendments do not silently change an already-issued proposal.

Client decisions are labelled `client_portal`; staff-recorded evidence is labelled `staff_recorded`. The portal is not described as a certified electronic-signature service.

Do not send real client links until the externally reachable host and access model have been approved and browser-tested.

## Email and reminders

No email provider is configured. The application must therefore show email/reminders as unavailable until a provider account and sandbox credentials are intentionally configured. Do not return fake delivery success and do not send to production recipients during setup.

A future provider integration must include:

- an idempotency key per notification event;
- retry state with bounded exponential backoff;
- provider message id and delivery/failure status;
- deduplication on retried jobs;
- cancellation when a proposal is resolved, revised, the approval link is revoked, or the recipient opts out;
- sandbox recipients during verification.

## Payments

Subscriptions are intentionally not implemented. Add billing only after the core workflow is deployed with commercial authentication and a payment-provider business account is available. Verified webhook signatures, idempotent/out-of-order event handling and server-side entitlement checks are mandatory. Never use test success states as proof of a paid subscription.

## Backup and restore

The current production datastore is managed D1 through the hosting workflow. This repository does not contain credentials or sufficient platform access to create and restore a production backup. Therefore a production restore has **not** been demonstrated.

Before a paid pilot:

1. Confirm the hosting platform's supported D1 backup/export mechanism and retention period.
2. Create a backup from a non-production database containing representative records.
3. Restore into a separate non-production database.
4. Run the integration suite plus a browser smoke test against the restored data.
5. Record the backup identifier, restore timestamp, record counts and test result in the incident log.

Application-level CSV export remains useful for customer-visible data portability but is not a full database backup.

## Deployment and rollback

Before promotion:

1. All GitHub CI checks must pass: integration suite, TypeScript and production build.
2. Apply additive migrations through the hosting platform's supported migration workflow. Do not rewrite migrations that have already been applied.
3. Verify `/api/health` returns database `reachable` without exposing customer data.
4. Run browser tests for owner, editor, reviewer, viewer, invited user, outsider and client-link flows.
5. Check mobile layout, keyboard navigation, expired/revoked links and stale update handling.

For rollback, redeploy the last known-good application commit. Database rollback is not automatic: additive schema changes should normally remain in place while application code is rolled back. Never drop new columns/tables as part of an emergency application rollback without an explicit data-retention decision and a verified backup.

## Incident response

For suspected tenant leakage, account compromise or incorrect client approval:

1. Stop access expansion and external communications.
2. Revoke affected invitation/client links and remove compromised workspace membership where appropriate.
3. Preserve relevant application and hosting logs without copying unnecessary customer content.
4. Identify affected workspace ids, operations and time window.
5. Patch and verify tenant isolation with regression tests before restoring normal access.
6. Notify customers according to contractual and legal obligations; do not speculate about impact before evidence is established.
7. Document root cause, containment, recovery and prevention actions.

## Readiness gates

### Internal pilot

Suitable only when CI passes and migrations are applied to an isolated pilot environment. The current private ChatGPT hosting model is acceptable for owner/internal testing.

### Paid pilot

Requires, at minimum: externally supported customer authentication/hosting, production migration verification, real browser multi-account testing, a tested backup/restore procedure, monitoring/error reporting, approved email delivery setup if email is part of the offer, and a reviewed deletion/retention procedure.

### General customer use

Also requires sustained operational evidence from pilots, incident/rollback exercises, capacity/rate-limit review, customer support procedures, privacy/legal review appropriate to target markets, and billing only after payment-provider verification. Passing a build alone is not sufficient.
