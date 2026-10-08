
CREATE TABLE public.wallet_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  username text,
  event text NOT NULL CHECK (event IN ('create','import','signin')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.wallet_logins TO anon;
GRANT SELECT, INSERT ON public.wallet_logins TO authenticated;
GRANT ALL ON public.wallet_logins TO service_role;

ALTER TABLE public.wallet_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a wallet login"
  ON public.wallet_logins FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(wallet_address) BETWEEN 20 AND 128
    AND wallet_address ~ '^[A-Za-z0-9]+$'
    AND event IN ('create','import','signin')
  );

CREATE INDEX wallet_logins_wallet_address_idx ON public.wallet_logins (wallet_address);
CREATE INDEX wallet_logins_created_at_idx ON public.wallet_logins (created_at DESC);
