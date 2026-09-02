alter table public.monthly_closings
  drop constraint if exists monthly_closings_business_line_check;

alter table public.monthly_closings
  add constraint monthly_closings_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING'));

alter table public.closing_versions
  drop constraint if exists closing_versions_business_line_check;

alter table public.closing_versions
  add constraint closing_versions_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING'));

alter table public.kpi_targets
  drop constraint if exists kpi_targets_business_line_check;

alter table public.kpi_targets
  add constraint kpi_targets_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING'));

alter table public.generated_insights
  drop constraint if exists generated_insights_business_line_check;

alter table public.generated_insights
  add constraint generated_insights_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING'));

alter table public.closing_audit_events
  drop constraint if exists closing_audit_events_business_line_check;

alter table public.closing_audit_events
  add constraint closing_audit_events_business_line_check
  check (business_line in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING'));

create table public.imaging_closing_inputs (
  id uuid primary key default gen_random_uuid(),
  closing_version_id uuid not null unique references public.closing_versions(id) on delete cascade,
  revenue_total numeric(14, 2) check (revenue_total >= 0),
  cost_of_sales numeric(14, 2) check (cost_of_sales >= 0),
  orders_total numeric(14, 2) check (orders_total >= 0),
  clients_total numeric(14, 2) check (clients_total >= 0),
  referred_revenue numeric(14, 2) check (referred_revenue >= 0),
  referred_orders numeric(14, 2) check (referred_orders >= 0),
  telemedicine_patients numeric(14, 2) check (telemedicine_patients >= 0),
  telemedicine_revenue numeric(14, 2) check (telemedicine_revenue >= 0),
  xray_studies numeric(14, 2) check (xray_studies >= 0),
  xray_revenue numeric(14, 2) check (xray_revenue >= 0),
  extra_plates_count numeric(14, 2) check (extra_plates_count >= 0),
  extra_plates_revenue numeric(14, 2) check (extra_plates_revenue >= 0),
  ct_studies numeric(14, 2) check (ct_studies >= 0),
  ct_revenue numeric(14, 2) check (ct_revenue >= 0),
  ultrasound_studies numeric(14, 2) check (ultrasound_studies >= 0),
  ultrasound_revenue numeric(14, 2) check (ultrasound_revenue >= 0),
  doppler_studies numeric(14, 2) check (doppler_studies >= 0),
  doppler_revenue numeric(14, 2) check (doppler_revenue >= 0),
  caaf_studies numeric(14, 2) check (caaf_studies >= 0),
  caaf_revenue numeric(14, 2) check (caaf_revenue >= 0),
  report_reading_count numeric(14, 2) check (report_reading_count >= 0),
  pending_reports numeric(14, 2) check (pending_reports >= 0),
  average_report_tat_hours numeric(14, 2) check (average_report_tat_hours >= 0),
  average_order_to_study_hours numeric(14, 2) check (average_order_to_study_hours >= 0),
  equipment_available_hours numeric(14, 2) check (equipment_available_hours >= 0),
  equipment_used_hours numeric(14, 2) check (equipment_used_hours >= 0),
  equipment_downtime_hours numeric(14, 2) check (equipment_downtime_hours >= 0),
  scheduled_studies numeric(14, 2) check (scheduled_studies >= 0),
  cancelled_studies numeric(14, 2) check (cancelled_studies >= 0),
  no_show_studies numeric(14, 2) check (no_show_studies >= 0),
  licensed_staff_count numeric(14, 2) check (licensed_staff_count >= 0),
  doctor_staff_count numeric(14, 2) check (doctor_staff_count >= 0),
  customer_service_count numeric(14, 2) check (customer_service_count >= 0),
  delivery_staff_count numeric(14, 2) check (delivery_staff_count >= 0),
  cleaning_staff_count numeric(14, 2) check (cleaning_staff_count >= 0),
  new_clients numeric(14, 2) check (new_clients >= 0),
  closure_observations text not null default '',
  source_lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index imaging_closing_inputs_version_idx
  on public.imaging_closing_inputs (closing_version_id);

create trigger set_imaging_closing_inputs_updated_at before update on public.imaging_closing_inputs
for each row execute function public.set_updated_at();

alter table public.imaging_closing_inputs enable row level security;

create policy "read assigned imaging inputs" on public.imaging_closing_inputs
for select to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and cv.business_line = 'IMAGING'
      and public.current_user_can_access_branch(cv.branch_id)
  )
);

create policy "manage assigned imaging inputs" on public.imaging_closing_inputs
for all to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and cv.business_line = 'IMAGING'
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
      and cv.business_line = 'IMAGING'
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
