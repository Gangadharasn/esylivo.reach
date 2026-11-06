"use client";

import { Briefcase, Coins, GraduationCap, LayoutDashboard, MailCheck, ScanText, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const GROUPS = [
  {
    title: "Find work",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/applications", label: "Applications", icon: MailCheck },
    ],
  },
  {
    title: "Get ready",
    links: [
      { href: "/profile", label: "Profile & resume", icon: UserRound },
      { href: "/ats", label: "ATS check", icon: ScanText },
      { href: "/study", label: "Interview prep", icon: GraduationCap },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/billing", label: "Billing & credits", icon: Coins },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function NavLinks({ newCount }: { newCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6" aria-label="Main">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{group.title}</p>
          <div className="space-y-0.5">
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {active ? <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" /> : null}
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="flex-1">{label}</span>
                  {href === "/jobs" && newCount ? (
                    <span className="rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
                      {newCount > 99 ? "99+" : newCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
