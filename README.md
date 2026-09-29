# Going Going Gone

Local online auctions. People sign in with their email, list items with photos, and bid until the clock runs out. The winner and seller then see each other's email to arrange payment and collection.

Built with **Next.js 16** and **Supabase** (database, sign-in, photo storage, live updates). Hosted on **Vercel**. All three have free tiers that are plenty to start.

## What's included

| Page | What it does |
|---|---|
| `/` | Open lots with categories, search, sorting, and "Recently gone" |
| `/lot/[id]` | Photos, live price and bid history, bid form, seller tools, report button |
| `/sell` | Listing form with up to 6 photos (resized in the browser before upload) |
| `/login` | Email sign-in: a link or a 6-digit code, no passwords |
| `/account` | Name and area, plus lots you're bidding on, won, selling and sold |
| `/how-it-works`, `/terms`, `/privacy` | Information pages. **Terms and privacy are starter drafts.** |

How bidding works, all enforced by the database rather than the browser:

- Bids must beat the current price by a saleroom-style step (50p under £20, up to £50 over £5,000).
- Sellers can't bid on their own lots, and nobody can bid after the end.
- A bid in the last 2 minutes pushes the end time to 2 minutes from then (stops last-second sniping).
- Lots show **Going once** in the final hour and **Going twice** in the final 10 minutes.
- Sellers can end early, and can withdraw a lot only before anyone bids.
- When a lot ends with a bid, only the winner and the seller can see each other's email.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Choose the **London (eu-west-2)** region.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, and click **Run**. This creates the tables, security rules, bidding functions and the `lot-photos` storage bucket.
3. Go to **Authentication → Emails → Templates → Magic Link** and replace the message body with:

   ```html
   <h2>Sign in to Going Going Gone</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">Sign in</a></p>
   <p>Or enter this code: <strong>{{ .Token }}</strong></p>
   ```

   Paste the same body into the **Confirm signup** template, which is what brand-new users receive. This lets people open the link on a different device from the one they signed in on, or just type the code.
4. Go to **Authentication → URL Configuration** and set **Site URL** to your live address (for example `https://goinggoinggone.co.uk`). Add `http://localhost:3000/**` and your Vercel address (`https://*.vercel.app/**`) under **Redirect URLs**.
5. Go to **Project Settings → API** and copy the **Project URL** and the **publishable key** (called the anon key on older projects).

### 2. Run it on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000. You need Node.js 20.9 or newer.

### 3. Put it online with Vercel

1. Push the project to a GitHub repository.
2. At [vercel.com](https://vercel.com), click **Add New → Project** and import the repository.
3. Add the four environment variables from `.env.example`, with `NEXT_PUBLIC_SITE_URL` set to your live address.
4. Deploy. To use your own domain, add it under **Settings → Domains**, then update the Site URL in Supabase to match.

### 4. Before you share it with the local groups

- **Email sending.** Supabase's built-in email is only meant for testing and allows just a few emails an hour. Set up your own sender under **Authentication → Emails → SMTP Settings** (Resend, Brevo and Postmark all have free tiers), or sign-ins will stop working once more than a handful of people join.
- **Terms and privacy.** Fill in your details and have them checked. Consider whether you need to register with the ICO.
- **Online Safety Act.** Sites where users post content need a basic risk assessment and a way to report and remove harmful content. The report button and the steps below cover the basics, but check Ofcom's guidance for small services.
- **Test it with a few friends** first: list, bid from two accounts, let a short auction end, and check both sides see the contact details.

## Running the site day to day

- **Reports:** in Supabase, open **Table Editor → reports**. Each row has the lot id and the reason.
- **Remove a listing:** in **Table Editor → lots**, set that lot's `status` to `removed`.
- **Ban someone:** in **Authentication → Users**, find them and choose **Delete user**. Their listings and bids are deleted with them.
- **Backups:** paid Supabase plans include daily backups. On the free plan, export your tables now and then from the dashboard.
- **Free-tier limits:** 500MB of database and 1GB of photo storage. Photos are about 300KB each, so that's around 3,000 photos. Free projects also pause after a week with no visitors.

## Files

```
app/                  pages (Next.js App Router)
  lot/[id]/LotLive.js   the live lot page: bidding, photos, seller tools
  sell/SellForm.js      listing form with photo upload
  login/LoginForm.js    email link / code sign-in
components/           lot card and live countdown
lib/format.js         prices, bid steps, categories, time left
lib/photos.js         resizing and uploading photos
lib/supabase/         Supabase connections for server and browser
proxy.js              keeps people signed in; guards /sell and /account
supabase/schema.sql   the whole database, security rules and bidding logic
```

The bid steps live in two places that must match: `increment()` in `lib/format.js` and `bid_increment()` in `supabase/schema.sql`. Categories are also listed in both files.

## Ideas for later

- Email alerts for "you've been outbid" and "you won" (Supabase Database Webhooks with a small Edge Function, or a Vercel cron job)
- Proxy bidding, where people set a maximum and the site bids for them
- Reserve prices and "Buy it now"
- Seller ratings after each sale
- Payments through Stripe
Launched on Vercel.
