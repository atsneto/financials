-- Vincula transações de cartão importadas via Open Finance ao cartão correto do usuário
ALTER TABLE public.credit_card_transactions
  ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_card_id
  ON public.credit_card_transactions(credit_card_id)
  WHERE credit_card_id IS NOT NULL;
