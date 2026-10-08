"use client";
import { useEffect,useState } from "react";
import type { WebsiteAnalytics } from "@/features/analytics/server";
import { adminFetch,adminErrorMessage } from "./adminFetch";
import styles from "./AdminConsole.module.css";
export function AnalyticsPanel() {
  const [data,setData] = useState<WebsiteAnalytics | null>(null);
  const [error,setError] = useState("");
  useEffect(() => {
    let active = true;
    void adminFetch("/api/admin/analytics").then(async response => {
      if (!response.ok) throw new Error("load");
      const body = await response.json() as WebsiteAnalytics;
      if(active) setData(body);
    }).catch(reason => {if(active) setError(adminErrorMessage(reason,"Unable to load analytics. Refresh to try again."));});
    return () => {active=false;};
  },[]);
  if(error) return <p role="alert">{error}</p>;
  if(!data) return <p>Loading website analytics…</p>;
  const peak = Math.max(...data.daily.map(day => day.views),1);
  return <>
    <section className={styles.kpiGrid} aria-label="Website performance">
      {[{label:"Page views",value:data.pageViews,note:"Last 30 days"},{label:"Sessions",value:data.sessions,note:"Anonymous visits, rotated daily"}].map(item => <article className={styles.kpi} key={item.label}><div className={styles.kpiHead}>{item.label}</div><strong>{item.value.toLocaleString()}</strong><p>{item.note}</p></article>)}
    </section>
    <article className={styles.card}><div className={styles.cardHeading}><h2>Website traffic</h2><span className={styles.updated}>Last 30 days · Abuja time</span></div>
      {data.pageViews === 0 ? <div className={styles.emptyState}><strong>No visits recorded yet</strong><p>Analytics starts with this release. Public website visits will appear here as people browse.</p></div> : <div className={styles.trafficChart} role="img" aria-label={`Daily public page views over the last 30 days, ${data.pageViews} in total`}>
        {data.daily.map(day => <div key={day.date} className={styles.trafficColumn} title={`${day.date}: ${day.views} views`}><i style={{height:`${day.views/peak*100}%`}} /><small>{Number(day.date.slice(-2))}</small><span className="sr-only">{day.date}: {day.views} views</span></div>)}
      </div>}
    </article>
    <section className={styles.analyticsGrid}>
      {[{title:"Popular pages",rows:data.pages},{title:"Traffic sources",rows:data.sources},{title:"Devices",rows:data.devices}].map(group => <article key={group.title} className={styles.card}><h2>{group.title}</h2>{group.rows.length ? <ul className={styles.statList}>{group.rows.map(row => <li key={row.label}><span>{row.label === "/" ? "Home" : row.label === "/quote" ? "Booking" : row.label}</span><strong>{row.views.toLocaleString()}</strong></li>)}</ul> : <p className={styles.emptyNote}>No data yet.</p>}</article>)}
    </section>
    <p className={styles.analyticsFootnote}>Public pages only. Repeat views of the same page within 30 minutes are counted once per session. Sessions rotate daily; no personal or payment details are collected. Historical traffic is unavailable.</p>
  </>;
}
