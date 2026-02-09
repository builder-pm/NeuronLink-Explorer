-- Create chat_threads table
create table if not exists chat_threads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create chat_messages table
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references chat_threads(id) on delete cascade not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;

-- Policies for chat_threads
create policy "Users can view their own threads"
  on chat_threads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own threads"
  on chat_threads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own threads"
  on chat_threads for update
  using (auth.uid() = user_id);

create policy "Users can delete their own threads"
  on chat_threads for delete
  using (auth.uid() = user_id);

-- Policies for chat_messages
create policy "Users can view messages in their threads"
  on chat_messages for select
  using (
    exists (
      select 1 from chat_threads
      where id = chat_messages.thread_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their threads"
  on chat_messages for insert
  with check (
    exists (
      select 1 from chat_threads
      where id = chat_messages.thread_id
      and user_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists idx_chat_threads_user_id on chat_threads(user_id);
create index if not exists idx_chat_messages_thread_id on chat_messages(thread_id);
