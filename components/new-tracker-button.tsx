"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createTracker } from "@/lib/actions/trackers";

type Template = "partnerships" | "influencers" | "general";

export function NewTrackerButton({
  defaultTemplate = "general",
  defaultName = "",
  label = "New tracker",
}: {
  defaultTemplate?: Template;
  defaultName?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [template, setTemplate] = useState<Template>(defaultTemplate);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("Give this tracker a name");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const id = await createTracker({ name: name.trim(), description: description.trim(), template });
        setOpen(false);
        router.push(`/trackers/${id}`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create tracker");
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 bg-accent text-white rounded-xl px-3.5 py-2.5 text-sm font-semibold hover:bg-accent-text transition-colors">
        <Plus size={15} /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-text-primary/25" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="relative w-full max-w-lg bg-surface border border-border shadow-2xl p-6" style={{ borderRadius: "26px 14px 14px 14px" }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-voice text-2xl font-semibold">Create a tracker</h2>
                <p className="text-sm text-text-secondary mt-1">Use trackers for partnerships, influencers, sponsors, outreach lists, or anything with a repeatable pipeline.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-page" aria-label="Close"><X size={17} /></button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">Name</span>
                <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Partnerships" className="mt-1.5 w-full border border-border bg-page rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">Template</span>
                <select value={template} onChange={(event) => setTemplate(event.target.value as Template)} className="mt-1.5 w-full border border-border bg-page rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="partnerships">Partnership pipeline</option>
                  <option value="influencers">Influencer pipeline</option>
                  <option value="general">Simple tracker</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">Description <span className="font-normal text-text-muted">optional</span></span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What is this tracker for?" className="mt-1.5 w-full border border-border bg-page rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:border-accent" />
              </label>
            </div>

            {error && <p className="text-xs text-brick-text mt-3">{error}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-semibold text-text-secondary">Cancel</button>
              <button disabled={isPending} onClick={submit} className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">{isPending ? "Creating" : "Create tracker"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
