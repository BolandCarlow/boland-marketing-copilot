import { BarChart3, FileDown, FileText, Globe2, MapPinned } from "lucide-react";
import { ReportCard, SectionHeader, StatusBadge } from "../../dashboard-ui";

const reports = [
  { title: "Monthly Marketing Report", description: "A consolidated view of website, leads and marketing investment.", icon: FileText },
  { title: "Executive Summary", description: "A concise management view of headline performance and actions.", icon: BarChart3 },
  { title: "Website Performance Report", description: "GA4 traffic, engagement, acquisition and landing-page reporting.", icon: Globe2 },
  { title: "Geographic Opportunity Report", description: "Ireland website-interest and county opportunity reporting.", icon: MapPinned },
];

export default function ReportsPage() {
  return <section className="section"><SectionHeader eyebrow="Reports" title="Management reporting" description="Report templates are prepared for connected data. Export remains unavailable until report generation is implemented." action={<StatusBadge status="comingSoon">Export unavailable</StatusBadge>}/><div className="placeholder-grid">{reports.map((report) => <ReportCard key={report.title} {...report} action={<button type="button" className="button" disabled><FileDown aria-hidden="true" size={15}/>Export PDF</button>}/>)}</div></section>;
}
