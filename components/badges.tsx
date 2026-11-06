import { SOURCES, type SourceKey } from "@/lib/sources";
import { cn } from "@/lib/utils";

const STATUS: Record<string, [string, string]> = {
  NEW: ["New", "bg-sky-50 text-sky-700 ring-sky-200"],
  SENT: ["Emailed", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  APPLIED: ["Applied on site", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  SKIPPED: ["Skipped", "bg-slate-100 text-slate-600 ring-slate-200"],
  FAILED: ["Failed", "bg-red-50 text-red-700 ring-red-200"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, style] = STATUS[status] ?? [status, STATUS.SKIPPED[1]];
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", style)}>{label}</span>;
}

export function SourceBadge({ source }: { source: string }) {
  const s = SOURCES[source as SourceKey];
  return (
    <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", s?.badge ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
      {s?.label ?? source}
    </span>
  );
}

/** Circular-ish match score pill: green 70+, amber 40+, grey below. */
export function MatchBadge({ score }: { score: number }) {
  const style =
    score >= 70
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : score >= 40
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-slate-100 text-slate-500 ring-slate-200";
  return <span className={cn("inline-flex min-w-12 justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset", style)}>{score}%</span>;
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- LinkedIn CDN avatars, not worth configuring next/image for
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full bg-slate-100 object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-fuchsia-100 text-xs font-semibold text-brand-700"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}
