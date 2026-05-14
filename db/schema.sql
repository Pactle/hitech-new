create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  location text,
  created_at timestamptz not null default now(),
  file_url text,
  parsed_json jsonb not null default '{}'::jsonb
);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references inquiries(id) on delete set null,
  total_trailers numeric not null default 0,
  freight_cost numeric not null default 0,
  grand_total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  dn numeric not null,
  pn numeric not null,
  qty numeric not null,
  weight numeric not null default 0,
  rate numeric not null default 0,
  amount numeric not null default 0
);
