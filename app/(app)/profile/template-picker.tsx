"use client";

import { Check, Eye, LayoutTemplate } from "lucide-react";
import { useState, useTransition } from "react";

import { Card, CardHeader } from "@/components/ui";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@/lib/resume-templates";
import { cn } from "@/lib/utils";

import { saveTemplateAction } from "./actions";

export function TemplatePicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [, start] = useTransition();

  const choose = (id: ResumeTemplateId) => {
    setSelected(id);
    start(() => saveTemplateAction(id));
  };

  return (
    <Card>
      <CardHeader
        title="Resume template"
        description="Used for every tailored resume. All templates are single-column and ATS-friendly."
        action={<LayoutTemplate className="size-5 text-brand-500" />}
      />
      <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-5 lg:grid-cols-4">
        {RESUME_TEMPLATES.map((t) => {
          const active = selected === t.id;
          return (
            <div
              key={t.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl ring-1 transition-shadow",
                active ? "shadow-lg shadow-brand-600/10 ring-2 ring-brand-500" : "ring-slate-200 hover:shadow-md",
              )}
            >
              <button type="button" onClick={() => choose(t.id)} className="relative block bg-slate-50 p-3 text-left" aria-label={`Use the ${t.name} template`}>
                <MiniResume id={t.id} accent={t.accent} />
                {active ? (
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </button>
              <div className="flex flex-1 flex-col p-3">
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="mt-0.5 flex-1 text-xs text-slate-500">{t.description}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => choose(t.id)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium",
                      active ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {active ? "Selected" : "Use"}
                  </button>
                  <a
                    href={`/api/jobs/general/resume?template=${t.id}`}
                    target="_blank"
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    aria-label={`Preview the ${t.name} template`}
                  >
                    <Eye className="size-3.5" /> PDF
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** A tiny drawing of the template's layout, so users can compare at a glance. */
function MiniResume({ id, accent }: { id: ResumeTemplateId; accent: string }) {
  const center = id === "classic";
  const line = (w: string, extra = "") => <div className={cn("h-1 rounded-full bg-slate-300", extra)} style={{ width: w }} />;
  return (
    <div className="mx-auto aspect-[1/1.3] w-full max-w-36 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-200">
      {id === "bold" ? (
        <div className="px-2.5 pb-2 pt-2.5" style={{ background: accent }}>
          <div className="h-2 w-2/3 rounded-full bg-white" />
          <div className="mt-1 h-1 w-1/3 rounded-full bg-white/60" />
        </div>
      ) : (
        <div className={cn("px-2.5 pt-2.5", center && "flex flex-col items-center")}>
          {id === "modern" ? <div className="-mx-2.5 -mt-2.5 mb-2 h-1" style={{ background: accent }} /> : null}
          <div className="h-2 w-2/3 rounded-full" style={{ background: id === "modern" ? "#111827" : accent }} />
          <div className="mt-1 h-1 w-1/3 rounded-full" style={{ background: id === "modern" ? accent : "#94a3b8" }} />
          <div className="mt-1 h-0.5 w-4/5 rounded-full bg-slate-200" />
        </div>
      )}
      <div className="space-y-2 px-2.5 py-2">
        {["Summary", "Skills", "Experience"].map((s) => (
          <div key={s}>
            <div className="mb-1 h-1 w-1/3 rounded-full" style={{ background: accent }} />
            <div className="mb-1 h-px w-full bg-slate-200" />
            {s === "Skills" && (id === "modern" || id === "bold") ? (
              <div className="flex flex-wrap gap-0.5">
                {[8, 10, 7, 9].map((w, i) => (
                  <span key={i} className="h-1.5 rounded-full" style={{ width: w * 2, background: i < 2 ? `${accent}33` : "#e2e8f0" }} />
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {line("100%")}
                {line("85%")}
                {s === "Experience" ? line("70%") : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
