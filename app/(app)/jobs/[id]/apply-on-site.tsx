"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui";

import { markAppliedOnSiteAction, setStatusAction } from "../actions";

/**
 * Job sites have no apply API, so this opens the listing for the user to apply there
 * and records the application in Esylivo Reach.
 */
export function ApplyOnSite({ postId, url, site, applied }: { postId: string; url: string; site: string; applied: boolean }) {
  const [done, setDone] = useState(applied);
  const [, start] = useTransition();

  if (done) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" /> Marked as applied on {site}
        </p>
        <div className="flex gap-3 text-sm">
          <a href={url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
            Open on {site}
          </a>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800"
            onClick={() => {
              setDone(false);
              start(() => setStatusAction([postId], "NEW"));
            }}
          >
            I didn&apos;t apply, undo
          </button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="gradient"
      className="w-full"
      onClick={() => {
        window.open(url, "_blank", "noopener");
        setDone(true);
        start(() => markAppliedOnSiteAction(postId));
      }}
    >
      <ExternalLink className="size-4" /> Apply on {site}
    </Button>
  );
}
