# SwarmShield

SwarmShield is a defensive security-operations application. Its governed workflow accepts authenticated sensor telemetry, normalizes and deduplicates it, applies deterministic detection policies, links evidence to tenant-scoped analyst cases, and requires human review for escalation, suppression, and evaluation approval. It does not transmit effector commands.

## Local setup

Requirements: Node.js 20.19 or newer, npm, and PostgreSQL.

1. Copy `.env.example` to `.env` and replace every secret placeholder.
2. Create the local demo database: `createdb defense_db`.
3. For a first-time, disposable local setup only, run `./start.sh --install --demo-reset`.
4. On subsequent launches, run `./start.sh`. Normal startup applies only checksum-verified additive migrations and never seeds, drops data, kills processes, or installs dependencies.

The demo reset is refused for production, remote database hosts, and database names outside the explicit local allowlist. It deletes data in the selected demo database. The seeded local account is `admin@demo.com`; set a non-demo credential before any shared deployment.

## Verification

```sh
cd backend
npm run check
npm test
npm audit

cd ../frontend
npm run build
npm audit
```

`npm test` creates a uniquely named disposable PostgreSQL database, applies the legacy demo bootstrap followed by the additive migration twice, runs the suite, and drops only that database.

## Telemetry contract

Provision sources from Security Operations. The response displays a signing secret once. Sensors send strict JSON to `POST /api/telemetry/ingest` with `X-Source-Uid` and `X-Telemetry-Signature: sha256=<hex HMAC>`. The HMAC covers the canonical JSON payload. Schema version `1.0` requires a unique event ID, increasing sequence, offset timestamp, supported event type, sensor UID, and scalar `data` values. Oversized, nested, stale, future-dated, replayed, and unsigned input fails closed.

## Operational notes

See [docs/operations.md](docs/operations.md) for deployment controls, key rotation, retention, backup/recovery, audit verification, and incident response.
