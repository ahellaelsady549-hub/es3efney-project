create table if not exists public.student_learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('task','session','mastery','resource')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_learning_items_user_type_updated_idx
  on public.student_learning_items (user_id, item_type, updated_at desc);

alter table public.student_learning_items enable row level security;
create policy "Students manage their own learning items"
  on public.student_learning_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
