// Pulls recruiter contact details and the role out of a LinkedIn post's text.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export function extractEmails(text: string) {
  const found = (text.match(EMAIL) ?? [])
    .map((e) => e.replace(/[.,;:]+$/, "").toLowerCase())
    .filter((e) => !IMAGE_EXT.test(e) && !e.endsWith("@example.com"));
  return [...new Set(found)];
}

/** Phone numbers of 10–13 digits, ignoring numbers inside links and long IDs. */
export function extractPhones(text: string) {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, " ");
  const out: string[] = [];
  for (const match of withoutUrls.matchAll(/(?<![\w/])\+?\d[\d\s().-]{8,16}\d(?![\w/])/g)) {
    const raw = match[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) continue;
    if (/^(19|20)\d{2}[-./]\d{1,2}[-./]\d{1,2}/.test(raw)) continue; // a date, not a phone
    // Indian mobile numbers: 10 digits starting 6-9, optionally with 91 / 0 prefix.
    const local = digits.replace(/^(91|0)(?=[6-9]\d{9}$)/, "");
    if (local.length === 10 && !/^[6-9]/.test(local) && !raw.startsWith("+")) continue;
    const pretty = raw.startsWith("+") ? `+${digits}` : local.length === 10 ? local : digits;
    if (!out.includes(pretty)) out.push(pretty);
  }
  return out;
}

const TITLE_PATTERNS = [
  /(?:job\s*title|role|position|designation|opening)\s*[:\-–]\s*([^\n|•]{3,70})/i,
  // Stops at punctuation, " - ", or words like "in"/"with"; a dot only ends it when followed by a space ("Node.js" stays whole).
  /(?:hiring|looking for|we(?:'re| are) hiring(?: for)?|urgent(?:ly)? (?:hiring|requirement)(?: for)?)\s*(?:an?\s+|for\s+(?:an?\s+)?)?(?:experienced\s+|talented\s+)?([A-Za-z][A-Za-z0-9+#./&\s-]{2,60}?)(?=\s*(?:[\n,!(|:]|\.(?:\s|$)|\s[-–]\s|\bwith\b|\bin\b|\bat\b|\bto\b|\bfor\b|$))/i,
];

/** Best guess at the role being hired for, e.g. "Senior React Developer". */
export function extractJobTitle(text: string) {
  const clean = text.replace(/#/g, "");
  for (const pattern of TITLE_PATTERNS) {
    const m = clean.match(pattern);
    if (m) {
      const title = m[1].replace(/\s+/g, " ").trim().replace(/[.,:;-]+$/, "");
      // Role names are written capitalised ("React Developer"); lowercase means we caught ordinary prose.
      if (title.length >= 3 && /^[A-Z0-9.]/.test(title) && !/^(you|we|someone|people|candidates?)$/i.test(title)) return title;
    }
  }
  return "";
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}
