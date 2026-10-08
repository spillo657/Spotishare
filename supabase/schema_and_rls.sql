-- ==============================================================================
-- SpotiShare - Comprehensive Database Schema & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. GROUP SETTINGS TABLE
-- Secure table to store shared payment coordinates and Spotify Family settings
CREATE TABLE IF NOT EXISTS public.group_settings (
    plan_id UUID PRIMARY KEY REFERENCES public.plans(id) ON DELETE CASCADE,
    family_address TEXT DEFAULT 'Via Roma 1, 00100 Roma (RM)',
    card_details JSONB DEFAULT '{
        "holderName": "Intestatario Gruppo",
        "revolutTag": "@tuorevtag",
        "revolutIban": "IT00X0000000000000000000000",
        "buddybankIban": "IT00Y0000000000000000000000",
        "postepayCardNumber": "0000 0000 0000 0000",
        "postepayFiscalCode": "XXXXXX00X00X000X",
        "bperIban": "IT00Z0000000000000000000000"
    }'::jsonb,
    playlist_url TEXT DEFAULT 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. RLS POLICIES FOR 'users'
-- ==============================================================================
-- A. Select: Authenticated users can read their own profile and profiles in the same plan
DROP POLICY IF EXISTS "Users can read members of their group" ON public.users;
CREATE POLICY "Users can read members of their group"
ON public.users
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR plan_id IN (
        SELECT u.plan_id FROM public.users u WHERE u.id = auth.uid() AND u.plan_id IS NOT NULL
    )
);

-- B. Update: Users can update their own display name, but CANNOT elevate their role to admin directly
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    AND (
        -- Protect role field: non-admins cannot change role to admin
        role IS NOT DISTINCT FROM (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
    )
);

-- ==============================================================================
-- 4. RLS POLICIES FOR 'plans'
-- ==============================================================================
-- A. Select: Any authenticated user can view plans (or search by invite code)
DROP POLICY IF EXISTS "Authenticated users can read plans" ON public.plans;
CREATE POLICY "Authenticated users can read plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- B. Insert: Authenticated users can create a new plan
DROP POLICY IF EXISTS "Authenticated users can create a plan" ON public.plans;
CREATE POLICY "Authenticated users can create a plan"
ON public.plans
FOR INSERT
TO authenticated
WITH CHECK (true);

-- C. Update: ONLY verified plan admins can update plan details
DROP POLICY IF EXISTS "Admins can update their plan" ON public.plans;
CREATE POLICY "Admins can update their plan"
ON public.plans
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.plan_id = plans.id
          AND u.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.plan_id = plans.id
          AND u.role = 'admin'
    )
);

-- ==============================================================================
-- 5. RLS POLICIES FOR 'payments'
-- ==============================================================================
-- A. Select: Members can read payments associated with their plan or their own user ID
DROP POLICY IF EXISTS "Members can view payments for their group" ON public.payments;
CREATE POLICY "Members can view payments for their group"
ON public.payments
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR plan_id IN (
        SELECT u.plan_id FROM public.users u WHERE u.id = auth.uid() AND u.plan_id IS NOT NULL
    )
);

-- B. Insert: Users can only record payments for their OWN account
DROP POLICY IF EXISTS "Users can insert payments for themselves" ON public.payments;
CREATE POLICY "Users can insert payments for themselves"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- C. Delete: ONLY plan admins can delete payment entries
DROP POLICY IF EXISTS "Admins can delete payments in their group" ON public.payments;
CREATE POLICY "Admins can delete payments in their group"
ON public.payments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.plan_id = payments.plan_id
          AND u.role = 'admin'
    )
);

-- ==============================================================================
-- 6. RLS POLICIES FOR 'group_settings'
-- ==============================================================================
-- A. Select: Members of the plan can read the verified settings & payment coordinates
DROP POLICY IF EXISTS "Members can read group settings" ON public.group_settings;
CREATE POLICY "Members can read group settings"
ON public.group_settings
FOR SELECT
TO authenticated
USING (
    plan_id IN (
        SELECT u.plan_id FROM public.users u WHERE u.id = auth.uid() AND u.plan_id IS NOT NULL
    )
);

-- B. Insert/Update: ONLY plan admins can insert or modify payment coordinates
DROP POLICY IF EXISTS "Admins can manage group settings" ON public.group_settings;
CREATE POLICY "Admins can manage group settings"
ON public.group_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.plan_id = group_settings.plan_id
          AND u.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.plan_id = group_settings.plan_id
          AND u.role = 'admin'
    )
);
