"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoSearchDue, claimSearch, rescorePosts, runSearch } from "@/lib/search";
import { templateById } from "@/lib/resume-templates";
import { canonicalSkill } from "@/lib/skills";
import { fieldErrors, profileSchema, type ProfileInput } from "@/lib/validators";

export async function saveProfileAction(input: ProfileInput) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const p = parsed.data;

  const skills = [...new Set(p.skills.filter(Boolean).map(canonicalSkill))];
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: p.name,
      headline: p.headline,
      phone: p.phone,
      location: p.location,
      linkedin: p.linkedin,
      website: p.website,
      summary: p.summary,
      yearsExperience: p.yearsExperience,
      skills: skills.join(", "),
      certifications: p.certifications.filter(Boolean).join("\n"),
      experience: JSON.stringify(
        p.experience.filter((e) => e.role || e.company).map((e) => ({ ...e, bullets: e.bullets.filter(Boolean) })),
      ),
      education: JSON.stringify(p.education.filter((e) => e.degree || e.school)),
      projects: JSON.stringify(p.projects.filter((pr) => pr.name)),
    },
  });
  if (skills.join(",") !== user.skills.split(",").map((s) => s.trim()).join(",")) await rescorePosts(user.id, skills);
  // First profile save after sign-up: start the first job search right away.
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  if (updated && !updated.lastSearchAt && autoSearchDue(updated) && (await claimSearch(user.id))) after(() => runSearch(user.id));
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function saveTemplateAction(id: string) {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { resumeTemplate: templateById(id).id } });
  revalidatePath("/profile");
}
