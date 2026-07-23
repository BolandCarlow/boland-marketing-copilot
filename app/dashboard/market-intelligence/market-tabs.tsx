"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, FileText, Gauge, MapPinned, Network, Radar, type LucideIcon } from "lucide-react";

const tabs: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/dashboard/market-intelligence", icon: Gauge },
  { label: "Geographic Insights", href: "/dashboard/market-intelligence/geographic-insights", icon: MapPinned },
  { label: "Lead Sources", href: "/dashboard/market-intelligence/lead-sources", icon: Network },
  { label: "Vehicle Performance", href: "/dashboard/market-intelligence/vehicle-performance", icon: Radar },
  { label: "AI Insights", href: "/dashboard/market-intelligence/ai-insights", icon: BrainCircuit },
  { label: "Reports", href: "/dashboard/market-intelligence/reports", icon: FileText },
];

export function MarketTabs() {
  const pathname = usePathname();
  return <nav className="market-tabs" aria-label="Market Intelligence sections">{tabs.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="market-tab" aria-current={pathname === href ? "page" : undefined}><Icon aria-hidden="true" size={15}/>{label}</Link>)}</nav>;
}
