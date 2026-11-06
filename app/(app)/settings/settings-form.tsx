"use client";

import { Bot, Loader2, Mail, MailCheck, Zap } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button, Card, CardHeader, Field, FormError, Input, Textarea } from "@/components/ui";
import { EMAIL_VARIABLES } from "@/lib/templates";

import { saveSettingsAction, testEmailAction } from "./actions";

type Values = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hasSmtpPass: boolean;
  fromName: string;
  emailSubject: string;
  emailBody: string;
  defaultSubject: string;
  defaultBody: string;
  dailyLimit: number;
  minMatch: number;
  autoSend: boolean;
};

export function SettingsForm({ v }: { v: Values }) {
  const [state, action] = useActionState(saveSettingsAction, undefined);
  const e = state?.errors ?? {};
  const [test, setTest] = useState<{ ok?: string; error?: string } | null>(null);
  const [testing, startTest] = useTransition();

  return (
    <form action={action} className="space-y-6">
      <FormError message={e.form} />

      <Card>
        <CardHeader
          title="Your email account"
          description="Applications are sent from your own mailbox, so replies come straight to you."
          action={<Mail className="size-5 text-brand-500" />}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Email address (login)" htmlFor="smtpUser" error={e.smtpUser}>
            <Input id="smtpUser" name="smtpUser" type="email" defaultValue={v.smtpUser} placeholder="you@gmail.com" />
          </Field>
          <Field
            label="App password"
            htmlFor="smtpPass"
            hint={v.hasSmtpPass ? "Saved. Leave empty to keep it." : "Gmail: Google Account → Security → 2-Step Verification → App passwords."}
          >
            <Input id="smtpPass" name="smtpPass" type="password" autoComplete="new-password" placeholder={v.hasSmtpPass ? "••••••••••••" : "16-character app password"} />
          </Field>
          <Field label="Sender name" htmlFor="fromName">
            <Input id="fromName" name="fromName" defaultValue={v.fromName} placeholder="Your full name" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="SMTP server" htmlFor="smtpHost" error={e.smtpHost}>
                <Input id="smtpHost" name="smtpHost" defaultValue={v.smtpHost} />
              </Field>
            </div>
            <Field label="Port" htmlFor="smtpPort" error={e.smtpPort}>
              <Input id="smtpPort" name="smtpPort" type="number" defaultValue={v.smtpPort} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              disabled={testing || !v.hasSmtpPass}
              onClick={() => startTest(async () => setTest(await testEmailAction()))}
              title={v.hasSmtpPass ? "" : "Save your login first"}
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />} Send test email
            </Button>
            {test?.ok ? <span className="text-sm text-emerald-700">{test.ok}</span> : null}
            {test?.error ? <span className="text-sm text-red-600">{test.error}</span> : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Application email" description="Leave empty to use the default shown as the placeholder." action={<Mail className="size-5 text-brand-500" />} />
        <div className="space-y-4 p-5">
          <Field label="Subject" htmlFor="emailSubject">
            <Input id="emailSubject" name="emailSubject" defaultValue={v.emailSubject} placeholder={v.defaultSubject} />
          </Field>
          <Field label="Message" htmlFor="emailBody" hint={`Placeholders: ${EMAIL_VARIABLES.join(" ")}`}>
            <Textarea id="emailBody" name="emailBody" defaultValue={v.emailBody} placeholder={v.defaultBody} className="min-h-72" />
          </Field>
        </div>
      </Card>

      <Card id="autopilot">
        <CardHeader title="Auto-apply" description="Let Esylivo Reach apply for you." action={<Zap className="size-5 text-fuchsia-500" />} />
        <div className="space-y-4 p-5">
          <label className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-brand-50 to-fuchsia-50 p-4 ring-1 ring-brand-100">
            <input type="checkbox" name="autoSend" defaultChecked={v.autoSend} className="mt-0.5 size-4 rounded" />
            <span className="text-sm text-slate-700">
              <strong className="text-slate-900">Auto-apply to new matches.</strong> After every automatic search, email a tailored resume to each new post
              that has an email and meets your minimum match.
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum match for auto-apply (%)" htmlFor="minMatch" error={e.minMatch}>
              <Input id="minMatch" name="minMatch" type="number" min={0} max={100} defaultValue={v.minMatch} />
            </Field>
            <Field label="Max emails per day" htmlFor="dailyLimit" error={e.dailyLimit} hint="Protects your email account from being flagged as spam.">
              <Input id="dailyLimit" name="dailyLimit" type="number" min={1} max={100} defaultValue={v.dailyLimit} />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="flex items-start gap-3 p-5 text-sm text-slate-600">
        <Bot className="size-5 shrink-0 text-brand-500" />
        <p>
          <strong className="text-slate-900">AI summaries are optional.</strong> Without AI, resumes use a summary built from your profile and the job&apos;s
          skills. To use a free local model, install Ollama and set <code className="rounded bg-slate-100 px-1 text-xs">AI_BASE_URL</code> and{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">AI_MODEL</code> in <code className="rounded bg-slate-100 px-1 text-xs">.env</code>.
        </p>
      </Card>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 md:bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <SubmitButton variant="gradient">Save settings</SubmitButton>
        {state?.saved ? <span className="text-sm text-emerald-700">Saved</span> : null}
        {Object.keys(e).length ? <span className="text-sm text-red-600">{Object.values(e)[0]}</span> : null}
      </div>
    </form>
  );
}
