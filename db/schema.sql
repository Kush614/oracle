-- Oracle warm store (spec §4.2).
--
-- This runs on any Postgres, designed for Ghost.build:
--
--   curl -fsSL https://install.ghost.build/ | sh
--   ghost login
--   ghost create oracle
--   ghost sql oracle -f db/schema.sql
--
-- pgvector is optional; only needed if you enable semantic search across
-- resolution narratives. Remove the create-extension line if your Ghost
-- instance doesn't have it preinstalled.

create extension if not exists pgcrypto;

-- Uncomment if your Ghost database has pgvector:
-- create extension if not exists "vector";

create table if not exists markets (
  market_id text primary key,
  question text not null,
  category text not null,
  source_urls jsonb not null,
  close_time timestamptz not null,
  created_at timestamptz not null default now(),
  stage text not null,
  cycle smallint not null default 1,
  odds_yes numeric not null default 0.5,
  confidence numeric not null default 0,
  outcome text not null default 'PENDING',
  resolved_at timestamptz,
  cited_md_hash text,
  ghost_url text,
  evidence_count integer not null default 0
);

-- Note: market_id on resolution-side tables is a soft reference, not an FK.
-- Live market state is owned by Redis (spec §4.2 "Hot layer"); Ghost holds
-- the post-resolution record. Decoupling means the warm store can ingest
-- resolutions without needing a synchronized copy of every hot-layer market.

create table if not exists evidence_objects (
  evidence_id text primary key,
  market_id text not null,
  source text not null,
  source_type text not null,
  event text not null,
  timestamp timestamptz not null,
  confidence numeric not null,
  fetched_by text not null,
  normalized_by text not null,
  artifact_ref text not null,
  supports text not null,
  created_at timestamptz not null default now()
  -- embedding vector(384)   -- enable with pgvector
);

create index if not exists evidence_market_idx on evidence_objects (market_id);
create index if not exists evidence_conf_idx on evidence_objects (confidence desc);

create table if not exists resolutions (
  market_id text primary key,
  cycle smallint not null,
  outcome text not null,
  confidence numeric not null,
  narrative text not null,
  cited_sources jsonb not null,
  resolver_agent text not null,
  resolver_image text not null,
  resolver_digest text not null,
  resolved_at timestamptz not null,
  sbom_ref text not null
);

create table if not exists challenge_records (
  market_id text not null,
  cycle smallint not null,
  challenger_agent text not null,
  counter_sources_found integer not null,
  max_contradiction_confidence numeric not null,
  threshold numeric not null,
  result text not null,
  notes text,
  ran_at timestamptz not null,
  primary key (market_id, cycle)
);

create table if not exists agent_runs (
  run_id text primary key,
  agent text not null,
  market_id text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  outcome text not null,
  confidence numeric,
  inputs_ref text,
  outputs_ref text
);

create table if not exists agent_scores (
  agent text primary key,
  verdict_accuracy numeric not null default 0,
  citation_coverage numeric not null default 0,
  confidence_calibration numeric not null default 0,
  resolution_latency_ms numeric not null default 0,
  challenge_success_rate numeric,
  runs integer not null default 0
);

create table if not exists cited_md (
  market_id text primary key,
  markdown text not null,
  hash text not null,
  visibility text not null default 'members',
  published_at timestamptz not null default now()
);

create table if not exists paper_balances (
  user_id text primary key,
  balance numeric not null default 0
);

create table if not exists paper_positions (
  user_id text not null,
  market_id text not null,
  side text not null,
  shares numeric not null,
  avg_price numeric not null,
  primary key (user_id, market_id)
);
