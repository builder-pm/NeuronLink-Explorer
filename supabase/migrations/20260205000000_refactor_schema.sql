-- Refactor Schema for NeuronLink Lakehouse (Phase 1)

-- 1. Metrics Library
-- Stores "Global" metric definitions that can be reused across use cases.
create table if not exists metrics_library (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  formula text not null, -- e.g. "SUM(sales) - SUM(cost)"
  description text,
  created_by uuid references auth.users(id),
  category text -- Optional grouping for library
);

-- 2. Model Metrics
-- Links a Use Case (Configuration) to specific Metrics from the library.
create table if not exists model_metrics (
  id uuid default gen_random_uuid() primary key,
  config_id uuid references configurations(id) on delete cascade not null,
  metric_id uuid references metrics_library(id) on delete cascade not null,
  display_name text, -- Optional override for this specific use case
  is_active boolean default true,
  unique(config_id, metric_id)
);

-- 3. Model Context (AI Context Layer)
-- Stores the "Enumerated Values" for specific fields to help the AI Analyst.
create table if not exists model_context (
  id uuid default gen_random_uuid() primary key,
  config_id uuid references configurations(id) on delete cascade not null,
  table_name text not null,
  field_name text not null,
  
  -- The scanned distinct values (e.g. ['North', 'South', 'East'])
  distinct_values jsonb default '[]'::jsonb,
  
  -- Metadata for the AI
  description text,
  last_scanned_at timestamp with time zone,
  
  unique(config_id, table_name, field_name)
);

-- 4. User Analyses (Saved Views)
-- Stores the "Business User" pivot/filter configurations.
create table if not exists user_analyses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  config_id uuid references configurations(id) not null, -- The parent Use Case
  
  name text not null,
  description text,
  
  -- The exact state of the Analysis View
  pivot_config jsonb default '{}'::jsonb, -- Rows, Cols, Values
  filter_state jsonb default '[]'::jsonb, -- Active Filters
  
  is_public boolean default false -- If true, other business users can see it
);

-- 5. Update Configurations Table
-- Add JSONB columns for the new "Master User" features.

-- Aliases: Key-Value map of { "t1.field": "Friendly Name" }
alter table configurations 
add column if not exists aliases jsonb default '{}'::jsonb;

-- Groups: Tree structure for sidebar folders { "Customer": ["t1.name", "t1.email"] }
alter table configurations 
add column if not exists groups jsonb default '{}'::jsonb;

-- Metric Definitions (Inline): 
-- If we want use-case specific metrics WITHOUT the library (Simpler option)
alter table configurations 
add column if not exists inline_metrics jsonb default '[]'::jsonb;

-- Enable RLS (Row Level Security)
alter table metrics_library enable row level security;
alter table model_metrics enable row level security;
alter table model_context enable row level security;
alter table user_analyses enable row level security;

-- Policies (Simple "Authenticated Users" policy for now)
create policy "Enable all access for authenticated users" 
on metrics_library for all 
to authenticated 
using (true) 
with check (true);

create policy "Enable all access for authenticated users" 
on model_metrics for all 
to authenticated 
using (true) 
with check (true);

create policy "Enable all access for authenticated users" 
on model_context for all 
to authenticated 
using (true) 
with check (true);

create policy "Enable all access for authenticated users" 
on user_analyses for all 
to authenticated 
using (true) 
with check (true);
