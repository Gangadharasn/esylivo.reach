import { describe, expect, it } from "vitest";

import { bankQuestions, gradeAnswer, pickMockQuestions, searchQuestions, topicsForJob, topicsForSkills } from "@/lib/study";
import { ALL_QUESTIONS, TOPICS } from "@/lib/study/bank";

describe("question bank", () => {
  it("has unique ids, answers and key points for every question", () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_QUESTIONS.length).toBeGreaterThanOrEqual(90);
    for (const q of ALL_QUESTIONS) {
      expect(q.a.length, q.id).toBeGreaterThan(80);
      expect(q.points.length, q.id).toBeGreaterThanOrEqual(3);
      // Code fences must be balanced or the answer renders wrongly.
      expect((q.a.match(/```/g) ?? []).length % 2, q.id).toBe(0);
    }
  });

  it("has a full HR & behavioural section", () => {
    expect(TOPICS.find((t) => t.id === "hr")?.questions.length).toBeGreaterThanOrEqual(6);
  });
});

describe("topics", () => {
  it("picks topics from skills, always ending with HR", () => {
    expect(topicsForSkills(["reactjs", "Node.js", "MongoDB"])).toEqual(["react", "nodejs", "mongodb", "hr"]);
    expect(topicsForSkills([])).toEqual(["hr"]);
  });

  it("reads topics from a job description", () => {
    expect(topicsForJob("Hiring Python developer with Django, PostgreSQL and Docker")).toEqual(["sql", "python", "devops", "hr"]);
  });

  it("searches by skill alias, topic or text", () => {
    const qs = bankQuestions();
    expect(searchQuestions(qs, "reactjs").every((q) => q.topicId === "react" || q.a.toLowerCase().includes("reactjs"))).toBe(true);
    expect(searchQuestions(qs, "closures").map((q) => q.id)).toContain("js-2");
    expect(searchQuestions(qs, "STAR").some((q) => q.topicId === "hr")).toBe(true);
    expect(searchQuestions(qs, "")).toHaveLength(qs.length);
  });
});

describe("mock grading", () => {
  const points = ["function scope|function-scoped", "block scope|block-scoped", "hoist", "reassign", "temporal dead zone|tdz"];

  it("scores key-point coverage, accepting alternatives", () => {
    const g = gradeAnswer(
      "var is function-scoped and hoisted, while let and const are block scoped. const cannot be reassigned, and both sit in the TDZ until declared, so using them early throws an error.",
      points,
    );
    expect(g.score).toBe(100);
    expect(g.missed).toEqual([]);
  });

  it("lists what was missed and holds back very short answers", () => {
    const partial = gradeAnswer("var is function scope and let is block scope, so they differ in where you can use the variable in your code.", points);
    expect(partial.score).toBe(40);
    expect(partial.missed).toEqual(["hoist", "reassign", "temporal dead zone"]);
    expect(gradeAnswer("hoist reassign tdz block scope function scope", points).score).toBeLessThanOrEqual(30);
    expect(gradeAnswer("", points)).toMatchObject({ score: 0, words: 0 });
  });

  it("picks mixed questions, easy first, without repeats", () => {
    const pool = bankQuestions().filter((q) => q.topicId === "javascript");
    const picked = pickMockQuestions(pool, 5, 42);
    expect(new Set(picked.map((q) => q.id)).size).toBe(5);
    expect(picked.map((q) => q.level)).toEqual([...picked.map((q) => q.level)].sort());
    expect(pickMockQuestions(pool, 5, 42).map((q) => q.id)).toEqual(picked.map((q) => q.id));
  });
});
