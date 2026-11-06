import { CheckCircle2, FileText, Mail, Search } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";

const POINTS = [
  { icon: Search, text: "Searches LinkedIn, Naukri, Indeed & Foundit for you" },
  { icon: Mail, text: "Finds recruiters' emails and phone numbers" },
  { icon: FileText, text: "Tailors your resume to every job description" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </div>
        <p className="text-center text-xs text-slate-400">© {new Date().getFullYear()} Esylivo. Your data stays private to your account.</p>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[26rem] rounded-full bg-fuchsia-600/30 blur-3xl" />

        <div className="relative max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Your job search, <span className="text-gradient">on autopilot.</span>
          </h2>
          <p className="mt-4 text-brand-100/75">Set up your profile once. We find the jobs, tailor the resume and help you reach the recruiter.</p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4 text-brand-200" />
                </span>
                <span className="text-sm text-brand-50">{text}</span>
              </li>
            ))}
          </ul>

          {/* Product glimpse */}
          <div className="mt-10 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-fuchsia-500 text-sm font-bold">PS</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Senior React Developer</p>
                <p className="truncate text-xs text-brand-200/70">TechCorp · Bengaluru · priya@techcorp.example</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300">92%</span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-400/20">
              <CheckCircle2 className="size-4" /> Tailored resume sent · 2 min ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
