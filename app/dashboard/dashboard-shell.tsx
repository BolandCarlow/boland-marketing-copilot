"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type IconName = "overview" | "leads" | "analytics" | "campaigns" | "reports" | "integrations" | "insights" | "settings" | "sun" | "moon";
type NavigationItem = { label: string; href: string; icon: IconName };

const primary: NavigationItem[] = [
  { label: "Overview", href: "/dashboard", icon: "overview" },
  { label: "Leads", href: "/dashboard/leads", icon: "leads" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "campaigns" },
  { label: "Reports", href: "/dashboard/reports", icon: "reports" },
];
const secondary: NavigationItem[] = [
  { label: "Integrations", href: "/dashboard/settings/integrations", icon: "integrations" },
  { label: "AI Insights", href: "/dashboard/ai-insights", icon: "insights" },
  { label: "Settings", href: "/dashboard/settings/integrations", icon: "settings" },
];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    leads: <><circle cx="12" cy="8" r="3"/><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6"/></>,
    analytics: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 2 4-6"/></>,
    campaigns: <><path d="M4 12h4l9-5v10l-9-5H4z"/><path d="M8 17v3"/><path d="M19 9c1.2 1.7 1.2 4.3 0 6"/></>,
    reports: <><path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6M9 7h3"/></>,
    integrations: <><path d="M8 12h8"/><path d="M8 8V6a3 3 0 0 1 6 0v2"/><path d="M16 12v2a3 3 0 0 1-6 0v-2"/><path d="M3 12h5M16 12h5"/></>,
    insights: <><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 15c-1.3-1-2-2.7-2-4.5A6 6 0 0 1 18 10.5c0 1.8-.7 3.5-2 4.5-.7.6-1 1.2-1 2H9c0-.8-.3-1.4-1-2Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06-2.1 2.1-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65v.1h-3v-.1a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.06.06-2.1-2.1.06-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1h-.1v-3h.1a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.06-.06 2.1-2.1.06.06a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.1-1.65v-.1h3v.1a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.06-.06 2.1 2.1-.06.06a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.65 1.1h.1v3h-.1A1.8 1.8 0 0 0 19.4 15Z"/></>,
    sun: <><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>
  };
  return <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function Navigation({ items, compact = false }: { items: NavigationItem[]; compact?: boolean }) {
  const pathname = usePathname();
  return <div className={compact ? "mobile-nav" : "nav-list"}>{items.map((item) => {
    const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    return <Link key={item.label} className="nav-link" href={item.href} aria-current={active ? "page" : undefined}><Icon name={item.icon}/><span>{compact && item.label === "Integrations" ? "More" : item.label}</span></Link>;
  })}</div>;
}

export function DashboardShell({ children, email, signOut }: { children: ReactNode; email: string; signOut: () => Promise<void> }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("boland-theme");
    const useDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(useDark); document.documentElement.classList.toggle("dark", useDark);
  }, []);
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); window.localStorage.setItem("boland-theme", next ? "dark" : "light"); }
  return <div className="app-shell">
    <aside className="sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark">B</span><span className="brand-copy"><strong>Boland</strong><span>Marketing Copilot</span></span></Link><p className="nav-label">Workspace</p><Navigation items={primary}/><p className="nav-label">Management</p><Navigation items={secondary}/><div className="sidebar-footer"><p className="user-email">{email}</p><form action={signOut}><button className="quiet-button">Sign out</button></form></div></aside>
    <div className="main-wrap"><header className="topbar"><span className="topbar-title">Boland Carlow · Marketing management</span><button type="button" className="theme-button" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}><Icon name={dark ? "sun" : "moon"}/></button></header><main className="content">{children}</main></div>
    <Navigation compact items={[primary[0], primary[1], primary[2], secondary[0]]}/>
  </div>;
}
