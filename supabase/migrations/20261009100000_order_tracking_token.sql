ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_hash_unique
ON public.orders (tracking_token_hash)
WHERE tracking_token_hash IS NOT NULL;