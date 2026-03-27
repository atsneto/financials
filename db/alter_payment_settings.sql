-- Add payment_method column to transactions
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Add credit_limit to credit_card_settings
ALTER TABLE IF EXISTS public.credit_card_settings
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2);

-- Add meal voucher fields to financial_profile
ALTER TABLE IF EXISTS public.financial_profile
  ADD COLUMN IF NOT EXISTS has_meal_voucher boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS meal_voucher_monthly_amount numeric(12,2);
