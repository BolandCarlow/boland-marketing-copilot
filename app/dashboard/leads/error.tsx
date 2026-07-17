"use client";
export default function LeadsError({ reset }: { reset: () => void }) { return <section className="empty-state card"><div><strong>We could not load the Leads Hub</strong><p>Please try again. Your lead records have not been changed.</p><button type="button" className="button primary" onClick={reset}>Try again</button></div></section>; }
