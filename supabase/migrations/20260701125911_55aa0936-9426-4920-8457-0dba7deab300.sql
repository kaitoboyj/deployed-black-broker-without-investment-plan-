DROP POLICY "Anyone can register a wallet profile" ON public.wallet_profiles;

CREATE POLICY "Register a wallet profile with a valid address"
  ON public.wallet_profiles FOR INSERT
  WITH CHECK (
    char_length(wallet_address) BETWEEN 20 AND 128
    AND wallet_address ~ '^[A-Za-z0-9]+$'
    AND char_length(username) BETWEEN 3 AND 24
    AND username ~ '^[A-Za-z0-9_]+$'
  );