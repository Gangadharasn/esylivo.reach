// Interview prep helpers: picking topics for a user or job, searching the bank, and
// scoring mock-interview answers against each question's key points. Pure functions.
import { canonicalSkill, skillsIn } from "@/lib/skills";

import { ALL_QUESTIONS, TOPICS, type Level } from "./bank";

export type StudyQuestionView = {
  id: string;
  topicId: string;
  topicName: string;
  q: string;
  a: string;
  points: string[];
  level: Level;
  custom?: boolean;
};

/** Topics that cover these skills (canonical names), with HR & Behavioural always last. */
export function topicsForSkills(skills: string[]) {
  const wanted = new Set(skills.map(canonicalSkill));
  const matched = TOPICS.filter((t) => t.id !== "hr" && t.skills.some((s) => wanted.has(s)));
  return [...matched.map((t) => t.id), "hr"];
}

/** Topics a job description asks about. */
export function topicsForJob(text: string) {
  return topicsForSkills(skillsIn(text));
}

const norm = (s: string) => s.toLowerCase().replace(/[`*_]/g, "").replace(/\s+/g, " ");

/** Questions matching a free-text keyword: topic name, skill or question/answer text. */
export function searchQuestions<T extends StudyQuestionView>(questions: T[], keyword: string) {
  const k = norm(keyword.trim());
  if (!k) return questions;
  const skill = canonicalSkill(keyword).toLowerCase();
  const topicHits = new Set(
    TOPICS.filter((t) => t.name.toLowerCase().includes(k) || t.skills.some((s) => s.toLowerCase() === skill || s.toLowerCase().includes(k))).map((t) => t.id),
  );
  return questions.filter((q) => topicHits.has(q.topicId) || norm(q.q).includes(k) || norm(q.a).includes(k) || q.topicName.toLowerCase().includes(k));
}

export function bankQuestions(): StudyQuestionView[] {
  return ALL_QUESTIONS.map((q) => ({ id: q.id, topicId: q.topicId, topicName: q.topicName, q: q.q, a: q.a, points: q.points, level: q.level }));
}

export type Grade = { score: number; covered: string[]; missed: string[]; words: number; feedback: string };

const pointLabel = (p: string) => p.split("|")[0];

/**
 * Scores a spoken or typed answer: the share of key points it mentions (any alternative
 * counts), held back for very short answers. Deterministic, so practice is comparable.
 */
export function gradeAnswer(answer: string, points: string[]): Grade {
  const text = norm(answer);
  const words = (answer.match(/\S+/g) ?? []).length;
  const covered: string[] = [];
  const missed: string[] = [];
  for (const p of points) {
    const hit = p.split("|").some((alt) => text.includes(norm(alt)));
    (hit ? covered : missed).push(pointLabel(p));
  }
  let score = points.length ? Math.round((covered.length / points.length) * 100) : 0;
  if (words < 12) score = Math.min(score, 30);
  else if (words < 25) score = Math.min(score, 70);

  const feedback =
    words === 0
      ? "No answer given. Have a go next time; even a partial answer shows how you think."
      : score >= 80
        ? "Strong answer: you covered the key points. Add a short real example from your work to make it memorable."
        : score >= 50
          ? `Good start. Also mention ${missed.slice(0, 3).join(", ")} to make it complete.`
          : words < 25
            ? "Too brief. Explain the idea, then give an example from a project you worked on."
            : `Missing the core ideas: ${missed.slice(0, 3).join(", ")}. Review the model answer below.`;
  return { score, covered, missed, words, feedback };
}

/** Shuffled pick of `count` questions, mixing levels (seeded by `seed` for repeatable tests). */
export function pickMockQuestions<T extends { id: string; level: number }>(pool: T[], count: number, seed = Date.now()) {
  let s = seed % 2147483647 || 1;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const shuffled = [...pool].sort(() => rand() - 0.5);
  // Warm up with easier questions, end with harder ones, like a real interview.
  return shuffled.slice(0, count).sort((a, b) => a.level - b.level);
}
