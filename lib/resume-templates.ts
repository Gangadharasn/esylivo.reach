// Resume layouts. All are single-column with standard section headings and real text
// (no tables, images or text in graphics), so applicant tracking systems can parse them.

export const RESUME_TEMPLATES = [
  {
    id: "modern",
    name: "Modern",
    description: "Violet accents and highlighted skill tags. Great for tech roles.",
    accent: "#6D28D9",
    font: "Poppins",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Serif, centred header, black and white. Safe for any company.",
    accent: "#111827",
    font: "Times",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean Helvetica with lots of white space. Easy to skim.",
    accent: "#334155",
    font: "Helvetica",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Teal name banner that stands out when printed.",
    accent: "#0F766E",
    font: "Poppins",
  },
] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number]["id"];

export function templateById(id: string | null | undefined) {
  return RESUME_TEMPLATES.find((t) => t.id === id) ?? RESUME_TEMPLATES[0];
}
