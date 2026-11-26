-- PostgREST only exposes the public schema. These wrappers let the server (service role)
-- call the rate-limit helpers; nobody else can execute them.

create or replace function public.hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean
language sql security invoker set search_path = '' as $$ select app.hit_rate_limit(p_key, p_window_seconds, p_max) $$;

create or replace function public.purge_rate_limits() returns void
language sql security invoker set search_path = '' as $$ select app.purge_rate_limits() $$;

revoke all on function public.hit_rate_limit(text, int, int), public.purge_rate_limits() from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int), public.purge_rate_limits() to service_role;
