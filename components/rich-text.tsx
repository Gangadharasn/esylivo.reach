import { Fragment, type ReactNode } from "react";

// Renders the small markdown subset used in interview answers: paragraphs, "- " and
// "1. " lists, **bold**, `inline code` and ``` code blocks. Plain text otherwise
// (no HTML is ever injected), so AI-generated answers are safe to show.

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-fuchsia-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const parts = text.split(/```[a-z]*\n?([\s\S]*?)```/g);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      blocks.push(
        <pre key={`c${i}`} className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100 sm:text-[13px]">
          <code>{part.replace(/\n$/, "")}</code>
        </pre>,
      );
      return;
    }
    // Group consecutive list lines; other lines become paragraphs.
    let list: { ordered: boolean; items: string[] } | null = null;
    const flush = () => {
      if (!list) return;
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={`l${i}-${blocks.length}`} className={list.ordered ? "list-decimal space-y-1 pl-5" : "space-y-1 pl-1"}>
          {list.items.map((item, j) => (
            <li key={j} className={list!.ordered ? "" : "flex gap-2"}>
              {list!.ordered ? null : <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />}
              <span>{inline(item)}</span>
            </li>
          ))}
        </Tag>,
      );
      list = null;
    };
    for (const raw of part.split("\n")) {
      const line = raw.trim();
      const bullet = line.match(/^[-*•]\s+(.*)$/);
      const numbered = line.match(/^\d+[.)]\s+(.*)$/);
      if (bullet || numbered) {
        const ordered = Boolean(numbered);
        if (!list || list.ordered !== ordered) {
          flush();
          list = { ordered, items: [] };
        }
        list.items.push((bullet ?? numbered)![1]);
      } else {
        flush();
        if (line) blocks.push(<p key={`p${i}-${blocks.length}`}>{inline(line)}</p>);
      }
    }
    flush();
  });
  return <div className={className ?? "space-y-2.5 text-sm leading-relaxed text-slate-700"}>{blocks}</div>;
}
