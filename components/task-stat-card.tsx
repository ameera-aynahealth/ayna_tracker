import Link from "next/link";

const toneDot: Record<string, string> = {
  brick: "bg-brick",
  gold: "bg-gold",
  accent: "bg-accent",
  plum: "bg-plum",
  sage: "bg-sage",
};

export function TaskStatCard({
  label,
  value,
  tone,
  href = "/my-work",
}: {
  label: string;
  value: number;
  tone: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="border border-border bg-surface p-4 hover:border-border-strong transition-colors block"
      style={{ borderRadius: "20px 10px 10px 10px" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${toneDot[tone] ?? "bg-accent"}`} />
      </div>
      <div className="font-voice text-3xl font-semibold mt-1.5">{value}</div>
    </Link>
  );
}
