-- Add bank_id column to credit_cards
-- Stores the identifier that maps to the front-end BANKS config (e.g. "nubank", "itau")
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS bank_id text;
