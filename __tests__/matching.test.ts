import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { htmlToText, parsePosts, relativeDate } from "@/lib/apify";
import { affordablePerKeyword, apifyCost, creditCostMicros, formatCredits, maxSearchCostMicros } from "@/lib/pricing";
import { searchKeywords } from "@/lib/queries";
import { indeedSearchUrl, linkedinQueries, naukriSearchUrl, parseSources, SOURCES } from "@/lib/sources";
import { extractEmails, extractJobTitle, extractPhones } from "@/lib/extract";
import { canonicalSkill, matchJob, skillsIn } from "@/lib/skills";
import { tailorResume } from "@/lib/tailor";
import { renderEmail } from "@/lib/templates";

describe("extract", () => {
  it("finds emails and ignores image file names", () => {
    expect(extractEmails("Mail HR@Acme.example. or jobs@acme.example; logo@2x.png")).toEqual(["hr@acme.example", "jobs@acme.example"]);
  });

  it("finds Indian and international phone numbers", () => {
    expect(extractPhones("WhatsApp 98450 12345 or +91 99860-11223")).toEqual(["9845012345", "+919986011223"]);
    expect(extractPhones("Landline 044-4567-8901")).toEqual(["04445678901"]);
  });

  it("ignores ids, years and links", () => {
    expect(extractPhones("Post 7390000000000000001, 2024-2026, https://x.com/12345678901")).toEqual([]);
  });

  it("guesses the job title", () => {
    expect(extractJobTitle("We're hiring a Senior React Developer in Bengaluru!")).toBe("Senior React Developer");
    expect(extractJobTitle("Urgent requirement for Node.js Backend Engineer (Remote)")).toBe("Node.js Backend Engineer");
    expect(extractJobTitle("Great news\nRole: Data Analyst\nLocation: Pune")).toBe("Data Analyst");
    expect(extractJobTitle("#Hiring Next.js Developer | Chennai")).toBe("Next.js Developer");
    expect(extractJobTitle("Looking for an Automation Testing Engineer with Selenium")).toBe("Automation Testing Engineer");
    expect(extractJobTitle("we are looking for someone who loves code")).toBe("");
  });
});

describe("skills", () => {
  it("normalises aliases", () => {
    expect(canonicalSkill("reactjs")).toBe("React");
    expect(canonicalSkill("NodeJS")).toBe("Node.js");
    expect(canonicalSkill("Blockchain")).toBe("Blockchain");
  });

  it("does not confuse Java with JavaScript or match common words", () => {
    expect(skillsIn("Strong JavaScript skills")).toEqual(["JavaScript"]);
    expect(skillsIn("Express your interest, excel in the rest of the role, go!")).toEqual([]);
  });

  it("scores the share of requested skills the profile has", () => {
    const r = matchJob("Need React, TypeScript, AWS and Docker", ["react", "TypeScript", "Python"]);
    expect(r.matched).toEqual(["React", "TypeScript"]);
    expect(r.missing).toEqual(["AWS", "Docker"]);
    expect(r.score).toBe(50);
  });
});

describe("parsePosts", () => {
  const sample = JSON.parse(readFileSync("samples/linkedin.sample.json", "utf8"));

  it("turns Apify items into rows with contacts and scores", () => {
    const posts = parsePosts(sample, ["React", "TypeScript", "Node.js", "Redux"]);
    expect(posts).toHaveLength(6);
    const first = posts[0];
    expect(first.authorName).toBe("Priya Sharma");
    expect(first.emails).toBe("priya.hr@techcorp.example");
    expect(first.phones).toBe("9845012345");
    expect(first.jobTitle).toBe("Senior React Developer");
    expect(first.matchScore).toBeGreaterThan(50);
  });

  it("accepts a wrapped export and skips items without text", () => {
    expect(parsePosts({ items: [{ type: "post", id: 1, content: "" }, { type: "post", id: 2, content: "Hiring" }] }, [])).toHaveLength(1);
    expect(parsePosts("nope", [])).toEqual([]);
  });
});

describe("tailoring", () => {
  const profile = {
    name: "Ananya Rao",
    email: "a@x.example",
    headline: "Full Stack Developer",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
    summary: "",
    yearsExperience: 4,
    skills: ["Python", "React", "Docker"],
    experience: [{ role: "Engineer", company: "Co", start: "", end: "", bullets: ["Wrote Python scripts", "Built React dashboards"] }],
    education: [],
    projects: [],
    certifications: [],
  };

  it("puts matching skills and bullets first", () => {
    const r = tailorResume(profile, { content: "Hiring React developer", jobTitle: "React Developer" });
    expect(r.matchedSkills).toEqual(["React"]);
    expect(r.otherSkills).toEqual(["Python", "Docker"]);
    expect(r.experience[0].bullets[0]).toBe("Built React dashboards");
    expect(r.summary).toContain("4+ years");
    expect(r.summary).toContain("React Developer");
  });

  it("fills the email template", () => {
    const body = renderEmail("Hi {poster_first_name}, re {job_title}: {matched_skills}. {unknown}", {
      posterName: "Priya Sharma",
      jobTitle: "",
      matchedSkills: ["React", "Node.js"],
      myName: "A",
      myHeadline: "",
      myPhone: "",
      myEmail: "",
      myLinkedin: "",
      mySkills: [],
    });
    expect(body).toBe("Hi Priya, re open position: React and Node.js. {unknown}");
  });

  it("reads naturally when the post names no role", () => {
    const ctx = { posterName: "", jobTitle: "", matchedSkills: [], myName: "A", myHeadline: "", myPhone: "", myEmail: "", myLinkedin: "", mySkills: [] };
    expect(renderEmail("Hi {poster_first_name}, about the {job_title} opening", ctx)).toBe("Hi there, about the open position");
  });
});

describe("search keywords", () => {
  const base = { jobKeywords: "", headline: "", skills: "" };

  it("uses the user's keywords, else the profile headline and skills", () => {
    expect(searchKeywords({ ...base, jobKeywords: "react developer\nnode.js, react developer" })).toEqual(["react developer", "node.js"]);
    expect(searchKeywords({ ...base, headline: "Full Stack Developer", skills: "React, Node.js, MongoDB, Docker" })).toEqual([
      "Full Stack Developer",
      "React Node.js",
      "MongoDB Docker",
    ]);
    expect(searchKeywords(base)).toEqual([]);
  });

  it("phrases LinkedIn searches like hiring posts, with the location", () => {
    expect(linkedinQueries({ keywords: ["react developer", "looking for node.js", "Bengaluru jobs"], location: "Bengaluru" })).toEqual([
      "hiring react developer Bengaluru",
      "looking for node.js Bengaluru",
      "Bengaluru jobs",
    ]);
  });

  it("builds job-board search URLs", () => {
    expect(naukriSearchUrl("React Developer", "Bengaluru", 7)).toBe(
      "https://www.naukri.com/react-developer-jobs-in-bengaluru?k=React+Developer&l=bengaluru&jobAge=7",
    );
    expect(naukriSearchUrl("node.js", "", 90)).toBe("https://www.naukri.com/node-js-jobs?k=node.js&jobAge=30");
    expect(indeedSearchUrl("react", "Pune", 30)).toBe("https://in.indeed.com/jobs?q=react&l=Pune&fromage=14&sort=date");
  });

  it("reads the chosen sources", () => {
    expect(parseSources("linkedin, NAUKRI,bogus,naukri")).toEqual(["LINKEDIN", "NAUKRI"]);
  });
});

describe("job boards", () => {
  const skills = ["React", "TypeScript", "Node.js", "MongoDB"];
  const load = (name: string) => JSON.parse(readFileSync(`samples/${name}.sample.json`, "utf8"));

  it("parses Naukri listings, including the email inside the description", () => {
    const [react, node] = SOURCES.NAUKRI.parse(load("naukri"), skills);
    expect(react).toMatchObject({
      source: "NAUKRI",
      externalId: "naukri:051126900101",
      jobTitle: "React JS Developer",
      company: "Brightwave Technologies",
      location: "Bengaluru",
      experience: "3-6 Yrs",
      salary: "8-15 Lacs PA",
      emails: "talent@brightwave.example",
      url: "https://www.naukri.com/job-listings-react-js-developer-brightwave-technologies-bengaluru-3-to-6-years-051126900101",
    });
    expect(react.applyUrl).toBe(react.url);
    expect(react.content).toContain("• Build responsive UIs");
    expect(react.matchedSkills).toContain("React");
    expect(node.salary).toBe("");
    expect(node.postedAt).not.toBeNull();
  });

  it("parses Indeed listings and prefers the employer's apply link", () => {
    const [mern, next] = SOURCES.INDEED.parse(load("indeed"), skills);
    expect(mern).toMatchObject({ source: "INDEED", externalId: "indeed:a1b2c3d4e5f60001", company: "Orbit Labs", applyUrl: "https://careers.orbitlabs.example/jobs/full-stack" });
    expect(next.applyUrl).toBe(next.url);
    expect(next.phones).toBe("9886022334");
  });

  it("parses Foundit listings and skips the run summary", () => {
    const jobs = SOURCES.FOUNDIT.parse(load("foundit"), skills);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ source: "FOUNDIT", experience: "4-8 Yrs", salary: "₹18-28 LPA", location: "Bengaluru, India" });
    expect(jobs[0].matchedSkills.split(",")).toEqual(["React", "TypeScript"]);
  });

  it("turns relative dates and HTML into usable values", () => {
    const now = new Date("2026-11-06T00:00:00Z");
    expect(relativeDate("2 Days Ago", now)?.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(relativeDate("30+ Days Ago", now)?.toISOString()).toBe("2026-10-07T00:00:00.000Z");
    expect(relativeDate("Just Now", now)).toBe(now);
    expect(relativeDate("whenever", now)).toBeNull();
    expect(htmlToText("<p>A &amp; B</p><ul><li>one</li><li>two</li></ul>")).toBe("A & B\n\n• one\n\n• two");
  });
});

describe("credits", () => {
  const all = Object.values(SOURCES).map((s) => s.pricing);

  it("charges users twice the Apify cost", () => {
    expect(creditCostMicros(0.35)).toBe(700_000);
    expect(formatCredits(creditCostMicros(5))).toBe("$10.00");
    expect(formatCredits(-1_234_567)).toBe("-$1.23");
  });

  it("prices a search from the results each site returned", () => {
    expect(apifyCost(SOURCES.NAUKRI.pricing, 45)).toBeCloseTo(0.375);
    expect(apifyCost(SOURCES.LINKEDIN.pricing, 0)).toBeCloseTo(0.005);
  });

  it("shrinks a search to what the balance can pay for, and refuses below the minimum", () => {
    const full = maxSearchCostMicros(all, 3, 15);
    expect(affordablePerKeyword(full, all, 3, 15)).toBe(15);
    expect(affordablePerKeyword(full - 1, all, 3, 15)).toBe(14);
    expect(affordablePerKeyword(1_000_000, all, 3, 15)).toBeLessThan(15);
    expect(affordablePerKeyword(10_000, all, 3, 15)).toBe(0);
    expect(affordablePerKeyword(5_000_000, [], 3, 15)).toBe(0);
  });

  it("free credit pays for at least one typical search", () => {
    expect(affordablePerKeyword(2_000_000, all, 3, 15)).toBeGreaterThanOrEqual(10);
  });
});
