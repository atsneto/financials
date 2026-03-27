-- Create table to store credit card transactions

CREATE TABLE IF NOT EXISTS public.credit_card_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text,
  merchant text,
  category text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_user_id ON public.credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_created_at ON public.credit_card_transactions(created_at);

-- Optional: keep updated_at current on update
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_credit_card_transactions ON public.credit_card_transactions;
CREATE TRIGGER set_updated_at_credit_card_transactions
BEFORE UPDATE ON public.credit_card_transactions
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_updated_at();

-- Example insert (replace <USER_UUID> with actual user id):
-- INSERT INTO public.credit_card_transactions (user_id, title, merchant, category, amount, created_at)
-- VALUES ('<USER_UUID>', 'Compra exemplo', 'Loja', 'Compras', 123.45, '2025-12-01T12:00:00Z');
