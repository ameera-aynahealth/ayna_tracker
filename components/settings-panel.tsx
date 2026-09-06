"use client";

import { useState, useTransition } from "react";
import { Check, LockKeyhole } from "lucide-react";
import {
  setMemberActive,
  updateInternalMemberRole,
  updateNotificationPreferences,
} from "@/lib/actions/settings";

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  active: boolean;
  notifyOnAssigned: boolean;
  notifyOnMentioned: boolean;
  notifyOnDueSoon: boolean;
  notifyOnOverdue: boolean;
  notifyOnReviewRequested: boolean;
  notifyOnBlocked: boolean;
  notifyOnComment: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
};

export function SettingsPanel({
  currentUser,
  people,
  dataHealth,
}: {
  currentUser: SettingsUser;
  people: SettingsUser[];
  dataHealth: {
    possibleDuplicateGroups: number;
    possibleDuplicateTasks: number;
    missingOwner: number;
    missingDueDate: number;
    inactiveOwner: number;
    malformedTitles: number;
  };
}) {
  const [tab, setTab] = useState<"notifications" | "team" | "data">("notifications");
  const [prefs, setPrefs] = useState({
    notifyOnAssigned: currentUser.notifyOnAssigned,
    notifyOnMentioned: currentUser.notifyOnMentioned,
    notifyOnDueSoon: currentUser.notifyOnDueSoon,
    notifyOnOverdue: currentUser.notifyOnOverdue,
    notifyOnReviewRequested: currentUser.notifyOnReviewRequested,
    notifyOnBlocked: currentUser.notifyOnBlocked,
    notifyOnComment: currentUser.notifyOnComment,
    dailyDigest: currentUser.dailyDigest,
    weeklyDigest: currentUser.weeklyDigest,
  });
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function savePreferences() {
    setSaved(false);
    startTransition(async () => {
      try {
        await updateNotificationPreferences(prefs);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1800);
      } catch {
        setSaved(false);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-5">
      <aside className="self-start border border-border bg-surface p-2 rounded-2xl lg:sticky lg:top-20">
        {[
          ["notifications", "Notifications"],
          ["team", "Team access"],
          ["data", "Data health"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as typeof tab)} className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold ${tab === key ? "bg-accent-soft text-accent-text" : "text-text-secondary hover:bg-page"}`}>{label}</button>
        ))}
      </aside>

      <div className="min-w-0">
        {tab === "notifications" && (
          <section className="border border-border bg-surface p-5 sm:p-7" style={{ borderRadius: "24px 12px 12px 12px" }}>
            <div className="mb-6">
              <h2 className="font-voice text-2xl font-semibold">Notifications</h2>
              <p className="text-sm text-text-secondary mt-1">Choose what deserves an email or inbox notification so reminders help instead of becoming noise.</p>
            </div>

            <div className="space-y-6">
              <SettingsGroup title="Task activity">
                <Toggle label="New assignments" description="When a task is assigned to you." checked={prefs.notifyOnAssigned} onChange={(value) => setPrefs({ ...prefs, notifyOnAssigned: value })} />
                <Toggle label="Mentions" description="When someone mentions you in a comment." checked={prefs.notifyOnMentioned} onChange={(value) => setPrefs({ ...prefs, notifyOnMentioned: value })} />
                <Toggle label="Review requests" description="When work is waiting for your approval." checked={prefs.notifyOnReviewRequested} onChange={(value) => setPrefs({ ...prefs, notifyOnReviewRequested: value })} />
                <Toggle label="Comments" description="New discussion on work you own." checked={prefs.notifyOnComment} onChange={(value) => setPrefs({ ...prefs, notifyOnComment: value })} />
                <Toggle label="Blocked tasks" description="When work you own becomes blocked." checked={prefs.notifyOnBlocked} onChange={(value) => setPrefs({ ...prefs, notifyOnBlocked: value })} />
              </SettingsGroup>

              <SettingsGroup title="Deadlines">
                <Toggle label="Due-soon reminders" description="7 days, 3 days, 1 day, and the due date when relevant." checked={prefs.notifyOnDueSoon} onChange={(value) => setPrefs({ ...prefs, notifyOnDueSoon: value })} />
                <Toggle label="Overdue reminders" description="Follow-ups after a missed deadline until the task is resolved." checked={prefs.notifyOnOverdue} onChange={(value) => setPrefs({ ...prefs, notifyOnOverdue: value })} />
              </SettingsGroup>

              <SettingsGroup title="Digests">
                <Toggle label="Daily priorities" description="Morning summary only when there is work worth showing." checked={prefs.dailyDigest} onChange={(value) => setPrefs({ ...prefs, dailyDigest: value })} />
                <Toggle label="Monday week ahead" description="Weekly overview of deadlines, blocked work, and priorities." checked={prefs.weeklyDigest} onChange={(value) => setPrefs({ ...prefs, weeklyDigest: value })} />
              </SettingsGroup>
            </div>

            <div className="flex items-center gap-3 mt-7 pt-5 border-t border-border">
              <button onClick={savePreferences} disabled={isPending} className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Save preferences</button>
              {saved && <span className="flex items-center gap-1.5 text-xs font-semibold text-sage-text"><Check size={14} />Saved</span>}
            </div>
          </section>
        )}

        {tab === "team" && (
          <div className="space-y-4">
            <section className="border border-border bg-surface p-5 sm:p-7" style={{ borderRadius: "24px 12px 12px 12px" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center shrink-0"><LockKeyhole size={18} /></div>
                <div>
                  <h2 className="font-voice text-2xl font-semibold">Ayna team access only</h2>
                  <p className="text-sm text-text-secondary mt-1 leading-6">Only accounts signed in with an <span className="font-semibold text-text-primary">@aynahealth.co</span> email address can access the tracker. No invitation or Clerk organization membership is required.</p>
                </div>
              </div>
            </section>

            <section className="border border-border bg-surface overflow-hidden" style={{ borderRadius: "24px 12px 12px 12px" }}>
              <div className="p-5 border-b border-border"><h3 className="font-voice text-xl font-semibold">Tracker roles</h3><p className="text-sm text-text-secondary mt-1">The Ayna email domain controls who can enter. These roles control what each teammate may do inside the tracker.</p></div>
              <div className="divide-y divide-border">
                {people.map((person) => (
                  <div key={person.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{person.name}</div><div className="text-xs text-text-muted truncate">{person.email}</div></div>
                    {currentUser.role === "admin" ? (
                      <>
                        <select defaultValue={person.role} onChange={(event) => startTransition(async () => { await updateInternalMemberRole(person.id, event.target.value as "admin" | "member" | "viewer"); })} className="border border-border bg-surface rounded-lg px-2.5 py-2 text-xs"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select>
                        <button onClick={() => startTransition(async () => { await setMemberActive(person.id, !person.active); })} className={`text-xs font-semibold rounded-lg px-3 py-2 ${person.active ? "bg-sage-soft text-sage-text" : "bg-surface-sunk text-text-muted"}`}>{person.active ? "Active" : "Inactive"}</button>
                      </>
                    ) : <span className="text-xs capitalize text-text-muted">{person.role}</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "data" && (
          <section className="border border-border bg-surface p-5 sm:p-7" style={{ borderRadius: "24px 12px 12px 12px" }}>
            <h2 className="font-voice text-2xl font-semibold">Data health</h2>
            <p className="text-sm text-text-secondary mt-1 mb-6">Potential problems are flagged for review. The tracker never silently deletes or merges Ayna work.</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <HealthCard label="Possible duplicate groups" value={dataHealth.possibleDuplicateGroups} detail={`${dataHealth.possibleDuplicateTasks} tasks involved`} />
              <HealthCard label="Tasks without owner" value={dataHealth.missingOwner} />
              <HealthCard label="Open tasks without deadline" value={dataHealth.missingDueDate} />
              <HealthCard label="Assigned to inactive user" value={dataHealth.inactiveOwner} />
              <HealthCard label="Possibly malformed titles" value={dataHealth.malformedTitles} />
            </div>
            <div className="rounded-2xl bg-page border border-border p-4 mt-5 text-sm text-text-secondary leading-6">
              Duplicate detection compares normalized titles but does not merge anything automatically. This keeps tasks with intentionally similar names safe until an admin reviews them.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-xs uppercase tracking-[0.11em] font-semibold text-text-muted mb-2">{title}</h3><div className="border border-border rounded-2xl divide-y divide-border overflow-hidden">{children}</div></div>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-4 p-4 cursor-pointer hover:bg-page/50">
      <div className="flex-1 min-w-0"><div className="text-sm font-medium">{label}</div><div className="text-xs text-text-muted mt-0.5">{description}</div></div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
      <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? "bg-accent" : "bg-border-strong"}`}><span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} /></span>
    </label>
  );
}

function HealthCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const attention = value > 0;
  return <div className={`rounded-2xl border p-4 ${attention ? "border-gold/20 bg-gold-soft" : "border-sage/20 bg-sage-soft"}`}><div className={`font-voice text-3xl font-semibold ${attention ? "text-gold-text" : "text-sage-text"}`}>{value}</div><div className={`text-sm font-medium mt-1 ${attention ? "text-gold-text" : "text-sage-text"}`}>{label}</div>{detail && <div className="text-xs opacity-70 mt-1">{detail}</div>}</div>;
}
