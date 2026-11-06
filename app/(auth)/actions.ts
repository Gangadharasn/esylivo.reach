"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { endSession, startSession } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";
import { FREE_CREDIT_USD } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { fieldErrors, registerSchema } from "@/lib/validators";

export type AuthState = { errors?: Record<string, string>; values?: Record<string, string> } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { errors: { form: "Email or password is incorrect." }, values: { email } };
  }
  await startSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  const { password: _password, ...values } = raw;
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { password, ...data } = parsed.data;
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    return { errors: { email: "An account with this email already exists. Log in instead." }, values };
  }

  const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  await grantCredits(user.id, FREE_CREDIT_USD, "SIGNUP_BONUS", "Welcome credit", `signup:${user.id}`);
  await startSession(user.id);
  redirect("/profile?welcome=1");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
