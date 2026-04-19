-- Add bank_id to pluggy_connections so Open Finance connections know which bank they belong to
ALTER TABLE pluggy_connections
  ADD COLUMN IF NOT EXISTS bank_id TEXT;
