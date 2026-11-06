"use server";

import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { fieldErrors, settingsSchema } from "@/lib/validators";

export type SettingsState = { errors?: Record<string, string>; saved?: boolean; tested?: string } | undefined;

export async function saveSettingsAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { smtpPass, ...rest } = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...rest,
      // A blank password keeps the saved one; "clear" removes it.
      // Gmail shows App Passwords with spaces; they work without them.
      ...(smtpPass ? { smtpPass: smtpPass === "clear" ? "" : encrypt(smtpPass.replace(/\s+/g, "")) } : {}),
    },
  });
  revalidatePath("/", "layout");
  return { saved: true };
}

/** Sends a test email to the user themselves with the saved SMTP settings. */
export async function testEmailAction() {
  const user = await requireUser();
  if (!user.smtpUser || !user.smtpPass) return { error: "Save your email login first." };
  try {
    await nodemailer
      .createTransport({
        host: user.smtpHost,
        port: user.smtpPort,
        secure: user.smtpPort === 465,
        auth: { user: user.smtpUser, pass: decrypt(user.smtpPass) },
      })
      .sendMail({
        from: { name: user.fromName || user.name, address: user.smtpUser },
        to: user.email,
        subject: "Esylivo Reach is connected ✔",
        text: "Your email is set up. Applications will be sent from this address.",
      });
    return { ok: `Test email sent to ${user.email}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: /Invalid login|535|Username and Password/i.test(message)
        ? "Login failed. For Gmail, turn on 2-Step Verification and use an App Password, not your normal password."
        : `Couldn't send: ${message.slice(0, 160)}`,
    };
  }
}
