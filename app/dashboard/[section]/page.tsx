import { notFound } from "next/navigation";

const content: Record<string, { eyebrow: string; title: string; description: string; action: string }> = {
  leads: { eyebrow: "Leads", title: "A clearer lead workspace.", description: "Review, prioritise and follow up on dealership interest from a focused management view.", action: "View lead sources" },
  analytics: { eyebrow: "Analytics", title: "See the signal, not the noise.", description: "Understand the marketing patterns that matter for demand, spend and performance.", action: "Set reporting period" },
  campaigns: { eyebrow: "Campaigns", title: "Campaign performance, simplified.", description: "Keep a concise record of active campaigns and the outcomes they are generating.", action: "Review campaigns" },
  reports: { eyebrow: "Reports", title: "Management reporting, ready when needed.", description: "Prepare a consistent view of marketing activity for leadership discussions.", action: "Create report" },
  "ai-insights": { eyebrow: "AI Insights", title: "Useful observations, thoughtfully presented.", description: "Insights will appear here when there is enough activity to identify meaningful patterns.", action: "Learn more" }
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; const item = content[section]; if (!item) notFound(); return <><header className="page-header"><div><p className="eyebrow">{item.eyebrow}</p><h1 className="page-title">{item.title}</h1><p className="page-intro">{item.description}</p></div><button className="button">{item.action}</button></header><section className="section card empty-state"><div><strong>This workspace is ready for your data</strong><p>There is nothing to review just yet. Once records are available, they will appear in this polished management view.</p></div></section></>; }
