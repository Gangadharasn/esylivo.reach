// Skill vocabulary used to find what a job post asks for and score it against the
// user's profile. Aliases map to one canonical name.

const SKILLS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "es6"],
  TypeScript: ["typescript"],
  React: ["react", "reactjs", "react.js"],
  "React Native": ["react native", "react-native"],
  "Next.js": ["next.js", "nextjs", "next js"],
  Angular: ["angular", "angularjs"],
  "Vue.js": ["vue", "vuejs", "vue.js"],
  "Node.js": ["node", "nodejs", "node.js"],
  "Express.js": ["expressjs", "express.js"],
  NestJS: ["nestjs", "nest.js"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3", "scss", "sass"],
  "Tailwind CSS": ["tailwind", "tailwindcss"],
  Redux: ["redux"],
  GraphQL: ["graphql"],
  "REST APIs": ["rest api", "restful", "rest apis"],
  Python: ["python"],
  Django: ["django"],
  Flask: ["flask"],
  FastAPI: ["fastapi"],
  Java: ["java"],
  Spring: ["spring", "spring boot", "springboot"],
  "C#": ["c#", "csharp"],
  ".NET": [".net", "dotnet", "asp.net", ".net core"],
  "C++": ["c++", "cpp"],
  Golang: ["go lang", "go developer"],
  Rust: ["rust"],
  PHP: ["php"],
  Laravel: ["laravel"],
  Ruby: ["ruby", "rails", "ruby on rails"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  Flutter: ["flutter"],
  Dart: ["dart"],
  Android: ["android"],
  iOS: ["ios"],
  SQL: ["sql"],
  MySQL: ["mysql"],
  PostgreSQL: ["postgres", "postgresql"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  "SQL Server": ["sql server", "mssql"],
  Oracle: ["oracle"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  "CI/CD": ["ci/cd", "cicd", "jenkins", "github actions"],
  Git: ["git", "github", "gitlab"],
  Linux: ["linux"],
  Microservices: ["microservices", "microservice"],
  "Machine Learning": ["machine learning", "ml"],
  "Deep Learning": ["deep learning"],
  "Generative AI": ["generative ai", "genai", "gen ai", "llm", "llms"],
  TensorFlow: ["tensorflow"],
  PyTorch: ["pytorch"],
  Pandas: ["pandas"],
  "Data Analysis": ["data analysis", "data analytics"],
  "Power BI": ["power bi", "powerbi"],
  Tableau: ["tableau"],
  "MS Excel": ["microsoft excel", "advanced excel"],
  Selenium: ["selenium"],
  Cypress: ["cypress"],
  Playwright: ["playwright"],
  "Manual Testing": ["manual testing"],
  "Automation Testing": ["automation testing", "test automation"],
  Jest: ["jest"],
  Figma: ["figma"],
  "UI/UX": ["ui/ux", "ux", "ui design", "user experience"],
  Salesforce: ["salesforce"],
  SAP: ["sap"],
  "Digital Marketing": ["digital marketing", "seo", "sem", "social media marketing"],
  Sales: ["sales", "business development", "b2b sales"],
  Recruitment: ["recruitment", "talent acquisition", "hr"],
  Agile: ["agile", "scrum", "jira"],
  "Project Management": ["project management", "pmp"],
  "Communication Skills": ["communication skill", "good communication"],
};

const LOOKUP: [string, RegExp][] = Object.entries(SKILLS).flatMap(([name, aliases]) =>
  [name.toLowerCase(), ...aliases].map((alias) => [name, aliasPattern(alias)] as [string, RegExp]),
);

function aliasPattern(alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Word-ish boundaries that also work for names like "c#", ".net" and "node.js".
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}(?![a-z0-9+#])`, "i");
}

/** Canonical name for a skill the user typed ("reactjs" -> "React"); unknown skills pass through. */
export function canonicalSkill(skill: string) {
  const lower = skill.trim().toLowerCase();
  for (const [name, aliases] of Object.entries(SKILLS)) {
    if (name.toLowerCase() === lower || aliases.includes(lower)) return name;
  }
  return skill.trim();
}

/** Known skills mentioned in a piece of text. */
export function skillsIn(text: string) {
  const found = new Set<string>();
  for (const [name, pattern] of LOOKUP) if (pattern.test(text)) found.add(name);
  return [...found];
}

function mentions(text: string, skill: string) {
  const canonical = canonicalSkill(skill);
  if (SKILLS[canonical]) return skillsIn(text).includes(canonical);
  return aliasPattern(skill.toLowerCase()).test(text);
}

/**
 * How well a profile fits a job post, 0–100. Based on the share of the skills the
 * post asks for that the profile has; posts naming no known skills score on raw overlap.
 */
export function matchJob(text: string, profileSkills: string[]) {
  const mine = [...new Set(profileSkills.map(canonicalSkill))];
  const matched = mine.filter((s) => mentions(text, s));
  const wanted = skillsIn(text);
  const missing = wanted.filter((s) => !matched.includes(s));
  const score = wanted.length
    ? Math.round((wanted.filter((s) => matched.includes(s)).length / wanted.length) * 100)
    : Math.min(100, matched.length * 25);
  return { score, matched, missing, wanted };
}

/** How many of the given keywords appear in a piece of text (for ordering resume bullets). */
export function keywordHits(text: string, keywords: string[]) {
  return keywords.filter((k) => mentions(text, k)).length;
}
