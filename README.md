## compIQ

**Live**: https://frontend-liard-iota-35.vercel.app

Real estate comps analysis SaaS. Enter an address, get comparable sales, value estimates, rent projections, and a full CMA report.

### Stack
- **Backend**: Python / FastAPI / asyncpg / Neon Postgres
- **Frontend**: React 19 / Vite / Tailwind / React Query / Zustand
- **Payments**: Stripe (checkout + webhooks)
- **Data**: RentCast API (property data, comps, rent estimates)
- **Deploy**: Vercel (frontend) / Render (backend)

### Dev Setup
```
make dev          # starts backend (8000) + frontend (5173)
make migrate      # run DB migrations
```

### Auth (Clerk)
- Get your publishable key from [dashboard.clerk.com](https://dashboard.clerk.com/~/api-keys) (choose **React**)
- Set `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env.local`

### Stripe (test mode)
- **Product**: compIQ Pro ($29/mo) — `prod_UCLrQQ0Op3mIcj`
- **Price ID**: `price_1TDxADD0MTNYAfYXYYCJYabk`
- **Admin customer**: `cus_UCdSHhLNP9tIGT` / sub `sub_1TEECXD0MTNYAfYXJvF1AsdM`
- **Test card**: `4242 4242 4242 4242` / any future exp / any CVC

### Env vars
**frontend/.env.local**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**backend/.env**
```
DATABASE_URL=...
RENTCAST_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_1TDxADD0MTNYAfYXYYCJYabk
SITE_URL=http://localhost:5173
```
