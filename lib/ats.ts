// ATS (applicant tracking system) check. Works on the plain text a parser extracts from
// the resume PDF, the same thing an ATS sees, and scores it the way ATS filters do:
// keyword match against the job, parsability, contact details, standard sections and
// content quality. Pure and deterministic: the same resume and job always score the same.
import { extractEmails, extractPhones } from "@/lib/extract";
import { skillsIn } from "@/lib/skills";

export type CheckStatus = "pass" | "warn" | "fail";
export type AtsCheck = { id: string; category: CategoryKey; status: CheckStatus; label: string; tip?: string };
export type CategoryKey = "keywords" | "parsing" | "contact" | "sections" | "content";
export type AtsResult = {
  score: number;
  grade: "Excellent" | "Good" | "Needs work" | "Poor";
  categories: { key: CategoryKey; label: string; score: number; weight: number }[];
  keywords: { matched: string[]; missing: string[] } | null;
  checks: AtsCheck[];
  stats: { words: number; pages: number; bullets: number; quantified: number };
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  keywords: "Keyword match",
  parsing: "ATS readability",
  contact: "Contact details",
  sections: "Sections",
  content: "Content quality",
};

// Weights with and without a job description to compare against.
const WEIGHTS_WITH_JOB: Record<CategoryKey, number> = { keywords: 40, parsing: 15, contact: 10, sections: 15, content: 20 };
const WEIGHTS_NO_JOB: Record<CategoryKey, number> = { keywords: 0, parsing: 20, contact: 15, sections: 25, content: 40 };

const SECTIONS: { key: string; label: string; required: boolean; names: string[] }[] = [
  { key: "summary", label: "Summary", required: false, names: ["summary", "professional summary", "profile", "about me", "objective", "career objective"] },
  { key: "skills", label: "Skills", required: true, names: ["skills", "technical skills", "key skills", "core skills", "core competencies", "skills & tools"] },
  {
    key: "experience",
    label: "Experience",
    required: true,
    names: ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "internships", "projects"],
  },
  { key: "education", label: "Education", required: true, names: ["education", "academic background", "qualifications", "academics"] },
];

const ACTION_VERBS = new Set(
  (
    "achieved analysed analyzed architected automated boosted built championed collaborated configured coordinated created cut decreased " +
    "delivered deployed designed developed directed drove enabled engineered enhanced established executed expanded facilitated generated " +
    "grew guided handled implemented improved increased initiated integrated introduced launched led maintained managed mentored migrated " +
    "modernised modernized negotiated optimised optimized organised organized owned planned produced programmed reduced redesigned refactored " +
    "resolved restructured revamped saved scaled shipped simplified spearheaded streamlined strengthened supported tested trained transformed " +
    "upgraded wrote containerised containerized maintained"
  ).split(" "),
);

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could do does for from has have how if in into is it its may more must not of on or our out " +
    "should so such than that the their them then there these they this to was we were what when where which who will with within without " +
    "you your yours about above after again all also any because before below between both each few further here just most other own same " +
    "some very via per etc e.g i.e us"
  ).split(" "),
);

// Words common to every job post that say nothing about the job itself.
const GENERIC_JOB_WORDS = new Set(
  (
    "experience experienced years year work working team teams candidate candidates role roles job jobs position opportunity company " +
    "hiring hire looking join apply applying resume cv email share send please interested immediate joiner joiners notice period location " +
    "based office hybrid remote onsite full time part good strong excellent knowledge ability able skills skill required requirement " +
    "requirements preferred plus bonus responsibilities responsible including include etc using use new great well within across help " +
    "drive build make ensure provide support understanding familiarity hands minimum least salary ctc lpa package benefits days day month " +
    "months week weeks today dm comment comments link below above urgent urgently opening openings vacancy vacancies freshers fresher"
  ).split(" "),
);

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, term: string) => new RegExp(`(^|[^a-z0-9+#.])${escapeRe(term.toLowerCase())}(?![a-z0-9+#])`, "i").test(text);

/** Important single words in a job description, beyond the known skills (most frequent first). */
export function jobTerms(jd: string, exclude: string[] = [], limit = 12) {
  const excluded = new Set(exclude.map((e) => e.toLowerCase()));
  const counts = new Map<string, number>();
  for (const raw of norm(jd).match(/[a-z][a-z0-9+#./-]{2,}/g) ?? []) {
    const word = raw.replace(/[./-]+$/, "");
    if (word.length < 3 || STOPWORDS.has(word) || GENERIC_JOB_WORDS.has(word) || excluded.has(word) || /^https?/.test(word) || word.includes("@")) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w);
}

function findSections(lines: string[]) {
  const found = new Set<string>();
  for (const line of lines) {
    const heading = line.toLowerCase().replace(/[:|]+$/, "").trim();
    if (heading.split(" ").length > 4) continue;
    for (const s of SECTIONS) if (s.names.includes(heading)) found.add(s.key);
  }
  return found;
}

export function analyzeResume(input: { text: string; pages: number; jobDescription?: string; jobTitle?: string }): AtsResult {
  const text = input.text.replace(/\r/g, "");
  const lower = norm(text);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const words = (text.match(/[A-Za-z][A-Za-z'+#.-]*/g) ?? []).length;
  const jd = (input.jobDescription ?? "").trim();
  const checks: AtsCheck[] = [];
  const add = (category: CategoryKey, id: string, status: CheckStatus, label: string, tip?: string) => checks.push({ id, category, status, label, tip });

  // ---------- ATS readability ----------
  let parsing = 100;
  if (text.replace(/\s/g, "").length < 200) {
    parsing = 0;
    add("parsing", "text", "fail", "Almost no text could be read from this resume", "It may be a scanned image or exported as pictures. Export a text-based PDF (e.g. from Word, Google Docs or Esylivo Reach).");
  } else {
    add("parsing", "text", "pass", "Text can be read by an ATS");
  }
  const spaced = lines.filter((l) => /^(?:[A-Z&] ){3,}[A-Z&]$/.test(l));
  if (spaced.length) {
    parsing -= 35;
    add("parsing", "spaced", "fail", `Spaced-out headings like "${spaced[0]}"`, "An ATS reads letter-spaced headings as separate letters and can't find your sections. Use normal headings such as EXPERIENCE.");
  }
  const odd = (text.match(/[^\x09\x0A\x20-\x7E -ɏ–-…₹]/g) ?? []).length;
  if (odd > text.length * 0.02) {
    parsing -= 25;
    add("parsing", "symbols", "warn", "Lots of unusual symbols or icons", "Icons and decorative fonts often turn into junk characters in an ATS. Use plain text labels.");
  }
  if (input.pages > 2) {
    parsing -= 20;
    add("parsing", "pages", "warn", `${input.pages} pages long`, "Keep it to 1–2 pages; recruiters skim and some ATS truncate long resumes.");
  } else {
    add("parsing", "pages", "pass", `${input.pages} page${input.pages === 1 ? "" : "s"}, a good length`);
  }

  // ---------- Contact details ----------
  const email = extractEmails(text)[0];
  const phone = extractPhones(text)[0] ?? text.match(/\+?\d[\d\s().-]{8,16}\d/)?.[0];
  const linkedin = /linkedin\.com\/in\//i.test(text);
  let contact = 0;
  if (email) contact += 40;
  add("contact", "email", email ? "pass" : "fail", email ? `Email found (${email})` : "No email address found", email ? undefined : "Add your email near the top.");
  if (phone) contact += 40;
  add("contact", "phone", phone ? "pass" : "fail", phone ? "Phone number found" : "No phone number found", phone ? undefined : "Add a mobile number with country code, e.g. +91 98765 43210.");
  if (linkedin) contact += 20;
  add("contact", "linkedin", linkedin ? "pass" : "warn", linkedin ? "LinkedIn profile linked" : "No LinkedIn profile link", linkedin ? undefined : "Recruiters check LinkedIn; add your profile URL.");

  // ---------- Sections ----------
  const found = findSections(lines);
  let sections = 0;
  for (const s of SECTIONS) {
    const ok = found.has(s.key);
    sections += ok ? (s.required ? 30 : 10) : 0;
    add(
      "sections",
      `section-${s.key}`,
      ok ? "pass" : s.required ? "fail" : "warn",
      ok ? `${s.label} section found` : `No ${s.label} section`,
      ok ? undefined : `Add a section headed "${s.label.toUpperCase()}" so the ATS can file this information.`,
    );
  }

  // ---------- Content quality ----------
  // Achievement lines: bullets, or lines that start with an action verb.
  const achievementLines = lines.filter((l) => {
    const first = l.replace(/^[•●▪*\-–]\s*/, "").split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    return /^[•●▪*\-–]\s/.test(l) || ACTION_VERBS.has(first);
  });
  const actionLed = achievementLines.filter((l) => ACTION_VERBS.has(l.replace(/^[•●▪*\-–]\s*/, "").split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "")).length;
  const quantified = achievementLines.filter((l) => /\d/.test(l)).length;
  let content = 0;
  if (achievementLines.length >= 3) {
    content += 25;
    add("content", "bullets", "pass", `${achievementLines.length} achievement bullet points`);
  } else {
    add("content", "bullets", "fail", "Few or no achievement bullet points", "Under each role, list 3–5 results starting with a verb, e.g. \"Built a React dashboard used by 5,000 users\".");
  }
  const verbShare = achievementLines.length ? actionLed / achievementLines.length : 0;
  content += Math.round(25 * Math.min(1, verbShare / 0.7));
  if (achievementLines.length) {
    add(
      "content",
      "verbs",
      verbShare >= 0.7 ? "pass" : "warn",
      `${Math.round(verbShare * 100)}% of bullets start with an action verb`,
      verbShare >= 0.7 ? undefined : "Start bullets with strong verbs: Built, Led, Reduced, Launched, Improved.",
    );
  }
  const quantShare = achievementLines.length ? quantified / achievementLines.length : 0;
  content += Math.round(25 * Math.min(1, quantShare / 0.4));
  add(
    "content",
    "numbers",
    quantShare >= 0.4 ? "pass" : "warn",
    `${quantified} of ${achievementLines.length} bullets include a number`,
    quantShare >= 0.4 ? undefined : "Add numbers that show impact: %, users, time saved, revenue, team size.",
  );
  if (words >= 250 && words <= 1000) {
    content += 15;
    add("content", "length", "pass", `${words} words, a good amount of detail`);
  } else {
    add("content", "length", "warn", words < 250 ? `Only ${words} words` : `${words} words, quite long`, words < 250 ? "Add more detail about your experience, projects and skills." : "Trim older or less relevant details.");
  }
  const pronouns = (lower.match(/\b(i|me|my|myself)\b/g) ?? []).length;
  if (pronouns <= 2) content += 10;
  add("content", "pronouns", pronouns <= 2 ? "pass" : "warn", pronouns <= 2 ? "Written without “I/my”" : `Uses “I/me/my” ${pronouns} times`, pronouns <= 2 ? undefined : "Resumes read better without first person: \"Built X\" instead of \"I built X\".");

  // ---------- Keyword match ----------
  let keywordScore = 0;
  let keywords: AtsResult["keywords"] = null;
  if (jd) {
    const resumeSkills = new Set(skillsIn(text));
    const jdSkills = skillsIn(jd);
    const terms = jobTerms(jd, jdSkills.flatMap((s) => s.toLowerCase().split(/\s+/)));
    const matchedSkills = jdSkills.filter((s) => resumeSkills.has(s));
    const matchedTerms = terms.filter((t) => has(lower, t));
    keywords = {
      matched: [...matchedSkills, ...matchedTerms],
      missing: [...jdSkills.filter((s) => !resumeSkills.has(s)), ...terms.filter((t) => !matchedTerms.includes(t))],
    };
    // Named skills matter most to ATS filters; other repeated terms add context.
    const skillPart = jdSkills.length ? matchedSkills.length / jdSkills.length : 1;
    const termPart = terms.length ? matchedTerms.length / terms.length : 1;
    keywordScore = Math.round(100 * (0.75 * skillPart + 0.25 * termPart));
    const total = jdSkills.length + terms.length;
    add(
      "keywords",
      "keywords",
      keywordScore >= 75 ? "pass" : keywordScore >= 50 ? "warn" : "fail",
      `Matches ${keywords.matched.length} of ${total} keywords from the job`,
      keywordScore >= 75 ? undefined : "Add the missing skills you genuinely have, using the same words as the job post.",
    );
    if (input.jobTitle) {
      const titleWords = norm(input.jobTitle).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w) && !["senior", "junior", "lead", "sr", "jr"].includes(w));
      const titleHit = titleWords.length > 0 && titleWords.every((w) => has(lower, w));
      add(
        "keywords",
        "title",
        titleHit ? "pass" : "warn",
        titleHit ? `Job title "${input.jobTitle}" appears in your resume` : `Job title "${input.jobTitle}" doesn't appear in your resume`,
        titleHit ? undefined : "ATS often rank by title match. If it fits, use the job's title in your headline or summary.",
      );
    }
  }

  // ---------- Total ----------
  const weights = jd ? WEIGHTS_WITH_JOB : WEIGHTS_NO_JOB;
  const raw: Record<CategoryKey, number> = {
    keywords: keywordScore,
    parsing: Math.max(0, parsing),
    contact,
    sections,
    content: Math.min(100, content),
  };
  const categories = (Object.keys(weights) as CategoryKey[])
    .filter((k) => weights[k] > 0)
    .map((key) => ({ key, label: CATEGORY_LABELS[key], score: raw[key], weight: weights[key] }));
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  let score = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);
  // An unreadable resume fails an ATS no matter what else is in it.
  if (raw.parsing === 0) score = Math.min(score, 15);

  const order: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };
  checks.sort((a, b) => order[a.status] - order[b.status]);

  return {
    score,
    grade: score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Needs work" : "Poor",
    categories,
    keywords,
    checks,
    stats: { words, pages: input.pages, bullets: achievementLines.length, quantified },
  };
}
