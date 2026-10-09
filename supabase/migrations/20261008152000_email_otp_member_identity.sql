BEGIN;

ALTER TABLE public.members
    ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.members
    ALTER COLUMN phone DROP NOT NULL;

WITH distinct_order_links AS (
    SELECT DISTINCT
        lower(btrim(email)) AS email,
        user_id
    FROM public.orders
    WHERE email IS NOT NULL
      AND btrim(email) <> ''
      AND user_id IS NOT NULL
), one_member_per_email AS (
    SELECT email, (array_agg(user_id))[1] AS user_id
    FROM distinct_order_links
    GROUP BY email
    HAVING count(*) = 1
), one_email_per_member AS (
    SELECT user_id, (array_agg(email))[1] AS email
    FROM one_member_per_email
    GROUP BY user_id
    HAVING count(*) = 1
)
UPDATE public.members AS member
SET email = mapping.email
FROM one_email_per_member AS mapping
WHERE member.id = mapping.user_id
  AND member.email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_email_lower_unique_idx
    ON public.members (lower(email))
    WHERE email IS NOT NULL AND btrim(email) <> '';

COMMIT;
