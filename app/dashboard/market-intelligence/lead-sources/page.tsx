const sources = ["Meta", "Google Ads", "Carzone", "DoneDeal", "Organic", "Referral"];

export default function LeadSourcesPage() {
  return <section className="section"><div className="section-heading"><div><h2 className="section-title">Lead Sources</h2><p className="section-description">A connected view of where prospective customers begin their journey.</p></div><span className="pill">Coming soon</span></div><div className="placeholder-grid">{sources.map((source) => <article className="card placeholder-card" key={source}><p className="eyebrow">Source</p><h3>{source}</h3><p>Performance and attribution will appear when this source is connected.</p></article>)}</div></section>;
}
