# Esylivo Reach

Find jobs automatically on **LinkedIn, Naukri, Indeed India and Foundit**, pull out recruiters' emails and mobile numbers, and apply with a resume tailored to each job description. The UI and API live in one Next.js app.

## Features

- **Landing page, sign up and log in**, with each user's data kept separate.
- **Profile & resume:** headline, contact details, summary, skills, experience, education, projects and certifications.
- **Automatic job search on four sites:** LinkedIn hiring posts, Naukri, Indeed India and Foundit, searched in parallel. Each user picks which sites to use, and if one site fails the others' results are still saved.
- **When it searches:**
  - When a user logs in (or opens any page) and their last search is more than 12 hours old, a LinkedIn search starts in the background. The page shows progress and refreshes when results arrive.
  - It searches the user's **job keywords**, or, when none are set, keywords built from their **profile headline and skills**. Each site gets them in its own format (LinkedIn "hiring …" queries, Naukri and Indeed search URLs, Foundit keywords), with the location and posted-within window applied.
  - **Search now** runs one immediately. Saving new keywords also searches right away.
- **Results table:**
  - One row per job, showing the source site, the poster or company, the role, experience, salary and location, the description, extracted **emails and mobile numbers**, a match score with the matched skills, and the status.
  - Filters: **site**, **has email / has mobile number / email + mobile / no contact**, minimum match, status (to apply, applied, skipped, all) and text search.
  - Rows can be selected in bulk.
- **Tailored resume PDF for every job:**
  - Skills the job asks for are highlighted first.
  - The most relevant experience bullets and projects move to the top.
  - The summary is aimed at the role.
- **Resume templates:** Modern, Classic, Minimal and Bold, chosen in Profile with a PDF preview of each. All are single-column with plain section headings and real text, so applicant tracking systems can read them (a test renders every template and checks this).
- **ATS check:** scores a resume (your Esylivo resume in any template, or an uploaded PDF) against one of your jobs or a pasted job description. It reads the PDF the way an ATS does and scores keyword match (40%), readability (15%), contact details (10%), sections (15%) and content quality (20%), then lists matched/missing keywords and what to fix. Rule-based and free: no AI or credits used.
- **Interview prep (Prep tab):**
  - **Questions & answers:** a built-in bank of ~100 interview questions with formatted model answers (code samples, key points) across JavaScript, TypeScript, React, Next.js, Node.js, REST APIs, SQL, MongoDB, Python, Java, Git/CI, Docker/Cloud, Testing, Data Analysis, System Design and HR/behavioural. Topics are picked from the user's skills and jobs; search any keyword, filter by level, and mark questions Known / Review later to track progress.
  - **Mock interview:** pick topics or one of your jobs and 3, 5 or 10 questions. The interviewer can read each question aloud; answer by typing or speaking (browser speech recognition). Each answer is scored on the key points covered, with what was missed and the model answer, then a summary and a saved history.
  - **With AI configured** (`AI_BASE_URL` and `AI_MODEL` in `.env`), users can also generate questions for any keyword or a specific job description, and mock answers get interviewer-style AI feedback. Without AI, everything else works for free.
- **Apply on Naukri / Indeed / Foundit:** these sites have no apply API and require your own logged-in account, so the app can't submit the application for you. The **Apply on Naukri** button (and the Indeed and Foundit equivalents) opens the job on that site, and the job is marked **Applied** in your Applications log; undo it if you didn't apply.
- **One-click email apply:** sends a personalised email from your own mailbox with the tailored resume attached. You can review and edit the email first, or bulk-send to selected rows.
- **Auto-apply (optional):**
  - After each automatic search, new posts that have an email and meet your minimum match get your application.
  - Safety limits apply: a daily send cap, and no repeat emails to the same recruiter within 30 days.
- **Applications log** with send failures explained in plain words.
- **Optional AI** for resume summaries, using any OpenAI-compatible API, including free local models through Ollama.

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env      # then set SESSION_SECRET, CRON_SECRET and APIFY_TOKEN (see comments in the file)
npm run setup             # creates the SQLite database and the demo account
npm run dev
```

Open http://localhost:3000. Log in with **demo@esylivo.com / demo1234** (sample jobs from all four sites, with made-up companies and `.example` emails), or create an account. A new account's first search starts as soon as its profile has a headline and skills, or job keywords.

## Configuration

- **`APIFY_TOKEN`** (required for search): the app's own Apify token. It stays on the server; users never see Apify. These actors are used and billed to that account:

  | Site | Actor | Approx. price |
  |---|---|---|
  | LinkedIn | [harvestapi/linkedin-post-search](https://apify.com/harvestapi/linkedin-post-search) | $1.50 / 1,000 posts |
  | Naukri | [easyapi/naukri-jobs-scraper](https://apify.com/easyapi/naukri-jobs-scraper) | $5 / 1,000 jobs + $0.09 per run |
  | Indeed India | [misceres/indeed-scraper](https://apify.com/misceres/indeed-scraper) | $1–6 / 1,000 jobs (by Apify plan) |
  | Foundit | [themineworks/foundit-jobs-scraper](https://apify.com/themineworks/foundit-jobs-scraper) | $1.50–2.50 / 1,000 jobs |

  Each automatic search fetches up to 5 keywords × "results per keyword, per site" (15 by default) from each chosen site. With 3 keywords and all four sites, that's about **$0.70 per search**, run at most every 12 hours per user. Lower the defaults, or `AUTO_SEARCH_HOURS` in `lib/search.ts`, to spend less.
- **Email (per user, in Settings):** for Gmail, turn on 2-Step Verification, create an App Password (Google Account → Security → App passwords), and enter your Gmail address and that password. Use **Send test email** to check it. Passwords are encrypted with `SESSION_SECRET`.

## Credits and billing

Searching costs real money (Apify), so users spend **credits**:

- **Every search is charged `CREDIT_MARKUP` × its Apify cost** (2× by default), based on the results each site actually returned plus each site's per-run fee. So 50% of all credit spent is margin. Each charge is logged with the Apify cost beside it (`CreditTransaction.apifyCostMicros`), so you can check revenue against cost per user.
- **Free:** every new account gets **$2** of credit (`FREE_CREDIT_USD`).
- **Pro:** **$10/month** (`PRO_PRICE_USD`) adds **$10** of credit on every successful payment (Lemon Squeezy `subscription_payment_success`, once per invoice). Unused credit carries over.
- A search never spends more than the balance: when credit is low, results per keyword are reduced. When it can't afford a minimal search, automatic search pauses and the user is asked to upgrade.
- With all four sites, 3 keywords and 15 results each, a search costs at most about **$1.75** of credit (≈ $0.87 Apify). Naukri is the most expensive site.

Set up Lemon Squeezy with the `LEMONSQUEEZY_*` variables in `.env.example`. Until then, `SKIP_PAYMENT_GATEWAY="true"` makes **Upgrade** add a month of Pro credit without payment (testing only).

## Keeping results fresh without logins

`GET /api/cron/run` with `Authorization: Bearer <CRON_SECRET>` runs the automatic search (and auto-apply) for every user whose search is due. On Vercel, `vercel.json` calls it every 6 hours; each user is searched at most every 12 hours. Elsewhere, call it from any cron service.

## Deploying

1. Change `provider` in `prisma/schema.prisma` to `"postgresql"`, set `DATABASE_URL`, and run `npx prisma db push`.
2. Set every variable from `.env.example`, including `APP_URL`.
3. Searches take 1–3 minutes in the background, so the host must allow long-running functions (on Vercel, a plan with a 300-second limit).

## Project layout

```
app/page.tsx              landing page
app/(auth)                login, register, logout
app/(app)/layout.tsx      app shell; starts the automatic search when it's due
app/(app)/dashboard       search status, stats, best matches, recent applications
app/(app)/jobs            search status, job keywords, filters, results table, job review + email composer
app/(app)/profile         resume profile editor
app/(app)/settings        email account, email template, auto-apply
app/(app)/study           interview prep: questions & answers, mock interviews
app/(app)/ats             ATS check page
app/(app)/billing         credit balance, Free/Pro plans, upgrade, credit history
app/api/billing/webhook   Lemon Squeezy: plan changes and monthly credit
app/api/jobs/[id]/resume  tailored resume PDF ("general" = untailored)
app/api/cron/run          due automatic searches for all users
lib/search.ts             automatic search: scheduling, locking, running, saving
lib/queries.ts            search keywords from preferences or profile
samples/                  example results from each site's actor (demo data and tests)
lib/sources.ts            the four job sites: search input and result parsing for each
lib/apify.ts              Apify actor calls, LinkedIn post parsing, shared parsing helpers
lib/extract.ts            emails, phones and job title from post text
lib/skills.ts             skill vocabulary and match scoring
lib/tailor.ts             resume tailoring
lib/resume-pdf.ts         resume PDF layout
lib/pricing.ts            credit rules: markup, free credit, Pro price, search cost limits
lib/credits.ts            granting and charging credits (ledger)
lib/lemonsqueezy.ts       checkout, subscription and webhook helpers
lib/study/                interview question bank, topic picking, answer scoring, optional AI
components/rich-text.tsx  safe renderer for formatted answers
lib/ats.ts                ATS scoring rules
lib/pdf-text.ts           reads text from a PDF, as an ATS would
lib/resume-templates.ts   resume template list (layouts live in lib/resume-pdf.ts)
lib/outreach.ts           email drafting and sending, limits, auto-apply
```

## Use responsibly

Only email recruiters who asked for applications in their post. Keep the daily limit modest so your email account isn't flagged as spam. Esylivo Reach is not affiliated with LinkedIn, Naukri, Indeed or Foundit.
