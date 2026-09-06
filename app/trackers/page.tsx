import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { getOrCreateCurrentUser } from "@/lib/auth";
import { getTrackersWithCounts } from "@/lib/tracker-queries";
import { AppShell } from "@/components/app-shell";
import { NewTrackerButton } from "@/components/new-tracker-button";

export default async function TrackersPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;
  const trackers = await getTrackersWithCounts();

  return (
    <AppShell active="Trackers" currentUser={user}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">Shared pipelines</p>
          <h1 className="font-voice text-3xl font-semibold">Trackers</h1>
          <p className="text-sm text-text-secondary mt-1">Track partnerships, influencers, sponsors, outreach, or any other process without turning it into a full project.</p>
        </div>
        <NewTrackerButton />
      </div>

      {trackers.length === 0 ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="border border-border bg-surface p-6" style={{ borderRadius: "24px 12px 12px 12px" }}>
            <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center mb-4"><ListChecks size={18} /></div>
            <h2 className="font-voice text-xl font-semibold">Partnerships</h2>
            <p className="text-sm text-text-secondary mt-1 mb-5">Track brands from first outreach through meetings, negotiation, contract, and active partnership.</p>
            <NewTrackerButton defaultTemplate="partnerships" defaultName="Partnerships" label="Create Partnerships tracker" />
          </section>
          <section className="border border-border bg-surface p-6" style={{ borderRadius: "24px 12px 12px 12px" }}>
            <div className="w-10 h-10 rounded-2xl bg-sage-soft text-sage-text flex items-center justify-center mb-4"><ListChecks size={18} /></div>
            <h2 className="font-voice text-xl font-semibold">Influencers</h2>
            <p className="text-sm text-text-secondary mt-1 mb-5">Track creator outreach, responses, negotiations, confirmed posts, and completed collaborations.</p>
            <NewTrackerButton defaultTemplate="influencers" defaultName="Influencers" label="Create Influencers tracker" />
          </section>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trackers.map((tracker) => (
            <Link key={tracker.id} href={`/trackers/${tracker.id}`} className="group border border-border bg-surface p-5 hover:border-border-strong hover:-translate-y-0.5 transition-all" style={{ borderRadius: "24px 12px 12px 12px" }}>
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-voice text-xl font-semibold group-hover:text-accent-text">{tracker.name}</h2>
                  {tracker.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{tracker.description}</p>}
                </div>
                <ArrowRight size={16} className="text-text-muted group-hover:text-accent-text mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-page p-3">
                  <div className="font-voice text-2xl font-semibold">{tracker.itemCount}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">{tracker.itemLabel}{tracker.itemCount === 1 ? "" : "s"}</div>
                </div>
                <div className={`rounded-xl p-3 ${tracker.needsAction ? "bg-gold-soft" : "bg-sage-soft"}`}>
                  <div className={`font-voice text-2xl font-semibold ${tracker.needsAction ? "text-gold-text" : "text-sage-text"}`}>{tracker.needsAction}</div>
                  <div className={`text-[11px] mt-0.5 ${tracker.needsAction ? "text-gold-text" : "text-sage-text"}`}>Need action</div>
                </div>
              </div>
              <div className="text-[11px] text-text-muted mt-4">{tracker.stagesParsed.map((stage) => stage.label).slice(0, 4).join(" · ")}{tracker.stagesParsed.length > 4 ? " · …" : ""}</div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
