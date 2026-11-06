// Resume profile shapes. Stored as JSON strings on User (see prisma/schema.prisma).

export type Experience = { role: string; company: string; start: string; end: string; bullets: string[] };
export type Education = { degree: string; school: string; year: string; score: string };
export type Project = { name: string; description: string; tech: string };

export type Profile = {
  name: string;
  email: string;
  headline: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  yearsExperience: number;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
};

function parseList<T>(json: string): T[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export const splitList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

type UserRow = {
  name: string;
  email: string;
  headline: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  yearsExperience: number;
  skills: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
};

export function toProfile(u: UserRow): Profile {
  return {
    name: u.name,
    email: u.email,
    headline: u.headline,
    phone: u.phone,
    location: u.location,
    linkedin: u.linkedin,
    website: u.website,
    summary: u.summary,
    yearsExperience: u.yearsExperience,
    skills: splitList(u.skills),
    experience: parseList<Experience>(u.experience),
    education: parseList<Education>(u.education),
    projects: parseList<Project>(u.projects),
    certifications: splitList(u.certifications),
  };
}

/** What still needs filling in before resumes look complete. */
export function profileGaps(p: Profile) {
  const gaps: string[] = [];
  if (!p.headline) gaps.push("headline");
  if (!p.phone) gaps.push("phone number");
  if (p.skills.length < 3) gaps.push("skills");
  if (!p.experience.length && !p.projects.length) gaps.push("experience or projects");
  if (!p.education.length) gaps.push("education");
  return gaps;
}
