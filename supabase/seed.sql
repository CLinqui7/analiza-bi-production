insert into public.organizations (id, name, slug, is_demo)
values ('10000000-0000-4000-8000-000000000001', 'Grupo Analiza DEMO', 'grupo-analiza-demo', true)
on conflict (slug) do update set
  name = excluded.name,
  is_demo = excluded.is_demo;

insert into public.currencies (id, code, name, symbol)
values
  ('20000000-0000-4000-8000-000000000001', 'GTQ', 'Quetzal guatemalteco', 'Q'),
  ('20000000-0000-4000-8000-000000000002', 'BZD', 'Dolar beliceno', 'BZ$'),
  ('20000000-0000-4000-8000-000000000003', 'USD', 'Dolar estadounidense', '$'),
  ('20000000-0000-4000-8000-000000000004', 'HNL', 'Lempira hondureno', 'L'),
  ('20000000-0000-4000-8000-000000000005', 'NIO', 'Cordoba nicaraguense', 'C$'),
  ('20000000-0000-4000-8000-000000000006', 'CRC', 'Colon costarricense', 'CRC'),
  ('20000000-0000-4000-8000-000000000007', 'PAB', 'Balboa panameno', 'B/.')
on conflict (code) do update set
  name = excluded.name,
  symbol = excluded.symbol;

insert into public.countries (
  id,
  organization_id,
  currency_id,
  iso2,
  name,
  time_zone,
  date_format,
  tax_config,
  is_demo
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'GT', 'Guatemala', 'America/Guatemala', 'dd/MM/yyyy', '{"future": true}', true),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'BZ', 'Belice', 'America/Belize', 'dd/MM/yyyy', '{"future": true}', true),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'SV', 'El Salvador', 'America/El_Salvador', 'dd/MM/yyyy', '{"future": true}', true),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'HN', 'Honduras', 'America/Tegucigalpa', 'dd/MM/yyyy', '{"future": true}', true),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'NI', 'Nicaragua', 'America/Managua', 'dd/MM/yyyy', '{"future": true}', true),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 'CR', 'Costa Rica', 'America/Costa_Rica', 'dd/MM/yyyy', '{"future": true}', true),
  ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', 'PA', 'Panama', 'America/Panama', 'dd/MM/yyyy', '{"future": true}', true)
on conflict (organization_id, iso2) do update set
  currency_id = excluded.currency_id,
  name = excluded.name,
  time_zone = excluded.time_zone,
  date_format = excluded.date_format,
  tax_config = excluded.tax_config,
  is_demo = excluded.is_demo;

insert into public.companies (id, organization_id, key, name, unit_type, is_demo)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'analiza-fisioterapia', 'Analiza Fisioterapia', 'fisioterapia', true),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'analiza-laboratorio', 'Analiza Laboratorio', 'laboratorio', true),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'analiza-imagenes', 'Analiza Imagenes', 'imagenes', true)
on conflict (organization_id, key) do update set
  name = excluded.name,
  unit_type = excluded.unit_type,
  is_demo = excluded.is_demo;

insert into public.branches (id, organization_id, country_id, company_id, code, name, city, time_zone, is_demo)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'HN-FIS-001', 'Sucursal DEMO Fisioterapia Norte', 'San Pedro Sula', 'America/Tegucigalpa', true),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'HN-LAB-001', 'Sucursal DEMO Laboratorio Central', 'Tegucigalpa', 'America/Tegucigalpa', true),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', 'HN-IMG-001', 'Sucursal DEMO Imagenes Este', 'Tegucigalpa', 'America/Tegucigalpa', true),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'SV-FIS-001', 'Sucursal DEMO Fisioterapia Centro', 'San Salvador', 'America/El_Salvador', true),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000002', 'CR-LAB-001', 'Sucursal DEMO Laboratorio Oeste', 'San Jose', 'America/Costa_Rica', true),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000003', 'PA-IMG-001', 'Sucursal DEMO Imagenes Pacifico', 'Panama', 'America/Panama', true)
on conflict (organization_id, country_id, company_id, code) do update set
  name = excluded.name,
  city = excluded.city,
  time_zone = excluded.time_zone,
  is_demo = excluded.is_demo;

delete from public.roles
where key in (
  'director_ejecutivo_grupo',
  'director_pais',
  'director_empresa',
  'director_financiero',
  'director_operaciones',
  'analista_bi',
  'cargador_datos',
  'auditor'
);

insert into public.roles (id, key, name, description)
values
  ('60000000-0000-4000-8000-000000000000', 'super_admin', 'Superadministrador', 'Administra la plataforma completa, permisos globales y gobierno del BI.'),
  ('60000000-0000-4000-8000-000000000001', 'webmaster_admin', 'Webmaster / Administrador', 'Disena dashboards, configura modulos, crea usuarios y asigna roles.'),
  ('60000000-0000-4000-8000-000000000002', 'ceo', 'CEO', 'Consulta la salud ejecutiva de Analiza y sus lineas de negocio.'),
  ('60000000-0000-4000-8000-000000000003', 'gerente_operaciones', 'Gerente de operaciones', 'Gestiona una linea de negocio y carga plantillas de sucursales.'),
  ('60000000-0000-4000-8000-000000000004', 'gerente_sucursal', 'Gerente de sucursal', 'Registra y consulta resultados de su sucursal asignada.'),
  ('60000000-0000-4000-8000-000000000005', 'gerente_area', 'Gerente de area', 'Supervisa un grupo de sucursales asignadas y valida disciplina de carga.'),
  ('60000000-0000-4000-8000-000000000006', 'usuario_operativo', 'Usuario operativo', 'Carga y corrige datos operativos sin privilegios gerenciales.'),
  ('60000000-0000-4000-8000-000000000007', 'viewer', 'Viewer', 'Consulta informacion autorizada sin permisos de modificacion.')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.role_hierarchy (role_id, role_key, hierarchy_level, can_invite)
select r.id, r.key, hierarchy.hierarchy_level, hierarchy.can_invite
from (
  values
    ('super_admin', 100, true),
    ('webmaster_admin', 100, true),
    ('gerente_operaciones', 80, true),
    ('gerente_area', 60, true),
    ('gerente_sucursal', 40, true),
    ('usuario_operativo', 20, false),
    ('viewer', 10, false)
) as hierarchy(role_key, hierarchy_level, can_invite)
join public.roles r on r.key = hierarchy.role_key
on conflict (role_id) do update set
  role_key = excluded.role_key,
  hierarchy_level = excluded.hierarchy_level,
  can_invite = excluded.can_invite,
  updated_at = now();

insert into public.permissions (id, key, name, description)
values
  ('70000000-0000-4000-8000-000000000001', 'context.read', 'Leer contexto', 'Ver paises, empresas y sucursales asignadas.'),
  ('70000000-0000-4000-8000-000000000002', 'config.manage', 'Gestionar configuracion', 'Administrar paises, empresas, sucursales y roles.'),
  ('70000000-0000-4000-8000-000000000003', 'imports.manage', 'Gestionar importaciones', 'Cargar, validar y corregir archivos.'),
  ('70000000-0000-4000-8000-000000000004', 'audit.read', 'Leer auditoria', 'Consultar trazabilidad e historial.'),
  ('70000000-0000-4000-8000-000000000005', 'dashboards.read', 'Leer dashboards', 'Consultar indicadores autorizados.'),
  ('70000000-0000-4000-8000-000000000006', 'dashboards.manage', 'Gestionar dashboards', 'Disenar y publicar dashboards del sistema.'),
  ('70000000-0000-4000-8000-000000000007', 'users.manage', 'Gestionar usuarios', 'Crear usuarios y asignar roles y alcances.'),
  ('70000000-0000-4000-8000-000000000008', 'users.invite', 'Invitar usuarios', 'Crear usuarios por invitacion sin definir contrasenas manuales.'),
  ('70000000-0000-4000-8000-000000000009', 'areas.manage', 'Gestionar areas operativas', 'Crear areas, regiones operativas y asignar responsables.'),
  ('70000000-0000-4000-8000-000000000010', 'branches.manage', 'Gestionar sucursales', 'Crear sucursales y asignarlas a areas operativas.'),
  ('70000000-0000-4000-8000-000000000011', 'subordinates.deactivate', 'Desactivar subordinados', 'Aplicar baja logica y exigir reasignacion cuando corresponda.'),
  ('70000000-0000-4000-8000-000000000012', 'goals.manage', 'Gestionar metas', 'Administrar metas y capacidad dentro del alcance autorizado.'),
  ('70000000-0000-4000-8000-000000000013', 'capacity.manage', 'Gestionar capacidad', 'Administrar capacidad, horarios y profesionales de sucursal.')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key in ('super_admin', 'webmaster_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'audit.read')
where r.key = 'ceo'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'imports.manage')
where r.key = 'gerente_operaciones'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'context.read',
  'dashboards.read',
  'imports.manage',
  'users.invite',
  'areas.manage',
  'branches.manage',
  'subordinates.deactivate',
  'goals.manage',
  'capacity.manage'
)
where r.key = 'gerente_operaciones'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'imports.manage')
where r.key = 'gerente_area'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'context.read',
  'dashboards.read',
  'imports.manage',
  'users.invite',
  'subordinates.deactivate',
  'goals.manage',
  'capacity.manage'
)
where r.key = 'gerente_area'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'imports.manage')
where r.key = 'gerente_sucursal'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'context.read',
  'dashboards.read',
  'imports.manage',
  'users.invite',
  'capacity.manage'
)
where r.key = 'gerente_sucursal'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'imports.manage')
where r.key = 'usuario_operativo'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read')
where r.key = 'viewer'
on conflict do nothing;

insert into public.branch_managers (id, organization_id, branch_id, display_name, email, is_demo, starts_on)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Gerente DEMO Norte', 'gerente.norte.demo@example.com', true, '2026-01-01'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Gerente DEMO Central', 'gerente.central.demo@example.com', true, '2026-01-01'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 'Gerente DEMO Este', 'gerente.este.demo@example.com', true, '2026-01-01')
on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email,
  is_demo = excluded.is_demo,
  starts_on = excluded.starts_on;

insert into public.service_categories (id, organization_id, company_id, name, is_demo)
values
  ('81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Terapia DEMO', true),
  ('81000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Pruebas DEMO', true),
  ('81000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Estudios DEMO', true)
on conflict (organization_id, company_id, name) do update set
  is_demo = excluded.is_demo;

insert into public.services (id, organization_id, company_id, category_id, code, name, is_demo)
values
  ('82000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'FIS-DEMO-01', 'Sesion fisioterapia DEMO', true),
  ('82000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000002', 'LAB-DEMO-01', 'Prueba laboratorio DEMO', true),
  ('82000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000003', 'IMG-DEMO-01', 'Estudio imagenes DEMO', true)
on conflict (organization_id, company_id, code) do update set
  name = excluded.name,
  is_demo = excluded.is_demo;

insert into public.professionals (id, organization_id, country_id, company_id, branch_id, code, display_name, professional_type, is_demo)
values
  ('83000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'PRO-FIS-01', 'Profesional DEMO Fisio A', 'fisioterapeuta', true),
  ('83000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'PRO-LAB-01', 'Profesional DEMO Lab A', 'tecnico_laboratorio', true),
  ('83000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', 'PRO-IMG-01', 'Profesional DEMO Imagen A', 'tecnico_imagenes', true)
on conflict (organization_id, branch_id, code) do update set
  display_name = excluded.display_name,
  professional_type = excluded.professional_type,
  is_demo = excluded.is_demo;

insert into public.anonymous_patients (id, organization_id, anonymous_key, is_demo)
values
  ('84000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'DEMO-PATIENT-001', true),
  ('84000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'DEMO-PATIENT-002', true),
  ('84000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'DEMO-PATIENT-003', true)
on conflict (organization_id, anonymous_key) do update set
  is_demo = excluded.is_demo;

insert into public.capacity_records (
  id,
  organization_id,
  country_id,
  company_id,
  branch_id,
  professional_id,
  service_id,
  period_start,
  period_end,
  available_minutes,
  scheduled_minutes,
  attended_minutes,
  is_demo
)
values
  ('85000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '2026-07-01', '2026-07-31', 9600, 7680, 6720, true),
  ('85000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002', '2026-07-01', '2026-07-31', 8400, 6300, 5880, true),
  ('85000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '83000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000003', '2026-07-01', '2026-07-31', 7200, 5040, 4380, true)
on conflict (id) do update set
  available_minutes = excluded.available_minutes,
  scheduled_minutes = excluded.scheduled_minutes,
  attended_minutes = excluded.attended_minutes,
  is_demo = excluded.is_demo;

insert into public.appointments (
  id,
  organization_id,
  country_id,
  company_id,
  branch_id,
  professional_id,
  service_id,
  anonymous_patient_id,
  external_reference,
  scheduled_start_at,
  scheduled_end_at,
  scheduled_minutes,
  attended_minutes,
  normalized_status,
  original_status,
  is_demo
)
values
  ('86000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', 'DEMO-APT-001', '2026-07-06 09:00:00-06', '2026-07-06 10:00:00-06', 60, 60, 'completed', 'Completada DEMO', true),
  ('86000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000002', 'DEMO-APT-002', '2026-07-06 10:00:00-06', '2026-07-06 11:00:00-06', 60, 0, 'no_show', 'No asistio DEMO', true),
  ('86000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000003', 'DEMO-APT-003', '2026-07-07 08:00:00-06', '2026-07-07 08:30:00-06', 30, 30, 'completed', 'Entregada DEMO', true)
on conflict (id) do update set
  normalized_status = excluded.normalized_status,
  original_status = excluded.original_status,
  attended_minutes = excluded.attended_minutes,
  is_demo = excluded.is_demo;

-- Rebuild additions: canonical business lines and handoff catalogs.
insert into public.business_lines (id, organization_id, company_id, code, name, is_enabled, is_demo)
values
  ('41000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'PHYSIOTHERAPY', 'Fisioterapia', true, true),
  ('41000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'LABORATORY', 'Laboratorio', true, true),
  ('41000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'IMAGING', 'Imágenes', true, true)
on conflict (organization_id, company_id, code) do update set
  name = excluded.name,
  is_enabled = excluded.is_enabled,
  is_demo = excluded.is_demo;

update public.branches
set status = 'active'
where organization_id = '10000000-0000-4000-8000-000000000001'
  and is_demo = true;

insert into public.role_hierarchy (role_id, role_key, hierarchy_level, can_invite)
select id, key, 90, false
from public.roles
where key = 'ceo'
on conflict (role_id) do update set
  role_key = excluded.role_key,
  hierarchy_level = excluded.hierarchy_level,
  can_invite = excluded.can_invite,
  updated_at = now();

insert into public.ingestion_sources (
  id, organization_id, source_key, name, source_type, provider_name, status, contains_personal_data, is_demo
)
values
  ('91000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'manual-monthly', 'Formulario mensual DEMO', 'manual', 'Analiza Intelligence', 'active', false, true),
  ('91000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'spreadsheet-import', 'Importación de hoja de cálculo DEMO', 'file', 'Analiza Intelligence', 'active', false, true)
on conflict (organization_id, source_key) do update set
  name = excluded.name,
  status = excluded.status,
  contains_personal_data = excluded.contains_personal_data,
  is_demo = excluded.is_demo;

insert into public.ingestion_template_definitions (
  organization_id, code, name, description, dataset_type, business_line,
  accepted_file_extensions, period_field, dedupe_key, critical_fields, pii_policy, status, is_demo
)
values
  ('10000000-0000-4000-8000-000000000001', 'monthly-physiotherapy', 'Cierre mensual Fisioterapia', 'Plantilla operativa mensual para datos agregados de Fisioterapia.', 'physiotherapy', 'PHYSIOTHERAPY', array['csv','xlsx','xls'], 'period', array['branch_code','period'], array['branch_code','period'], 'blocked', 'active', true),
  ('10000000-0000-4000-8000-000000000001', 'monthly-laboratory', 'Cierre mensual Laboratorio', 'Plantilla operativa mensual para datos agregados de Laboratorio.', 'laboratory', 'LABORATORY', array['csv','xlsx','xls'], 'period', array['branch_code','period'], array['branch_code','period'], 'blocked', 'active', true),
  ('10000000-0000-4000-8000-000000000001', 'monthly-imaging', 'Cierre mensual Imágenes', 'Plantilla operativa mensual para datos agregados de Imágenes.', 'imaging', 'IMAGING', array['csv','xlsx','xls'], 'period', array['branch_code','period'], array['branch_code','period'], 'blocked', 'active', true)
on conflict do nothing;

insert into public.ingestion_template_versions (
  template_definition_id, version, schema_fields, mapping_rules, validation_rules, sample_payload, change_summary, status, is_demo
)
select
  d.id,
  '1.0',
  '[{"name":"branch_code","type":"text","required":true},{"name":"period","type":"month","required":true},{"name":"metric_code","type":"text","required":true},{"name":"value","type":"number","required":true}]'::jsonb,
  '{}'::jsonb,
  '{"reject_personal_data":true,"block_formula_cells":true}'::jsonb,
  '[]'::jsonb,
  'Versión inicial reconstruida a partir del handoff técnico.',
  'active',
  true
from public.ingestion_template_definitions d
where d.organization_id = '10000000-0000-4000-8000-000000000001'
  and d.code in ('monthly-physiotherapy','monthly-laboratory','monthly-imaging')
on conflict (template_definition_id, version) do nothing;

-- Production/global KPI and template catalogs are installed by the versioned
-- 20260828140000_global_catalogs.sql migration. This seed remains DEMO-only.
