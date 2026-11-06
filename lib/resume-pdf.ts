import "server-only";

import path from "node:path";
import PDFDocument from "pdfkit";

import { templateById, type ResumeTemplateId } from "@/lib/resume-templates";
import type { TailoredResume } from "@/lib/tailor";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const poppins = (name: string) => path.join(FONT_DIR, `Poppins-${name}.ttf`);

type Theme = {
  fonts: { R: string; M: string; SB: string; B: string };
  /** Built-in PDF fonts only cover Latin-1; Poppins also has ₹ and other symbols. */
  embedded: boolean;
  accent: string;
  accentSoft: string;
  ink: string;
  soft: string;
  line: string;
  nameSize: number;
  align: "left" | "center";
  /** Name printed on a coloured band across the top. */
  band: boolean;
  /** Highlighted tags for the skills the job asks for; otherwise a plain comma list. */
  chips: boolean;
  sectionSize: number;
};

const THEMES: Record<ResumeTemplateId, Theme> = {
  modern: {
    fonts: { R: poppins("Regular"), M: poppins("Medium"), SB: poppins("SemiBold"), B: poppins("Bold") },
    embedded: true,
    accent: "#6D28D9",
    accentSoft: "#EDE9FE",
    ink: "#111827",
    soft: "#4B5563",
    line: "#E5E7EB",
    nameSize: 24,
    align: "left",
    band: false,
    chips: true,
    sectionSize: 10.5,
  },
  classic: {
    fonts: { R: "Times-Roman", M: "Times-Roman", SB: "Times-Bold", B: "Times-Bold" },
    embedded: false,
    accent: "#111827",
    accentSoft: "#F3F4F6",
    ink: "#111827",
    soft: "#374151",
    line: "#111827",
    nameSize: 22,
    align: "center",
    band: false,
    chips: false,
    sectionSize: 11.5,
  },
  minimal: {
    fonts: { R: "Helvetica", M: "Helvetica", SB: "Helvetica-Bold", B: "Helvetica-Bold" },
    embedded: false,
    accent: "#334155",
    accentSoft: "#F1F5F9",
    ink: "#0F172A",
    soft: "#475569",
    line: "#E2E8F0",
    nameSize: 22,
    align: "left",
    band: false,
    chips: false,
    sectionSize: 10,
  },
  bold: {
    fonts: { R: poppins("Regular"), M: poppins("Medium"), SB: poppins("SemiBold"), B: poppins("Bold") },
    embedded: true,
    accent: "#0F766E",
    accentSoft: "#CCFBF1",
    ink: "#111827",
    soft: "#4B5563",
    line: "#D1D5DB",
    nameSize: 26,
    align: "left",
    band: true,
    chips: true,
    sectionSize: 11,
  },
};

/** Single-column, ATS-friendly resume PDF in the chosen template. Resolves with the file bytes. */
export function resumePdf(r: TailoredResume, templateId?: string): Promise<Buffer> {
  const t = THEMES[templateById(templateId).id];
  // Standard PDF fonts can't draw characters outside Latin-1 (e.g. ₹); spell them out.
  const txt = (s: string) =>
    t.embedded ? s : s.replace(/₹\s?/g, "Rs. ").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—‘’“”•…]/g, "");

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 0, left: 44, right: 44, bottom: 44 },
    font: t.embedded ? t.fonts.R : undefined,
    info: { Title: `${r.name} - Resume`, Author: r.name },
  });
  for (const [key, file] of Object.entries(t.fonts)) doc.registerFont(key, file);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const L = 44;
  const W = doc.page.width - 88;
  const title = r.headline || r.targetRole;
  const contact = [
    r.email,
    r.phone,
    r.location,
    r.linkedin && r.linkedin.replace(/^https?:\/\/(www\.)?/, ""),
    r.website && r.website.replace(/^https?:\/\//, ""),
  ]
    .filter(Boolean)
    .join("  |  ");

  // ---------- Header ----------
  if (t.band) {
    const top = 0;
    doc.font("B").fontSize(t.nameSize);
    const bandH = 34 + doc.heightOfString(txt(r.name), { width: W }) + (title ? 22 : 0) + 18;
    doc.rect(0, top, doc.page.width, bandH).fill(t.accent);
    doc.fillColor("#FFFFFF").text(txt(r.name), L, 30, { width: W });
    if (title) doc.font("M").fontSize(12).fillColor(t.accentSoft).text(txt(title), { width: W });
    doc.y = bandH + 12;
    doc.font("R").fontSize(9).fillColor(t.soft).text(txt(contact), L, doc.y, { width: W });
  } else {
    if (templateById(templateId).id === "modern") doc.rect(0, 0, doc.page.width, 6).fill(t.accent);
    doc.y = 36;
    doc.font("B").fontSize(t.nameSize).fillColor(t.ink).text(txt(r.name), L, doc.y, { width: W, align: t.align });
    if (title) doc.font("M").fontSize(12).fillColor(t.accent === t.ink ? t.soft : t.accent).text(txt(title), { width: W, align: t.align });
    doc.moveDown(0.3).font("R").fontSize(9).fillColor(t.soft).text(txt(contact), { width: W, align: t.align });
  }

  const ensure = (h: number) => {
    if (doc.y + h > doc.page.height - 44) {
      doc.addPage();
      doc.y = 44;
    }
  };

  // Plain uppercase headings (no letter spacing) so parsers read "EXPERIENCE", not "E X P E R I E N C E".
  const section = (name: string) => {
    ensure(60);
    doc.moveDown(1);
    doc.font("B").fontSize(t.sectionSize).fillColor(t.accent).text(name.toUpperCase(), L, doc.y, { width: W, align: t.align === "center" ? "left" : "left" });
    const y = doc.y + 2;
    doc.moveTo(L, y).lineTo(L + W, y).lineWidth(t.line === t.ink ? 0.8 : 0.8).strokeColor(t.line).stroke();
    doc.y = y + 6;
  };

  const bullet = (text: string) => {
    ensure(20);
    const y = doc.y;
    doc.circle(L + 3, y + 6.5, 1.6).fill(t.accent);
    doc.font("R").fontSize(9.5).fillColor(t.ink).text(txt(text), L + 11, y, { width: W - 11, lineGap: 1.5 });
    doc.moveDown(0.15);
  };

  const dated = (left: string, right: string, size: number) => {
    ensure(30);
    const y = doc.y;
    doc.font("SB").fontSize(size).fillColor(t.ink).text(txt(left), L, y, { width: W - 130 });
    const after = doc.y;
    if (right) doc.font("R").fontSize(9).fillColor(t.soft).text(txt(right), L + W - 130, y + 1, { width: 130, align: "right" });
    doc.y = after;
  };

  // ---------- Body ----------
  if (r.summary) {
    section("Summary");
    doc.font("R").fontSize(9.8).fillColor(t.ink).text(txt(r.summary), L, doc.y, { width: W, lineGap: 2.5 });
  }

  if (r.matchedSkills.length || r.otherSkills.length) {
    section("Skills");
    if (t.chips) {
      // Skills this job asks for come first, as highlighted tags.
      let x = L;
      let y = doc.y;
      const chip = (label: string, strong: boolean) => {
        doc.font(strong ? "SB" : "R").fontSize(9);
        const w = doc.widthOfString(label) + 14;
        if (x + w > L + W) {
          x = L;
          y += 20;
        }
        if (strong) doc.roundedRect(x, y, w, 16, 8).fill(t.accentSoft);
        else doc.roundedRect(x, y, w, 16, 8).lineWidth(0.6).strokeColor(t.line).stroke();
        doc.fillColor(strong ? t.accent : t.soft).text(label, x + 7, y + 3, { lineBreak: false });
        x += w + 6;
      };
      r.matchedSkills.forEach((s) => chip(s, true));
      r.otherSkills.forEach((s) => chip(s, false));
      doc.x = L;
      doc.y = y + 22;
    } else {
      doc.font("R").fontSize(9.8).fillColor(t.ink).text(txt([...r.matchedSkills, ...r.otherSkills].join(", ")), L, doc.y, { width: W, lineGap: 2 });
    }
  }

  if (r.experience.length) {
    section("Experience");
    for (const e of r.experience) {
      dated(e.role, [e.start, e.end].filter(Boolean).join(" – "), 10.5);
      if (e.company) doc.font("M").fontSize(9.5).fillColor(t.accent === t.ink ? t.soft : t.accent).text(txt(e.company), L, doc.y, { width: W });
      doc.moveDown(0.2);
      e.bullets.filter(Boolean).forEach((b) => bullet(b));
      doc.moveDown(0.5);
    }
  }

  if (r.projects.length) {
    section("Projects");
    for (const p of r.projects) {
      ensure(36);
      doc.font("SB").fontSize(10).fillColor(t.ink).text(txt(p.name), L, doc.y, { width: W, continued: Boolean(p.tech) });
      if (p.tech) doc.font("R").fontSize(9).fillColor(t.soft).text(txt(`  |  ${p.tech}`));
      if (p.description) doc.font("R").fontSize(9.5).fillColor(t.ink).text(txt(p.description), L, doc.y, { width: W, lineGap: 1.5 });
      doc.moveDown(0.5);
    }
  }

  if (r.education.length) {
    section("Education");
    for (const ed of r.education) {
      dated(ed.degree, ed.year, 10);
      const line = [ed.school, ed.score].filter(Boolean).join("  |  ");
      if (line) doc.font("R").fontSize(9.5).fillColor(t.soft).text(txt(line), L, doc.y, { width: W });
      doc.moveDown(0.4);
    }
  }

  if (r.certifications.length) {
    section("Certifications");
    r.certifications.forEach((c) => bullet(c));
  }

  doc.end();
  return done;
}

export function resumeFileName(name: string) {
  return `${name.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Resume"}_Resume.pdf`;
}
