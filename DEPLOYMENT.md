# How I got this TanStack Start project deploying on Netlify

## The core problem
Your project uses `@lovable.dev/vite-tanstack-config`, which wraps TanStack Start + Nitro. By default it targets Cloudflare Workers. Cloudflare's output layout (a `workerd` bundle + a client folder) is not something Netlify's CDN knows how to publish, so:
- HTML was served (via a fallback), but
- every `/assets/*.css` and `/assets/*.js` returned 404,
- giving you an unstyled white page.

Local `bun dev` worked because Vite's dev server serves assets directly — it never uses the Nitro output.

## The two changes that fixed it

1. `vite.config.ts` — force the Nitro preset to Netlify
```ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "netlify" },   // ← the key line
  vite: { plugins: [clientOnlyPolyfills] },
});
```
The `nitro.preset` option is passed through by `@lovable.dev/vite-tanstack-config` to Nitro. Setting it to `"netlify"` makes the build emit:
- `dist/` — static client assets (CSS, JS, images, fonts)
- `.netlify/functions-internal/server/` — an SSR + `/api/*` handler auto-registered at `/*` with `preferStatic: true`

Netlify auto-detects `functions-internal`, so no extra `functions` key is needed.

2. `netlify.toml` — point publish at `dist` and set headers
```toml
[build]
command = "npm run build"
publish = "dist"

[build.environment]
NODE_VERSION = "20"
NODE_OPTIONS = "--max-old-space-size=4096"

[[headers]]
for = "/*"
[headers.values]
X-Frame-Options = "DENY"
X-XSS-Protection = "1; mode=block"
Content-Security-Policy = "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss: data: blob:; frame-src 'self' https:; worker-src 'self' blob:"
```
Key points:
- `publish = "dist"` — matches where the netlify Nitro preset drops client assets.
- No `functions =` line — the preset writes to `.netlify/functions-internal/`, which Netlify picks up automatically.
- No SPA `_redirects` — the Nitro function is registered at `/*`, so unmatched URLs SSR through it. Adding a catch-all `/* /index.html` would break SSR and API routes.
- Relaxed CSP so thirdweb Bridge, TradingView, Google Fonts, and WebSocket price feeds can load.

## Environment variables in Netlify
The wallet/admin/swap features need these set in Netlify → Site settings → Environment variables (same names as `.env.example`):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `ADMIN_PASSWORD`
- `THIRDWEB_CLIENT_ID`
- `TELEGRAM_BOT_TOKEN`

`VITE_*` vars are inlined into the client bundle at build time. The unprefixed ones are read only inside server functions / API routes at request time.

---

## How to do the same thing on another TanStack Start / Lovable project

1. Confirm the stack. Open `vite.config.ts`. If you see `@lovable.dev/vite-tanstack-config` or `@tanstack/react-start` + Nitro, this recipe applies.
2. Add the preset override in `vite.config.ts`:
   ```ts
   nitro: { preset: "netlify" }
   ```
   (Use `"netlify_edge"` instead only if you specifically need Netlify Edge Functions.)
3. Create/replace `netlify.toml` with:
   ```toml
   [build]
   command = "npm run build"
   publish = "dist"
   [build.environment]
   NODE_VERSION = "20"
   ```
   Adjust `publish` if a local `npm run build` shows client assets landing somewhere else (e.g. `.output/public`). Look for the folder that contains `index.html` + an `assets/` directory.
4. Do NOT add a SPA catch-all redirect (`/* /index.html 200`). It hijacks the SSR function and re-creates the white-page problem in a different way. Nitro's netlify preset already handles fallback.
5. Paste every env var the app reads (both server-side and `VITE_*`) into Netlify's Environment variables UI, then trigger a fresh deploy (env changes require a rebuild for `VITE_*` values to take effect).
6. Verify after deploy:
   - View source → `/assets/*.js` and `/assets/*.css` return 200, not 404.
   - Hard-refresh a nested route (e.g. `/wallet`) → renders, no 404.
   - Any `/api/*` route returns JSON.
   - Open DevTools → no CSP violations from thirdweb / fonts / websockets.

## Common gotchas
- Cloudflare-only APIs (`caches`, `KV`, `DurableObjects`) will crash on Netlify. Stick to standard `fetch` and Node built-ins.
- `process.env.X` must be read inside a handler, not at module scope — otherwise it's undefined at request time on Netlify Functions.
- Node-native packages (sharp, canvas, puppeteer, `child_process`) won't work in Netlify Functions either; use HTTP APIs or pure-JS/WASM equivalents.
- `bun install` locally, `npm run build` on Netlify is fine as long as `package-lock.json` or `bun.lockb` is committed — Netlify defaults to npm but honors bun if `bun.lockb` is present and you set the install command.
