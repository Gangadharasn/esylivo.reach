// Demo account with an illustrative profile and sample jobs from each job site (made-up people, companies and
// .example email domains, so nothing real gets emailed). `npm run db:seed` resets it.
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { SOURCE_KEYS, SOURCES } from "../lib/sources";

const prisma = new PrismaClient();

const SKILLS = ["React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "Tailwind CSS", "REST APIs", "Git", "Docker"];

async function main() {
  const email = "demo@esylivo.com";
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Ananya Rao",
      headline: "Full Stack Developer",
      phone: "+91 98765 43210",
      location: "Bengaluru, India",
      linkedin: "https://www.linkedin.com/in/ananya-rao-demo",
      website: "https://github.com/ananya-demo",
      summary: "Builds fast, accessible web apps end to end, from React front ends to Node.js APIs and databases.",
      yearsExperience: 4,
      skills: SKILLS.join(", "),
      experience: JSON.stringify([
        {
          role: "Software Engineer",
          company: "Brightline Software",
          start: "Jun 2022",
          end: "Present",
          bullets: [
            "Built a Next.js and TypeScript customer portal used by 20,000+ users.",
            "Designed Node.js and Express REST APIs backed by PostgreSQL, cutting page load time by 35%.",
            "Containerised services with Docker and set up CI pipelines on GitHub Actions.",
          ],
        },
        {
          role: "Associate Developer",
          company: "Nimbus Labs",
          start: "Jul 2020",
          end: "May 2022",
          bullets: ["Developed React dashboards with Redux for internal analytics.", "Maintained MongoDB data pipelines for reporting."],
        },
      ]),
      education: JSON.stringify([{ degree: "B.E. Computer Science", school: "RV College of Engineering", year: "2016 – 2020", score: "8.4 CGPA" }]),
      projects: JSON.stringify([
        { name: "ShopSwift", description: "MERN e-commerce store with payments and an admin panel.", tech: "MongoDB, Express, React, Node.js" },
        { name: "DevNotes", description: "Markdown notes app with offline sync.", tech: "Next.js, PostgreSQL, Tailwind CSS" },
      ]),
      certifications: "AWS Certified Cloud Practitioner",
      minMatch: 50,
      jobKeywords: "react developer\nnext.js developer\nfull stack developer",
      jobLocation: "Bengaluru",
      creditMicros: 2_000_000,
      credits: { create: { kind: "SIGNUP_BONUS", amountMicros: 2_000_000, description: "Welcome credit" } },
    },
  });

  // One sample result file per job site, in each Apify actor's real output format.
  const posts = SOURCE_KEYS.flatMap((key) => {
    const items = JSON.parse(readFileSync(new URL(`../samples/${key.toLowerCase()}.sample.json`, import.meta.url), "utf8"));
    return SOURCES[key].parse(items, SKILLS);
  });
  for (const p of posts) await prisma.jobPost.create({ data: { ...p, userId: user.id } });

  // Pretend the first automatic search already ran, so the demo doesn't need a live search.
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSearchAt: new Date(), lastSearchFound: posts.length, lastSearchNew: posts.length },
  });

  console.log(`Seeded demo account: ${email} / demo1234 (${posts.length} sample jobs)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
