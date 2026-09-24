-- ============ ENUMS ============
create type public.personnel_status as enum ('ACTIVE','ON_LEAVE','TRANSFERRED','RETIRED','ARCHIVED');
create type public.attendance_status as enum ('PRESENT','ABSENT','LATE','ON_LEAVE','MISSION','SICK');
create type public.leave_type as enum ('ANNUAL','SICK','EMERGENCY','SPECIAL');
create type public.leave_status as enum ('PENDING','APPROVED','REJECTED','CANCELLED');
create type public.maintenance_status as enum ('OPEN','IN_PROGRESS','RESOLVED','CLOSED','REJECTED');
create type public.maintenance_priority as enum ('LOW','MEDIUM','HIGH','URGENT');
create type public.inventory_tx_type as enum ('IN','OUT','ADJUSTMENT');
create type public.meal_type as enum ('BREAKFAST','LUNCH','DINNER');

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ============ IDENTITY / RBAC ============
create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text not null default '',
  is_active boolean not null default true,
  locale text not null default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  name_fr text,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.roles to authenticated;
grant all on public.roles to service_role;
alter table public.roles enable row level security;

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module text not null,
  name_ar text not null,
  name_en text not null,
  name_fr text
);
grant select on public.permissions to authenticated;
grant all on public.permissions to service_role;
alter table public.permissions enable row level security;

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
grant select, insert, update, delete on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_permission(_user_id uuid, _perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    join public.profiles pr on pr.id = ur.user_id
    where ur.user_id = _user_id and p.code = _perm and pr.is_active
  )
$$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles pr on pr.id = ur.user_id
    where ur.user_id = _user_id and r.code = _role and pr.is_active
  )
$$;

create or replace function public.my_permissions()
returns setof text language sql stable security definer set search_path = public as $$
  select distinct p.code from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.profiles pr on pr.id = ur.user_id
  where ur.user_id = auth.uid() and pr.is_active
$$;

create or replace function public.system_bootstrapped()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles)
$$;

-- ============ AUDIT ============
create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
grant usage, select on sequence public.audit_logs_id_seq to authenticated, service_role;
alter table public.audit_logs enable row level security;
create policy "audit_read" on public.audit_logs for select to authenticated
  using (public.has_permission(auth.uid(), 'audit.read'));

create or replace function public.audit_logs_immutable() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'AUDIT_LOGS_IMMUTABLE: audit logs cannot be modified or deleted'; end $$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

create or replace function public.log_audit(_action text, _entity_type text, _entity_id text,
  _old jsonb default null, _new jsonb default null, _meta jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, old_data, new_data, metadata)
  values (auth.uid(), coalesce(auth.jwt()->>'email', _meta->>'actor_email'), _action, _entity_type, _entity_id, _old, _new, _meta);
end $$;
revoke execute on function public.log_audit(text,text,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.log_audit(text,text,text,jsonb,jsonb,jsonb) to authenticated, service_role;

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb; v_id text;
begin
  if tg_op = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;
  v_id := coalesce(j->>'id', (j->>'role_id') || ':' || (j->>'permission_id'));
  insert into public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), auth.jwt()->>'email', tg_table_name || '.' || lower(tg_op), tg_table_name, v_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- ============ BOOTSTRAP ============
create or replace function public.bootstrap_profile()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; v_name text; v_role uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_email := coalesce(auth.jwt()->>'email', '');
  v_name := coalesce(nullif(auth.jwt()->'user_metadata'->>'full_name',''), split_part(v_email,'@',1));
  insert into public.profiles(id, email, full_name) values (v_uid, v_email, v_name)
  on conflict (id) do update set email = excluded.email;
  if not exists (select 1 from public.user_roles) then
    select id into v_role from public.roles where code = 'SUPER_ADMIN';
    insert into public.user_roles(user_id, role_id, assigned_by) values (v_uid, v_role, v_uid);
    perform public.log_audit('auth.bootstrap_super_admin', 'user_roles', v_uid::text, null, jsonb_build_object('email', v_email));
  end if;
end $$;
revoke execute on function public.bootstrap_profile() from public, anon;
grant execute on function public.bootstrap_profile() to authenticated, service_role;

create or replace function public.protect_last_super_admin() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sa uuid; v_cnt int;
begin
  select id into v_sa from public.roles where code = 'SUPER_ADMIN';
  if old.role_id = v_sa then
    select count(*) into v_cnt from public.user_roles ur join public.profiles p on p.id = ur.user_id
      where ur.role_id = v_sa and ur.id <> old.id and p.is_active;
    if v_cnt = 0 then raise exception 'LAST_SUPER_ADMIN: cannot remove the last active SUPER_ADMIN'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
create trigger user_roles_protect_sa before update or delete on public.user_roles
  for each row execute function public.protect_last_super_admin();

-- RBAC policies
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_permission(auth.uid(), 'users.read'));
create policy "profiles_update" on public.profiles for update to authenticated
  using (public.has_permission(auth.uid(), 'users.manage'));
create policy "roles_select" on public.roles for select to authenticated using (true);
create policy "roles_manage" on public.roles for all to authenticated
  using (public.has_permission(auth.uid(), 'roles.manage')) with check (public.has_permission(auth.uid(), 'roles.manage'));
create policy "permissions_select" on public.permissions for select to authenticated using (true);
create policy "role_permissions_select" on public.role_permissions for select to authenticated using (true);
create policy "role_permissions_manage" on public.role_permissions for all to authenticated
  using (public.has_permission(auth.uid(), 'roles.manage')) with check (public.has_permission(auth.uid(), 'roles.manage'));
create policy "user_roles_select" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'users.read'));
create policy "user_roles_manage" on public.user_roles for all to authenticated
  using (public.has_permission(auth.uid(), 'users.manage')) with check (public.has_permission(auth.uid(), 'users.manage'));

-- ============ UNITS & PERSONNEL ============
create table public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  name_fr text,
  unit_type text not null default 'COMPANY',
  parent_id uuid references public.units(id) on delete set null,
  location text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.units to authenticated;
grant all on public.units to service_role;
alter table public.units enable row level security;
create policy "units_select" on public.units for select to authenticated using (true);
create policy "units_insert" on public.units for insert to authenticated with check (public.has_permission(auth.uid(), 'units.manage'));
create policy "units_update" on public.units for update to authenticated using (public.has_permission(auth.uid(), 'units.manage'));
create policy "units_delete" on public.units for delete to authenticated using (public.has_permission(auth.uid(), 'units.manage'));
create trigger units_updated_at before update on public.units for each row execute function public.set_updated_at();

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  personnel_number text not null unique,
  first_name text not null,
  last_name text not null,
  father_name text,
  rank text not null,
  unit_id uuid references public.units(id) on delete restrict,
  status public.personnel_status not null default 'ACTIVE',
  date_of_birth date,
  enlistment_date date,
  phone text,
  email text,
  blood_type text,
  address text,
  notes text,
  is_demo boolean not null default false,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.personnel to authenticated;
grant all on public.personnel to service_role;
alter table public.personnel enable row level security;
create policy "personnel_select" on public.personnel for select to authenticated using (public.has_permission(auth.uid(), 'personnel.read'));
create policy "personnel_insert" on public.personnel for insert to authenticated with check (public.has_permission(auth.uid(), 'personnel.create'));
create policy "personnel_update" on public.personnel for update to authenticated using (public.has_permission(auth.uid(), 'personnel.update'));
-- No DELETE policy on personnel: hard delete is impossible through the API.
create trigger personnel_updated_at before update on public.personnel for each row execute function public.set_updated_at();

alter table public.units add column commander_personnel_id uuid references public.personnel(id) on delete set null;

create or replace function public.enforce_personnel_archive() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'ARCHIVED' and new.archived_at is null then new.archived_at := now(); end if;
  if new.status <> 'ARCHIVED' then new.archived_at := null; end if;
  return new;
end $$;
create trigger personnel_archive before insert or update on public.personnel for each row execute function public.enforce_personnel_archive();

-- ============ ATTENDANCE & LEAVE ============
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references public.personnel(id) on delete restrict,
  record_date date not null,
  status public.attendance_status not null,
  check_in time,
  check_out time,
  notes text,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  unique (personnel_id, record_date)
);
grant select, insert, update, delete on public.attendance_records to authenticated;
grant all on public.attendance_records to service_role;
alter table public.attendance_records enable row level security;
create policy "attendance_select" on public.attendance_records for select to authenticated using (public.has_permission(auth.uid(), 'attendance.read'));
create policy "attendance_manage" on public.attendance_records for all to authenticated
  using (public.has_permission(auth.uid(), 'attendance.manage')) with check (public.has_permission(auth.uid(), 'attendance.manage'));

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references public.personnel(id) on delete restrict,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status public.leave_status not null default 'PENDING',
  requested_by uuid,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_valid check (end_date >= start_date)
);
grant select, insert, update, delete on public.leave_requests to authenticated;
grant all on public.leave_requests to service_role;
alter table public.leave_requests enable row level security;
create policy "leave_select" on public.leave_requests for select to authenticated using (public.has_permission(auth.uid(), 'leave.read'));
create policy "leave_insert" on public.leave_requests for insert to authenticated with check (public.has_permission(auth.uid(), 'leave.create'));
create policy "leave_update" on public.leave_requests for update to authenticated
  using (public.has_permission(auth.uid(), 'leave.create') or public.has_permission(auth.uid(), 'leave.approve'));
create trigger leave_updated_at before update on public.leave_requests for each row execute function public.set_updated_at();

create or replace function public.enforce_leave_rules() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- system / seed / service context
  if tg_op = 'INSERT' then
    if new.status in ('APPROVED','REJECTED') and not public.has_permission(auth.uid(), 'leave.approve') then
      raise exception 'LEAVE_APPROVE_FORBIDDEN: only users with leave.approve may approve or reject';
    end if;
    if new.requested_by is null then new.requested_by := auth.uid(); end if;
  elsif new.status is distinct from old.status and new.status in ('APPROVED','REJECTED') then
    if not public.has_permission(auth.uid(), 'leave.approve') then
      raise exception 'LEAVE_APPROVE_FORBIDDEN: only users with leave.approve may approve or reject';
    end if;
    new.decided_by := auth.uid(); new.decided_at := now();
  end if;
  return new;
end $$;
create trigger leave_rules before insert or update on public.leave_requests for each row execute function public.enforce_leave_rules();

-- ============ HOUSING ============
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  floors int not null default 1,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.buildings to authenticated;
grant all on public.buildings to service_role;
alter table public.buildings enable row level security;
create policy "buildings_select" on public.buildings for select to authenticated using (public.has_permission(auth.uid(), 'housing.read'));
create policy "buildings_manage" on public.buildings for all to authenticated
  using (public.has_permission(auth.uid(), 'housing.manage')) with check (public.has_permission(auth.uid(), 'housing.manage'));

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete restrict,
  room_number text not null,
  floor int not null default 0,
  capacity int not null check (capacity > 0),
  room_type text not null default 'DORM',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, room_number)
);
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "rooms_select" on public.rooms for select to authenticated using (public.has_permission(auth.uid(), 'housing.read'));
create policy "rooms_manage" on public.rooms for all to authenticated
  using (public.has_permission(auth.uid(), 'housing.manage')) with check (public.has_permission(auth.uid(), 'housing.manage'));

create table public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  personnel_id uuid not null references public.personnel(id) on delete restrict,
  started_at date not null default current_date,
  ended_at date,
  assigned_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  constraint assignment_dates_valid check (ended_at is null or ended_at >= started_at)
);
create unique index room_assignments_one_active_per_person on public.room_assignments(personnel_id) where ended_at is null;
grant select, insert, update, delete on public.room_assignments to authenticated;
grant all on public.room_assignments to service_role;
alter table public.room_assignments enable row level security;
create policy "room_assignments_select" on public.room_assignments for select to authenticated using (public.has_permission(auth.uid(), 'housing.read'));
create policy "room_assignments_manage" on public.room_assignments for all to authenticated
  using (public.has_permission(auth.uid(), 'housing.manage')) with check (public.has_permission(auth.uid(), 'housing.manage'));

create or replace function public.enforce_room_assignment() returns trigger
language plpgsql set search_path = public as $$
declare v_room public.rooms%rowtype; v_count int;
begin
  if new.ended_at is not null then return new; end if;
  select * into v_room from public.rooms where id = new.room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not v_room.is_active then raise exception 'ROOM_INACTIVE: inactive rooms cannot receive assignments'; end if;
  select count(*) into v_count from public.room_assignments
    where room_id = new.room_id and ended_at is null and id <> new.id;
  if v_count >= v_room.capacity then raise exception 'ROOM_FULL: room capacity (%) exceeded', v_room.capacity; end if;
  return new;
end $$;
create trigger room_assignment_rules before insert or update on public.room_assignments for each row execute function public.enforce_room_assignment();

-- ============ INVENTORY (non-sensitive) ============
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name_ar text not null,
  name_en text,
  category text not null default 'GENERAL',
  unit_of_measure text not null default 'piece',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  min_quantity numeric(12,2) not null default 0,
  location text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.inventory_items to authenticated;
grant all on public.inventory_items to service_role;
alter table public.inventory_items enable row level security;
create policy "inventory_items_select" on public.inventory_items for select to authenticated using (public.has_permission(auth.uid(), 'inventory.read'));
create policy "inventory_items_insert" on public.inventory_items for insert to authenticated with check (public.has_permission(auth.uid(), 'inventory.manage'));
create policy "inventory_items_update" on public.inventory_items for update to authenticated using (public.has_permission(auth.uid(), 'inventory.manage'));
create trigger inventory_items_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();

create or replace function public.guard_inventory_quantity() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.quantity <> 0 then
    raise exception 'INVENTORY_DIRECT_CHANGE: opening stock must be recorded as an IN transaction';
  end if;
  if tg_op = 'UPDATE' and new.quantity is distinct from old.quantity
     and coalesce(current_setting('bms.inventory_tx', true), '') <> 'on' then
    raise exception 'INVENTORY_DIRECT_CHANGE: stock can only change through inventory_transactions';
  end if;
  return new;
end $$;
create trigger inventory_quantity_guard before insert or update on public.inventory_items for each row execute function public.guard_inventory_quantity();

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  tx_type public.inventory_tx_type not null,
  quantity numeric(12,2) not null,
  reference text,
  notes text,
  performed_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.inventory_transactions to authenticated;
grant all on public.inventory_transactions to service_role;
alter table public.inventory_transactions enable row level security;
create policy "inventory_tx_select" on public.inventory_transactions for select to authenticated using (public.has_permission(auth.uid(), 'inventory.read'));
create policy "inventory_tx_insert" on public.inventory_transactions for insert to authenticated with check (public.has_permission(auth.uid(), 'inventory.manage'));

create or replace function public.apply_inventory_transaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_delta numeric; v_new numeric;
begin
  if new.tx_type in ('IN','OUT') and new.quantity <= 0 then
    raise exception 'INVENTORY_INVALID_QTY: IN/OUT quantity must be positive';
  end if;
  v_delta := case new.tx_type when 'IN' then new.quantity when 'OUT' then -new.quantity else new.quantity end;
  if new.performed_by is null then new.performed_by := auth.uid(); end if;
  perform set_config('bms.inventory_tx', 'on', true);
  update public.inventory_items set quantity = quantity + v_delta where id = new.item_id returning quantity into v_new;
  perform set_config('bms.inventory_tx', 'off', true);
  if v_new is null then raise exception 'INVENTORY_ITEM_NOT_FOUND'; end if;
  if v_new < 0 then raise exception 'INVENTORY_NEGATIVE: stock cannot be negative'; end if;
  return new;
end $$;
create trigger inventory_tx_apply before insert on public.inventory_transactions for each row execute function public.apply_inventory_transaction();

create or replace function public.inventory_tx_immutable() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'INVENTORY_TX_IMMUTABLE: use a correcting transaction instead'; end $$;
create trigger inventory_tx_no_change before update or delete on public.inventory_transactions for each row execute function public.inventory_tx_immutable();

-- ============ MAINTENANCE ============
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  building_id uuid references public.buildings(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  location_text text,
  priority public.maintenance_priority not null default 'MEDIUM',
  status public.maintenance_status not null default 'OPEN',
  requested_by uuid,
  assigned_to uuid,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.maintenance_requests to authenticated;
grant all on public.maintenance_requests to service_role;
alter table public.maintenance_requests enable row level security;
create policy "maintenance_select" on public.maintenance_requests for select to authenticated using (public.has_permission(auth.uid(), 'maintenance.read'));
create policy "maintenance_manage" on public.maintenance_requests for all to authenticated
  using (public.has_permission(auth.uid(), 'maintenance.manage')) with check (public.has_permission(auth.uid(), 'maintenance.manage'));
create trigger maintenance_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();

-- ============ MEALS ============
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  meal_type public.meal_type not null,
  menu_description text,
  planned_count int not null default 0,
  unit_id uuid references public.units(id) on delete set null,
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.meal_plans to authenticated;
grant all on public.meal_plans to service_role;
alter table public.meal_plans enable row level security;
create policy "meal_plans_select" on public.meal_plans for select to authenticated using (public.has_permission(auth.uid(), 'meals.read'));
create policy "meal_plans_manage" on public.meal_plans for all to authenticated
  using (public.has_permission(auth.uid(), 'meals.manage')) with check (public.has_permission(auth.uid(), 'meals.manage'));

create table public.meal_consumption (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  personnel_id uuid references public.personnel(id) on delete restrict,
  unit_id uuid references public.units(id) on delete set null,
  served_count int not null default 1 check (served_count > 0),
  recorded_by uuid,
  recorded_at timestamptz not null default now()
);
grant select, insert, update, delete on public.meal_consumption to authenticated;
grant all on public.meal_consumption to service_role;
alter table public.meal_consumption enable row level security;
create policy "meal_consumption_select" on public.meal_consumption for select to authenticated using (public.has_permission(auth.uid(), 'meals.read'));
create policy "meal_consumption_manage" on public.meal_consumption for all to authenticated
  using (public.has_permission(auth.uid(), 'meals.manage')) with check (public.has_permission(auth.uid(), 'meals.manage'));

-- ============ DOCUMENTS ============
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'GENERAL',
  storage_bucket text,
  file_path text,
  mime_type text,
  size_bytes bigint,
  personnel_id uuid references public.personnel(id) on delete restrict,
  unit_id uuid references public.units(id) on delete set null,
  is_protected boolean not null default false,
  is_public boolean not null default false,
  is_demo boolean not null default false,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protected_never_public check (not (is_protected and is_public))
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "documents_select" on public.documents for select to authenticated
  using (public.has_permission(auth.uid(), 'documents.read') and (not is_protected or public.has_permission(auth.uid(), 'documents.manage')));
create policy "documents_manage" on public.documents for all to authenticated
  using (public.has_permission(auth.uid(), 'documents.manage')) with check (public.has_permission(auth.uid(), 'documents.manage'));
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

-- ============ PERSONNEL HARD-DELETE GUARD ============
create or replace function public.prevent_personnel_hard_delete() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.attendance_records where personnel_id = old.id)
     or exists (select 1 from public.leave_requests where personnel_id = old.id)
     or exists (select 1 from public.room_assignments where personnel_id = old.id)
     or exists (select 1 from public.documents where personnel_id = old.id)
     or exists (select 1 from public.meal_consumption where personnel_id = old.id) then
    raise exception 'PERSONNEL_HAS_HISTORY: personnel with history cannot be deleted; archive instead';
  end if;
  return old;
end $$;
create trigger personnel_no_hard_delete before delete on public.personnel for each row execute function public.prevent_personnel_hard_delete();

-- ============ SEED: ROLES & PERMISSIONS ============
insert into public.roles (code, name_ar, name_en, name_fr, description) values
 ('SUPER_ADMIN','مدير النظام الأعلى','Super Administrator','Super administrateur','صلاحيات كاملة على النظام'),
 ('COMMAND_ADMIN','إداري القيادة','Command Administrator','Administrateur du commandement','إدارة عامة واعتماد الإجازات والتقارير'),
 ('PERSONNEL_OFFICER','ضابط الأفراد','Personnel Officer','Officier du personnel','إدارة ملفات الأفراد والحضور والوثائق'),
 ('LOGISTICS_OFFICER','ضابط الإمداد','Logistics Officer','Officier logistique','إدارة المخزون والإقامة'),
 ('MAINTENANCE_OFFICER','ضابط الصيانة','Maintenance Officer','Officier de maintenance','إدارة طلبات الصيانة'),
 ('MESS_OFFICER','ضابط الإعاشة','Mess Officer','Officier de l''ordinaire','إدارة خطط الوجبات والاستهلاك'),
 ('READ_ONLY','قراءة فقط','Read Only','Lecture seule','عرض البيانات دون تعديل');

insert into public.permissions (code, module, name_ar, name_en, name_fr) values
 ('users.read','admin','عرض المستخدمين','View users','Voir les utilisateurs'),
 ('users.manage','admin','إدارة المستخدمين','Manage users','Gérer les utilisateurs'),
 ('roles.read','admin','عرض الأدوار','View roles','Voir les rôles'),
 ('roles.manage','admin','إدارة الأدوار والصلاحيات','Manage roles & permissions','Gérer les rôles'),
 ('units.read','admin','عرض الوحدات','View units','Voir les unités'),
 ('units.manage','admin','إدارة الوحدات','Manage units','Gérer les unités'),
 ('audit.read','admin','عرض سجل التدقيق','View audit log','Voir le journal d''audit'),
 ('personnel.read','personnel','عرض الأفراد','View personnel','Voir le personnel'),
 ('personnel.create','personnel','إضافة أفراد','Create personnel','Créer du personnel'),
 ('personnel.update','personnel','تعديل الأفراد','Update personnel','Modifier le personnel'),
 ('personnel.archive','personnel','أرشفة الأفراد','Archive personnel','Archiver le personnel'),
 ('attendance.read','attendance','عرض الحضور','View attendance','Voir les présences'),
 ('attendance.manage','attendance','تسجيل الحضور','Manage attendance','Gérer les présences'),
 ('leave.read','leave','عرض الإجازات','View leave','Voir les congés'),
 ('leave.create','leave','تقديم طلبات إجازة','Create leave requests','Créer des demandes de congé'),
 ('leave.approve','leave','اعتماد/رفض الإجازات','Approve/reject leave','Approuver les congés'),
 ('housing.read','housing','عرض الإقامة','View housing','Voir l''hébergement'),
 ('housing.manage','housing','إدارة الإقامة','Manage housing','Gérer l''hébergement'),
 ('inventory.read','inventory','عرض المخزون','View inventory','Voir l''inventaire'),
 ('inventory.manage','inventory','إدارة المخزون','Manage inventory','Gérer l''inventaire'),
 ('maintenance.read','maintenance','عرض الصيانة','View maintenance','Voir la maintenance'),
 ('maintenance.manage','maintenance','إدارة الصيانة','Manage maintenance','Gérer la maintenance'),
 ('meals.read','meals','عرض الإعاشة','View meals','Voir les repas'),
 ('meals.manage','meals','إدارة الإعاشة','Manage meals','Gérer les repas'),
 ('documents.read','documents','عرض الوثائق','View documents','Voir les documents'),
 ('documents.manage','documents','إدارة الوثائق','Manage documents','Gérer les documents'),
 ('reports.read','reports','عرض التقارير','View reports','Voir les rapports');

-- SUPER_ADMIN: everything
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'SUPER_ADMIN';
-- COMMAND_ADMIN
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'COMMAND_ADMIN'
  and (p.code like '%.read' or p.code in ('personnel.create','personnel.update','personnel.archive','units.manage','leave.approve','leave.create','attendance.manage','documents.manage'));
-- PERSONNEL_OFFICER
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'PERSONNEL_OFFICER'
  and p.code in ('units.read','personnel.read','personnel.create','personnel.update','personnel.archive','attendance.read','attendance.manage','leave.read','leave.create','housing.read','documents.read','documents.manage','reports.read');
-- LOGISTICS_OFFICER
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'LOGISTICS_OFFICER'
  and p.code in ('units.read','personnel.read','housing.read','housing.manage','inventory.read','inventory.manage','maintenance.read','meals.read','reports.read');
-- MAINTENANCE_OFFICER
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'MAINTENANCE_OFFICER'
  and p.code in ('units.read','personnel.read','housing.read','inventory.read','maintenance.read','maintenance.manage','reports.read');
-- MESS_OFFICER
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'MESS_OFFICER'
  and p.code in ('units.read','personnel.read','attendance.read','inventory.read','meals.read','meals.manage','reports.read');
-- READ_ONLY
insert into public.role_permissions select r.id, p.id from public.roles r, public.permissions p where r.code = 'READ_ONLY'
  and p.code in ('units.read','personnel.read','attendance.read','leave.read','housing.read','inventory.read','maintenance.read','meals.read','documents.read','reports.read');

-- ============ SEED: DEMO DATA (clearly labelled) ============
insert into public.units (id, code, name_ar, name_en, name_fr, unit_type, parent_id, location, is_demo, notes) values
 ('a0000000-0000-4000-8000-000000000001','DEMO-HQ','[تجريبي] قيادة الثكنة','[DEMO] Barracks HQ','[DEMO] État-major','HQ',null,'المبنى الرئيسي',true,'بيانات تجريبية DEMO'),
 ('a0000000-0000-4000-8000-000000000002','DEMO-BN1','[تجريبي] الكتيبة الأولى','[DEMO] 1st Battalion','[DEMO] 1er Bataillon','BATTALION','a0000000-0000-4000-8000-000000000001','الجناح الشرقي',true,'بيانات تجريبية DEMO'),
 ('a0000000-0000-4000-8000-000000000003','DEMO-CO-A','[تجريبي] السرية أ','[DEMO] Company A','[DEMO] Compagnie A','COMPANY','a0000000-0000-4000-8000-000000000002','المبنى 2',true,'بيانات تجريبية DEMO'),
 ('a0000000-0000-4000-8000-000000000004','DEMO-CO-B','[تجريبي] السرية ب','[DEMO] Company B','[DEMO] Compagnie B','COMPANY','a0000000-0000-4000-8000-000000000002','المبنى 3',true,'بيانات تجريبية DEMO'),
 ('a0000000-0000-4000-8000-000000000005','DEMO-SVC','[تجريبي] سرية الخدمات والإسناد الإداري','[DEMO] Services Company','[DEMO] Compagnie des services','SERVICE','a0000000-0000-4000-8000-000000000001','المبنى 4',true,'بيانات تجريبية DEMO');

insert into public.personnel (id, personnel_number, first_name, last_name, father_name, rank, unit_id, status, date_of_birth, enlistment_date, phone, blood_type, is_demo, notes) values
 ('b0000000-0000-4000-8000-000000000001','DEMO-0001','أحمد','بن سالم','محمد','عقيد','a0000000-0000-4000-8000-000000000001','ACTIVE','1975-03-12','1996-09-01','+000 000 0001','O+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000002','DEMO-0002','خالد','المنصوري','علي','رائد','a0000000-0000-4000-8000-000000000002','ACTIVE','1982-07-04','2003-09-01','+000 000 0002','A+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000003','DEMO-0003','سامي','الطرابلسي','حسن','نقيب','a0000000-0000-4000-8000-000000000003','ACTIVE','1988-01-22','2009-09-01','+000 000 0003','B+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000004','DEMO-0004','ياسين','الجبالي','عمر','ملازم أول','a0000000-0000-4000-8000-000000000004','ACTIVE','1992-11-09','2013-09-01','+000 000 0004','O-',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000005','DEMO-0005','مروان','بوعزيزي','صالح','رقيب أول','a0000000-0000-4000-8000-000000000003','ACTIVE','1990-05-30','2010-03-01','+000 000 0005','AB+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000006','DEMO-0006','هيثم','الشريف','كمال','رقيب','a0000000-0000-4000-8000-000000000003','ON_LEAVE','1994-09-14','2014-03-01','+000 000 0006','A-',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000007','DEMO-0007','وليد','الحمروني','فتحي','عريف','a0000000-0000-4000-8000-000000000004','ACTIVE','1996-02-18','2016-03-01','+000 000 0007','O+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000008','DEMO-0008','أنيس','القاسمي','رشيد','عريف','a0000000-0000-4000-8000-000000000004','ACTIVE','1997-06-25','2017-03-01','+000 000 0008','B-',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000009','DEMO-0009','بلال','النفزاوي','منير','جندي أول','a0000000-0000-4000-8000-000000000005','ACTIVE','1999-10-02','2019-03-01','+000 000 0009','A+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000010','DEMO-0010','عماد','الزغلامي','نجيب','جندي','a0000000-0000-4000-8000-000000000005','ACTIVE','2001-04-11','2021-03-01','+000 000 0010','O+',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000011','DEMO-0011','رضا','العياري','لطفي','رقيب','a0000000-0000-4000-8000-000000000002','TRANSFERRED','1991-08-08','2011-03-01','+000 000 0011','AB-',true,'بيانات تجريبية DEMO'),
 ('b0000000-0000-4000-8000-000000000012','DEMO-0012','نزار','بن عمر','الهادي','جندي','a0000000-0000-4000-8000-000000000005','ARCHIVED','1998-12-01','2018-03-01','+000 000 0012','B+',true,'بيانات تجريبية DEMO - ملف مؤرشف');

update public.units set commander_personnel_id = 'b0000000-0000-4000-8000-000000000001' where id = 'a0000000-0000-4000-8000-000000000001';
update public.units set commander_personnel_id = 'b0000000-0000-4000-8000-000000000002' where id = 'a0000000-0000-4000-8000-000000000002';
update public.units set commander_personnel_id = 'b0000000-0000-4000-8000-000000000003' where id = 'a0000000-0000-4000-8000-000000000003';
update public.units set commander_personnel_id = 'b0000000-0000-4000-8000-000000000004' where id = 'a0000000-0000-4000-8000-000000000004';

insert into public.buildings (id, code, name_ar, name_en, floors, is_demo, notes) values
 ('c0000000-0000-4000-8000-000000000001','DEMO-B1','[تجريبي] مبنى الإقامة 1','[DEMO] Dormitory 1',2,true,'بيانات تجريبية DEMO'),
 ('c0000000-0000-4000-8000-000000000002','DEMO-B2','[تجريبي] مبنى الإقامة 2','[DEMO] Dormitory 2',1,true,'بيانات تجريبية DEMO');

insert into public.rooms (id, building_id, room_number, floor, capacity, room_type, is_active) values
 ('d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','101',1,4,'DORM',true),
 ('d0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','102',1,4,'DORM',true),
 ('d0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','201',2,2,'OFFICER',true),
 ('d0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000002','A1',0,6,'DORM',true),
 ('d0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000002','A2',0,6,'DORM',false);

insert into public.room_assignments (room_id, personnel_id, started_at, notes) values
 ('d0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','2025-01-10','DEMO'),
 ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','2025-01-10','DEMO'),
 ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000006','2025-01-10','DEMO'),
 ('d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000009','2025-02-01','DEMO'),
 ('d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000010','2025-02-01','DEMO');

insert into public.inventory_items (id, sku, name_ar, name_en, category, unit_of_measure, min_quantity, location, is_demo, notes) values
 ('e0000000-0000-4000-8000-000000000001','DEMO-BED-001','[تجريبي] سرير حديدي فردي','[DEMO] Single steel bed','FURNITURE','piece',10,'مخزن 1',true,'DEMO'),
 ('e0000000-0000-4000-8000-000000000002','DEMO-BLK-001','[تجريبي] بطانية صوف','[DEMO] Wool blanket','BEDDING','piece',50,'مخزن 1',true,'DEMO'),
 ('e0000000-0000-4000-8000-000000000003','DEMO-CLN-001','[تجريبي] مواد تنظيف (عبوة 5ل)','[DEMO] Cleaning detergent 5L','CLEANING','can',20,'مخزن 2',true,'DEMO'),
 ('e0000000-0000-4000-8000-000000000004','DEMO-OFF-001','[تجريبي] ورق طباعة A4','[DEMO] A4 paper ream','OFFICE','ream',30,'مكتب الإدارة',true,'DEMO'),
 ('e0000000-0000-4000-8000-000000000005','DEMO-KIT-001','[تجريبي] أرز (كيس 25كغ)','[DEMO] Rice 25kg bag','KITCHEN','bag',15,'مخزن المطبخ',true,'DEMO');

insert into public.inventory_transactions (item_id, tx_type, quantity, reference, notes) values
 ('e0000000-0000-4000-8000-000000000001','IN',60,'DEMO-OPEN','رصيد افتتاحي تجريبي'),
 ('e0000000-0000-4000-8000-000000000002','IN',200,'DEMO-OPEN','رصيد افتتاحي تجريبي'),
 ('e0000000-0000-4000-8000-000000000002','OUT',24,'DEMO-ISSUE-01','صرف للسرية أ'),
 ('e0000000-0000-4000-8000-000000000003','IN',40,'DEMO-OPEN','رصيد افتتاحي تجريبي'),
 ('e0000000-0000-4000-8000-000000000003','OUT',25,'DEMO-ISSUE-02','صرف شهري'),
 ('e0000000-0000-4000-8000-000000000004','IN',100,'DEMO-OPEN','رصيد افتتاحي تجريبي'),
 ('e0000000-0000-4000-8000-000000000005','IN',30,'DEMO-OPEN','رصيد افتتاحي تجريبي'),
 ('e0000000-0000-4000-8000-000000000005','OUT',18,'DEMO-KITCHEN','استهلاك المطبخ');

insert into public.maintenance_requests (title, description, building_id, room_id, location_text, priority, status, is_demo) values
 ('[تجريبي] تسرب مياه في الحمامات','تسرب في الطابق الأول','c0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','الطابق 1 - الحمام المشترك','HIGH','OPEN',true),
 ('[تجريبي] إصلاح إنارة الممر','مصابيح معطلة','c0000000-0000-4000-8000-000000000002',null,'الممر الرئيسي','MEDIUM','IN_PROGRESS',true),
 ('[تجريبي] تعطل مكيف قاعة الاجتماعات',null,null,null,'المبنى الرئيسي - قاعة الاجتماعات','LOW','RESOLVED',true);

insert into public.meal_plans (id, plan_date, meal_type, menu_description, planned_count, is_demo) values
 ('f0000000-0000-4000-8000-000000000001', current_date, 'BREAKFAST','[تجريبي] خبز، جبن، بيض، شاي',120,true),
 ('f0000000-0000-4000-8000-000000000002', current_date, 'LUNCH','[تجريبي] أرز، دجاج، سلطة، فاكهة',130,true),
 ('f0000000-0000-4000-8000-000000000003', current_date, 'DINNER','[تجريبي] شوربة، معكرونة، لبن',110,true);

insert into public.meal_consumption (meal_plan_id, unit_id, served_count) values
 ('f0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003',38),
 ('f0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000004',41),
 ('f0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003',40);

insert into public.leave_requests (personnel_id, leave_type, start_date, end_date, reason, status) values
 ('b0000000-0000-4000-8000-000000000006','ANNUAL', current_date - 3, current_date + 7,'[تجريبي] إجازة سنوية','APPROVED'),
 ('b0000000-0000-4000-8000-000000000007','SICK', current_date + 2, current_date + 4,'[تجريبي] موعد طبي','PENDING'),
 ('b0000000-0000-4000-8000-000000000009','EMERGENCY', current_date - 20, current_date - 18,'[تجريبي] ظرف عائلي','REJECTED');

insert into public.attendance_records (personnel_id, record_date, status, check_in) values
 ('b0000000-0000-4000-8000-000000000003', current_date, 'PRESENT','06:55'),
 ('b0000000-0000-4000-8000-000000000005', current_date, 'PRESENT','07:00'),
 ('b0000000-0000-4000-8000-000000000006', current_date, 'ON_LEAVE',null),
 ('b0000000-0000-4000-8000-000000000007', current_date, 'LATE','07:40'),
 ('b0000000-0000-4000-8000-000000000009', current_date, 'PRESENT','06:50'),
 ('b0000000-0000-4000-8000-000000000010', current_date, 'ABSENT',null);

insert into public.documents (title, description, category, file_path, personnel_id, unit_id, is_protected, is_public, is_demo) values
 ('[تجريبي] لائحة النظام الداخلي للثكنة','وثيقة عامة تجريبية بدون ملف فعلي','REGULATION',null,null,'a0000000-0000-4000-8000-000000000001',false,true,true),
 ('[تجريبي] ملف إداري - DEMO-0003','وثيقة محمية تجريبية بدون ملف فعلي','PERSONNEL_FILE',null,'b0000000-0000-4000-8000-000000000003',null,true,false,true);

-- ============ AUDIT TRIGGERS (after seed so seed does not flood the log) ============
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_row_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function public.audit_row_change();
create trigger audit_role_permissions after insert or delete on public.role_permissions for each row execute function public.audit_row_change();
create trigger audit_roles after insert or update or delete on public.roles for each row execute function public.audit_row_change();
create trigger audit_units after insert or update or delete on public.units for each row execute function public.audit_row_change();
create trigger audit_personnel after insert or update or delete on public.personnel for each row execute function public.audit_row_change();
create trigger audit_leave after insert or update or delete on public.leave_requests for each row execute function public.audit_row_change();
create trigger audit_room_assignments after insert or update or delete on public.room_assignments for each row execute function public.audit_row_change();
create trigger audit_rooms after insert or update or delete on public.rooms for each row execute function public.audit_row_change();
create trigger audit_buildings after insert or update or delete on public.buildings for each row execute function public.audit_row_change();
create trigger audit_inventory_items after insert or update or delete on public.inventory_items for each row execute function public.audit_row_change();
create trigger audit_inventory_tx after insert on public.inventory_transactions for each row execute function public.audit_row_change();
create trigger audit_maintenance after insert or update or delete on public.maintenance_requests for each row execute function public.audit_row_change();
create trigger audit_documents after insert or update or delete on public.documents for each row execute function public.audit_row_change();
create trigger audit_attendance after insert or update or delete on public.attendance_records for each row execute function public.audit_row_change();

-- Personnel stats helper for dashboard (respects RLS via invoker)
create or replace function public.dashboard_stats()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'personnel_total', (select count(*) from public.personnel where status <> 'ARCHIVED'),
    'personnel_active', (select count(*) from public.personnel where status = 'ACTIVE'),
    'personnel_on_leave', (select count(*) from public.personnel where status = 'ON_LEAVE'),
    'units_total', (select count(*) from public.units where is_active),
    'users_total', (select count(*) from public.profiles where is_active),
    'leave_pending', (select count(*) from public.leave_requests where status = 'PENDING'),
    'maintenance_open', (select count(*) from public.maintenance_requests where status in ('OPEN','IN_PROGRESS')),
    'inventory_low', (select count(*) from public.inventory_items where is_active and quantity <= min_quantity)
  )
$$;