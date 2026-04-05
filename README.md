# ScentRev waitlist launch

Single **Next.js** app under `frontend/`:

- **UI** — same experience as `apps/web/app/waitlist` (sections, GSAP, marquees, assets).
- **Server** — `POST /api/waitlist` uses **Supabase** (service role) for the `waitlist` table and **Resend** for the coupon email. Template lives in `frontend/lib/waitlist/couponEmailTemplate.ts`.

No separate backend service: deploy **only** `waitlist-launch/frontend` (e.g. Vercel).

## Local development

All configuration for `next dev` must live in **`frontend/.env.local`** (not `.env`). That file is gitignored.

```bash
cd waitlist-launch/frontend
npm install
cp .env.example .env.local
# Edit .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_*, NEXT_PUBLIC_* 
npm run dev
```

Open `http://localhost:3000`.

## Vercel

1. **Root directory:** `waitlist-launch/frontend`
2. **Environment variables** — add the same keys as in `.env.example`, but in the Vercel dashboard (`.env.local` is not uploaded). Use **server** scope for `SUPABASE_*` and `RESEND_*`; `NEXT_PUBLIC_*` are exposed to the client.

Ensure your **FastAPI** (or whichever serves `/api/v1/fragrances`) allows **CORS** from the launch domain for the marquee, or the strip will show skeletons until images load from cache.

## Email + DB

- **Resend:** verify sending domain; `RESEND_FROM_EMAIL` must use that domain.
- **Supabase:** `waitlist` table must match production (email, coupon_code, discount_percent, etc.). Use the **service role** key only in server env — never `NEXT_PUBLIC_*`.
