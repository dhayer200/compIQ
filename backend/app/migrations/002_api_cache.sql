CREATE TABLE IF NOT EXISTS api_cache (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint   TEXT NOT NULL,
    address    TEXT NOT NULL,
    response   JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_cache_lookup
    ON api_cache(endpoint, address);
