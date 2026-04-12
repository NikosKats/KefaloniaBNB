# Deployment Guide

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file:
   `supabase/migrations/001_initial_schema.sql`
3. Go to **Storage** > Create bucket:
   - Name: `listing-images`
   - Public: ✅
   - Allowed MIME types: `image/jpeg, image/png, image/webp, image/avif`
   - Max file size: `5242880` (5MB)
4. Go to **Settings > API** and copy:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - Anon key → `PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Authentication > URL Configuration** and add your production URL

## 2. Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Go to **Developers > API Keys** and copy your **Secret key** → `STRIPE_SECRET_KEY`
3. After deploying, go to **Developers > Webhooks** > Add endpoint:
   - URL: `https://yoursite.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## 3. Resend Email Setup

1. Create account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Go to **API Keys** and create one → `RESEND_API_KEY`
4. Set `EMAIL_FROM` to a verified domain address (e.g. `noreply@villakeramoti.com`)
5. Set `EMAIL_OWNER` to your personal email for booking notifications

## 4. Cloudflare Pages Deploy

### Option A: GitHub integration (recommended)
1. Push this repo to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) > Create project > Connect to Git
3. Build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output**: `dist`
   - **Node.js version**: `20`
4. Add all environment variables from `.env.example`
5. Deploy!

### Option B: CLI deploy
```bash
cp .env.example .env
# Fill in all values in .env
npm run deploy
```

## 5. Admin Account Setup

1. After deploy, go to your Supabase project
2. Go to **Authentication > Users** > Invite User
3. Enter your email and send invite
4. You'll receive an email — click the link to set your password
5. Your account will be auto-added to the `profiles` table with `role: 'admin'`
6. Visit `https://yoursite.com/admin/login`

## 6. Add Your Property Photos

1. Log into admin at `/admin/login`
2. Go to **Listings** > click your listing
3. Scroll to **Photos** section
4. Upload your property images (JPG/PNG/WebP, max 5MB each)
5. The first image uploaded becomes the cover photo automatically

## 7. Update Public Site URL

After deployment, update `wrangler.toml` with your actual domain, and update the Supabase environment variable `PUBLIC_SITE_URL` to your production URL.

## Quick checklist before going live

- [ ] SQL migration run
- [ ] Storage bucket created
- [ ] All environment variables set in Cloudflare dashboard
- [ ] Admin account created and tested
- [ ] Listing photos uploaded
- [ ] Stripe webhook configured and tested
- [ ] Email sending verified (send a test inquiry)
- [ ] `PUBLIC_SITE_URL` set to production domain
- [ ] `robots.txt` updated with correct sitemap URL
- [ ] Test full booking flow end-to-end
