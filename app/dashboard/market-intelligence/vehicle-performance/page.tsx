import { BadgeCheck, CarFront, Clock3, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { ChartCard, EmptyState, SectionHeader } from "../../dashboard-ui";

const cards = [
  { title: "Top performing vehicles", description: "Website demand, enquiries and stock signals will identify the strongest opportunities.", icon: TrendingUp },
  { title: "Lowest performing vehicles", description: "Connected stock and demand data will highlight vehicles that need attention.", icon: TrendingDown },
  { title: "Average stock age", description: "Inventory-feed data will show ageing risk and movement trends.", icon: Clock3 },
  { title: "Brand performance", description: "Brand-level vehicle interest will combine website demand and lead signals.", icon: BadgeCheck },
];

export default function VehiclePerformancePage() {
  return <section className="section"><SectionHeader eyebrow="Inventory intelligence" title="Vehicle performance" description="A ready-to-connect view of stock movement, website demand and enquiry signals."/><div className="placeholder-grid">{cards.map((card) => <ChartCard key={card.title} {...card}><EmptyState icon={CarFront} title="Data source pending" description={card.description}/></ChartCard>)}</div></section>;
}
