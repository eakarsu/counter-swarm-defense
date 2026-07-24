CREATE TABLE IF NOT EXISTS runtime_ai_results (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider = 'openrouter'),
  provider_receipt TEXT NOT NULL,
  result TEXT NOT NULL,
  usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS runtime_ai_results_tenant_time_idx
  ON runtime_ai_results(tenant_id, created_at DESC);
