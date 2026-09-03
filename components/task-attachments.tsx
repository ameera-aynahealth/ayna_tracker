"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { ExternalLink, FileText, Link2, Paperclip, Plus, Upload } from "lucide-react";

type Attachment = {
  id: string;
  name: string;
  url: string;
  kind: string;
  fileSize?: number | null;
  createdAt?: Date | string;
};

type AttachmentResponse = {
  attachment?: Attachment;
  error?: string;
};

const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.ppt,.pptx,.zip";
const MAX_FILE_BYTES = 4_000_000;

export function TaskAttachments({ taskId, initialAttachments }: { taskId: string; initialAttachments: Attachment[] }) {
  const [items, setItems] = useState<Attachment[]>(initialAttachments);
  const [composerOpen, setComposerOpen] = useState(initialAttachments.length === 0);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openComposer(nextMode: "link" | "file" = "link") {
    setMode(nextMode);
    setError(null);
    setComposerOpen(true);
  }

  function resetFilePicker() {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function addLink(event: FormEvent) {
    event.preventDefault();
    if (!linkName.trim() || !linkUrl.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "link", name: linkName.trim(), url: linkUrl.trim() }),
      });
      const body = (await response.json()) as AttachmentResponse;
      if (!response.ok || !body.attachment) throw new Error(body.error || "Could not attach link");

      setItems((current) => [...current, body.attachment!]);
      setLinkName("");
      setLinkUrl("");
      setComposerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not attach link");
    } finally {
      setBusy(false);
    }
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const tooLarge = selected.find((file) => file.size > MAX_FILE_BYTES);
    if (tooLarge) {
      setError(`${tooLarge.name} is larger than 4 MB.`);
      resetFilePicker();
      return;
    }
    setError(null);
    setFiles(selected);
  }

  async function uploadFiles() {
    if (!files.length) return;
    setBusy(true);
    setError(null);

    try {
      const added: Attachment[] = [];
      // Upload sequentially so each request remains under Vercel's request-size limit.
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: form });
        const body = (await response.json()) as AttachmentResponse;
        if (!response.ok || !body.attachment) throw new Error(body.error || `Could not upload ${file.name}`);
        added.push(body.attachment);
      }

      setItems((current) => [...current, ...added]);
      resetFilePicker();
      setComposerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="space-y-2">
        {items.map((attachment) => {
          const isFile = attachment.kind === "file";
          return (
            <a
              key={attachment.id}
              href={attachment.url}
              target={isFile ? undefined : "_blank"}
              rel={isFile ? undefined : "noreferrer"}
              download={isFile ? attachment.name : undefined}
              className="flex items-center gap-3 border border-border rounded-xl p-3 hover:border-border-strong hover:bg-page transition-colors"
            >
              {isFile ? <FileText size={16} className="text-accent-text shrink-0" /> : <Link2 size={16} className="text-accent-text shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{attachment.name}</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {isFile ? `${attachment.fileSize ? formatBytes(attachment.fileSize) : "File"} · Download` : "Link"}
                </div>
              </div>
              {isFile ? <Paperclip size={14} className="text-text-muted" /> : <ExternalLink size={14} className="text-text-muted" />}
            </a>
          );
        })}
        {items.length === 0 && <p className="text-sm text-text-muted">No links or files attached yet.</p>}
      </div>

      {items.length > 0 && !composerOpen && (
        <button
          type="button"
          onClick={() => openComposer("link")}
          className="mt-3 inline-flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-sm font-semibold hover:bg-page"
        >
          <Plus size={14} /> Add another
        </button>
      )}

      {composerOpen && (
        <div className="mt-4 rounded-2xl border border-border bg-page p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setMode("link"); setError(null); }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${mode === "link" ? "bg-accent-soft text-accent-text" : "bg-surface text-text-secondary"}`}
            >
              Add link
            </button>
            <button
              type="button"
              onClick={() => { setMode("file"); setError(null); }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${mode === "file" ? "bg-accent-soft text-accent-text" : "bg-surface text-text-secondary"}`}
            >
              Upload file
            </button>
            {items.length > 0 && (
              <button type="button" onClick={() => setComposerOpen(false)} className="ml-auto text-xs font-semibold text-text-muted px-2 py-2">
                Done
              </button>
            )}
          </div>

          {mode === "link" ? (
            <form onSubmit={addLink} className="grid sm:grid-cols-[1fr_1.5fr_auto] gap-2">
              <input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Link name" className="field-input" />
              <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" className="field-input" />
              <button disabled={busy || !linkName.trim() || !linkUrl.trim()} className="border border-border rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50">
                {busy ? "Adding" : "Attach"}
              </button>
            </form>
          ) : (
            <div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface px-4 py-5 text-sm font-semibold text-text-secondary hover:border-accent">
                <Upload size={16} />
                <span>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose file(s)"}</span>
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILES} onChange={chooseFiles} className="sr-only" />
              </label>
              <div className="mt-2 text-[11px] text-text-muted">PDFs, images, Office files, CSV/TXT/MD, PowerPoint, and ZIP. Up to 4 MB per file.</div>
              {files.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {files.map((file) => <div key={`${file.name}-${file.size}`} className="text-xs text-text-secondary truncate">{file.name} · {formatBytes(file.size)}</div>)}
                  <button type="button" disabled={busy} onClick={uploadFiles} className="mt-2 inline-flex items-center gap-2 bg-accent text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    <Upload size={14} /> {busy ? "Uploading" : `Upload ${files.length > 1 ? "files" : "file"}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-3 text-xs font-semibold text-brick-text">{error}</div>}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
