"use client";

import { Loader2, Settings2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui";

import { manageSubscriptionAction, upgradeAction } from "./actions";

export function UpgradeButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="gradient"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await upgradeAction();
            if (r?.error) setError(r.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {label}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function ManageButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await manageSubscriptionAction();
            if (r?.error) setError(r.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Settings2 className="size-4" />} Manage subscription
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
