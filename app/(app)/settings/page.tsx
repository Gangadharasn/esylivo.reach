import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BODY, DEFAULT_SUBJECT } from "@/lib/templates";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Settings" description="Connect your email and decide how much to automate." />
      <SettingsForm
        v={{
          smtpHost: user.smtpHost,
          smtpPort: user.smtpPort,
          smtpUser: user.smtpUser,
          hasSmtpPass: Boolean(user.smtpPass),
          fromName: user.fromName,
          emailSubject: user.emailSubject,
          emailBody: user.emailBody,
          defaultSubject: DEFAULT_SUBJECT,
          defaultBody: DEFAULT_BODY,
          dailyLimit: user.dailyLimit,
          minMatch: user.minMatch,
          autoSend: user.autoSend,
        }}
      />
    </>
  );
}
