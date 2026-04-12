-- Invoice payments: tracks payments made towards credit card invoices
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  invoice_month integer NOT NULL,       -- 0-11 (JS month index)
  invoice_year integer NOT NULL,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  payment_date timestamptz NOT NULL DEFAULT now(),
  account_label text,                   -- e.g. "Conta corrente Nubank"
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_payments_user_idx ON public.invoice_payments(user_id);
CREATE INDEX IF NOT EXISTS invoice_payments_card_idx ON public.invoice_payments(credit_card_id);

-- Row Level Security
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own invoice_payments" ON public.invoice_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own invoice_payments" ON public.invoice_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own invoice_payments" ON public.invoice_payments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own invoice_payments" ON public.invoice_payments FOR DELETE USING (auth.uid() = user_id);
