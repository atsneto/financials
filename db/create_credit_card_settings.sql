-- Create table to store per-user credit card settings (closing day)

CREATE TABLE IF NOT EXISTS public.credit_card_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  closing_day int NOT NULL DEFAULT 25,
  due_day int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure one settings row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_card_settings_user_id ON public.credit_card_settings(user_id);

-- Optional: keep updated_at current on update
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_credit_card_settings ON public.credit_card_settings;
CREATE TRIGGER set_updated_at_credit_card_settings
BEFORE UPDATE ON public.credit_card_settings
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_updated_at();

-- If the table already exists, add due_day safely
ALTER TABLE IF EXISTS public.credit_card_settings
  ADD COLUMN IF NOT EXISTS due_day int NOT NULL DEFAULT 5;
