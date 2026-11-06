"use client";

import { FileText, GraduationCap, Loader2, Plus, Save, Sparkles, Trash2, Wrench, X, Briefcase, FolderGit2, Award, UserRound } from "lucide-react";
import { useState, useTransition } from "react";

import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import type { Education, Experience, Profile, Project } from "@/lib/profile";
import type { ProfileInput } from "@/lib/validators";

import { saveProfileAction } from "./actions";

const blankExperience: Experience = { role: "", company: "", start: "", end: "", bullets: [""] };
const blankEducation: Education = { degree: "", school: "", year: "", score: "" };
const blankProject: Project = { name: "", description: "", tech: "" };

export function ProfileEditor({ initial }: { initial: Profile }) {
  const [p, setP] = useState<ProfileInput>({
    name: initial.name,
    headline: initial.headline,
    phone: initial.phone,
    location: initial.location,
    linkedin: initial.linkedin,
    website: initial.website,
    summary: initial.summary,
    yearsExperience: initial.yearsExperience,
    skills: initial.skills,
    certifications: initial.certifications,
    experience: initial.experience.length ? initial.experience : [blankExperience],
    education: initial.education.length ? initial.education : [blankEducation],
    projects: initial.projects,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setP((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  const setItem = <K extends "experience" | "education" | "projects">(key: K, i: number, patch: Partial<ProfileInput[K][number]>) =>
    set(key, p[key].map((item, j) => (j === i ? { ...item, ...patch } : item)) as ProfileInput[K]);
  const removeItem = (key: "experience" | "education" | "projects", i: number) =>
    set(key, p[key].filter((_, j) => j !== i) as never);

  const save = () =>
    start(async () => {
      const result = await saveProfileAction(p);
      if ("errors" in result && result.errors) {
        setErrors(result.errors);
      } else {
        setErrors({});
        setSaved(true);
      }
    });

  const saveBar = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Button variant="gradient" onClick={save} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
      </Button>
      <a href="/api/jobs/general/resume" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
        <FileText className="size-4 text-brand-600" /> Preview resume
      </a>
      {saved ? <span className="text-sm text-emerald-700">Saved. Match scores updated.</span> : null}
      {Object.keys(errors).length ? <span className="text-sm text-red-600">Please fix: {Object.values(errors)[0]}</span> : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="About you" description="Shown at the top of every resume." action={<UserRound className="size-5 text-brand-500" />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={errors.name}>
            <Input id="name" value={p.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Headline" htmlFor="headline" hint="Your role, like “Full Stack Developer”">
            <Input id="headline" value={p.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Full Stack Developer" />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" value={p.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Location" htmlFor="location">
            <Input id="location" value={p.location} onChange={(e) => set("location", e.target.value)} placeholder="Bengaluru, India" />
          </Field>
          <Field label="LinkedIn URL" htmlFor="linkedin">
            <Input id="linkedin" value={p.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/you" />
          </Field>
          <Field label="Portfolio / GitHub (optional)" htmlFor="website">
            <Input id="website" value={p.website} onChange={(e) => set("website", e.target.value)} placeholder="https://github.com/you" />
          </Field>
          <Field label="Years of experience" htmlFor="years">
            <Input id="years" type="number" min={0} max={60} value={p.yearsExperience} onChange={(e) => set("yearsExperience", Number(e.target.value) || 0)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Summary" htmlFor="summary" hint="2–3 sentences about what you do best. Each resume adds a line aimed at the job.">
              <Textarea id="summary" value={p.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Skills"
          description="Used to score each job and to order your resume. Add the exact tools you know."
          action={<Wrench className="size-5 text-brand-500" />}
        />
        <div className="p-5">
          <TagInput values={p.skills} onChange={(v) => set("skills", v)} placeholder="Type a skill and press Enter, e.g. React" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Experience" action={<Briefcase className="size-5 text-brand-500" />} />
        <div className="space-y-4 p-5">
          {p.experience.map((e, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={e.role} onChange={(ev) => setItem("experience", i, { role: ev.target.value })} placeholder="Role, e.g. Software Engineer" aria-label="Role" />
                <Input value={e.company} onChange={(ev) => setItem("experience", i, { company: ev.target.value })} placeholder="Company" aria-label="Company" />
                <Input value={e.start} onChange={(ev) => setItem("experience", i, { start: ev.target.value })} placeholder="Start, e.g. Jan 2022" aria-label="Start" />
                <Input value={e.end} onChange={(ev) => setItem("experience", i, { end: ev.target.value })} placeholder="End, e.g. Present" aria-label="End" />
              </div>
              <Textarea
                className="mt-3"
                value={e.bullets.join("\n")}
                onChange={(ev) => setItem("experience", i, { bullets: ev.target.value.split("\n") })}
                placeholder={"One achievement per line\nBuilt a React dashboard used by 5,000 users\nCut API response time by 40% with Redis caching"}
                aria-label="Achievements"
              />
              <RemoveButton onClick={() => removeItem("experience", i)} />
            </div>
          ))}
          <AddButton label="Add experience" onClick={() => set("experience", [...p.experience, blankExperience])} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Education" action={<GraduationCap className="size-5 text-brand-500" />} />
        <div className="space-y-4 p-5">
          {p.education.map((e, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={e.degree} onChange={(ev) => setItem("education", i, { degree: ev.target.value })} placeholder="Degree, e.g. B.E. Computer Science" aria-label="Degree" />
                <Input value={e.school} onChange={(ev) => setItem("education", i, { school: ev.target.value })} placeholder="College / University" aria-label="College" />
                <Input value={e.year} onChange={(ev) => setItem("education", i, { year: ev.target.value })} placeholder="Year, e.g. 2018 – 2022" aria-label="Year" />
                <Input value={e.score} onChange={(ev) => setItem("education", i, { score: ev.target.value })} placeholder="CGPA / % (optional)" aria-label="Score" />
              </div>
              <RemoveButton onClick={() => removeItem("education", i)} />
            </div>
          ))}
          <AddButton label="Add education" onClick={() => set("education", [...p.education, blankEducation])} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Projects" description="Optional, great for freshers." action={<FolderGit2 className="size-5 text-brand-500" />} />
        <div className="space-y-4 p-5">
          {p.projects.map((pr, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={pr.name} onChange={(ev) => setItem("projects", i, { name: ev.target.value })} placeholder="Project name" aria-label="Project name" />
                <Input value={pr.tech} onChange={(ev) => setItem("projects", i, { tech: ev.target.value })} placeholder="Tech used, e.g. Next.js, MongoDB" aria-label="Tech" />
              </div>
              <Textarea className="mt-3 min-h-16" value={pr.description} onChange={(ev) => setItem("projects", i, { description: ev.target.value })} placeholder="What it does and your part in it" aria-label="Description" />
              <RemoveButton onClick={() => removeItem("projects", i)} />
            </div>
          ))}
          <AddButton label="Add project" onClick={() => set("projects", [...p.projects, blankProject])} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Certifications" description="Optional, one per line." action={<Award className="size-5 text-brand-500" />} />
        <div className="p-5">
          <Textarea value={p.certifications.join("\n")} onChange={(e) => set("certifications", e.target.value.split("\n"))} placeholder="AWS Certified Cloud Practitioner" />
        </div>
      </Card>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 md:bottom-0 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">{saveBar}</div>
    </div>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (items.length) onChange([...new Set([...values, ...items])]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-medium text-brand-700">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full p-0.5 hover:bg-brand-100">
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (/[,\n]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        placeholder={values.length ? "Add more…" : placeholder}
        className="min-w-48 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
      />
      {!values.length ? (
        <p className="flex w-full items-center gap-1 px-1 text-xs text-slate-500">
          <Sparkles className="size-3 text-fuchsia-500" /> Tip: paste a comma-separated list to add many at once.
        </p>
      ) : null}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      <Plus className="size-4" /> {label}
    </Button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
      <Trash2 className="size-3.5" /> Remove
    </button>
  );
}
