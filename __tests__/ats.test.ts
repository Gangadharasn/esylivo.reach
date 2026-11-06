import { describe, expect, it } from "vitest";

import { analyzeResume, jobTerms } from "@/lib/ats";
import { pdfText } from "@/lib/pdf-text";
import { resumePdf } from "@/lib/resume-pdf";
import { RESUME_TEMPLATES } from "@/lib/resume-templates";
import { tailorResume } from "@/lib/tailor";

const JD = `We are hiring a Senior React Developer in Bengaluru.
Must have: React, TypeScript, Redux, REST APIs and AWS. Experience with GraphQL is a plus.
You will build dashboards, own the dashboards' performance and mentor developers on dashboards.`;

const GOOD = `Ananya Rao
Full Stack Developer
ananya.rao@gmail.com | +91 98765 43210 | linkedin.com/in/ananya
SUMMARY
Full Stack Developer with 4 years building React and Node.js products.
SKILLS
React, TypeScript, Node.js, Redux, REST APIs, MongoDB
EXPERIENCE
Software Engineer, Brightline (2022 – Present)
Built a React dashboards suite used by 20,000 users.
Reduced API latency by 35% with Redis caching.
Led migration of 12 services to TypeScript.
Mentored 3 junior developers.
EDUCATION
B.E. Computer Science, RVCE, 2020
${"Delivered features across the product with the team. ".repeat(30)}`;

describe("ATS analysis", () => {
  it("scores a well-formed resume highly and lists missing job keywords", () => {
    const r = analyzeResume({ text: GOOD, pages: 1, jobDescription: JD, jobTitle: "Senior React Developer" });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.keywords?.matched).toEqual(expect.arrayContaining(["React", "TypeScript", "Redux", "REST APIs", "dashboards"]));
    expect(r.keywords?.missing).toEqual(expect.arrayContaining(["AWS", "GraphQL"]));
    expect(r.checks.find((c) => c.id === "spaced")).toBeUndefined();
  });

  it("flags letter-spaced headings, missing contact details and missing sections", () => {
    const bad = "Someone\nS U M M A R Y\nI am a developer and I like my job. " + "I build things. ".repeat(40);
    const r = analyzeResume({ text: bad, pages: 3 });
    const ids = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(ids).toMatchObject({ spaced: "fail", email: "fail", phone: "fail", "section-experience": "fail", pages: "warn", pronouns: "warn" });
    expect(r.score).toBeLessThan(50);
    expect(r.keywords).toBeNull();
  });

  it("caps the score of a resume with no readable text", () => {
    expect(analyzeResume({ text: "  ", pages: 1, jobDescription: JD }).score).toBeLessThanOrEqual(15);
  });

  it("finds repeated job terms but not generic job-post words", () => {
    expect(jobTerms(JD)).toContain("dashboards");
    expect(jobTerms("Hiring hiring experience experience team team kubernetes kubernetes")).toEqual(["kubernetes"]);
  });
});

describe("resume templates are ATS-readable", () => {
  const profile = {
    name: "Ananya Rao",
    email: "ananya.rao@gmail.com",
    headline: "Full Stack Developer",
    phone: "+91 98765 43210",
    location: "Bengaluru",
    linkedin: "https://www.linkedin.com/in/ananya-demo",
    website: "",
    summary: "Builds fast web apps with React and Node.js.",
    yearsExperience: 4,
    skills: ["React", "TypeScript", "Node.js", "Redux", "MongoDB"],
    experience: [
      {
        role: "Software Engineer",
        company: "Brightline",
        start: "2022",
        end: "Present",
        bullets: ["Built a React dashboard used by 20,000 users.", "Reduced API latency by 35% with caching.", "Led a 4-person team shipping weekly."],
      },
    ],
    education: [{ degree: "B.E. Computer Science", school: "RVCE", year: "2020", score: "8.4 CGPA" }],
    projects: [{ name: "ShopSwift", description: "MERN store with payments, salary ₹12 LPA tracker.", tech: "React, Node.js" }],
    certifications: ["AWS Cloud Practitioner"],
  };

  for (const t of RESUME_TEMPLATES) {
    it(`${t.name}: parses with sections and contact details`, async () => {
      const pdf = await resumePdf(tailorResume(profile, { content: JD, jobTitle: "Senior React Developer" }), t.id);
      const { text, pages } = await pdfText(new Uint8Array(pdf));
      const r = analyzeResume({ text, pages, jobDescription: JD, jobTitle: "Senior React Developer" });
      const failed = r.checks.filter((c) => c.category !== "keywords" && c.category !== "content" && c.status === "fail").map((c) => c.label);
      expect(failed).toEqual([]);
      expect(pages).toBe(1);
      expect(text).toContain("ananya.rao@gmail.com");
    }, 30_000);
  }
});
