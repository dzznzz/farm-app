create table harvest_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  farm_id uuid references farms(id) on delete cascade,
  crop_type text,
  note text not null,
  created_at timestamptz default now()
);
alter table harvest_notes enable row level security;
create policy "Users own harvest notes" on harvest_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table other_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  farm_id uuid references farms(id) on delete cascade,
  crop_type text,
  note text not null,
  created_at timestamptz default now()
);
alter table other_notes enable row level security;
create policy "Users own other notes" on other_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
