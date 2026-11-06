import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Esylivo Reach mark: a source point sending out "reach" waves toward a spark,
 * the moment a job match is found. Pure SVG, so it is crisp at any size.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7a5af8" />
          <stop offset="0.55" stopColor="#6938ef" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="20" y1="0" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id}-bg)`} />
      <rect width="40" height="40" rx="11" fill={`url(#${id}-shine)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" stroke="#fff" strokeOpacity="0.18" />
      {/* Reach waves from the bottom-left source point. */}
      <path d="M11 20.5a8.5 8.5 0 0 1 8.5 8.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M11 13a16 16 0 0 1 16 16" stroke="#fff" strokeOpacity="0.62" strokeWidth="3" strokeLinecap="round" />
      <circle cx="11.5" cy="28.5" r="3.2" fill="#fff" />
      {/* The spark: a match found. */}
      <path d="M29 7.5c.45 2.6 1.4 3.55 4 4-2.6.45-3.55 1.4-4 4-.45-2.6-1.4-3.55-4-4 2.6-.45 3.55-1.4 4-4Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ light, size = 32, className }: { light?: boolean; size?: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className={cn("text-[1.05rem] font-bold leading-none tracking-tight", light ? "text-white" : "text-slate-900")}>
        Esylivo
        <span className={cn("ml-1 font-semibold", light ? "text-brand-300" : "text-brand-600")}>Reach</span>
      </span>
    </span>
  );
}
