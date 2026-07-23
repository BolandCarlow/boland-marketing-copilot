const metrics = ["Top Performing Vehicles", "Lowest Performing Vehicles", "Average Stock Age", "Brand Performance"];

export default function VehiclePerformancePage() {
  return <section className="section"><div className="section-heading"><div><h2 className="section-title">Vehicle Performance</h2><p className="section-description">Future inventory signals designed to connect website demand, enquiries and stock movement.</p></div><span className="pill">Coming soon</span></div><div className="placeholder-grid">{metrics.map((metric) => <article className="card placeholder-card" key={metric}><p className="eyebrow">Inventory insight</p><h3>{metric}</h3><p>This view will populate when inventory and vehicle data sources are available.</p></article>)}</div></section>;
}
