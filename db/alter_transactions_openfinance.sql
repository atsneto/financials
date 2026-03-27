-- Adiciona colunas para identificar transações importadas via Open Finance
-- Isso evita duplicatas ao re-sincronizar

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Índice para busca rápida por external_id (evitar duplicatas)
CREATE INDEX IF NOT EXISTS idx_transactions_external_id
  ON transactions(external_id)
  WHERE external_id IS NOT NULL;
