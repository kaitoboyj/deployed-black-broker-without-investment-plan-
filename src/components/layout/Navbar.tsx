import { Link, useRouterState } from "@tanstack/react-router";
import { Check, ChevronDown, LogOut, Menu, Plus, User, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWalletAccounts, useWalletSession } from "@/hooks/useWalletSession";
import { clearSession, switchAccount } from "@/lib/wallet-auth";
import { forgetPrivateKey } from "@/lib/wallet-signer";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/markets", label: "Markets" },
  { to: "/trade", label: "Trade" },
  { to: "/swap", label: "Swap" },
  { to: "/wallet", label: "Wallet" },
  { to: "/news", label: "News" },
  { to: "/how-it-works", label: "How it works" },
] as const;

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const session = useWalletSession();
  const accounts = useWalletAccounts();
  const [menu, setMenu] = useState(false);

  const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

  const onSwitch = (address: string) => {
    setMenu(false);
    if (address !== session?.address) switchAccount(address);
  };

  const signOut = () => {
    if (session?.address) forgetPrivateKey(session.address);
    clearSession();
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="PrimeCapital"
              className="h-9 w-9 rounded-lg object-contain shadow-glow"
            />
            <span className="font-display text-lg font-semibold tracking-tight">
              Prime<span className="text-gradient">Capital</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-md bg-white/5 ring-1 ring-white/10" aria-hidden />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setMenu((m) => !m)}
                    className="inline-flex items-center gap-2 rounded-md glass px-3 py-2 text-sm font-medium"
                    aria-label="Switch account"
                  >
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="text-foreground">{session.username}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {menu && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-white/10 bg-card shadow-xl">
                      <p className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Accounts on this device
                      </p>
                      {accounts.map((acc) => (
                        <button
                          key={acc.address}
                          onClick={() => onSwitch(acc.address)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-foreground">{acc.username}</span>
                            <span className="block truncate font-mono text-[11px] text-muted-foreground">
                              {short(acc.address)}
                            </span>
                          </span>
                          {acc.address === session.address && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      ))}
                      <Link
                        to="/wallet"
                        onClick={() => setMenu(false)}
                        className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-sm text-foreground hover:bg-white/5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add another account
                      </Link>
                    </div>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </>
            ) : (
              <Link
                to="/wallet"
                className="rounded-md bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
              >
                Get started
              </Link>

            )}
          </div>

          <button
            className="md:hidden rounded-md p-2 text-foreground/80 hover:bg-white/5"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden glass border-b border-white/5">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground/90 hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            {session ? (
              <>
                {accounts.length > 1 && (
                  <div className="mt-2 rounded-md border border-white/10">
                    {accounts.map((acc) => (
                      <button
                        key={acc.address}
                        onClick={() => {
                          onSwitch(acc.address);
                          setOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                      >
                        <span className="min-w-0 truncate text-foreground">{acc.username}</span>
                        {acc.address === session.address && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <Link
                  to="/wallet"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-md border border-white/10 px-4 py-2 text-center text-sm text-foreground"
                >
                  Add another account
                </Link>
              <button
                onClick={signOut}
                className="mt-2 rounded-md bg-[image:var(--gradient-brand)] px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
              >
                Sign out
              </button>
              </>
            ) : (
              <Link
                to="/wallet"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-md bg-[image:var(--gradient-brand)] px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
              >
                Get started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
