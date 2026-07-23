import { Compass } from "lucide-react";
import { PageHeader, StatusBadge } from "../dashboard-ui";
import { MarketTabs } from "./market-tabs";

export default function MarketIntelligenceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><PageHeader eyebrow="Market Intelligence" title="Know where your market is moving." description="A decision-ready workspace for website demand, local opportunities and the signals shaping dealership action." meta={<><StatusBadge status="live">Live GA4 signals</StatusBadge><span className="small"><Compass aria-hidden="true" size={13}/> Ireland opportunity reporting</span></>}/><MarketTabs/>{children}</>;
}
