import type { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./dashboard-ui.module.css";

type TrendValue = number | null;

export function PageHeader({ eyebrow, title, description, meta, actions }: { eyebrow?: string; title: string; description?: string; meta?: ReactNode; actions?: ReactNode }) {
  return <header className={styles.pageHeader}><div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1>{description ? <p className={styles.pageIntro}>{description}</p> : null}{meta ? <div className={styles.headerMeta}>{meta}</div> : null}</div>{actions ? <div className={styles.headerActions}>{actions}</div> : null}</header>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className={styles.sectionHeader}><div>{eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}<h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action ? <div>{action}</div> : null}</div>;
}

export function TrendBadge({ value, label = "vs previous period" }: { value: TrendValue; label?: string }) {
  const direction = value === null ? "neutral" : value > 0 ? "up" : value < 0 ? "down" : "neutral";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const content = value === null ? "No comparison" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  return <span className={`${styles.trendBadge} ${styles[direction]}`}><Icon aria-hidden="true" size={13}/><span>{content}</span><span className={styles.trendLabel}>{label}</span></span>;
}

export function IconTile({ icon: Icon, tone = "accent", label }: { icon: LucideIcon; tone?: "accent" | "success" | "warning" | "muted"; label?: string }) {
  return <span className={`${styles.iconTile} ${styles[tone]}`} aria-label={label}><Icon aria-hidden="true" size={19}/></span>;
}

export function MetricCard({ icon, label, value, detail, trend, tone = "accent" }: { icon: LucideIcon; label: string; value: string; detail?: string; trend?: TrendValue; tone?: "accent" | "success" | "warning" | "muted" }) {
  return <article className={styles.metricCard}><div className={styles.metricTop}><IconTile icon={icon} tone={tone} label={label}/>{trend !== undefined ? <TrendBadge value={trend}/> : null}</div><p className={styles.metricLabel}>{label}</p><strong className={styles.metricValue}>{value}</strong>{detail ? <p className={styles.metricDetail}>{detail}</p> : null}</article>;
}

export function StatusBadge({ status, children }: { status: "connected" | "pending" | "comingSoon" | "live" | "warning" | "neutral"; children: ReactNode }) {
  return <span className={`${styles.statusBadge} ${styles[status]}`}><span className={styles.statusDot}/>{children}</span>;
}

export function ChartCard({ title, description, icon, action, children, className = "" }: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return <article className={`${styles.chartCard} ${className}`}><div className={styles.cardHeader}><div className={styles.cardHeading}>{icon ? <IconTile icon={icon} tone="muted" label={title}/> : null}<div><h3>{title}</h3>{description ? <p>{description}</p> : null}</div></div>{action ? <div>{action}</div> : null}</div>{children}</article>;
}

export function InsightCard({ title, evidence, action, icon: Icon, label = "Insight" }: { title: string; evidence: string; action?: string; icon?: LucideIcon; label?: string }) {
  return <article className={styles.insightCard}>{Icon ? <IconTile icon={Icon} tone="warning" label={label}/> : null}<div><p className={styles.insightLabel}>{label}</p><h3>{title}</h3><p>{evidence}</p>{action ? <p className={styles.recommendedAction}><ArrowRight aria-hidden="true" size={14}/><span>{action}</span></p> : null}</div></article>;
}

export function IntegrationCard({ name, description, icon, status, action }: { name: string; description: string; icon: LucideIcon; status: "connected" | "pending" | "comingSoon" | "live" | "warning" | "neutral"; action?: ReactNode }) {
  return <article className={styles.integrationCard}><div className={styles.metricTop}><IconTile icon={icon} tone={status === "connected" || status === "live" ? "success" : "muted"} label={name}/><StatusBadge status={status}>{status === "comingSoon" ? "Coming soon" : status === "connected" ? "Connected" : status === "live" ? "Live" : status === "pending" ? "Pending" : "Unavailable"}</StatusBadge></div><h3>{name}</h3><p>{description}</p>{action ? <div className={styles.cardAction}>{action}</div> : null}</article>;
}

export function ReportCard({ title, description, icon, status = "comingSoon", action }: { title: string; description: string; icon: LucideIcon; status?: "connected" | "pending" | "comingSoon" | "live" | "warning" | "neutral"; action?: ReactNode }) {
  return <article className={styles.reportCard}><IconTile icon={icon} tone="accent" label={title}/><div><StatusBadge status={status}>{status === "comingSoon" ? "Unavailable" : "Ready"}</StatusBadge><h3>{title}</h3><p>{description}</p></div>{action ? <div className={styles.cardAction}>{action}</div> : null}</article>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className={styles.emptyState}><IconTile icon={Icon} tone="muted" label={title}/><strong>{title}</strong><p>{description}</p>{action ? <div>{action}</div> : null}</div>;
}

export function BrandBadge({ brand }: { brand: "Volvo" | "Skoda" | "Peugeot" | "Mazda" | "Used Cars" | "Aftersales" | string }) {
  const token = brand.toLowerCase().replace(/\s+/g, "");
  return <span className={`${styles.brandBadge} ${styles[token] ?? ""}`}>{brand}</span>;
}

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return <div className={styles.dataTableWrap}><div className={styles.tableScroll}><table className={styles.dataTable} aria-label={label}>{children}</table></div></div>;
}
