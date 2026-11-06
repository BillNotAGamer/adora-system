import type { DemoProvenance } from "@/lib/demo";

const COPY: Record<DemoProvenance, string> = {
  editorial: "Nội dung biên tập",
  "demo-fixture": "Dữ liệu demo cục bộ",
};

type DemoBadgeProps = {
  provenance: DemoProvenance;
  /** Set on dark backgrounds. */
  inverted?: boolean;
  className?: string;
};

/** Honest, always-visible origin label for editorial and demo-fixture records. */
export function DemoBadge({ provenance, inverted = false, className = "" }: Readonly<DemoBadgeProps>) {
  const tone = inverted
    ? "border-white/30 text-white/85"
    : "border-[var(--adora-hairline)] text-[var(--adora-text-secondary)]";
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-2 border px-3 text-[0.64rem] font-bold tracking-[0.14em] uppercase ${tone} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-[var(--adora-gold)]" aria-hidden="true" />
      {COPY[provenance]}
    </span>
  );
}
