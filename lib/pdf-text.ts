import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

/** The plain text an ATS would read from a PDF, page breaks kept as blank lines. */
export async function pdfText(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { pages: totalPages, text: (text as string[]).join("\n\n") };
}
