-- Tabela para armazenar conexões Open Finance via Pluggy
CREATE TABLE IF NOT EXISTS pluggy_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  connector_name TEXT,
  connector_logo TEXT,
  status TEXT DEFAULT 'UPDATED',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE pluggy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON pluggy_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON pluggy_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON pluggy_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON pluggy_connections FOR DELETE
  USING (auth.uid() = user_id);
