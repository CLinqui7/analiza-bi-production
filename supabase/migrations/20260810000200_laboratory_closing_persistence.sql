alter table public.monthly_closings
  drop constraint if exists monthly_closings_business_line_check;

alter table public.monthly_closings
  add constraint monthly_closings_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY'));

alter table public.closing_versions
  drop constraint if exists closing_versions_business_line_check;

alter table public.closing_versions
  add constraint closing_versions_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY'));

alter table public.kpi_targets
  drop constraint if exists kpi_targets_business_line_check;

alter table public.kpi_targets
  add constraint kpi_targets_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY'));

alter table public.generated_insights
  drop constraint if exists generated_insights_business_line_check;

alter table public.generated_insights
  add constraint generated_insights_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY'));

alter table public.closing_audit_events
  drop constraint if exists closing_audit_events_business_line_check;

alter table public.closing_audit_events
  add constraint closing_audit_events_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY'));

create table public.laboratory_closing_inputs (
  id uuid primary key default gen_random_uuid(),
  closing_version_id uuid not null unique references public.closing_versions(id) on delete cascade,
  revenue_total numeric(14, 2) check (revenue_total >= 0),
  cost_of_sales numeric(14, 2) check (cost_of_sales >= 0),
  orders_total numeric(14, 2) check (orders_total >= 0),
  clients_total numeric(14, 2) check (clients_total >= 0),
  profiles_total numeric(14, 2) check (profiles_total >= 0),
  processed_tests numeric(14, 2) check (processed_tests >= 0),
  referred_revenue numeric(14, 2) check (referred_revenue >= 0),
  referred_orders numeric(14, 2) check (referred_orders >= 0),
  analiza_revenue numeric(14, 2) check (analiza_revenue >= 0),
  analiza_orders numeric(14, 2) check (analiza_orders >= 0),
  drsv_revenue numeric(14, 2) check (drsv_revenue >= 0),
  drsv_orders numeric(14, 2) check (drsv_orders >= 0),
  drsv_clients numeric(14, 2) check (drsv_clients >= 0),
  home_service_revenue numeric(14, 2) check (home_service_revenue >= 0),
  home_service_orders numeric(14, 2) check (home_service_orders >= 0),
  card_revenue numeric(14, 2) check (card_revenue >= 0),
  cash_revenue numeric(14, 2) check (cash_revenue >= 0),
  credit_revenue numeric(14, 2) check (credit_revenue >= 0),
  mixed_payment_revenue numeric(14, 2) check (mixed_payment_revenue >= 0),
  phlebotomist_count numeric(14, 2) check (phlebotomist_count >= 0),
  customer_service_count numeric(14, 2) check (customer_service_count >= 0),
  nurse_count numeric(14, 2) check (nurse_count >= 0),
  technical_staff_count numeric(14, 2) check (technical_staff_count >= 0),
  average_turnaround_time_hours numeric(14, 2) check (average_turnaround_time_hours >= 0),
  rejected_tests numeric(14, 2) check (rejected_tests >= 0),
  reprocessed_tests numeric(14, 2) check (reprocessed_tests >= 0),
  technical_capacity_tests numeric(14, 2) check (technical_capacity_tests >= 0),
  closure_observations text not null default '',
  source_lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index laboratory_closing_inputs_version_idx
  on public.laboratory_closing_inputs (closing_version_id);

create trigger set_laboratory_closing_inputs_updated_at before update on public.laboratory_closing_inputs
for each row execute function public.set_updated_at();

alter table public.laboratory_closing_inputs enable row level security;

create policy "read assigned laboratory inputs" on public.laboratory_closing_inputs
for select to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and cv.business_line = 'LABORATORY'
      and public.current_user_can_access_branch(cv.branch_id)
  )
);

create policy "manage assigned laboratory inputs" on public.laboratory_closing_inputs
for all to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and cv.business_line = 'LABORATORY'
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
)
with check (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and cv.business_line = 'LABORATORY'
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
);
