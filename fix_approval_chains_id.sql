-- ============================================================
-- FIX: approval_chains NULL id column issue and set primary key
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Generate unique random UUIDs for any existing approval chain rows with NULL IDs
UPDATE public.approval_chains
SET id = gen_random_uuid()
WHERE id IS NULL;

-- 2. Make the id column default to gen_random_uuid() automatically on insert
ALTER TABLE public.approval_chains 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Make sure the id column is NOT NULL
ALTER TABLE public.approval_chains 
ALTER COLUMN id SET NOT NULL;

-- 4. Check if a primary key constraint exists on the id column, and add it if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'approval_chains_pkey' 
    AND conrelid = 'public.approval_chains'::regclass
  ) THEN
    ALTER TABLE public.approval_chains ADD PRIMARY KEY (id);
  END IF;
END $$;
