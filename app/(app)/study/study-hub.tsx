"use client";

import { BookOpen, Bookmark, CheckCircle2, ChevronDown, Loader2, Mic, Search, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { RichText } from "@/components/rich-text";
import { Button, Card, Select } from "@/components/ui";
import { searchQuestions, type StudyQuestionView } from "@/lib/study";
import { LEVEL_LABELS, type Level } from "@/lib/study/bank";
import { cn } from "@/lib/utils";

import { deleteCustomTopicAction, generateAction, markQuestionAction } from "./actions";
import { MockInterview } from "./mock-interview";

type Topic = { id: string; name: string };
type Job = { id: string; label: string; topics: string[] };
type Mock = { id: string; title: string; score: number; when: string; count: number };

export type StudyHubProps = {
  initialTab: "questions" | "mock";
  initialJob: string;
  questions: StudyQuestionView[];
  topics: Topic[];
  suggested: string[];
  marks: Record<string, string>;
  jobs: Job[];
  mocks: Mock[];
  aiEnabled: boolean;
};

const LEVEL_STYLE: Record<Level, string> = {
  1: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  2: "bg-amber-50 text-amber-800 ring-amber-200",
  3: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StudyHub(props: StudyHubProps) {
  const [tab, setTab] = useState(props.initialTab);
  const jobTopics = props.jobs.find((j) => j.id === props.initialJob)?.topics;
  const [selected, setSelected] = useState<string[]>(jobTopics ?? props.suggested);

  return (
    <div className="space-y-5">
      <div className="inline-flex w-full rounded-xl bg-white p-1 ring-1 ring-slate-200 sm:w-auto">
        {(
          [
            ["questions", "Questions & answers", BookOpen],
            ["mock", "Mock interview", Mic],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none",
              tab === key ? "bg-gradient-to-r from-brand-600 to-fuchsia-600 text-white shadow" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "questions" ? (
        <QuestionsTab {...props} selected={selected} setSelected={setSelected} />
      ) : (
        <MockInterview questions={props.questions} topics={props.topics} suggested={selected} jobs={props.jobs} initialJob={props.initialJob} mocks={props.mocks} />
      )}
    </div>
  );
}

function QuestionsTab({
  questions,
  topics,
  suggested,
  marks: initialMarks,
  jobs,
  aiEnabled,
  selected,
  setSelected,
}: StudyHubProps & { selected: string[]; setSelected: (v: string[]) => void }) {
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState<"all" | Level>("all");
  const [status, setStatus] = useState<"all" | "todo" | "REVIEW" | "KNOWN">("all");
  const [marks, setMarks] = useState(initialMarks);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [jobId, setJobId] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [generating, startGenerate] = useTransition();
  const [, start] = useTransition();

  const searching = keyword.trim().length > 0;
  const visible = useMemo(() => {
    // A keyword searches every topic; otherwise show the selected topics.
    let list = searching ? searchQuestions(questions, keyword) : questions.filter((q) => selected.includes(q.topicId));
    if (level !== "all") list = list.filter((q) => q.level === level);
    if (status === "todo") list = list.filter((q) => !marks[q.id]);
    else if (status !== "all") list = list.filter((q) => marks[q.id] === status);
    return list;
  }, [questions, keyword, searching, selected, level, status, marks]);

  const scope = searching ? searchQuestions(questions, keyword) : questions.filter((q) => selected.includes(q.topicId));
  const known = scope.filter((q) => marks[q.id] === "KNOWN").length;
  const review = scope.filter((q) => marks[q.id] === "REVIEW").length;
  const pct = scope.length ? Math.round((known / scope.length) * 100) : 0;

  const toggleTopic = (id: string) => setSelected(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);
  const mark = (id: string, next: "KNOWN" | "REVIEW") => {
    const value = marks[id] === next ? "NONE" : next;
    setMarks((m) => {
      const copy = { ...m };
      if (value === "NONE") delete copy[id];
      else copy[id] = value;
      return copy;
    });
    start(() => markQuestionAction(id, value));
  };
  const toggleOpen = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const generate = (subject: { keyword?: string; jobId?: string }) =>
    startGenerate(async () => {
      setNotice(null);
      const r = await generateAction(subject);
      if ("error" in r && r.error) setNotice({ tone: "error", text: r.error });
      else if ("added" in r) {
        setNotice({ tone: "ok", text: `Added ${r.added} questions for "${r.topic}".` });
        setKeyword("");
        setSelected([...selected.filter((t) => t !== `custom:${r.topic}`), `custom:${r.topic}`]);
      }
    });

  const pickJob = (id: string) => {
    setJobId(id);
    const job = jobs.find((j) => j.id === id);
    if (job) {
      setKeyword("");
      setSelected(job.topics);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Filters */}
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-[#1e1b4b] via-brand-700 to-fuchsia-600 p-5 text-white">
            <p className="text-sm text-brand-100">{searching ? `Results for "${keyword}"` : "Your progress"}</p>
            <p className="mt-1 text-3xl font-semibold">{pct}%</p>
            <div className="mt-3 h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-brand-100">
              {known} known · {review} to review · {scope.length} questions
            </p>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search a skill or topic, e.g. closures"
              className="block w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-9 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
            />
            {keyword ? (
              <button type="button" onClick={() => setKeyword("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400" aria-label="Clear search">
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {aiEnabled && searching ? (
            <Button variant="secondary" className="w-full" disabled={generating} onClick={() => generate({ keyword })}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-fuchsia-600" />} Generate &ldquo;{keyword.slice(0, 24)}&rdquo; questions
            </Button>
          ) : null}

          {jobs.length ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Prepare for a job</p>
              <Select value={jobId} onChange={(e) => pickJob(e.target.value)} aria-label="Prepare for a job">
                <option value="">Choose one of your jobs…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.label}
                  </option>
                ))}
              </Select>
              {aiEnabled && jobId ? (
                <Button variant="secondary" className="mt-2 w-full" disabled={generating} onClick={() => generate({ jobId })}>
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-fuchsia-600" />} Questions for this exact job
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className={cn(searching && "pointer-events-none opacity-40")}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topics</p>
              <button type="button" onClick={() => setSelected(suggested)} className="text-xs font-medium text-brand-600 hover:underline">
                For you
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <span key={t.id} className="inline-flex">
                    <button
                      type="button"
                      onClick={() => toggleTopic(t.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                        on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                        t.id.startsWith("custom:") && "pr-2",
                      )}
                    >
                      {t.id.startsWith("custom:") ? <Sparkles className="mr-1 inline size-3" /> : null}
                      {t.name}
                      {suggested.includes(t.id) && !on ? <span className="ml-1 text-fuchsia-500">•</span> : null}
                    </button>
                    {t.id.startsWith("custom:") ? (
                      <button
                        type="button"
                        onClick={() => start(() => deleteCustomTopicAction(t.name))}
                        className="ml-0.5 rounded-full p-1 text-slate-400 hover:text-red-600"
                        aria-label={`Delete ${t.name} questions`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    ) : null}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={String(level)} onChange={(e) => setLevel(e.target.value === "all" ? "all" : (Number(e.target.value) as Level))} aria-label="Level">
              <option value="all">All levels</option>
              {([1, 2, 3] as Level[]).map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
              <option value="all">All questions</option>
              <option value="todo">Not studied</option>
              <option value="REVIEW">To review</option>
              <option value="KNOWN">Known</option>
            </Select>
          </div>
        </Card>
      </div>

      {/* Questions */}
      <div className="min-w-0 space-y-3">
        {notice ? (
          <p className={cn("rounded-xl px-4 py-3 text-sm", notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{notice.text}</p>
        ) : null}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {visible.length} question{visible.length === 1 ? "" : "s"}
          </p>
          {visible.length ? (
            <button
              type="button"
              onClick={() => setOpen(open.size ? new Set() : new Set(visible.map((q) => q.id)))}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {open.size ? "Collapse all" : "Show all answers"}
            </button>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <Card className="px-6 py-14 text-center">
            <BookOpen className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-800">No questions here</p>
            <p className="mt-1 text-sm text-slate-500">
              {searching
                ? aiEnabled
                  ? `Nothing for "${keyword}" in the question bank yet. Generate some with AI.`
                  : `Nothing for "${keyword}" yet. Try a broader term like "React" or "SQL".`
                : "Pick some topics on the left, or change the filters."}
            </p>
          </Card>
        ) : (
          visible.map((q, i) => {
            const isOpen = open.has(q.id);
            const m = marks[q.id];
            return (
              <Card key={q.id} className={cn("overflow-hidden transition-shadow", isOpen && "shadow-md ring-brand-200")}>
                <button type="button" onClick={() => toggleOpen(q.id)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={isOpen}>
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      m === "KNOWN" ? "bg-emerald-500 text-white" : m === "REVIEW" ? "bg-amber-400 text-white" : "bg-brand-50 text-brand-700",
                    )}
                  >
                    {m === "KNOWN" ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug text-slate-900">
                      <RichText text={q.q} className="inline" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{q.topicName}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", LEVEL_STYLE[q.level])}>{LEVEL_LABELS[q.level]}</span>
                      {q.custom ? <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[11px] font-medium text-fuchsia-700">AI</span> : null}
                    </div>
                  </div>
                  <ChevronDown className={cn("mt-1 size-5 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3 sm:pl-14">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">Answer</p>
                    <RichText text={q.a} />
                    {q.points.length ? (
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Key points to mention</p>
                        <div className="flex flex-wrap gap-1.5">
                          {q.points.map((p) => (
                            <span key={p} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                              {p.split("|")[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant={m === "KNOWN" ? "success" : "secondary"} className="py-2" onClick={() => mark(q.id, "KNOWN")}>
                        <CheckCircle2 className="size-4" /> {m === "KNOWN" ? "Known" : "I know this"}
                      </Button>
                      <Button
                        variant="secondary"
                        className={cn("py-2", m === "REVIEW" && "bg-amber-50 text-amber-800 ring-amber-300")}
                        onClick={() => mark(q.id, "REVIEW")}
                      >
                        <Bookmark className="size-4" /> {m === "REVIEW" ? "Marked to review" : "Review later"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
