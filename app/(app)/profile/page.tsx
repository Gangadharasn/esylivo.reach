import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { profileGaps, toProfile } from "@/lib/profile";

import { ProfileEditor } from "./profile-editor";
import { TemplatePicker } from "./template-picker";

export const metadata: Metadata = { title: "Profile & resume" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const profile = toProfile(user);
  const gaps = profileGaps(profile);

  return (
    <>
      <PageHeader
        title={welcome ? `Welcome, ${user.name.split(" ")[0]}! Let's build your profile` : "Profile & resume"}
        description="Fill this in once. Every application gets a resume generated from it and tailored to the job description."
      />
      {gaps.length ? (
        <p className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          To get strong resumes and accurate match scores, add your <strong>{gaps.join(", ")}</strong>.
        </p>
      ) : null}
      <div className="mb-6">
        <TemplatePicker current={user.resumeTemplate} />
      </div>
      <ProfileEditor initial={profile} />
    </>
  );
}
