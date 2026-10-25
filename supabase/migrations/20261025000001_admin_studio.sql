-- ═════════════════════════════════════════════════════════════════════════
-- NALAYAK STUDIOS — ADMIN STUDIO CATALOGUE & COMMERCE SCHEMA MIGRATION
-- Migration: 20261025000001_admin_studio.sql
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    kicker text,
    price integer NOT NULL CHECK (price >= 0),
    compare_at integer CHECK (compare_at IS NULL OR compare_at >= 0),
    cost_price integer CHECK (cost_price IS NULL OR cost_price >= 0),
    category text NOT NULL,
    gender text DEFAULT 'unisex',
    badge text,
    description text,
    fit text,
    composition text,
    care text,
    story text,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    color_images jsonb DEFAULT '{}'::jsonb NOT NULL,
    colors jsonb DEFAULT '[]'::jsonb NOT NULL,
    sizes jsonb DEFAULT '[]'::jsonb NOT NULL,
    stock integer DEFAULT 0 NOT NULL CHECK (stock >= 0),
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'draft', 'archived')),
    new_arrival boolean DEFAULT false NOT NULL,
    best_seller boolean DEFAULT false NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products (slug);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_gender_idx ON public.products (gender);

-- 2. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
    id text PRIMARY KEY,
    product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku text NOT NULL UNIQUE,
    size text NOT NULL,
    color_name text NOT NULL,
    color_hex text NOT NULL,
    stock integer DEFAULT 0 NOT NULL CHECK (stock >= 0),
    price_override integer CHECK (price_override IS NULL OR price_override >= 0),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS product_variants_sku_idx ON public.product_variants (sku);

-- 3. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    kicker text,
    description text,
    hero_image text,
    products jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS collections_slug_idx ON public.collections (slug);

-- 4. DISCOUNTS & COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.discounts (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    value numeric NOT NULL CHECK (value > 0),
    min_order_amount numeric DEFAULT 0 NOT NULL CHECK (min_order_amount >= 0),
    max_discount numeric CHECK (max_discount IS NULL OR max_discount > 0),
    usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
    usage_count integer DEFAULT 0 NOT NULL CHECK (usage_count >= 0),
    is_active boolean DEFAULT true NOT NULL,
    valid_from timestamptz,
    valid_to timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS discounts_code_idx ON public.discounts (upper(code));

-- 5. STOREFRONT CONTENT CMS TABLE
CREATE TABLE IF NOT EXISTS public.storefront_content (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 6. ADMIN SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    token text PRIMARY KEY,
    admin_identity text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON public.admin_sessions (expires_at);

-- 7. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id text PRIMARY KEY,
    admin_identity text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at DESC);

-- 8. EXTEND ORDERS TABLE WITH FULFILLMENT FIELDS (SAFE & NON-DESTRUCTIVE)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS tracking_number text,
    ADD COLUMN IF NOT EXISTS courier_name text,
    ADD COLUMN IF NOT EXISTS discount_code text,
    ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;

COMMIT;

