import { MarketTabs } from "./market-tabs";

export default function MarketIntelligenceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><header className="page-header"><div><p className="eyebrow">Market Intelligence</p><h1 className="page-title">Know where your market is moving.</h1><p className="page-intro">A single workspace for website demand, local opportunities and the signals that shape dealership decisions.</p></div></header><MarketTabs/>{children}</>;
}
