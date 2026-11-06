import "server-only";

import { aiEnabled, chat } from "@/lib/ai";

export type GeneratedQuestion = { question: string; answer: string; points: string[]; level: 1 | 2 | 3 };

/** Pulls the first JSON array/object out of a model reply (models often wrap it in prose or ``` fences). */
function parseJson(text: string): unknown {
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) throw new Error("AI reply had no JSON");
  return JSON.parse(match[0]);
}

/** Interview questions for a keyword or a job description, in the bank's answer format. */
export async function generateQuestions(subject: string, count = 8): Promise<GeneratedQuestion[]> {
  if (!aiEnabled()) throw new Error("AI is not configured");
  const reply = await chat(
    "You are a senior interviewer at an Indian tech company. Write realistic interview questions with model answers. " +
      'Reply with ONLY a JSON array: [{"question": string, "answer": string, "points": string[], "level": 1|2|3}]. ' +
      'Answers: 50-120 words, may use "- " bullets, **bold**, `code` and ```code blocks```, newline-separated. ' +
      "points: 3-5 short lowercase key terms a good answer must mention. level: 1 basic, 2 intermediate, 3 advanced.",
    `Write ${count} interview questions (mixed levels, mostly technical, include 1 behavioural) for:\n${subject.slice(0, 4000)}`,
  );
  const data = parseJson(reply);
  if (!Array.isArray(data)) throw new Error("AI reply was not a list");
  return data
    .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
    .map((d) => ({
      question: String(d.question ?? "").trim(),
      answer: String(d.answer ?? "").trim(),
      points: Array.isArray(d.points) ? d.points.map((p) => String(p).toLowerCase().trim()).filter(Boolean).slice(0, 6) : [],
      level: ([1, 2, 3].includes(Number(d.level)) ? Number(d.level) : 2) as 1 | 2 | 3,
    }))
    .filter((d) => d.question.length > 8 && d.answer.length > 20)
    .slice(0, count);
}

/** Interviewer-style feedback on one answer. Returns null if AI is off or fails. */
export async function aiFeedback(question: string, modelAnswer: string, answer: string) {
  if (!aiEnabled() || !answer.trim()) return null;
  try {
    const reply = await chat(
      "You are a kind but honest interviewer giving feedback on a candidate's answer. " +
        'Reply with ONLY JSON: {"score": 0-100, "feedback": "2-3 sentences: what was good, what to add or fix"}.',
      `Question: ${question}\n\nReference answer: ${modelAnswer}\n\nCandidate's answer: ${answer.slice(0, 3000)}`,
    );
    const data = parseJson(reply) as { score?: unknown; feedback?: unknown };
    const score = Math.max(0, Math.min(100, Math.round(Number(data.score))));
    if (!Number.isFinite(score) || typeof data.feedback !== "string") return null;
    return { score, feedback: data.feedback.trim() };
  } catch (err) {
    console.error("[study] AI feedback failed", err);
    return null;
  }
}
