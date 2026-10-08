CREATE TABLE public.wallet_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_profiles_username_len CHECK (char_length(username) BETWEEN 3 AND 24),
  CONSTRAINT wallet_profiles_username_fmt CHECK (username ~ '^[A-Za-z0-9_]+$')
);

CREATE INDEX wallet_profiles_wallet_address_lower_idx ON public.wallet_profiles (lower(wallet_address));
CREATE INDEX wallet_profiles_username_lower_idx ON public.wallet_profiles (lower(username));

GRANT SELECT, INSERT ON public.wallet_profiles TO anon, authenticated;
GRANT ALL ON public.wallet_profiles TO service_role;

ALTER TABLE public.wallet_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wallet profiles"
  ON public.wallet_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register a wallet profile"
  ON public.wallet_profiles FOR INSERT
  WITH CHECK (true);