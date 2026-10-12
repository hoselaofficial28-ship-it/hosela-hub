-- ============================================================================
-- Hosela Hub — perluasan Bagian/Jabatan untuk pendaftaran karyawan ecommerce
-- Owner dan Finance sengaja tidak tersedia pada pendaftaran mandiri karena
-- keduanya mempunyai akses istimewa dan hanya boleh ditetapkan oleh Owner.
-- ============================================================================

with daftar(bagian, jabatan) as (
  values
    ('Gudang', 'Admin Gudang & Stok'),
    ('Gudang', 'Staff Inbound'),
    ('Gudang', 'Picker'),
    ('Gudang', 'Admin Packing'),
    ('Gudang', 'Quality Control Packing'),
    ('Gudang', 'Kepala Gudang'),
    ('Live Streaming', 'Live Streamer'),
    ('Live Streaming', 'Moderator Live'),
    ('Live Streaming', 'Operator Live'),
    ('Live Streaming', 'Koordinator Live Streaming'),
    ('Content Creator', 'Content Creator'),
    ('Content Creator', 'Scriptwriter / Copywriter'),
    ('Content Creator', 'Video Editor'),
    ('Content Creator', 'Graphic Designer'),
    ('Content Creator', 'Fotografer Produk'),
    ('Content Creator', 'Content Lead'),
    ('Marketplace & Ecommerce', 'Admin Marketplace'),
    ('Marketplace & Ecommerce', 'Customer Service Marketplace'),
    ('Marketplace & Ecommerce', 'Listing Specialist'),
    ('Marketplace & Ecommerce', 'Promo & Campaign Specialist'),
    ('Marketplace & Ecommerce', 'Marketplace Ads Specialist'),
    ('Marketplace & Ecommerce', 'Ecommerce Supervisor'),
    ('Digital Marketing', 'Social Media Specialist'),
    ('Digital Marketing', 'Performance Ads Specialist'),
    ('Digital Marketing', 'Affiliate & KOL Specialist'),
    ('Digital Marketing', 'CRM & Retention Specialist'),
    ('Digital Marketing', 'Digital Marketing Lead'),
    ('Customer Service', 'Customer Service Chat'),
    ('Customer Service', 'Customer Service Komplain & Retur'),
    ('Customer Service', 'Customer Experience Specialist'),
    ('Customer Service', 'Customer Service Lead'),
    ('Purchasing & Inventory', 'Purchasing Staff'),
    ('Purchasing & Inventory', 'Supplier Coordinator'),
    ('Purchasing & Inventory', 'Inventory Control'),
    ('Purchasing & Inventory', 'Purchasing Supervisor'),
    ('Operasional & Fulfillment', 'Admin Pesanan'),
    ('Operasional & Fulfillment', 'Fulfillment Staff'),
    ('Operasional & Fulfillment', 'Staff Retur & Refund'),
    ('Operasional & Fulfillment', 'Koordinator Operasional'),
    ('Operasional & Fulfillment', 'Operations Manager'),
    ('Keuangan & Administrasi', 'Admin Keuangan'),
    ('Keuangan & Administrasi', 'Accounting Staff'),
    ('Keuangan & Administrasi', 'Accounts Payable / Receivable'),
    ('Keuangan & Administrasi', 'Admin Pajak'),
    ('Keuangan & Administrasi', 'Supervisor Keuangan'),
    ('HR & General Affairs', 'HR Admin'),
    ('HR & General Affairs', 'Recruitment & People Operations'),
    ('HR & General Affairs', 'General Affairs Staff'),
    ('HR & General Affairs', 'HRGA Supervisor'),
    ('Product & Merchandising', 'Product Research'),
    ('Product & Merchandising', 'Merchandiser'),
    ('Product & Merchandising', 'Product Development'),
    ('Product & Merchandising', 'Catalog Specialist'),
    ('Product & Merchandising', 'Product Lead')
)
insert into public.jobdesks (bagian, jabatan)
select d.bagian, d.jabatan
from daftar d
where not exists (
  select 1 from public.jobdesks j
  where lower(trim(j.bagian)) = lower(trim(d.bagian))
    and lower(trim(j.jabatan)) = lower(trim(d.jabatan))
);

create or replace function public.get_daftar_options()
returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_object_agg(bagian, jabatan_list), '{}'::jsonb)
  from (
    select bagian, jsonb_agg(distinct jabatan order by jabatan) as jabatan_list
    from (
      select
        case lower(trim(bagian))
          when 'packing' then 'Gudang'
          when 'live' then 'Live Streaming'
          when 'ecommerce' then 'Marketplace & Ecommerce'
          else trim(bagian)
        end as bagian,
        trim(jabatan) as jabatan
      from public.jobdesks
      where bagian is not null
        and lower(trim(bagian)) not in ('owner', 'finance')
    ) normalized
    group by bagian
  ) t;
$$;

grant execute on function public.get_daftar_options() to anon;
