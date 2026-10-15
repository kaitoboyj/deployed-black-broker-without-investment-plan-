# Netlify Environment Variables Setup

## Build and hosting configuration

Connect the project repository to Netlify; the committed `netlify.toml` supplies the build settings:

- Node.js 22.
- Build command: `npm run build && node scripts/register-telegram-webhook.mjs`.
- Publish directory: `dist`.
- Nitro target: `netlify`, selected only for Netlify builds; Lovable preview keeps its own target.
- Nitro generates the server function and route handling. Do not add a catch-all `/index.html` SPA redirect: pages and `/api/*` require the server.
- Configure the variables below for both build and function runtime as appropriate. Only publishable browser configuration may use the `VITE_` prefix.

The existing Nitro adapter is retained deliberately; adding the separate Netlify Vite adapter alongside it would create competing deployment outputs.

## Deployment verification

After the first Netlify deployment, check `/`, `/markets`, `/news`, `/wallet`, `/swap`, and `/trade`, including a direct refresh on each page. Check `/api/markets?per_page=5` and `/api/news` return data, then verify wallet actions using your own wallet session. If using Telegram, check the webhook registration and delivery against the Netlify domain. A working Lovable preview does not prove the Netlify deployment or its runtime secrets are configured.

No Netlify deployment was performed as part of the home-page design update; deployed functions and wallet actions still require a hosted check.

## Required Environment Variables

Add these variables in your Netlify dashboard:
1. Go to your site → Site Settings → Environment variables
2. Click "Add a variable" for each variable below

### Client-side Variables (VITE_ prefix required)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Server-side Variables
```
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Other Required Variables
```
ADMIN_PASSWORD=your_admin_password
THIRDWEB_CLIENT_ID=your_thirdweb_client_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=your_strong_random_webhook_secret
TELEGRAM_CHAT_ID=-1003957750577
```

## After Setting Variables

1. Go to Deploys in Netlify
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. Wait for deployment to complete
4. Test the login feature

## Important Notes

- The `VITE_` prefix is critical for client-side access in Vite projects
- Ensure no extra spaces in variable values
- Never commit actual secrets to git
- The service role key should be kept secure

### Withdrawal emails (Gmail)
```
SMTP_USER=primecapitalsupportchat@gmail.com
SMTP_PASS=your 16-character Gmail app password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
```

For Gmail, enable two-step verification and create an App Password. A normal Gmail password will not work.
The deploy registers the Telegram webhook automatically only when both Telegram secrets are present.
