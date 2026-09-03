"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { FolderKanban, ListChecks, ListTodo, Search, UserRound, X } from "lucide-react";
import { searchWorkspace } from "@/lib/actions/search";

const emptyResults = { tasks: [], trackers: [], projects: [], people: [] } as Awaited<ReturnType<typeof searchWorkspace>>;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (!typing && event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onQuery(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults(emptyResults);
      return;
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const next = await searchWorkspace(value);
        setResults(next);
      });
    }, 180);
  }

  function close() {
    setOpen(false);
    setQuery("");
    setResults(emptyResults);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 border border-border bg-surface rounded-xl px-3 py-2 text-sm text-text-secondary hover:border-border-strong min-w-56"
        aria-label="Search Ayna Tracker"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search Ayna</span>
        <kbd className="text-[10px] border border-border rounded px-1.5 py-0.5 text-text-muted">⌘K</kbd>
      </button>
      <button onClick={() => setOpen(true)} className="sm:hidden p-2 rounded-lg hover:bg-surface-sunk" aria-label="Search">
        <Search size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-text-primary/25 backdrop-blur-[2px] flex items-start justify-center px-4 pt-[10vh]" onMouseDown={close}>
          <div className="w-full max-w-2xl bg-surface border border-border shadow-2xl overflow-hidden" style={{ borderRadius: "24px 12px 12px 12px" }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search size={18} className="text-text-muted shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search tasks, trackers, projects, or people"
                className="flex-1 bg-transparent outline-none text-base placeholder:text-text-muted"
              />
              {isPending && <span className="text-xs text-text-muted">Searching</span>}
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-surface-sunk" aria-label="Close search"><X size={17} /></button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3">
              {query.trim().length < 2 ? (
                <div className="px-3 py-8 text-center">
                  <div className="font-voice text-lg font-semibold mb-1">Find anything quickly</div>
                  <p className="text-sm text-text-muted">Search the shared Ayna workspace without digging through menus.</p>
                </div>
              ) : (
                <>
                  <ResultSection title="Tasks" empty="No matching tasks">
                    {results.tasks.map((task) => (
                      <Link key={task.id} href={`/tasks/${task.id}`} onClick={close} className="flex gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-sunk/70">
                        <ListTodo size={16} className="text-accent-text mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-5 break-words">{task.title}</div>
                          <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>{task.project ?? "No project"}</span>
                            <span>{task.owner ?? "Unassigned"}</span>
                            <span className="capitalize">{task.status.replaceAll("_", " ")}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </ResultSection>

                  <ResultSection title="Trackers" empty="No matching trackers">
                    {results.trackers.map((tracker) => (
                      <Link key={tracker.id} href={`/trackers/${tracker.id}`} onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-sunk/70">
                        <ListChecks size={16} className="text-gold-text shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{tracker.name}</div>
                          <div className="text-xs text-text-muted">Tracks {tracker.itemLabel.toLowerCase()}s</div>
                        </div>
                      </Link>
                    ))}
                  </ResultSection>

                  <ResultSection title="Projects" empty="No matching projects">
                    {results.projects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-sunk/70">
                        <FolderKanban size={16} className="text-sage-text shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{project.name}</div>
                          <div className="text-xs text-text-muted capitalize">{project.status.replaceAll("_", " ")} · {project.health.replaceAll("_", " ")}</div>
                        </div>
                      </Link>
                    ))}
                  </ResultSection>

                  <ResultSection title="People" empty="No matching people">
                    {results.people.map((person) => (
                      <div key={person.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                        <UserRound size={16} className="text-plum-text shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{person.name}</div>
                          <div className="text-xs text-text-muted">{person.email} · {person.role}</div>
                        </div>
                      </div>
                    ))}
                  </ResultSection>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasChildren = childArray.some(Boolean);
  return (
    <section className="mb-3 last:mb-0">
      <div className="px-3 py-1 text-[11px] uppercase tracking-[0.12em] font-semibold text-text-muted">{title}</div>
      {hasChildren ? children : <div className="px-3 py-2 text-sm text-text-muted">{empty}</div>}
    </section>
  );
}
