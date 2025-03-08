-- Add a policy to allow service role to insert new users
create policy "Service role can insert users"
    on public.users
    for insert
    to service_role
    with check (true);

-- Add a policy to allow service role to read all users
create policy "Service role can read all users"
    on public.users
    for select
    to service_role
    using (true);

-- Add a policy to allow service role to update all users
create policy "Service role can update all users"
    on public.users
    for update
    to service_role
    using (true);

-- Add a policy to allow anonymous users to read select user data
create policy "Public can view user names and pictures"
    on public.users
    for select
    using (true);

-- Down Migration (in case we need to rollback)
-- To rollback, uncomment and run these commands:
/*
drop policy if exists "Service role can insert users" on public.users;
drop policy if exists "Service role can read all users" on public.users;
drop policy if exists "Service role can update all users" on public.users;
drop policy if exists "Public can view user names and pictures" on public.users;
*/ 