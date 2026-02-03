-- Create User Usage Tracking Table
create table if not exists public.user_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text, -- Used for Guest tracking
  query_count integer default 0,
  reset_date date default current_date not null,
  last_query_at timestamp with time zone default now(),
  unique(user_id, reset_date),
  unique(ip_address, reset_date)
);

-- Enable RLS
alter table public.user_usage enable row level security;

-- Index for performance
create index if not exists idx_user_usage_reset_date on public.user_usage(reset_date);
create index if not exists idx_user_usage_ip on public.user_usage(ip_address);
create index if not exists idx_user_usage_user on public.user_usage(user_id);

-- Policies
-- Anon users can insert/update usage for their own IP
create policy "Allow anon usage tracking"
    on public.user_usage for all
    using (auth.role() = 'anon' or auth.role() = 'authenticated')
    with check (true);

-- Note: In a production app, you'd restrict this with a trigger or edge function 
-- to prevent users from tampering with their own counts.
-- For this implementation, we follow the Agent Lab pattern.

grant all on public.user_usage to anon, authenticated;
