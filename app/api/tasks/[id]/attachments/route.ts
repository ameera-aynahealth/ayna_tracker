import { db } from "@/db";
import { attachmentFiles } from "@/db/attachment-schema";
import { attachments, tasks } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requireEditPermission } from "@/lib/auth";
import { ensureAttachmentFileSchema } from "@/lib/ensure-attachment-files";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 4_000_000;
const ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp",
  "doc", "docx", "xls", "xlsx", "csv", "txt", "md", "ppt", "pptx", "zip",
]);

const linkSchema = z.object({
  kind: z.literal("link"),
  name: z.string().trim().min(1).max(255),
  url: z.string().url().max(4000),
});

function extensionOf(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

function safeName(name: string) {
  return name.replace(/[\r\n]/g, " ").trim().slice(0, 255) || "attachment";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;
  const user = await requireEditPermission();
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.workspaceId, user.workspaceId)),
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a file to upload" }, { status: 400 });
    }

    const name = safeName(file.name);
    if (!ALLOWED_EXTENSIONS.has(extensionOf(name))) {
      return Response.json({ error: "That file type is not supported" }, { status: 400 });
    }
    if (file.size <= 0) {
      return Response.json({ error: "The selected file is empty" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json({ error: "Files must be 4 MB or smaller" }, { status: 413 });
    }

    const attachmentId = nanoid();
    const mimeType = file.type || "application/octet-stream";
    const dataBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const downloadUrl = `/api/attachments/${attachmentId}`;

    await ensureAttachmentFileSchema();
    await db.transaction(async (tx) => {
      await tx.insert(attachments).values({
        id: attachmentId,
        taskId,
        uploadedById: user.id,
        kind: "file",
        name,
        url: downloadUrl,
        fileSize: file.size,
      });
      await tx.insert(attachmentFiles).values({
        attachmentId,
        mimeType,
        dataBase64,
      });
      await tx.update(tasks).set({ lastActivityAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
    });

    await logActivity({ taskId, userId: user.id, action: "file_attached", newValue: name });
    revalidatePath(`/tasks/${taskId}`);

    return Response.json({
      attachment: {
        id: attachmentId,
        name,
        url: downloadUrl,
        kind: "file",
        fileSize: file.size,
        createdAt: new Date().toISOString(),
      },
    });
  }

  let parsed: z.infer<typeof linkSchema>;
  try {
    parsed = linkSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Enter a valid link name and URL" }, { status: 400 });
  }

  const attachmentId = nanoid();
  await db.insert(attachments).values({
    id: attachmentId,
    taskId,
    uploadedById: user.id,
    kind: "link",
    name: parsed.name,
    url: parsed.url,
  });
  await db.update(tasks).set({ lastActivityAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, taskId));
  await logActivity({ taskId, userId: user.id, action: "link_attached", newValue: parsed.name });
  revalidatePath(`/tasks/${taskId}`);

  return Response.json({
    attachment: {
      id: attachmentId,
      name: parsed.name,
      url: parsed.url,
      kind: "link",
      fileSize: null,
      createdAt: new Date().toISOString(),
    },
  });
}
