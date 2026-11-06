// Decorative product illustrations for the landing page. Built from markup so they
// stay sharp at any size, match the brand colours and cost nothing to load.
import { Bell, Briefcase, CheckCircle2, FileText, Mail, MapPin, Paperclip, Phone, Search, Send, Sparkles, Star } from "lucide-react";

import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const SITES = [
  { name: "LinkedIn", dot: "bg-sky-500" },
  { name: "Naukri", dot: "bg-blue-600" },
  { name: "Indeed", dot: "bg-indigo-500" },
  { name: "Foundit", dot: "bg-fuchsia-500" },
];

function Frame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-fuchsia-50 p-6 ring-1 ring-brand-100 sm:p-8",
        className,
      )}
    >
      <div className="bg-grid-light pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      {children}
    </div>
  );
}

function MatchRing({ value, size = 88 }: { value: number; size?: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="-rotate-90">
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6938ef" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r={r} stroke="#ede9fe" strokeWidth="8" fill="none" />
      <circle cx="40" cy="40" r={r} stroke="url(#ring-grad)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
    </svg>
  );
}

/* ---------- Step 1: we search every site ---------- */
export function SearchIllustration() {
  return (
    <Frame>
      <div className="relative mx-auto aspect-square w-full max-w-[340px]">
        {[100, 74, 48].map((pct) => (
          <div key={pct} className="absolute rounded-full border border-brand-200/70" style={{ inset: `${(100 - pct) / 2}%` }} />
        ))}
        <div className="absolute inset-0 animate-scan rounded-full bg-[conic-gradient(from_0deg,rgba(105,56,239,0.28),transparent_28%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 animate-ping-slow rounded-2xl bg-brand-400/40" />
          <LogoMark size={64} className="relative drop-shadow-xl" />
        </div>
        {SITES.map((s, i) => {
          const pos = ["left-0 top-[14%]", "right-0 top-[22%]", "left-[4%] bottom-[16%]", "right-[2%] bottom-[10%]"][i];
          return (
            <span
              key={s.name}
              className={cn("absolute flex animate-float items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lift ring-1 ring-slate-100", pos)}
              style={{ animationDelay: `${i * 0.8}s` }}
            >
              <span className={cn("size-2 rounded-full", s.dot)} /> {s.name}
            </span>
          );
        })}
      </div>
      <div className="mx-auto -mt-2 flex max-w-xs items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm shadow-lift ring-1 ring-slate-100">
        <Search className="size-4 text-brand-500" />
        <span className="flex-1 truncate text-slate-700">React developer · Bengaluru</span>
        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">AUTO</span>
      </div>
    </Frame>
  );
}

/* ---------- Step 2: contacts pulled out of the post ---------- */
export function ContactsIllustration() {
  return (
    <Frame>
      <div className="mx-auto max-w-sm space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-brand-500 text-sm font-bold text-white">PS</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Priya Sharma</p>
              <p className="text-xs text-slate-500">Talent Lead at TechCorp · 2h</p>
            </div>
            <span className="ml-auto rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">LinkedIn</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
            We&apos;re hiring a <b className="text-slate-800">Senior React Developer</b> (4–7 yrs) in Bengaluru! Send your CV to{" "}
            <mark className="rounded bg-brand-100 px-1 font-semibold text-brand-800">priya@techcorp.example</mark> or WhatsApp{" "}
            <mark className="rounded bg-fuchsia-100 px-1 font-semibold text-fuchsia-800">+91 98765 43210</mark>
          </p>
        </div>

        <div className="flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white shadow-glow">
            <Sparkles className="size-3.5" /> Contacts extracted
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Mail, label: "Email", value: "priya@techcorp.example", tone: "text-brand-600 bg-brand-50" },
            { icon: Phone, label: "Mobile", value: "+91 98765 43210", tone: "text-fuchsia-600 bg-fuchsia-50" },
            { icon: Briefcase, label: "Experience", value: "4–7 years", tone: "text-sky-600 bg-sky-50" },
            { icon: MapPin, label: "Location", value: "Bengaluru", tone: "text-emerald-600 bg-emerald-50" },
          ].map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="rounded-xl bg-white p-3 shadow-card ring-1 ring-slate-100">
              <span className={cn("flex size-7 items-center justify-center rounded-lg", tone)}>
                <Icon className="size-3.5" />
              </span>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="truncate text-xs font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Step 3: resume rebuilt for the job ---------- */
export function ResumeIllustration() {
  return (
    <Frame>
      <div className="relative mx-auto max-w-sm">
        <div className="rotate-[-2deg] rounded-2xl bg-white p-5 shadow-lift ring-1 ring-slate-100">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">AK</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Aarav Kumar</p>
              <p className="text-[11px] text-slate-500">Senior React Developer</p>
            </div>
            <FileText className="ml-auto size-4 text-slate-300" />
          </div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills · matched first</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {["React", "TypeScript", "Next.js", "Redux"].map((k) => (
              <span key={k} className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {k}
              </span>
            ))}
            {["Node.js", "AWS"].map((k) => (
              <span key={k} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {k}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Experience · most relevant on top</p>
          <div className="mt-2 space-y-2">
            {[92, 80, 64, 70].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", i < 2 ? "bg-brand-500" : "bg-slate-300")} />
                <span className={cn("h-2 rounded-full", i < 2 ? "bg-brand-200" : "bg-slate-100")} style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -right-3 -top-6 flex animate-float flex-col items-center rounded-2xl bg-white p-3 shadow-lift ring-1 ring-slate-100 sm:-right-8">
          <div className="relative">
            <MatchRing value={92} size={76} />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">92%</span>
          </div>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Job match</span>
        </div>

        <div className="absolute -bottom-4 -left-3 flex animate-float-slow items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-lift sm:-left-8">
          <CheckCircle2 className="size-4" /> ATS-ready PDF
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Step 4: one-click apply ---------- */
export function SendIllustration() {
  return (
    <Frame>
      <div className="relative mx-auto max-w-sm">
        <div className="overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-slate-100">
          <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
            <span className="ml-2 text-[11px] font-semibold text-slate-500">New application</span>
          </div>
          <div className="space-y-2 px-4 py-3 text-xs">
            <p className="border-b border-slate-100 pb-2 text-slate-500">
              To <span className="font-semibold text-slate-800">priya@techcorp.example</span>
            </p>
            <p className="border-b border-slate-100 pb-2 font-semibold text-slate-800">Application: Senior React Developer, Aarav Kumar</p>
            <p className="leading-relaxed text-slate-600">
              Hi Priya, I saw your post about the Senior React Developer role. I have 5 years building React and TypeScript apps…
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-2 ring-1 ring-brand-100">
              <Paperclip className="size-3.5 text-brand-600" />
              <span className="truncate font-semibold text-brand-800">Aarav_Kumar_TechCorp.pdf</span>
              <span className="ml-auto text-[10px] text-brand-500">tailored</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-[11px] text-slate-400">From your own Gmail</span>
            <span className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-glow">
              <Send className="size-3.5" /> Send
            </span>
          </div>
        </div>
        <div className="absolute -right-2 -top-5 flex animate-float items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-lift ring-1 ring-slate-100 sm:-right-8">
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-4 text-emerald-600" />
          </span>
          Application sent
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Hero: the app at a glance ---------- */
const ROWS = [
  { initials: "PS", name: "Priya Sharma", role: "Senior React Developer", place: "Bengaluru", email: "priya@techcorp.example", site: "LinkedIn", score: 92 },
  { initials: "AM", name: "Finly", role: "Node.js Backend Engineer", place: "Remote", email: "careers@finly.example", site: "Naukri", score: 81 },
  { initials: "NG", name: "CloudNest", role: "Full Stack Developer (MERN)", place: "Pune", email: "hr@cloudnest.example", site: "Indeed", score: 74 },
  { initials: "RV", name: "Rahul Verma", role: "Frontend Engineer, Next.js", place: "Hyderabad", email: "rahul@shopwave.example", site: "Foundit", score: 66 },
];

export function HeroMockup() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-brand-600/40 via-fuchsia-500/30 to-pink-500/30 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl bg-white text-left shadow-2xl shadow-black/40 ring-1 ring-white/20">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="mx-auto rounded-md bg-white px-10 py-1 text-[10px] text-slate-400 ring-1 ring-slate-200">reach.esylivo.com/jobs</span>
        </div>
        <div className="flex">
          <div className="hidden w-40 shrink-0 space-y-1 border-r border-slate-100 p-3 sm:block">
            <div className="mb-3 flex items-center gap-1.5">
              <LogoMark size={20} />
              <span className="text-[11px] font-bold text-slate-800">Reach</span>
            </div>
            {["Dashboard", "Jobs", "Applications", "Profile", "ATS check", "Interview prep"].map((l) => (
              <div key={l} className={cn("rounded-md px-2 py-1.5 text-[11px] font-medium", l === "Jobs" ? "bg-brand-50 text-brand-700" : "text-slate-500")}>
                {l}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Jobs for you</p>
                <p className="text-[11px] text-slate-500">48 found · 31 with recruiter email</p>
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-brand-600 to-fuchsia-600 px-2.5 py-1.5 text-[11px] font-semibold text-white">
                <Send className="size-3" /> Apply to 3
              </span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {["Has email", "70%+ match", "All sites"].map((f, i) => (
                <span key={f} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-1", i === 0 ? "bg-brand-50 text-brand-700 ring-brand-200" : "text-slate-500 ring-slate-200")}>
                  {f}
                </span>
              ))}
            </div>
            <div className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-100">
              {ROWS.map((r, i) => (
                <div key={r.email} className={cn("flex items-center gap-3 px-3 py-2.5", i === 0 && "bg-brand-50/40")}>
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      i < 3 ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300",
                    )}
                  >
                    {i < 3 ? <CheckCircle2 className="size-3" /> : null}
                  </span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-fuchsia-100 text-[10px] font-bold text-brand-700">
                    {r.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">{r.role}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      {r.name} · {r.place} · <span className="text-brand-600">{r.email}</span>
                    </p>
                  </div>
                  <span className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 md:inline">{r.site}</span>
                  <span
                    className={cn(
                      "w-10 rounded-full py-0.5 text-center text-[10px] font-bold",
                      r.score >= 70 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {r.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-4 top-24 hidden animate-float items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-2xl ring-1 ring-slate-100 sm:flex lg:-left-12">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50">
          <Bell className="size-4 text-brand-600" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">12 new matches</p>
          <p className="text-[10px] text-slate-500">Auto-search · just now</p>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-3 hidden animate-float-slow items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-2xl ring-1 ring-slate-100 sm:flex lg:-right-10">
        <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50">
          <Star className="size-4 fill-emerald-500 text-emerald-500" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">Resume tailored · 92%</p>
          <p className="text-[10px] text-slate-500">Senior React Developer</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small mockups for the "get interview-ready" section ---------- */
export function AtsMockup() {
  return (
    <div aria-hidden="true" className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-slate-100">
      <div className="flex items-center gap-4">
        <div className="relative">
          <MatchRing value={86} size={72} />
          <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-slate-900">86</span>
        </div>
        <div className="flex-1 space-y-1.5">
          {[
            ["Keywords", 88],
            ["Readability", 95],
            ["Sections", 80],
          ].map(([label, v]) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                <span>{label}</span>
                <span>{v}%</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {["React ✓", "Redux ✓", "Jest ✗"].map((k) => (
          <span key={k} className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", k.endsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

export function InterviewMockup() {
  return (
    <div aria-hidden="true" className="space-y-2.5 rounded-2xl bg-white p-4 shadow-lift ring-1 ring-slate-100">
      <div className="flex gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">AI</span>
        <p className="rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[11px] text-slate-700">What does the useEffect dependency array do?</p>
      </div>
      <div className="flex justify-end">
        <p className="rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-2 text-[11px] text-white">It re-runs the effect only when those values change…</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="size-3.5" /> 4 of 5 key points covered
      </div>
    </div>
  );
}
