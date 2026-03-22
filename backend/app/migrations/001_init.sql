CREATE TABLE IF NOT EXISTS properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address         TEXT NOT NULL,
    city            TEXT,
    state           TEXT,
    zip_code        TEXT,
    county          TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    property_type   TEXT,
    bedrooms        INTEGER,
    bathrooms       NUMERIC(3,1),
    sqft            INTEGER,
    lot_size        INTEGER,
    year_built      INTEGER,
    last_sale_date  DATE,
    last_sale_price INTEGER,
    raw_api_data    JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analyses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_property_id UUID REFERENCES properties(id),
    estimated_value     INTEGER,
    value_range_low     INTEGER,
    value_range_high    INTEGER,
    estimated_rent      INTEGER,
    rent_range_low      INTEGER,
    rent_range_high     INTEGER,
    est_days_on_market  INTEGER,
    adjustments_json    JSONB,
    narrative_text      TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comp_properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id     UUID REFERENCES analyses(id),
    address         TEXT NOT NULL,
    sale_price      INTEGER,
    sale_date       DATE,
    bedrooms        INTEGER,
    bathrooms       NUMERIC(3,1),
    sqft            INTEGER,
    lot_size        INTEGER,
    year_built      INTEGER,
    distance_miles  NUMERIC(4,2),
    correlation     NUMERIC(3,2),
    adjusted_price  INTEGER,
    adjustments     JSONB,
    raw_api_data    JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_address ON properties(address);
CREATE INDEX IF NOT EXISTS idx_analyses_subject ON analyses(subject_property_id);
CREATE INDEX IF NOT EXISTS idx_comp_properties_analysis ON comp_properties(analysis_id);
