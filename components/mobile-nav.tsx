"use client";

import { Briefcase, Coins, GraduationCap, LayoutDashboard, LogOut, MailCheck, ScanText, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/(auth)/actions";
import { Avatar } from "@/components/badges";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/study", label: "Prep", icon: GraduationCap },
  { href: "/ats", label: "ATS", icon: ScanText },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Phone navigation: fixed tab bar at the bottom, within thumb reach. */
export function BottomNav({ newCount }: { newCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(16_24_40/0.12)] backdrop-blur-xl md:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-700" : "text-slate-500")}
            >
              {active ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gradient-to-r from-brand-600 to-fuchsia-600" /> : null}
              <span className={cn("relative rounded-full px-3 py-1", active && "bg-brand-50")}>
                <Icon className="size-5" />
                {href === "/jobs" && newCount ? (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-fuchsia-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
                    {newCount > 99 ? "99+" : newCount}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Avatar button in the phone top bar: account details, settings and log out. */
export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Account menu" aria-expanded={open} className="rounded-full ring-2 ring-brand-100">
        <Avatar name={name} size={34} />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
          <Link href="/applications" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
            <MailCheck className="size-4 text-slate-400" /> Applications
          </Link>
          <Link href="/billing" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
            <Coins className="size-4 text-slate-400" /> Billing & credits
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
            <Settings className="size-4 text-slate-400" /> Settings
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
