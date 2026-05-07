# Security Headers

Configured in [`obra/vercel.json`](../obra/vercel.json) as platform-level headers applied to every response.

## Content-Security-Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in;
connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests
```

### Directive rationale

| Directive | Allowed origins | Reason |
|-----------|----------------|--------|
| `script-src` | `'self'` + `https://vercel.live` + sha256 hash | Vite production bundles all JS into `/assets/`. `vercel.live` and the hash cover Vercel's preview toolbar (injected only in preview deployments; inert in production). The `modulePreload.polyfill` is disabled in `vite.config.ts` to avoid a second inline script. |
| `style-src` | `'self'` + `'unsafe-inline'` + `fonts.googleapis.com` | Google Fonts CSS is fetched from googleapis.com. `'unsafe-inline'` covers dynamic style injection from shadcn/ui and Radix primitives; removing it requires auditing every component. |
| `font-src` | `'self'` + `fonts.gstatic.com` | Fraunces and Plus Jakarta Sans binary font files are served by Google. |
| `img-src` | `'self'` + `data:` + `blob:` + `*.supabase.co` / `*.supabase.in` | Section images and covers are stored in Supabase Storage. `data:` covers base64 previews; `blob:` covers object URLs created during PDF export. |
| `connect-src` | `'self'` + `*.supabase.co` / `*.supabase.in` + `wss://` variants + `vercel.live` + `wss://ws-us3.pusher.com` | Supabase REST (PostgREST), Auth, Storage, and Realtime (WebSocket). Vercel live toolbar uses Pusher for real-time in preview deployments. |
| `frame-src` | `'none'` | No iframes used. Mercado Pago checkout runs via server-side redirect (Edge Functions), not an embedded widget. |
| `object-src` | `'none'` | Flash/plugins not used. |
| `base-uri` | `'self'` | Prevents base-tag injection. |
| `form-action` | `'self'` | No HTML form posts to third parties. |
| `upgrade-insecure-requests` | — | Forces all sub-resource loads to HTTPS in production. |

## Other headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends origin only on cross-origin requests; full URL for same-origin. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing. |
| `X-Frame-Options` | `DENY` | Belt-and-suspenders clickjacking protection alongside `frame-ancestors` (implicit via `default-src`). |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables browser features the app does not use. |

## Extending the policy

### Adding a new third-party API (fetch/WebSocket)

Add its origin to `connect-src`:

```json
"connect-src 'self' https://*.supabase.co ... https://api.newservice.com"
```

### Adding a third-party script (analytics, support widget, etc.)

Add its CDN origin to `script-src`. If the script also injects inline code, a **hash** or **nonce** is preferred over `'unsafe-inline'`:

```
script-src 'self' https://cdn.newservice.com
```

If the vendor requires a nonce, configure `@vitejs/plugin-legacy` or a custom Vite plugin to inject it and add `'nonce-<value>'` to `script-src`.

### Adding an embed (iframe)

Add its origin to `frame-src`:

```
frame-src https://embed.newservice.com
```

### Staging: Report-Only mode

To audit the policy before enforcing it, set the header key to `Content-Security-Policy-Report-Only` in a staging Vercel environment and add a `report-uri` endpoint (e.g. [Report URI](https://report-uri.com)):

```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "... ; report-uri https://your-report-endpoint/csp"
}
```

### Supabase custom domain

If the project moves to a custom Supabase domain (e.g. `db.obra.app`), add it explicitly to `connect-src` and `img-src` and remove the `*.supabase.co` wildcard if no longer needed.
