# Operations runbook

## Deployment controls

- Use a dedicated PostgreSQL role and database per environment. Back up before migrations and run `npm run migrate` as a release step.
- Supply secrets through the deployment secret manager. Require 32+ random characters for JWT and audit keys and exactly 32 random bytes, base64-encoded, for telemetry encryption.
- Set `CORS_ORIGINS` to the exact console origins. Terminate TLS at the ingress, cap request sizes there, and retain the application rate limits.
- Do not run `reset-demo.js`, `db/schema.sql`, or `db/seed.sql` in a shared or production database. Production startup refuses missing security configuration.
- Optional LLM routes are advisory only and are outside the telemetry/detection/triage authorization path. The generated effector-dispatch route is retired and returns HTTP 410.

## Source and key lifecycle

Provision each physical/logical sensor separately and put the one-time signing secret directly in its secret store. Quarantine a source on signature failures, sequence anomalies, unexpected clock drift, or compromise. Create a replacement source/credential rather than sharing a secret. `TELEMETRY_SECRETS_KEY_VERSION` labels new envelopes; rotate by deploying a new encryption key, re-provisioning source credentials, and retaining the prior key only for a controlled migration window.

Changing `JWT_SECRET` invalidates all sessions. Increment a user's `token_version` or set `active=false` for targeted revocation. Audit-chain key rotation must preserve the prior chain and begin a documented new trust epoch; do not silently replace the key and claim older entries verify under it.

## Monitoring and response

Monitor readiness, 401/409/422/429 rates, quarantined sources, event clock-skew warnings, case SLA breaches, suppression expiry, evaluation gates, PostgreSQL capacity, and audit verification. On suspicious intake: quarantine the source, preserve its recent telemetry and audit chain, revoke credentials, compare raw SHA-256 evidence to the source record, re-provision, and document closure in the case.

Run `GET /api/audit/verify` after deployment and on a schedule. Any chain failure is an incident: make the database read-only for investigation, preserve backups and logs, identify the first failed ID, and restore only through an approved recovery procedure.

## Retention, backup, and recovery

Source retention is 1–3650 days. `POST /api/telemetry/retention/purge` removes only expired telemetry that is not linked as case evidence and writes an audit event. Schedule it under an admin service identity. Preserve evidence according to incident/legal policy.

Take encrypted PostgreSQL backups, test point-in-time recovery, and record recovery objectives. A recovery drill should restore to an isolated database, run migrations, verify the audit chain, compare case/evidence counts, exercise login and a signed telemetry event, and only then approve promotion. The application never silently falls back to sample data when storage or a provider is unavailable.
