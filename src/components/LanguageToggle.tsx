import { useEffect, useState } from "react";
import { Languages } from "lucide-react";

/**
 * Whole-site English/Chinese switch. Uses the free Google website translator
 * (cookie `googtrans`) so every text on every page is translated without
 * maintaining a dictionary. Choice is remembered in localStorage.
 */
type Lang = "en" | "zh";
const KEY = "pmc-lang";

function setCookie(value: string) {
  const host = window.location.hostname;
  const exp = value ? "" : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=${value}; path=/${exp}`;
  document.cookie = `googtrans=${value}; path=/; domain=${host}${exp}`;
  const root = host.split(".").slice(-2).join(".");
  if (root !== host) document.cookie = `googtrans=${value}; path=/; domain=.${root}${exp}`;
}

export function applyLanguage(lang: Lang, reload = true) {
  localStorage.setItem(KEY, lang);
  setCookie(lang === "zh" ? "/en/zh-CN" : "");
  if (reload) window.location.reload();
}

function loadTranslator() {
  if (document.getElementById("gt-script")) return;
  const holder = document.createElement("div");
  holder.id = "google_translate_element";
  holder.style.display = "none";
  document.body.appendChild(holder);
  (window as any).googleTranslateElementInit = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    new g.translate.TranslateElement({ pageLanguage: "en", includedLanguages: "en,zh-CN", autoDisplay: false }, "google_translate_element");
  };
  const s = document.createElement("script");
  s.id = "gt-script";
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(s);
}

export function useLanguage() {
  const [lang, setLang] = useState<Lang | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Lang | null;
    setLang(saved);
    if (saved === "zh") {
      setCookie("/en/zh-CN");
      loadTranslator();
    }
  }, []);
  return lang;
}

export function LanguageToggle() {
  const lang = useLanguage();
  const current: Lang = lang ?? "en";
  return (
    <button
      onClick={() => applyLanguage(current === "zh" ? "en" : "zh")}
      className="notranslate inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 hover:text-foreground"
      aria-label="Switch language"
    >
      <Languages className="h-3.5 w-3.5" />
      {current === "zh" ? "English" : "中文"}
    </button>
  );
}

/** First-visit prompt asking for the preferred language. */
export function LanguagePrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);
  if (!show) return null;
  const pick = (l: Lang) => {
    setShow(false);
    applyLanguage(l, l === "zh");
  };
  return (
    <div className="notranslate fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
        <Languages className="mx-auto h-8 w-8 text-primary" />
        <h2 className="font-display text-lg font-semibold">Choose your language · 选择语言</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => pick("en")} className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">English</button>
          <button onClick={() => pick("zh")} className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">中文</button>
        </div>
      </div>
    </div>
  );
}
