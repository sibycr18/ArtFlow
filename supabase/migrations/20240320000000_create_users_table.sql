-- Create users table
create table if not exists public.users (
    id uuid default uuid_generate_v4() primary key,
    email text unique not null,
    name text not null,
    picture text,
    google_id text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_login timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Users can read their own data"
    on public.users
    for select
    using (auth.uid() = id);

create policy "Users can update their own data"
    on public.users
    for update
    using (auth.uid() = id);

-- Create indexes for performance
create index if not exists users_email_idx on public.users (email);
create index if not exists users_google_id_idx on public.users (google_id);

---- Create a function to handle user updates
create or replace function public.handle_user_update()
returns trigger as $$
begin
    new.last_login = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to automatically update last_login
create trigger on_user_update
    before update on public.users
    for each row
    execute function public.handle_user_update();

-- Down Migration (in case we need to rollback)
-- To rollback, uncomment and run these commands:
/*
drop trigger if exists on_user_update on public.users;
drop function if exists public.handle_user_update();
drop policy if exists "Users can update their own data" on public.users;
drop policy if exists "Users can read their own data" on public.users;
drop table if exists public.users;
*/ 