"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, FormError, Input } from "@/components/ui";

import { register } from "../actions";

export default function RegisterPage() {
  const [state, action] = useActionState(register, undefined);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Find jobs and apply with a tailored resume.</p>
      </div>
      <FormError message={e.form} />
      <Field label="Your name" htmlFor="name" error={e.name}>
        <Input id="name" name="name" autoComplete="name" required defaultValue={v.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={e.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
