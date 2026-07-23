"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Building2, FileText, LayoutDashboard, LogOut, Map, Megaphone, Moon, PlugZap, Settings, Sparkles, Sun, UsersRound, type LucideIcon } from "lucide-react";

type NavigationItem = { label: string; href: string; icon: LucideIcon };

const primary: NavigationItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market Intelligence", href: "/dashboard/market-intelligence", icon: Map },
  { label: "Leads", href: "/dashboard/leads", icon: UsersRound },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
];

const secondary: NavigationItem[] = [
  { label: "Integrations", href: "/dashboard/settings/integrations", icon: PlugZap },
  { label: "AI Insights", href: "/dashboard/ai-insights", icon: Sparkles },
  { label: "Settings", href: "/dashboard/settings/integrations", icon: Settings },
];

function Navigation({ items, compact = false }: { items: NavigationItem[]; compact?: boolean }) {
  const pathname = usePathname();
  return <div className={compact ? "mobile-nav" : "nav-list"}>{items.map(({ label, href, icon: Icon }) => {
    const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return <Link key={label} className="nav-link" href={href} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" className="nav-icon" size={18}/><span>{compact && label === "Integrations" ? "More" : label}</span></Link>;
  })}</div>;
}

export function DashboardShell({ children, email, signOut }: { children: ReactNode; email: string; signOut: () => Promise<void> }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("boland-theme");
    const useDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(useDark);
    document.documentElement.classList.toggle("dark", useDark);
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("boland-theme", next ? "dark" : "light");
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><span className="brand-mark"><Building2 aria-hidden="true" size={17}/></span><span className="brand-copy"><strong>Boland Carlow</strong><span>Marketing Copilot</span></span></Link>
      <p className="nav-label">Workspace</p><Navigation items={primary}/>
      <p className="nav-label">Management</p><Navigation items={secondary}/>
      <div className="sidebar-footer"><div className="user-profile"><span className="user-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span><p className="user-email">{email}</p></div><form action={signOut}><button className="quiet-button"><LogOut aria-hidden="true" size={14}/>Sign out</button></form></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><span className="topbar-title">Boland Carlow <span>·</span> Marketing Centre</span><button type="button" className="theme-button" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun aria-hidden="true" size={16}/> : <Moon aria-hidden="true" size={16}/>}</button></header><main className="content">{children}</main></div>
    <Navigation compact items={[primary[0], primary[1], primary[2], primary[3], secondary[0]]}/>
  </div>;
}
