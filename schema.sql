-- Shares table for short links
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game mappings table
CREATE TABLE IF NOT EXISTS game_mappings (
  id BIGSERIAL PRIMARY KEY,
  game_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_name)
);

-- Game mapping usage table
CREATE TABLE IF NOT EXISTS game_mapping_usage (
  id BIGSERIAL PRIMARY KEY,
  game_name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_name, app_id)
);

-- Game prices table
CREATE TABLE IF NOT EXISTS game_prices (
  id BIGSERIAL PRIMARY KEY,
  app_id TEXT NOT NULL,
  region TEXT NOT NULL,
  price NUMERIC,
  discount NUMERIC,
  original_price NUMERIC,
  currency TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(app_id, region)
);
