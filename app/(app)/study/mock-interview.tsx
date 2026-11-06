"use client";

import { ArrowRight, CheckCircle2, Clock, History, Loader2, Mic, MicOff, Play, RotateCcw, Sparkles, Trophy, Volume2, VolumeX, XCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { RichText } from "@/components/rich-text";
import { Button, Card, CardHeader, Select, Textarea } from "@/components/ui";
import { pickMockQuestions, type Grade, type StudyQuestionView } from "@/lib/study";
import { LEVEL_LABELS } from "@/lib/study/bank";
import { cn } from "@/lib/utils";

import { gradeAction, saveMockAction, type MockResult } from "./actions";

type Topic = { id: string; name: string };
type Job = { id: string; label: string; topics: string[] };
type Mock = { id: string; title: string; score: number; when: string; count: number };
type Stage = "setup" | "asking" | "feedback" | "done";

const SECONDS_PER_QUESTION = 120;
const plain = (md: string) => md.replace(/```[\s\S]*?```/g, " ").replace(/[`*]/g, "");
const tone = (s: number) => (s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600");
const ring = (s: number) => (s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444");

// Minimal typing for the browser speech-to-text API (Chrome/Edge/Android; not in all browsers).
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
};
const speechRecognition = () =>
  typeof window === "undefined"
    ? undefined
    : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition);

export function MockInterview({
  questions,
  topics,
  suggested,
  jobs,
  initialJob,
  mocks,
}: {
  questions: StudyQuestionView[];
  topics: Topic[];
  suggested: string[];
  jobs: Job[];
  initialJob: string;
  mocks: Mock[];
}) {
  const [stage, setStage] = useState<Stage>("setup");
  const [chosen, setChosen] = useState<string[]>(suggested);
  const [jobId, setJobId] = useState(initialJob);
  const [count, setCount] = useState(5);
  const [speak, setSpeak] = useState(true);
  const [timed, setTimed] = useState(true);
  const [set, setSet] = useState<StudyQuestionView[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<(Grade & { ai: boolean }) | null>(null);
  const [results, setResults] = useState<MockResult[]>([]);
  const [left, setLeft] = useState(SECONDS_PER_QUESTION);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [grading, startGrading] = useTransition();
  const recognition = useRef<Recognition | null>(null);

  const current = set[index];
  const pool = questions.filter((q) => chosen.includes(q.topicId));

  useEffect(() => setCanListen(Boolean(speechRecognition())), []);

  // Countdown while answering.
  useEffect(() => {
    if (stage !== "asking" || !timed) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [stage, timed, index]);

  // Interviewer reads each question aloud.
  useEffect(() => {
    if (stage !== "asking" || !speak || !current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plain(current.q));
    u.lang = "en-IN";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [stage, speak, current]);

  const stopListening = () => {
    recognition.current?.stop();
    setListening(false);
  };

  const toggleMic = () => {
    if (listening) return stopListening();
    const SR = speechRecognition();
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setAnswer((a) => `${a}${a && !a.endsWith(" ") ? " " : ""}${text.trim()}`);
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    window.speechSynthesis?.cancel();
    r.start();
    setListening(true);
  };

  const begin = () => {
    const picked = pickMockQuestions(pool, Math.min(count, pool.length));
    setSet(picked);
    setIndex(0);
    setResults([]);
    setAnswer("");
    setGrade(null);
    setLeft(SECONDS_PER_QUESTION);
    setStage("asking");
  };

  const submit = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    startGrading(async () => {
      const g = await gradeAction({ question: current.q, modelAnswer: current.a, points: current.points, answer });
      setGrade(g);
      setResults((r) => [...r, { questionId: current.id, question: current.q, answer, score: g.score, covered: g.covered, missed: g.missed }]);
      setStage("feedback");
    });
  };

  const next = () => {
    if (index + 1 < set.length) {
      setIndex(index + 1);
      setAnswer("");
      setGrade(null);
      setLeft(SECONDS_PER_QUESTION);
      setStage("asking");
    } else {
      setStage("done");
      const job = jobs.find((j) => j.id === jobId);
      const title = job ? `Mock for ${job.label}` : `Mock: ${topics.filter((t) => chosen.includes(t.id)).map((t) => t.name).slice(0, 3).join(", ")}`;
      void saveMockAction(title, results);
    }
  };

  // ---------- Setup ----------
  if (stage === "setup") {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-brand-700 to-fuchsia-600 p-6 text-white">
            <Sparkles className="absolute -right-4 -top-4 size-28 text-white/10" />
            <p className="text-sm text-brand-100">Practice makes it easy</p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Mock interview</h2>
            <p className="mt-2 max-w-md text-sm text-brand-100">
              Answer one question at a time, by typing or speaking. You get a score, what you covered and missed, and a model answer after each one.
            </p>
          </div>
          <div className="space-y-5 p-5">
            {jobs.length ? (
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Practise for a job (optional)</p>
                <Select
                  value={jobId}
                  onChange={(e) => {
                    setJobId(e.target.value);
                    const j = jobs.find((x) => x.id === e.target.value);
                    if (j) setChosen(j.topics);
                  }}
                >
                  <option value="">Choose topics myself</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => {
                  const on = chosen.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setChosen(on ? chosen.filter((x) => x !== t.id) : [...chosen, t.id])}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium ring-1",
                        on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{pool.length} questions in these topics</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Questions</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                  {[3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={cn("rounded-md py-1.5 text-sm font-medium", count === n ? "bg-white text-brand-700 shadow-sm" : "text-slate-600")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle on={speak} onChange={setSpeak} icon={speak ? Volume2 : VolumeX} label="Read questions aloud" />
              <Toggle on={timed} onChange={setTimed} icon={Clock} label="2-minute timer" />
            </div>
            <Button variant="gradient" className="w-full py-3 text-base" disabled={!pool.length} onClick={begin}>
              <Play className="size-4" /> Start interview
            </Button>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Past interviews" action={<History className="size-5 text-brand-500" />} />
          {mocks.length ? (
            <ul className="divide-y divide-slate-100">
              {mocks.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn("w-10 text-lg font-semibold tabular-nums", tone(m.score))}>{m.score}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.count} questions · {m.when}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Your scores will show here so you can see yourself improve.</p>
          )}
        </Card>
      </div>
    );
  }

  // ---------- Summary ----------
  if (stage === "done") {
    const total = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    const weak = results.filter((r) => r.score < 60);
    return (
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-[#1e1b4b] via-brand-700 to-fuchsia-600 px-6 py-8 text-center text-white">
          <Trophy className="size-10 text-amber-300" />
          <p className="text-sm text-brand-100">Interview complete</p>
          <p className="text-5xl font-bold tabular-nums">{total}</p>
          <p className="text-brand-100">
            {total >= 75 ? "Excellent! You're interview-ready on these topics." : total >= 50 ? "Good effort. A little more practice and you'll nail it." : "Keep going: review the answers below and try again."}
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {results.map((r, i) => (
            <li key={r.questionId} className="flex items-start gap-3 px-5 py-4">
              <span className={cn("w-10 shrink-0 text-lg font-semibold tabular-nums", tone(r.score))}>{r.score}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {i + 1}. <RichText text={r.question} className="inline" />
                </div>
                {r.missed.length ? <p className="mt-1 text-xs text-slate-500">Missed: {r.missed.join(", ")}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-5">
          <Button variant="gradient" onClick={begin}>
            <RotateCcw className="size-4" /> New interview
          </Button>
          <Button variant="secondary" onClick={() => setStage("setup")}>
            Change topics
          </Button>
          {weak.length ? <p className="w-full text-sm text-slate-500">Tip: {weak.length} answer{weak.length === 1 ? "" : "s"} scored under 60. Study those in the Questions tab.</p> : null}
        </div>
      </Card>
    );
  }

  // ---------- Question / feedback ----------
  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {set.map((q, i) => (
            <span
              key={q.id}
              className={cn("h-1.5 flex-1 rounded-full", i < index || (i === index && stage === "feedback") ? "bg-brand-600" : i === index ? "bg-brand-300" : "bg-slate-200")}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-slate-600">
          {index + 1}/{set.length}
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 bg-gradient-to-r from-brand-50 to-fuchsia-50 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-fuchsia-600 text-sm font-semibold text-white shadow">
            AI
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-brand-700">
              Interviewer · {current.topicName} · {LEVEL_LABELS[current.level]}
            </p>
            <div className="mt-1 text-lg font-semibold leading-snug text-slate-900">
              <RichText text={current.q} className="inline" />
            </div>
          </div>
          {speak ? (
            <button
              type="button"
              aria-label="Read the question again"
              onClick={() => {
                window.speechSynthesis?.cancel();
                const u = new SpeechSynthesisUtterance(plain(current.q));
                u.lang = "en-IN";
                window.speechSynthesis?.speak(u);
              }}
              className="rounded-full p-2 text-brand-600 hover:bg-white"
            >
              <Volume2 className="size-5" />
            </button>
          ) : null}
        </div>

        {stage === "asking" ? (
          <div className="space-y-3 p-5">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={canListen ? "Type your answer, or tap the mic and speak…" : "Type your answer…"}
              className="min-h-44"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              {canListen ? (
                <Button variant={listening ? "danger" : "secondary"} onClick={toggleMic} className="py-2.5">
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />} {listening ? "Stop" : "Speak"}
                  {listening ? <span className="size-2 animate-pulse rounded-full bg-red-500" /> : null}
                </Button>
              ) : null}
              {timed ? (
                <span className={cn("flex items-center gap-1 text-sm tabular-nums", left <= 15 ? "font-semibold text-red-600" : "text-slate-500")}>
                  <Clock className="size-4" /> {mins}:{secs}
                </span>
              ) : null}
              <Button variant="gradient" className="ml-auto py-2.5" onClick={submit} disabled={grading}>
                {grading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {answer.trim() ? "Submit answer" : "Skip"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">Tip: explain the idea, then give a quick example from your own work.</p>
          </div>
        ) : grade ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(${ring(grade.score)} ${grade.score * 3.6}deg, #eef2f7 0deg)` }}
              >
                <span className={cn("flex size-16 items-center justify-center rounded-full bg-white text-xl font-bold tabular-nums", tone(grade.score))}>{grade.score}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{grade.ai ? "Interviewer feedback" : "Feedback"}</p>
                <p className="text-sm text-slate-600">{grade.feedback}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PointList title="You covered" items={grade.covered} ok />
              <PointList title="You could add" items={grade.missed} />
            </div>
            <details className="rounded-xl bg-slate-50 ring-1 ring-slate-200" open={grade.score < 60}>
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand-700">Model answer</summary>
              <div className="px-4 pb-4">
                <RichText text={current.a} />
              </div>
            </details>
            <Button variant="gradient" className="w-full py-3" onClick={next}>
              {index + 1 < set.length ? (
                <>
                  Next question <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  See my results <Trophy className="size-4" />
                </>
              )}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function PointList({ title, items, ok }: { title: string; items: string[]; ok?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3 ring-1", ok ? "bg-emerald-50/60 ring-emerald-100" : "bg-amber-50/60 ring-amber-100")}>
      <p className={cn("mb-1.5 text-xs font-semibold uppercase tracking-wide", ok ? "text-emerald-700" : "text-amber-800")}>{title}</p>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((p) => (
            <li key={p} className="flex items-center gap-1.5 text-sm text-slate-700">
              {ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-amber-500" />} {p}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{ok ? "None yet" : "Nothing, great job!"}</p>
      )}
    </div>
  );
}

function Toggle({ on, onChange, icon: Icon, label }: { on: boolean; onChange: (v: boolean) => void; icon: typeof Clock; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={cn(
        "flex items-center gap-2 self-end rounded-lg px-3 py-2.5 text-left text-sm ring-1",
        on ? "bg-brand-50 font-medium text-brand-800 ring-brand-300" : "text-slate-600 ring-slate-200",
      )}
    >
      <Icon className="size-4 shrink-0" /> {label}
    </button>
  );
}
