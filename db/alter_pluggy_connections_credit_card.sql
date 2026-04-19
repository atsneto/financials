-- Vincula uma conexão Open Finance a um cartão de crédito do usuário
-- Permite que transações importadas de contas CREDIT sejam associadas ao cartão correto

ALTER TABLE pluggy_connections
  ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;
