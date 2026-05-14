# SwarmShield — _AUDIT_NOTE

## Stack
Express backend (port **3006**) + Vite/React/TS frontend, Postgres `defense_db`, JWT bearer auth.
Login: `admin@demo.com / demo123`. Run via `./start.sh`.

## Apply 3 — feature_add (2026-05-07)

**Action:** ADDED 5 defensive AI features + 3 utility features (8 total).

### Backend endpoints surfaced (new)

AI (defensive / educational / training framing — system prompt enforces this):
- `POST /api/ai-extras/trajectory-prediction` — threat-trajectory predictor
- `POST /api/ai-extras/formation-classifier` — swarm-formation classifier
- `POST /api/ai-extras/sensor-anomaly` — sensor-anomaly detector
- `POST /api/ai-extras/priority-scorer` — defensive response-priority scorer
- `POST /api/ai-extras/drill-scenario` — training drill scenario generator

Utility:
- `GET /api/export/:entity` — CSV export (threats, countermeasures, deployments, sensors, incidents, zones)
- `GET|POST|DELETE /api/audit` — audit log (lazy-creates `audit_log` table; `search` + `action` + `entity_type` filters)
- `GET /api/search?q=&entity=&status=&type=` — cross-entity search + filter

All AI endpoints return **HTTP 503** when `OPENROUTER_API_KEY` is missing or upstream fails. JWT bearer required on every endpoint (verified: `GET /api/audit` without token → 401).

### Frontend pages added

- `/ai-extras` — AI Tools+ (5 panels, one per new AI feature)
- `/export` — CSV Export
- `/audit` — Audit Log
- `/search` — Global Search & Filter

Layout sidebar gained an "AI Tools+" link under AI Center and a new "Utilities" group with Global Search / CSV Export / Audit Log links.

### Files written / modified

Created: `backend/routes/{aiExtras,audit,exportCsv,search}.js`, `frontend/src/pages/{AIExtrasPage,ExportPage,AuditLogPage,SearchPage}.tsx`.
Modified: `backend/server.js` (mount 4 new routers), `frontend/src/App.tsx` (4 routes), `frontend/src/components/Layout.tsx` (nav links), `frontend/src/api.ts` (`apiDownload` helper + explicit 503 surface).

### Syntax check

- `node --check` PASS for all new backend files + `server.js`.
- `tsc --noEmit` PASS (exit 0) for frontend.
- Backend module-load smoke: prints `SwarmShield backend running on port 3006`.

### Smoke test (port 3006, admin@demo.com/demo123)

```
POST /api/auth/login                      → 200 + JWT
POST /api/audit                           → 201 (lazy-creates audit_log)
GET  /api/audit?search=smoke              → 200
GET  /api/export/threats                  → CSV (header + rows)
GET  /api/search?q=Alpha                  → cross-entity matches
POST /api/ai-extras/trajectory-prediction → 503 (no API key — correct path)
GET  /api/audit  (no token)               → 401
```

### Notes

- Existing routes / schema.sql / seed.sql / start.sh and pre-existing pages were **not** modified.
- No `npm install` was executed; project deps reused.
- `audit_log` is created at runtime via `CREATE TABLE IF NOT EXISTS` to avoid touching the destructive `schema.sql` (which `DROP`s tables on every start).
- Defensive-only framing is enforced via a `DEFENSIVE_FRAMING` system-prompt prefix in `aiExtras.js` and surfaced to the operator in the AI Tools+ page header.

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/feature_add_counter-swarm-defense.md`.

## Apply 3 — sample_data (2026-05-07)

**Action:** ADDED a Sample Data page with one button per main entity (defensive/training simulation only). Skips `users` and `audit_log`.

### Backend

New: `backend/routes/sample_data.js` mounted at `/api/admin` in `server.js`.

- `GET  /api/admin/sample-data/entities` → `{entities, framing}`
- `POST /api/admin/sample-data/:entity` → `{inserted, entity}` (5–10 rows per call)

Entities: `threats`, `countermeasures`, `deployments`, `sensors`, `incidents`, `zones`. JWT bearer required (existing `verifyToken`). Inserted rows are framed as defensive/educational/training-drill data (zone names suffixed "(training)", incident damage assessment "No real-world damage — simulated drill only.", etc.). Unknown entity → 400 with allow-list. `deployments` self-bootstraps parents if needed.

### Frontend

New: `frontend/src/pages/SampleDataPage.tsx` — one button per entity, JWT bearer via `apiFetch`, per-entity counter chip + toast (ok/err).
Wired: `App.tsx` route `/sample-data`, `Layout.tsx` sidebar link "Sample Data" (Database icon, Utilities group).

### Constraints

- `DEFENSIVE_FRAMING` + 5 AI endpoints in `backend/routes/aiExtras.js` untouched.
- No `npm install`.
- `node --check` PASS for new and modified backend files. `tsc --noEmit` exit 0 for frontend.

### Smoke test (port 3006, admin@demo.com/demo123)

```
POST /api/auth/login                          → 200 + JWT
POST /api/admin/sample-data/sensors  (Bearer) → 200 {"inserted":10,"entity":"sensors"}
GET  /api/admin/sample-data/entities (Bearer) → 200
POST /api/admin/sample-data/sensors  (none)   → 401
POST /api/admin/sample-data/users    (Bearer) → 400 (rejected — users skipped)
```

Backend cleaned up after test (port 3006 clear).

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/sample_data_counter-swarm-defense.md`.

## Apply 3 — samples / prefill buttons (2026-05-07)

**Action:** ADDED 27 sample-prefill buttons (3 per AI feature) across the 9 AI features in 2 frontend pages. Buttons fully populate each form's state when clicked.

### Pages touched
- `frontend/src/components/AICenter.tsx` — 4 features × 3 = 12 buttons.
- `frontend/src/pages/AIExtrasPage.tsx` — 5 features × 3 = 15 buttons.

### Approach
No shared form abstraction; samples added inline as small typed arrays mapped over a button row above each form.

### Defensive framing
Every sample is tagged `[DRILL]`, `[TRAINING]`, or `[SIMULATION]` and references training-range exercises, drill telemetry, simulated sensor logs, or readiness drills only. No real-world targeting / offensive guidance. Backend `DEFENSIVE_FRAMING` constant in `backend/routes/aiExtras.js` not modified.

### Verification
- `tsc --noEmit -p .` → exit 0.
- `vite build` → built in 1.60s, 1489 modules transformed.
- Backend on port 3006: `POST /api/auth/login` (admin@demo.com / demo123) → 200 + JWT.
- Cleanup: backend killed, `dist/` removed.

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/samples_counter-swarm-defense.md`.

## Apply 3 — dashboard (2026-05-07)

**Action:** ADDED a defensive/training-oriented Dashboard as the post-login landing page and first sidebar item.

### Backend
New: `backend/routes/dashboard.js` mounted at `/api/dashboard` in `server.js`.
- `GET /api/dashboard/stats` (JWT bearer required) → `{framing, kpis, recent_activity, generated_at}`
- KPIs: `active_sensors`, `sensors_total`, `training_drills_logged`, `threat_training_records`, `countermeasure_inventory`, `deployments`, `incidents_logged`, `defense_zones`
- `recent_activity` = last 10 `audit_log` rows (table is lazy-created so fresh DBs don't 500)
- Per-table reads wrapped in `safeCount`/`safeRows` (missing tables → 0 / [], not 500)

### Frontend
New: `frontend/src/pages/Dashboard.tsx` — 5 KPI cards, Quick Actions (AI Center, Sensors, Drills, Sample Data), Recent Activity table, "Training Mode" + "Drill Audit Trail" badges, framing string from server, training-only footer disclaimer.
Wired:
- `Layout.tsx` → `LayoutDashboard` icon, Dashboard added as the FIRST sidebar entry under Operations.
- `App.tsx` → `/dashboard` route, default landing redirect changed from `/threats` to `/dashboard`.

### Constraints
- Defensive/training framing preserved (UI badges, server-supplied `framing` string, sample-text tags).
- No prior route, page, schema, or seed touched.
- No `npm install`.
- `node --check` PASS for new + modified backend files. `tsc --noEmit` exit 0 for frontend.

### Smoke test (port 3006, admin@demo.com/demo123)

```
POST /api/auth/login                          → 200 + JWT
GET  /api/dashboard/stats  (Bearer)           → 200 (kpis populated, 1 audit row)
GET  /api/dashboard/stats  (no token)         → 401
```

Backend cleaned up after test (port 3006 clear).

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/dashboard_counter-swarm-defense.md`.

## Apply 3 — merge_ai (2026-05-07)

**Action:** MERGED duplicate AI sidebar entries into a single tabbed AI Center. The previous `/ai-extras` page (5 tools) is folded into `/ai` AICenter as additional tabs alongside the original 4 tools (9 total).

### Frontend changes

- `components/AICenter.tsx` rewritten with a 9-tab interface; only the selected panel renders. All 27 sample-prefill buttons preserved (each with [DRILL]/[TRAINING]/[SIMULATION] tag).
- `components/Layout.tsx` — removed "AI Tools+" link; renamed remaining "AI Tools" to "AI Center".
- `App.tsx` — removed `AIExtrasPage` import; `/ai-extras` now redirects to `/ai` via `<Navigate to="/ai" replace />`.
- `pages/AIExtrasPage.tsx` — deleted.

### Constraints

- Backend `DEFENSIVE_FRAMING` constant in `backend/routes/aiExtras.js` untouched (still 2 occurrences). All `/api/ai/*` and `/api/ai-extras/*` endpoints untouched.
- No `npm install`.

### Verification

- `tsc --noEmit -p .` exit 0.
- `vite build` clean (1489 modules, 1.36s).
- Backend on port 3006: `POST /api/auth/login` (admin@demo.com / demo123) → 200 + JWT.
- Cleanup: backend killed, port 3006 clear, `dist/` removed.

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/merge_ai_counter-swarm-defense.md`.
