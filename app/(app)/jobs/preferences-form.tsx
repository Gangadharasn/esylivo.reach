"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { POSTED_LABELS, POSTED_LIMITS } from "@/lib/apify";
import { SOURCE_KEYS, SOURCES } from "@/lib/sources";
import { cn } from "@/lib/utils";

import { savePreferencesAction } from "./actions";

type Prefs = {
  jobKeywords: string;
  suggested: string;
  jobLocation: string;
  postedLimit: string;
  postsPerQuery: number;
  jobsOnly: boolean;
  autoSearch: boolean;
  jobSources: string[];
  costEstimate: string;
  credits: string;
};

export function PreferencesForm({ p, openByDefault }: { p: Prefs; openByDefault: boolean }) {
  const [open, setOpen] = useState(openByDefault);
  const [state, action] = useActionState(savePreferencesAction, undefined);
  const e = state?.errors ?? {};

  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <SlidersHorizontal className="size-4 text-brand-600" /> What jobs should we look for?
        </span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <form action={action} className="space-y-4 border-t border-slate-100 p-4">
          <Field
            label="Job keywords"
            htmlFor="jobKeywords"
            error={e.jobKeywords}
            hint="One per line, up to 5. Leave empty to search using your profile headline and skills."
          >
            <Textarea id="jobKeywords" name="jobKeywords" defaultValue={p.jobKeywords} placeholder={p.suggested} className="min-h-20" />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Search on</legend>
            <div className="flex flex-wrap gap-2">
              {SOURCE_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-300"
                >
                  <input type="checkbox" name="jobSources" value={key} defaultChecked={p.jobSources.includes(key)} className="size-4 rounded" />
                  {SOURCES[key].label}
                  {key === "INDEED" ? <span className="text-xs text-slate-400">India</span> : null}
                </label>
              ))}
            </div>
            {e.jobSources ? <p className="mt-1 text-xs text-red-600">{e.jobSources}</p> : null}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Location (optional)" htmlFor="jobLocation">
              <Input id="jobLocation" name="jobLocation" defaultValue={p.jobLocation} placeholder="Bengaluru, Remote…" />
            </Field>
            <Field label="Posted in" htmlFor="postedLimit">
              <Select id="postedLimit" name="postedLimit" defaultValue={p.postedLimit}>
                {POSTED_LIMITS.map((v) => (
                  <option key={v} value={v}>
                    {POSTED_LABELS[v]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Results per keyword, per site" htmlFor="postsPerQuery" error={e.postsPerQuery}>
              <Input id="postsPerQuery" name="postsPerQuery" type="number" min={5} max={50} defaultValue={p.postsPerQuery} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="autoSearch" defaultChecked={p.autoSearch} className="size-4 rounded" /> Search automatically every few hours
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="jobsOnly" defaultChecked={p.jobsOnly} className="size-4 rounded" /> LinkedIn: only posts with a job attached
            </label>
          </div>
          <p className="text-xs text-slate-500">
            With these settings a search uses up to <strong>{p.costEstimate}</strong> of credit (you have {p.credits}). Fewer sites, keywords or
            results make it cheaper; Naukri costs the most.
          </p>
          <div className="flex items-center gap-3">
            <SubmitButton variant="gradient" pendingText="Saving…">
              Save & search now
            </SubmitButton>
            {state?.saved ? <span className="text-sm text-emerald-700">Saved. Searching with your new keywords…</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
