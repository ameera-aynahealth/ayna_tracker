import Link from "next/link";
import { ArrowRight, CircleAlert, Clock3, ListChecks, ShieldAlert } from "lucide-react";

export function MetricCard({
  label,
  value,
  detail,
  tone = "accent",
  href,
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone?: "accent" | "sage" | "gold" | "brick" | "plum";
  href?: string;
}) {
  const tones = {
    accent: "bg-accent-soft text-accent-text border-accent/15",
    sage: "bg-sage-soft text-sage-text border-sage/15",
    gold: "bg-gold-soft text-gold-text border-gold/15",
    brick: "bg-brick-soft text-brick-text border-brick/15",
    plum: "bg-plum-soft text-plum-text border-plum/15",
  };

  const content = (
    <div className={`h-full border p-4 sm:p-5 transition-transform ${tones[tone]}`} style={{ borderRadius: "20px 10px 10px 10px" }}>
      <div className="text-[11px] uppercase tracking-[0.11em] font-semibold opacity-75">{label}</div>
      <div className="font-voice text-3xl sm:text-4xl font-semibold leading-none mt-2">{value}</div>
      {detail && <div className="text-xs mt-2 opacity-75">{detail}</div>}
    </div>
  );

  return href ? <Link href={href} className="block hover:-translate-y-0.5 transition-transform">{content}</Link> : content;
}

export function ProgressRing({
  value,
  label,
  size = 112,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (clamped / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full" role="img" aria-label={`${clamped}% complete`}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-sunk" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="text-accent"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-voice text-xl font-semibold">{clamped}%</div>
      </div>
      {label && <div className="text-xs text-text-muted">{label}</div>}
    </div>
  );
}

const barTones = ["bg-accent", "bg-gold", "bg-sage", "bg-plum", "bg-brick", "bg-accent/60", "bg-sage/60"];

export function HorizontalBars({
  data,
  max,
  compact = false,
}: {
  data: Array<{ label: string; value: number; detail?: string }>;
  max?: number;
  compact?: boolean;
}) {
  const top = max ?? Math.max(1, ...data.map((row) => row.value));
  return (
    <div className={compact ? "space-y-2.5" : "space-y-3.5"}>
      {data.map((row, index) => (
        <div key={`${row.label}-${index}`}>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs font-medium flex-1 truncate">{row.label}</span>
            <span className="text-xs text-text-muted shrink-0">{row.detail ?? row.value}</span>
          </div>
          <div className={`${compact ? "h-1.5" : "h-2"} bg-surface-sunk rounded-full overflow-hidden`}>
            <div className={`h-full rounded-full ${barTones[index % barTones.length]}`} style={{ width: `${Math.max(row.value ? 3 : 0, (row.value / top) * 100)}%` }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="text-sm text-text-muted">No data yet.</div>}
    </div>
  );
}

export function StackedDistribution({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <div>
      <div className="h-3 rounded-full bg-surface-sunk overflow-hidden flex" aria-label={`${total} tasks across statuses`}>
        {data.map((row, index) => (
          <div
            key={row.label}
            title={`${humanize(row.label)}: ${row.value}`}
            className={`${barTones[index % barTones.length]} h-full`}
            style={{ width: total ? `${(row.value / total) * 100}%` : "0%" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-4">
        {data.filter((row) => row.value > 0).map((row, index) => (
          <div key={row.label} className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${barTones[index % barTones.length]}`} />
            <span className="text-xs text-text-secondary truncate capitalize">{humanize(row.label)}</span>
            <span className="text-xs font-semibold ml-auto">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniColumnChart({
  data,
  emptyLabel = "No deadlines in the next seven days.",
}: {
  data: Array<{ label: string; value: number }>;
  emptyLabel?: string;
}) {
  const top = Math.max(1, ...data.map((row) => row.value));
  if (data.every((row) => row.value === 0)) return <div className="text-sm text-text-muted py-8 text-center">{emptyLabel}</div>;

  return (
    <div className="h-36 flex items-end gap-2 sm:gap-3 pt-4">
      {data.map((row, index) => (
        <div key={`${row.label}-${index}`} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1.5">
          <span className="text-[11px] font-semibold text-text-secondary">{row.value || ""}</span>
          <div className="w-full max-w-12 bg-surface-sunk rounded-t-xl overflow-hidden flex items-end" style={{ height: "88px" }}>
            <div className={`w-full rounded-t-xl ${index === 0 ? "bg-accent" : "bg-accent/55"}`} style={{ height: `${Math.max(row.value ? 10 : 0, (row.value / top) * 100)}%` }} />
          </div>
          <span className="text-[10px] sm:text-[11px] text-text-muted truncate max-w-full">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({
  data,
  secondary,
}: {
  data: Array<{ label: string; value: number }>;
  secondary?: Array<{ label: string; value: number }>;
}) {
  const top = Math.max(1, ...data.map((row) => row.value), ...(secondary ?? []).map((row) => row.value));
  return (
    <div>
      <div className="h-44 flex items-end gap-2 sm:gap-3 border-b border-border pb-1">
        {data.map((row, index) => {
          const second = secondary?.[index]?.value ?? 0;
          return (
            <div key={`${row.label}-${index}`} className="flex-1 h-full flex items-end justify-center gap-1 min-w-0">
              <div className="w-2 sm:w-4 bg-accent rounded-t-md" style={{ height: `${Math.max(row.value ? 4 : 0, (row.value / top) * 100)}%` }} title={`${row.label}: ${row.value}`} />
              {secondary && <div className="w-2 sm:w-4 bg-sage rounded-t-md" style={{ height: `${Math.max(second ? 4 : 0, (second / top) * 100)}%` }} title={`${secondary[index]?.label ?? row.label}: ${second}`} />}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-3 mt-2">
        {data.map((row, index) => <div key={`${row.label}-label-${index}`} className="flex-1 text-center text-[10px] text-text-muted truncate">{row.label}</div>)}
      </div>
    </div>
  );
}

export function AttentionList({
  items,
}: {
  items: Array<{ label: string; value: number; href: string; type: "overdue" | "today" | "blocked" | "review" }>;
}) {
  const iconMap = {
    overdue: ShieldAlert,
    today: Clock3,
    blocked: CircleAlert,
    review: ListChecks,
  };
  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const Icon = iconMap[item.type];
        return (
          <Link key={item.label} href={item.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
            <div className="w-8 h-8 rounded-xl bg-surface-sunk flex items-center justify-center shrink-0"><Icon size={15} className="text-text-secondary" /></div>
            <span className="text-sm flex-1">{item.label}</span>
            <span className="font-voice text-lg font-semibold">{item.value}</span>
            <ArrowRight size={14} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
          </Link>
        );
      })}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-surface p-5 sm:p-6 ${className}`} style={{ borderRadius: "24px 12px 12px 12px" }}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            {title && <h2 className="font-voice text-lg font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
