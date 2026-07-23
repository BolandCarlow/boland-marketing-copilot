"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/dashboard/market-intelligence" },
  { label: "Geographic Insights", href: "/dashboard/market-intelligence/geographic-insights" },
  { label: "Lead Sources", href: "/dashboard/market-intelligence/lead-sources" },
  { label: "Vehicle Performance", href: "/dashboard/market-intelligence/vehicle-performance" },
  { label: "AI Insights", href: "/dashboard/market-intelligence/ai-insights" },
  { label: "Reports", href: "/dashboard/market-intelligence/reports" }
];

export function MarketTabs() {
  const pathname = usePathname();
  return <nav className="market-tabs" aria-label="Market Intelligence sections">{tabs.map((tab) => <Link key={tab.href} href={tab.href} className="market-tab" aria-current={pathname === tab.href ? "page" : undefined}>{tab.label}</Link>)}</nav>;
}
