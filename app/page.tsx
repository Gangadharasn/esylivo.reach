import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  Filter,
  GraduationCap,
  Lock,
  MailCheck,
  ScanText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AtsMockup,
  ContactsIllustration,
  HeroMockup,
  InterviewMockup,
  ResumeIllustration,
  SearchIllustration,
  SendIllustration,
} from "@/components/landing/illustrations";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { FREE_CREDIT_USD, PRO_CREDIT_USD, PRO_PRICE_USD } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    tag: "Search",
    title: "We search four job sites for you, every few hours",
    body: "Tell us the roles you want, or just fill in your profile. Esylivo Reach turns it into searches on LinkedIn, Naukri, Indeed India and Foundit, then keeps looking on its own.",
    points: ["Keywords built from your headline and skills", "Location and “posted within” filters", "Runs automatically while you're away"],
    Illustration: SearchIllustration,
  },
  {
    tag: "Extract",
    title: "Every post becomes a clean row with real contacts",
    body: "No more scrolling through posts. We pull out the recruiter's email and mobile number, the role, experience, salary and location, and score how well you match.",
    points: ["Recruiter email and phone number", "Match score with the skills you share", "Filter by site, contact or match"],
    Illustration: ContactsIllustration,
  },
  {
    tag: "Tailor",
    title: "Your resume, rebuilt for each job description",
    body: "For every job, your resume is reshaped around what the employer asked for. The skills they want come first, your most relevant experience moves up, and the summary speaks to the role.",
    points: ["Four ATS-friendly templates", "Matched skills highlighted first", "Optional AI-written summaries"],
    Illustration: ResumeIllustration,
  },
  {
    tag: "Apply",
    title: "Apply in one click, or let autopilot do it",
    body: "Send a personal email with your tailored resume attached, straight from your own Gmail. Review it first, send in bulk, or turn on auto-apply for strong new matches.",
    points: ["Sent from your own mailbox", "Bulk send to selected jobs", "Daily limits keep you safe"],
    Illustration: SendIllustration,
  },
];

const FEATURES = [
  { icon: Zap, title: "Fully automatic", body: "Log in once and searching starts on its own. Turn on auto-apply and strong new matches get your application." },
  { icon: Filter, title: "Filter what matters", body: "Show posts with an email, a mobile number or both, by match score, by site or by status." },
  { icon: MailCheck, title: "Applications log", body: "See every application in one place, with send failures explained in plain words." },
  { icon: ShieldCheck, title: "Safe by design", body: "Daily send caps and no repeat emails to the same recruiter within 30 days." },
  { icon: Lock, title: "Private and encrypted", body: "Your data stays in your account. Mail passwords are stored encrypted." },
  { icon: Sparkles, title: "AI when you want it", body: "Everything works free without AI. Connect any AI model for written summaries and interview feedback." },
];

const FAQ = [
  {
    q: "Which job sites does it search?",
    a: "LinkedIn hiring posts, Naukri, Indeed India and Foundit. You choose which sites to use, and if one site is down the others' results are still saved.",
  },
  {
    q: "Does it apply on Naukri, Indeed or Foundit for me?",
    a: "Those sites need your own logged-in account, so we open the job on the site in one click and mark it as applied. For posts with a recruiter email, we send the application from your own mailbox.",
  },
  {
    q: "Will my resume pass applicant tracking systems (ATS)?",
    a: "All four templates are single-column with plain headings and real text, so ATS software can read them. The built-in ATS check scores your resume against any job and tells you what to fix.",
  },
  {
    q: "What do credits pay for?",
    a: `Searching job sites costs us money, so each search uses a little credit. You get $${FREE_CREDIT_USD} free when you sign up. Pro adds $${PRO_CREDIT_USD} every month, and unused credit carries over.`,
  },
  {
    q: "Do I need an AI subscription?",
    a: "No. Resume tailoring, ATS checks and interview prep all work free. AI is optional and only adds written summaries, custom questions and interviewer-style feedback.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="Esylivo Reach home">
            <Logo light />
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-medium text-brand-100/75 md:flex">
            {[
              ["How it works", "#how"],
              ["Features", "#features"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-100 hover:bg-white/10 sm:px-4">
              Log in
            </Link>
            <ButtonLink href="/register" variant="gradient">
              Start free
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/35 blur-[120px]" />
        <div className="pointer-events-none absolute -left-40 top-[28rem] size-[28rem] rounded-full bg-fuchsia-600/25 blur-[100px]" />


        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1.12fr] lg:gap-12 lg:pb-32">
          <div className="animate-fade-up text-center lg:text-left">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-4 text-sm text-brand-100 lg:mx-0">
              <span className="rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 px-2.5 py-0.5 text-xs font-semibold text-white">New</span>
              Interview prep & ATS check included
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:whitespace-nowrap sm:text-5xl lg:text-[2.75rem] xl:text-5xl">
              Find the job.
              <br />
              Reach the recruiter.
              <br />
              <span className="text-gradient">Get hired faster.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-brand-100/75 lg:mx-0">
              Esylivo Reach searches LinkedIn, Naukri, Indeed and Foundit for you, finds recruiters&apos; emails and phone numbers, and sends each one a
              resume tailored to their job.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <ButtonLink href="/register" variant="gradient" className="px-6 py-3.5 text-base">
                Create free account <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="border-white/15 bg-white/5 px-6 py-3.5 text-base text-white shadow-none hover:border-white/25 hover:bg-white/10">
                Try the live demo
              </ButtonLink>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-brand-100/60 lg:justify-start">
              {[`$${FREE_CREDIT_USD} free credit`, "No card needed", "Works with Gmail"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> {t}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-brand-200/50">Demo login: demo@esylivo.com / demo1234</p>
          </div>

          <div className="min-w-0 animate-fade-up [animation-delay:150ms]">
            <HeroMockup />
          </div>
        </div>

        {/* Job-site strip */}
        <div className="relative border-t border-white/5 bg-white/[0.02]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-7 sm:flex-row sm:justify-between sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-200/50">Searches the sites you already use</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-lg font-bold tracking-tight text-white/60">
              {["LinkedIn", "Naukri", "Indeed India", "Foundit"].map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="scroll-mt-16 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="How it works" title="From job post to sent application in four steps">
            Set up your profile once. Esylivo Reach handles the searching, sorting, tailoring and sending, and you stay in control of every step.
          </SectionHeading>

          {/* Quick overview */}
          <ol className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.tag} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-fuchsia-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-slate-800">{s.tag}</span>
              </li>
            ))}
          </ol>

          <div className="mt-16 space-y-20 sm:mt-24 sm:space-y-28">
            {STEPS.map(({ tag, title, body, points, Illustration }, i) => (
              <div key={tag} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={cn(i % 2 === 1 && "lg:order-2")}>
                  <p className="flex items-center gap-3 text-sm font-semibold text-brand-600">
                    <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 font-bold ring-1 ring-brand-100">{i + 1}</span>
                    Step {i + 1} · {tag}
                  </p>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h3>
                  <p className="mt-4 leading-relaxed text-slate-600">{body}</p>
                  <ul className="mt-6 space-y-3">
                    {points.map((p) => (
                      <li key={p} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <Check className="size-3 text-emerald-700" strokeWidth={3} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn(i % 2 === 1 && "lg:order-1")}>
                  <Illustration />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Interview-ready ---------------- */}
      <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-28">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="pointer-events-none absolute right-0 top-0 size-[30rem] rounded-full bg-brand-600/25 blur-[110px]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Beyond applying" title="Walk into the interview ready" dark>
            Getting the call is half the job. Check your resume the way an ATS reads it, then practise with a mock interviewer.
          </SectionHeading>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <PrepCard
              icon={ScanText}
              title="ATS check"
              body="Score any resume against a job: keywords, readability, contact details, sections and content quality, with exactly what to fix."
            >
              <AtsMockup />
            </PrepCard>
            <PrepCard
              icon={GraduationCap}
              title="Interview prep & mock interviews"
              body="About 100 questions with model answers across React, Node, SQL, Python, system design, HR and more. Answer by typing or speaking and get scored."
            >
              <InterviewMockup />
            </PrepCard>
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-16 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Features" title="Everything you need, nothing you don't">
            Built for job seekers in India who want more interviews with less busywork.
          </SectionHeading>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="group rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-lift">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-fuchsia-50 ring-1 ring-brand-100 transition-colors group-hover:from-brand-600 group-hover:to-fuchsia-600">
                  <Icon className="size-5 text-brand-600 transition-colors group-hover:text-white" />
                </span>
                <h3 className="mt-5 font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when it's working.">
            Searching job sites uses credits. Everything else, like tailored resumes, ATS checks and interview prep, is included.
          </SectionHeading>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-3xl p-8 ring-1 ring-slate-200">
              <p className="font-semibold text-slate-900">Free</p>
              <p className="mt-3 text-5xl font-extrabold tracking-tight text-slate-900">$0</p>
              <p className="mt-2 text-sm text-slate-500">To try it out properly</p>
              <PlanList items={[`$${FREE_CREDIT_USD} of search credit on sign-up`, "All four job sites", "Tailored resumes & ATS check", "Email apply from your Gmail", "Interview prep"]} />
              <ButtonLink href="/register" variant="secondary" className="mt-8 w-full py-3">
                Start free
              </ButtonLink>
            </div>
            <div className="relative flex flex-col rounded-3xl bg-ink p-8 text-white shadow-2xl shadow-brand-900/30 ring-1 ring-brand-500/40">
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-600/30 via-transparent to-fuchsia-600/20" />
              <span className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 px-3 py-1 text-xs font-bold">Most popular</span>
              <p className="relative font-semibold">Pro</p>
              <p className="relative mt-3 text-5xl font-extrabold tracking-tight">
                ${PRO_PRICE_USD}
                <span className="text-base font-medium text-brand-200/70">/month</span>
              </p>
              <p className="relative mt-2 text-sm text-brand-200/70">For an active job search</p>
              <PlanList dark items={[`$${PRO_CREDIT_USD} of search credit every month`, "Unused credit carries over", "Automatic search every few hours", "Auto-apply to strong matches", "Everything in Free"]} />
              <ButtonLink href="/register" variant="gradient" className="relative mt-8 w-full py-3">
                Get Pro <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-16 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-12 space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl bg-white px-6 py-1 shadow-card ring-1 ring-slate-200/70 open:ring-brand-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-brand-600" />
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-950 via-brand-800 to-fuchsia-700 px-6 py-16 text-center text-white shadow-2xl shadow-brand-900/30 sm:px-12">
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <BellRing className="relative mx-auto size-10 text-brand-200" />
          <h2 className="relative mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Stop scrolling. Start reaching.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-brand-100/80">
            Set up your profile in five minutes. Your first search starts as soon as you&apos;re done.
          </p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/register" className="bg-white px-6 py-3.5 text-base text-brand-700 shadow-xl hover:bg-brand-50">
              Get started free <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="border-white/25 bg-white/10 px-6 py-3.5 text-base text-white shadow-none hover:bg-white/20">
              Try the demo
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <Logo size={28} />
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Esylivo · Not affiliated with LinkedIn, Naukri, Indeed or Foundit.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, children, dark }: { eyebrow: string; title: string; children?: React.ReactNode; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={cn("text-sm font-bold uppercase tracking-[0.14em]", dark ? "text-brand-300" : "text-brand-600")}>{eyebrow}</p>
      <h2 className={cn("mt-3 text-3xl font-extrabold tracking-tight sm:text-[2.6rem] sm:leading-tight", dark ? "text-white" : "text-slate-900")}>{title}</h2>
      {children ? <p className={cn("mt-4 text-lg leading-relaxed", dark ? "text-brand-100/70" : "text-slate-600")}>{children}</p> : null}
    </div>
  );
}

function PrepCard({ icon: Icon, title, body, children }: { icon: typeof Zap; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-glow">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-100/70">{body}</p>
      <div className="mt-6 text-slate-900">{children}</div>
    </div>
  );
}

function PlanList({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="relative mt-6 flex-1 space-y-3 text-sm">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3">
          <Check className={cn("size-4 shrink-0", dark ? "text-fuchsia-300" : "text-brand-600")} strokeWidth={3} />
          <span className={dark ? "text-brand-50" : "text-slate-700"}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
