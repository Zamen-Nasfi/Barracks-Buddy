-- Trigger functions: not callable by API roles at all
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.audit_logs_immutable() from public, anon, authenticated;
revoke execute on function public.protect_last_super_admin() from public, anon, authenticated;
revoke execute on function public.apply_inventory_transaction() from public, anon, authenticated;
revoke execute on function public.enforce_leave_rules() from public, anon, authenticated;
revoke execute on function public.enforce_room_assignment() from public, anon, authenticated;
revoke execute on function public.guard_inventory_quantity() from public, anon, authenticated;
revoke execute on function public.inventory_tx_immutable() from public, anon, authenticated;
revoke execute on function public.prevent_personnel_hard_delete() from public, anon, authenticated;
revoke execute on function public.enforce_personnel_archive() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
-- Helpers: signed-in only
revoke execute on function public.has_permission(uuid, text) from public, anon;
grant execute on function public.has_permission(uuid, text) to authenticated, service_role;
revoke execute on function public.has_role(uuid, text) from public, anon;
grant execute on function public.has_role(uuid, text) to authenticated, service_role;
revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.my_permissions() to authenticated, service_role;
revoke execute on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated, service_role;
-- system_bootstrapped: only exposes a yes/no flag; needed by the sign-in page before login
revoke execute on function public.system_bootstrapped() from public;
grant execute on function public.system_bootstrapped() to anon, authenticated, service_role;