-- Fictional data only. All customer contact details use example.invalid addresses.
insert into public.salespeople (name, email) values
  ('Niamh Doyle', 'niamh.doyle@example.invalid'), ('Eoin Walsh', 'eoin.walsh@example.invalid'), ('Grace Nolan', 'grace.nolan@example.invalid')
on conflict (email) do update set name = excluded.name;

with source_data as (
  select id, slug from public.lead_sources
), salesperson_data as (
  select id, email from public.salespeople
), brand_data as (
  select id, name from public.brands
), model_data as (
  select id, name from public.vehicle_models
)
insert into public.leads (
  occurred_at, customer_name, customer_email, customer_phone, brand_id, vehicle_model_id,
  lead_source_id, assigned_salesperson_id, registration_or_stock_number, county, campaign_name,
  status, is_demo, import_provider, import_external_id
) values
  (now() - interval '1 hour', 'Aisling Murphy', 'aisling.murphy@example.invalid', '+353 85 123 4567', (select id from brand_data where name = 'Škoda' limit 1), (select id from model_data where name = 'Kodiaq' limit 1), (select id from source_data where slug = 'website'), (select id from salesperson_data where email = 'niamh.doyle@example.invalid'), '261-CW-2481', 'Carlow', 'Škoda SUV Event', 'New', true, 'seed', 'demo-aisling-001'),
  (now() - interval '2 hours', 'Conor Byrne', 'conor.byrne@example.invalid', '+353 86 987 6512', (select id from brand_data where name = 'Volvo' limit 1), (select id from model_data where name = 'EX30' limit 1), (select id from source_data where slug = 'meta-lead-ads'), (select id from salesperson_data where email = 'eoin.walsh@example.invalid'), null, 'Kilkenny', 'Volvo Electric Range', 'Contacted', true, 'seed', 'demo-conor-002'),
  (now() - interval '4 hours', 'Sarah Keane', 'sarah.keane@example.invalid', '+353 87 440 1298', null, (select id from model_data where name = 'RAV4' limit 1), (select id from source_data where slug = 'donedeal'), (select id from salesperson_data where email = 'grace.nolan@example.invalid'), '201-WW-8104', 'Wexford', null, 'Appointment Booked', true, 'seed', 'demo-sarah-003')
on conflict (import_provider, import_external_id) where import_provider is not null and import_external_id is not null do nothing;
