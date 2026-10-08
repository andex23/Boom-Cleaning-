"use client";
import { useEffect,useState } from "react";
import { lagosToday,revenuePeriod,shiftRevenuePeriod,type RevenueUnit,type RevenueSummary } from "@/features/operations/revenue-period";
import { formatNaira } from "@/lib/format";
import { adminFetch,adminErrorMessage } from "./adminFetch";
import styles from "./RevenueChart.module.css";
import collection from "./AdminCollection.module.css";
const dateLabel = (date:string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"});
export function RevenueChart() {
  const [unit,setUnit]=useState<RevenueUnit>("week");
  const [date,setDate]=useState(lagosToday);
  const [result,setResult]=useState<{key:string;data:RevenueSummary}|null>(null);
  const [failure,setFailure]=useState<{key:string;message:string}|null>(null);
  const key=`${unit}:${date}`;
  const data=result?.key === key ? result.data : null;
  const error=failure?.key === key ? failure.message : "";
  const period=revenuePeriod(unit,date);
  const current=revenuePeriod(unit,lagosToday());
  useEffect(() => {
    let active=true;
    void adminFetch(`/api/admin/revenue?unit=${unit}&date=${date}`).then(async response => {
      if(!response.ok) throw new Error("revenue");
      const body=await response.json();if(active) {setFailure(null);setResult({key:`${unit}:${date}`,data:body});}
    }).catch(reason => {if(active) setFailure({key:`${unit}:${date}`,message:adminErrorMessage(reason,"Unable to load this period. Try another period or refresh.")});});
    return () => {active=false;};
  },[unit,date]);
  const peak=Math.max(...(data?.daily.map(day=>Number(day.value)) ?? []),1);
  return <article className={styles.card} aria-label="Payment history">
    <header className={styles.header}><div><p className={styles.eyebrow}>PAYMENT HISTORY</p><h2>Payments received</h2><p className={styles.period}>{period.label} · Abuja time</p></div>
      <div className={styles.controls}><select className={collection.select} aria-label="Payment period" value={unit} onChange={event=>setUnit(event.target.value as RevenueUnit)}><option value="week">Weekly</option><option value="month">Monthly</option></select>
      <label><span>{unit === "week" ? "Week containing" : "Month"}</span><input aria-label={unit === "week" ? "Week containing" : "Payment month"} type={unit === "week" ? "date" : "month"} min={unit === "week" ? "2000-01-01" : "2000-01"} max={unit === "week" ? lagosToday() : lagosToday().slice(0,7)} value={unit === "week" ? date : date.slice(0,7)} onChange={event=>{const value=event.target.value;if(value) {try {const next=unit === "week" ? value : `${value}-01`;revenuePeriod(unit,next);setDate(next);} catch { /* Incomplete date entry keeps the last valid period. */ }}}} /></label></div>
    </header>
    <div className={styles.navigation}><button aria-label={`Previous ${unit}`} disabled={period.start <= "2000-01-03"} onClick={()=>setDate(shiftRevenuePeriod(period,-1))}>← Previous {unit}</button><button disabled={period.start === current.start} onClick={()=>setDate(lagosToday())}>This {unit}</button><button aria-label={`Next ${unit}`} disabled={period.start >= current.start} onClick={()=>setDate(shiftRevenuePeriod(period,1))}>Next {unit} →</button></div>
    <div className={styles.results} aria-live="polite">{error ? <p role="alert">{error}</p> : !data ? <p className={styles.note}>Loading payment history…</p> : <>
      <div className={styles.total}><strong>{formatNaira(Number(data.total)).replace("₦","₦\u00a0")}</strong><span>{Number(data.count)} verified {Number(data.count) === 1 ? "payment" : "payments"}</span></div>
      {!Number(data.count) && <p className={styles.note}>No verified payments in this {unit}.</p>}
      <svg className={styles.chart} viewBox="0 0 720 210" role="img" aria-label={`Daily payments for ${period.label}, total ${formatNaira(Number(data.total))}`}>
        <line x1="0" x2="720" y1="175" y2="175" stroke="#cbdcf0" />
        {data.daily.map((day,index)=>{
          const step=720/data.daily.length,height=Number(day.value)/peak*140,x=index*step;
          const showLabel=unit === "week" || index%5===0 || index===data.daily.length-1;
          return <g key={day.date}><title>{dateLabel(day.date)}: {formatNaira(Number(day.value))}, {day.count} payments</title><rect x={x+step*.2} y={175-height} width={step*.6} height={height} rx="3" fill={day.date === lagosToday() ? "#0c55b5" : "#71b6d8"} />{showLabel && <text x={x+step*.5} y="199" textAnchor="middle" fontSize="13" fill="#5a6d84">{unit === "week" ? new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-GB",{weekday:"short",timeZone:"UTC"}) : new Date(`${day.date}T00:00:00Z`).getUTCDate()}</text>}</g>;
        })}
      </svg>
      <details className={styles.details}><summary>Daily breakdown</summary><table><thead><tr><th>Date</th><th>Payments</th><th>Received</th></tr></thead><tbody>{data.daily.map(day=><tr key={day.date}><td>{dateLabel(day.date)}</td><td>{day.count}</td><td>{formatNaira(Number(day.value)).replace("₦","₦\u00a0")}</td></tr>)}</tbody></table></details>
      <p className={styles.note}>Verified Flutterwave receipts only, dated when payment was received. Unpaid bookings are excluded.</p>
    </>}</div>
  </article>;
}
