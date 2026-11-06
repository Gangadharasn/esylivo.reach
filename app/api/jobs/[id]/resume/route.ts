import { getCurrentUser } from "@/lib/auth";
import { buildResume } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";

// The tailored resume for one job post ("general" = untailored), shown inline in the browser.
// ?template=<id> previews another layout without changing the saved choice.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const post =
    id === "general" ? { content: "", jobTitle: "" } : await prisma.jobPost.findFirst({ where: { id, userId: user.id } });
  if (!post) return new Response("Not found", { status: 404 });

  const template = new URL(request.url).searchParams.get("template") ?? undefined;
  const { pdf, fileName } = await buildResume(user, post, { template });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
