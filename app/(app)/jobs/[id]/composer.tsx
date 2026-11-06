"use client";

import { Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";

import { sendAction } from "../actions";

export function Composer({
  postId,
  emails,
  subject: initialSubject,
  body: initialBody,
  canSend,
  alreadySent,
}: {
  postId: string;
  emails: string[];
  subject: string;
  body: string;
  canSend: boolean;
  alreadySent: boolean;
}) {
  const [to, setTo] = useState(emails[0] ?? "");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const result = await sendAction(postId, { to, subject, body });
      setNotice(result.ok ? { tone: "ok", text: `Sent to ${to} with your tailored resume attached.` } : { tone: "error", text: result.error });
    });

  return (
    <div className="space-y-4">
      <Field label="To" htmlFor="to">
        {emails.length > 1 ? (
          <Select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
            {emails.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </Select>
        ) : (
          <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recruiter@company.com" />
        )}
      </Field>
      <Field label="Subject" htmlFor="subject">
        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Message" htmlFor="body">
        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-64" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="gradient" onClick={send} disabled={!canSend || !to || pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {alreadySent ? "Send again" : "Send application"}
        </Button>
        {!canSend ? <span className="text-sm text-amber-700">Connect your email in Settings to send.</span> : null}
      </div>
      {notice ? <p className={notice.tone === "ok" ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{notice.text}</p> : null}
    </div>
  );
}
