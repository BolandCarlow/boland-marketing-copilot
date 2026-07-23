import { BadgeEuro, CarFront, CircleDotDashed, Globe2, Megaphone, MousePointerClick } from "lucide-react";
import { IntegrationCard, SectionHeader } from "../../dashboard-ui";

const sources = [
  { name: "Meta", description: "Campaign, spend and attributed lead reporting will appear when Meta Ads is connected.", icon: Megaphone, status: "pending" as const },
  { name: "Google Ads", description: "Paid-search campaign data is ready to connect when the advertising source is available.", icon: BadgeEuro, status: "pending" as const },
  { name: "Carzone", description: "Marketplace enquiries and vehicle-interest reporting will appear when connected.", icon: CarFront, status: "comingSoon" as const },
  { name: "DoneDeal", description: "Marketplace activity will be added when the source integration is available.", icon: CircleDotDashed, status: "comingSoon" as const },
  { name: "Organic", description: "Organic website interest is live in Google Analytics reporting today.", icon: Globe2, status: "live" as const },
  { name: "Referral", description: "Referral attribution will appear when lead-source data is connected.", icon: MousePointerClick, status: "pending" as const },
];

export default function LeadSourcesPage() {
  return <section className="section"><SectionHeader eyebrow="Acquisition" title="Lead sources" description="A single visual view of where prospective customers begin their journey."/><div className="placeholder-grid">{sources.map((source) => <IntegrationCard key={source.name} {...source}/>)}</div></section>;
}
