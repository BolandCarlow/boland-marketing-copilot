"use client";

import { useMemo, useState } from "react";
import styles from "./market-opportunities.module.css";
import type { Ga4MarketOpportunitiesData } from "@/lib/ga4/dashboard";
import { MIN_CATEGORY_PAGE_VIEWS, MIN_COMPARISON_PAGE_VIEWS, MIN_GROWTH, MIN_KEY_EVENTS, MIN_SHARE_DIFFERENCE, buildOpportunities, marketCategories, type CountyInterest, type InterestMetric } from "@/lib/ga4/market-opportunities";
import type { PageCategory } from "@/lib/ga4/page-classification";

type Period = "current" | "previous";
type SortKey = PageCategory | "county" | "total";

const metricOptions: { key: InterestMetric; label: string }[] = [
  { key: "pageViews", label: "Page Views" },
  { key: "activeUsers", label: "Users" },
  { key: "sessions", label: "Sessions" },
  { key: "keyEvents", label: "Key Events" },
];

const number = (value: number) => value.toLocaleString("en-IE");
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const rate = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null;
const countyKey = (value: string) => value.toLowerCase().replace(/^county\s+/, "").replace(/\s+county$/, "").trim();
const categoryMetric = (county: CountyInterest, category: PageCategory, metric: InterestMetric) => county.categories.find((item) => item.category === category)?.[metric] ?? 0;

function Empty({ children }: { children: string }) {
  return <div className="empty-state"><div><strong>No market opportunities available yet</strong><p>{children}</p></div></div>;
}

export function MarketOpportunities({ data, selectedCounty, onSelectCounty }: { data: Ga4MarketOpportunitiesData | null; selectedCounty: string | null; onSelectCounty: (county: string) => void }) {
  const [period, setPeriod] = useState<Period>("current");
  const [categoryFilter, setCategoryFilter] = useState<"all" | PageCategory>("all");
  const [metric, setMetric] = useState<InterestMetric>("pageViews");
  const [sort, setSort] = useState<SortKey>("total");
  const [descending, setDescending] = useState(true);

  const calculated = useMemo(() => data ? buildOpportunities(data.current, data.previous) : null, [data]);
  const counties = useMemo(() => period === "current" ? calculated?.counties ?? [] : calculated?.previous ?? [], [calculated, period]);
  const sortedCounties = useMemo(() => [...counties].sort((left, right) => {
    const leftValue = sort === "county" ? left.county : sort === "total" ? left.totals[metric] : categoryMetric(left, sort, metric);
    const rightValue = sort === "county" ? right.county : sort === "total" ? right.totals[metric] : categoryMetric(right, sort, metric);
    const comparison = typeof leftValue === "string" && typeof rightValue === "string" ? leftValue.localeCompare(rightValue) : Number(leftValue) - Number(rightValue);
    return descending ? -comparison : comparison;
  }), [counties, descending, metric, sort]);
  const opportunities = useMemo(() => (calculated?.opportunities ?? []).filter((item) => categoryFilter === "all" || item.category.category === categoryFilter).slice(0, 3), [calculated, categoryFilter]);
  const selected = useMemo(() => counties.find((county) => countyKey(county.county) === countyKey(selectedCounty ?? "")) ?? opportunities[0] ?? counties[0] ?? null, [counties, opportunities, selectedCounty]);
  const insights = useMemo(() => {
    if (!calculated) return [] as string[];
    const result: string[] = [];
    const share = calculated.opportunities.find((item) => item.shareDifference >= MIN_SHARE_DIFFERENCE);
    const growth = calculated.opportunities.find((item) => item.change !== null && item.change >= MIN_GROWTH);
    const nationalKeyEventRate = rate(calculated.nationalTotals.keyEvents, calculated.nationalTotals.pageViews);
    const keyEventRate = calculated.counties.find((county) => county.totals.pageViews >= 50 && county.totals.keyEvents >= MIN_KEY_EVENTS && nationalKeyEventRate !== null && (rate(county.totals.keyEvents, county.totals.pageViews) ?? 0) >= nationalKeyEventRate + 0.02);
    if (share) result.push(`${share.county}’s share of ${share.category.category} page-view interest is ${(share.shareDifference * 100).toFixed(1)} percentage points above the national average.`);
    if (growth && growth.change !== null) result.push(`${growth.category.category} page-view interest in ${growth.county} increased ${Math.round(growth.change * 100)}% versus the previous 30-day period.`);
    if (keyEventRate && nationalKeyEventRate !== null) result.push(`${keyEventRate.county} has a ${(rate(keyEventRate.totals.keyEvents, keyEventRate.totals.pageViews)! * 100).toFixed(1)}% key-event rate, above the national ${(nationalKeyEventRate * 100).toFixed(1)}% rate.`);
    return result.slice(0, 3);
  }, [calculated]);

  const setSortKey = (key: SortKey) => {
    if (key === sort) setDescending(!descending);
    else { setSort(key); setDescending(key !== "county"); }
  };

  if (!data || !calculated) {
    return <section className={`section card section-card ${styles.marketOpp}`}><div className="section-heading"><div><h2 className="section-title">Market Opportunities</h2><p className="section-description">Location and page-view interest will be available after a fresh GA4 sync includes the new Ireland page-interest reports.</p></div></div><Empty>Run Sync now after the geographic market-opportunity refresh update has been deployed.</Empty></section>;
  }

  const selectedPages = selected ? selected.pages.filter((page) => categoryFilter === "all" || page.category === categoryFilter).sort((a, b) => b[metric] - a[metric]).slice(0, 8) : [];

  return <div className={styles.marketOpp}>
    <section className="section card section-card">
      <div className="section-heading"><div><p className="eyebrow">Market Opportunities</p><h2 className="section-title">County website interest</h2><p className="section-description">Aggregated GA4 page-view interest by Ireland location and page category. Location data is approximate and aggregated; no individual visitor information is shown.</p></div></div>
      <div className="opportunity-filters">
        <label>Date range<select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="current">Current 30 days</option><option value="previous">Previous 30 days</option></select></label>
        <label>Brand/category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | PageCategory)}><option value="all">All classified pages</option>{marketCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label>Metric<select value={metric} onChange={(event) => setMetric(event.target.value as InterestMetric)}>{metricOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      </div>
      {opportunities.length ? <div className="opportunity-cards">{opportunities.map((item) => <button type="button" className="card opportunity-card" key={`${item.county}-${item.category.category}`} onClick={() => onSelectCounty(item.county)}><span className="eyebrow">{item.county}</span><strong>{item.category.category}</strong><span>{number(item.category.pageViews)} page views</span><small>{percent(item.countyShare)} county share · {item.shareDifference >= 0 ? "+" : ""}{(item.shareDifference * 100).toFixed(1)} pts vs national</small><small>{item.change === null ? "No reliable prior-period comparison" : `${item.change >= 0 ? "+" : ""}${percent(item.change)} vs previous period`}</small><small>{percent(item.engagementRate)} engagement · {number(item.category.keyEvents)} key events</small></button>)}</div> : <Empty>No county-category combination currently meets the minimum website-interest thresholds.</Empty>}
    </section>

    <section className="section two-grid">
      <article className="card table-card"><div className="table-head"><h2 className="section-title">Brand interest by county</h2><p className="section-description">Sort any brand/category column. Values follow the selected metric and period.</p></div>{sortedCounties.length ? <div className="table-scroll"><table className="data-table sortable-table opportunity-table"><thead><tr><th><button type="button" onClick={() => setSortKey("county")}>County</button></th>{marketCategories.map((category) => <th key={category}><button type="button" onClick={() => setSortKey(category)}>{category}</button></th>)}<th><button type="button" onClick={() => setSortKey("total")}>Total classified {metricOptions.find((item) => item.key === metric)?.label.toLowerCase()}</button></th></tr></thead><tbody>{sortedCounties.map((county) => <tr key={county.county} tabIndex={0} onClick={() => onSelectCounty(county.county)} onKeyDown={(event) => event.key === "Enter" && onSelectCounty(county.county)}><td>{county.county}</td>{marketCategories.map((category) => <td key={category}>{number(categoryMetric(county, category, metric))}</td>)}<td>{number(county.totals[metric])}</td></tr>)}</tbody></table></div> : <Empty>No classified page-interest data is available for this period.</Empty>}</article>
      <aside className="card table-card"><div className="table-head"><h2 className="section-title">Automatic opportunity insights</h2><p className="section-description">Deterministic observations only, using minimum-volume thresholds.</p></div>{insights.length ? insights.map((insight) => <article className="insight" key={insight}><span className="insight-type">Website interest</span><p>{insight}</p></article>) : <Empty>There is not yet enough aggregated website-interest volume for a reliable opportunity insight.</Empty>}</aside>
    </section>

    <section className="section card table-card"><div className="table-head"><h2 className="section-title">County detail{selected ? ` · ${selected.county}` : ""}</h2><p className="section-description">Select a county on the map, leaderboard or table to review its top aggregated page-view interest.</p></div>{selected ? <><div className="county-detail-summary">{selected.categories.filter((category) => category.pageViews > 0).sort((a, b) => b.pageViews - a.pageViews).slice(0, 4).map((category) => <span className="pill" key={category.category}>{category.category}: {number(category.pageViews)} views</span>)}</div>{selectedPages.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Page</th><th>Category</th><th>Views</th><th>Users</th><th>Engagement rate</th><th>Key events</th><th>Change</th></tr></thead><tbody>{selectedPages.map((page) => <tr key={`${page.category}-${page.pagePath}-${page.pageTitle}`}><td>{page.pageTitle}<span className="small">{page.pagePath || "Path unavailable"}</span></td><td>{page.category}</td><td>{number(page.pageViews)}</td><td>{number(page.activeUsers)}</td><td>{percent(rate(page.engagedSessions, page.sessions))}</td><td>{number(page.keyEvents)}</td><td>{page.change === null ? "—" : `${page.change >= 0 ? "+" : ""}${percent(page.change)}`}</td></tr>)}</tbody></table></div> : <Empty>No classified page-interest rows match the current filter for this county.</Empty>}</> : <Empty>Select a county to view aggregated detail.</Empty>}</section>
    <p className="data-privacy-note">GA4 location data is approximate and aggregated. This view describes website interest and page-view interest only; it does not identify individual visitors, customers, leads or sales.</p>
    <p className="data-threshold-note">Insight thresholds: at least {MIN_CATEGORY_PAGE_VIEWS} category page views, {MIN_COMPARISON_PAGE_VIEWS} prior-period page views for growth, and {MIN_KEY_EVENTS} key events for key-event-rate comparisons.</p>
  </div>;
}
