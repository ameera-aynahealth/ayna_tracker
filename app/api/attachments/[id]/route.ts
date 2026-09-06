import { db } from "@/db";
import { attachmentFiles } from "@/db/attachment-schema";
import { attachments, tasks } from "@/db/schema";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { ensureAttachmentFileSchema } from "@/lib/ensure-attachment-files";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(name: string) {
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOrCreateCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  await ensureAttachmentFileSchema();

  const rows = await db
    .select({
      name: attachments.name,
      workspaceId: tasks.workspaceId,
      mimeType: attachmentFiles.mimeType,
      dataBase64: attachmentFiles.dataBase64,
    })
    .from(attachmentFiles)
    .innerJoin(attachments, eq(attachments.id, attachmentFiles.attachmentId))
    .innerJoin(tasks, eq(tasks.id, attachments.taskId))
    .where(eq(attachmentFiles.attachmentId, id))
    .limit(1);

  const file = rows[0];
  if (!file || file.workspaceId !== user.workspaceId) {
    return new Response("File not found", { status: 404 });
  }

  const bytes = Buffer.from(file.dataBase64, "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": contentDisposition(file.name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
