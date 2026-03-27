-- Adiciona colunas para identificar transações de cartão importadas via Open Finance
-- Evita duplicatas ao re-sincronizar

ALTER TABLE credit_card_transactions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Índice para busca rápida por external_id (evitar duplicatas)
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_external_id
  ON credit_card_transactions(external_id)
  WHERE external_id IS NOT NULL;
