# Completeness Review: counter-swarm-defense

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 119 project files (103 source files), 3 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished security operations application, not just an empty scaffold. Inspection found 103 source files across `frontend/`, `backend/` using Next.js, React, Express; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Connect authenticated telemetry sources with normalized schemas, deduplication, timestamp integrity, and retention controls.
2. Implement deterministic detection/risk policies, evidence-linked triage, case ownership, escalation, and suppression review.
3. Add adversarial evaluation, false-positive measurement, tamper-evident audit history, and analyst approval boundaries.
4. Harden tenant isolation, secrets, outbound requests, parser sandboxes, rate limits, and incident recovery.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `frontend/src/App.tsx:27`
- `backend/routes/sample_data.js:1`
- `backend/server.js`
- `backend/middleware/auth.js`
- `requirements.txt`
- `start.sh`

## Recommended next action

Choose one real security operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-19)

The recommended journey is now implemented end to end: authenticated sensor telemetry → strict normalization/deduplication → deterministic policy detection → evidence-linked, tenant-scoped analyst case → owned escalation/resolution and independently reviewed suppression/evaluation.

- Added checksum-verified additive migrations for tenants, encrypted telemetry-source credentials, retained telemetry evidence, versioned deterministic policies, detections, triage cases/events, suppressions, evaluation metrics, and HMAC-chained append-only audit history. PostgreSQL triggers reject audit and case-event mutation.
- Added one-time sensor secrets encrypted with AES-256-GCM, canonical HMAC request authentication, strict scalar-only schema parsing, monotonic sequences, exact replay handling, timestamp windows, SHA-256 evidence hashes, bounded retention, source quarantine controls, request-size limits, rate limits, Helmet, exact-origin CORS, fail-closed secret validation, and short-lived revocable JWT sessions backed by live tenant/role lookups.
- Added deterministic RF/radar/health rules with evidence consolidation; owner/supervisor case controls; second-person suppression and evaluation approval; precision, recall, false-positive-rate, dataset-digest, and adversarial-case gates. The direct and generated effector-dispatch paths now return HTTP 410, and engagement clearance requires a separately requested and independently decided ROE authorization.
- Added the Security Operations console for source provisioning, case/evidence work, suppression review, and evaluation approval. Audit history is now read-only in the UI with live chain verification, and previously public utility routes are behind the authenticated layout.
- Replaced destructive default startup with safe migration-only startup. Local database reset/seed is explicit, restricted to local allowlisted demo databases, and refused in production. Added environment guidance, operations/recovery/key-rotation runbooks, and CI for installs, static checks, dependency audits, migration replay, PostgreSQL integration/failure tests, frontend build, and shell validation.
- Verification: 13/13 automated tests pass against uniquely created disposable PostgreSQL databases; backend syntax checks pass; frontend production build passes; backend and frontend dependency audits report 0 vulnerabilities; migration replay, shell syntax, and whitespace checks pass. Local `.env` files are ignored and have no tracked Git history; their values were not printed or treated as safe, so any credential used elsewhere should still be rotated.

## Runtime acceptance (2026-07-20)

The non-suite runtime validator passed on the fresh assigned PostgreSQL/API/UI ports `55639/6092/6093`: `start.sh` launched the backend and frontend only on their assigned ports, the explicit administrator provisioning command created the runtime identity with a bcrypt cost of 12, login issued the constrained JWT, `/api/auth/me` reloaded the active user and token version from PostgreSQL, and the smoke test recorded `API_VERIFIED — startup_login_session_api`. The launcher no longer silently falls back to the legacy `3006/5173` ports and maps the validator's non-production audit/encryption secret aliases without weakening production validation. Backend syntax checks, all 13 disposable-PostgreSQL tests, the frontend production build, shell syntax, and `git diff --check` passed. All acceptance and test ports were released afterward.

Residual scope is explicit: older catalog, visualization, and optional LLM advisory modules remain outside this completed journey and are not trusted for telemetry decisions, case authorization, or effector control. Production deployment still requires environment-specific TLS/ingress, managed secrets, a dedicated PostgreSQL role, monitoring, backups, and a recovery drill described in `docs/operations.md`.
