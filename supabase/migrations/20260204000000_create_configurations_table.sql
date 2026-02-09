-- Create configurations table
create table public.configurations (
  id uuid not null default gen_random_uuid (),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  description text null,
  type text not null check (type in ('db_config', 'analysis_config')),
  config jsonb not null,
  is_public boolean default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint configurations_pkey primary key (id)
);

-- Enable RLS
alter table public.configurations enable row level security;

-- Policies

-- Everyone can read public configurations
create policy "Public configurations are viewable by everyone"
  on public.configurations for select
  using (is_public = true);

-- Users can read their own configurations
create policy "Users can view their own configurations"
  on public.configurations for select
  using (auth.uid() = user_id);

-- Users can insert their own configurations
create policy "Users can insert their own configurations"
  on public.configurations for insert
  with check (auth.uid() = user_id);

-- Users can update their own configurations
create policy "Users can update their own configurations"
  on public.configurations for update
  using (auth.uid() = user_id);

-- Users can delete their own configurations
create policy "Users can delete their own configurations"
  on public.configurations for delete
  using (auth.uid() = user_id);

-- Add indexes
create index configurations_user_id_idx on public.configurations (user_id);
create index configurations_type_idx on public.configurations (type);
create index configurations_is_public_idx on public.configurations (is_public);
