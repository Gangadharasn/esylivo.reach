import "server-only";

// Optional: any OpenAI-compatible chat API (hosted, or free and local via Ollama / LM Studio).

export function aiEnabled() {
  return Boolean(process.env.AI_BASE_URL && process.env.AI_MODEL);
}

export async function chat(system: string, user: string) {
  const res = await fetch(`${process.env.AI_BASE_URL!.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI returned an empty reply");
  return text.replace(/^["']|["']$/g, "");
}

/** A 3-sentence resume summary aimed at this job. Returns null if AI is off or fails. */
export async function aiSummary(input: { profileText: string; job: string }) {
  if (!aiEnabled()) return null;
  try {
    return await chat(
      "You write resume summaries. 3 sentences, at most 70 words, first person implied (no 'I'), factual: use only facts from the candidate profile. No markdown.",
      `Candidate profile:\n${input.profileText}\n\nJob post:\n${input.job.slice(0, 3000)}\n\nWrite the summary tailored to this job.`,
    );
  } catch (err) {
    console.error("[ai] summary failed", err);
    return null;
  }
}
