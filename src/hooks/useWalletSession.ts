import { useEffect, useState } from "react";
import { listAccounts, loadSession, type WalletSession } from "@/lib/wallet-auth";

export function useWalletSession(): WalletSession | null {
  const [session, setSession] = useState<WalletSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
    const handler = () => setSession(loadSession());
    window.addEventListener("prime:session-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("prime:session-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return session;
}

/** Every account signed in on this device, active one first. */
export function useWalletAccounts(): WalletSession[] {
  const [accounts, setAccounts] = useState<WalletSession[]>([]);

  useEffect(() => {
    const read = () => setAccounts(listAccounts());
    read();
    window.addEventListener("prime:session-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("prime:session-change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return accounts;
}
