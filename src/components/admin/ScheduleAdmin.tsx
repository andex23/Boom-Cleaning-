"use client";
import { useEffect, useState } from "react";
import type { AdminScheduleData } from "@/features/operations/catalogue-admin";
import { adminFetch, adminErrorMessage } from "./adminFetch";
import panel from "./PricingAdmin.module.css";
import collection from "./AdminCollection.module.css";
import styles from "./ScheduleAdmin.module.css";
const weekdays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const date = new Intl.DateTimeFormat("en-NG",{timeZone:"Africa/Lagos",day:"numeric",month:"short",year:"numeric"});
export function ScheduleAdmin() {
  const [data,setData]=useState<AdminScheduleData|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [dirty,setDirty]=useState(false);
  useEffect(() => {let active=true; void adminFetch("/api/admin/schedule").then(async response => {if(!response.ok) throw new Error("Unable to load the schedule.");const value=await response.json();if(active)setData(value);}).catch(reason => {if(active)setError(adminErrorMessage(reason,"Unable to load the schedule."));});return()=>{active=false;};},[]);
  useEffect(() => {if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  async function update(method:string,body:unknown,success:string) {
    setBusy(true);setError("");setMessage("");
    try {const response=await adminFetch("/api/admin/schedule",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error);setData(result);setDirty(false);setMessage(success);return true;}
    catch(reason){setError(adminErrorMessage(reason,reason instanceof Error ? reason.message : "Unable to update schedule."));return false;}
    finally{setBusy(false);}
  }
  if(!data)return <article className={panel.panel}><p role={error ? "alert" : undefined}>{error || "Loading schedule…"}</p></article>;
  return <div className={styles.workspace}>
    <div className={styles.notice}><strong>Booking availability</strong><p>All times are Abuja time. Changes affect new bookings; existing appointments stay in the diary.</p></div>
    {error && <p className={collection.alert} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}
    <form className={panel.panel} onSubmit={event=>{event.preventDefault();void update("PATCH",{days:data.days,slots:data.slots},"Booking hours saved.");}}>
      <div className={styles.heading}><div><h2>Weekly opening days</h2><p>Choose the days and hours when customers can book an arrival.</p></div><button disabled={busy || !dirty} type="submit">{busy ? "Saving…" : "Save availability"}</button></div>
      <fieldset disabled={busy} className={styles.week}>{[1,2,3,4,5,6,0].map(weekday=>{const day=data.days.find(row=>row.weekday===weekday)!;return <div className={styles.day} key={weekday}><label><input type="checkbox" checked={day.open} onChange={event=>{setData({...data,days:data.days.map(row=>row.weekday===weekday ? {...row,open:event.target.checked} : row)});setDirty(true);setMessage("");}} />{weekdays[weekday]}</label><span>{day.open ? "Open" : "Closed"}</span><label className={styles.time}>From<input type="time" required disabled={!day.open} value={day.start} onChange={event=>{setData({...data,days:data.days.map(row=>row.weekday===weekday ? {...row,start:event.target.value} : row)});setDirty(true);}} /></label><label className={styles.time}>Until<input type="time" required disabled={!day.open} value={day.end} onChange={event=>{setData({...data,days:data.days.map(row=>row.weekday===weekday ? {...row,end:event.target.value} : row)});setDirty(true);}} /></label></div>;})}</fieldset>
      <h3>Arrival windows</h3><p className={collection.muted}>Enable the times your team offers. An arrival is available only within the opening hours above and when it is not already booked.</p><fieldset disabled={busy} className={styles.slots}>{data.slots.map((slot,index)=><div key={slot.id}><label><input type="checkbox" checked={slot.isActive} onChange={event=>{setData({...data,slots:data.slots.map((row,i)=>i===index ? {...row,isActive:event.target.checked} : row)});setDirty(true);}} /><strong>{slot.time}</strong></label><input aria-label={`Name for ${slot.time} arrival`} value={slot.label} required minLength={2} maxLength={60} onChange={event=>{setData({...data,slots:data.slots.map((row,i)=>i===index ? {...row,label:event.target.value} : row)});setDirty(true);}} /></div>)}</fieldset>
    </form>
    <article className={panel.panel}><div className={styles.heading}><div><h2>Block dates</h2><p>Close the calendar for holidays, team leave or days you cannot take new jobs.</p></div></div><form className={styles.blockForm} onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));if(await update("POST",values,"Dates blocked."))form.reset();}}><fieldset disabled={busy || dirty}><label>First day<input name="from" type="date" required /></label><label>Last day<input name="to" type="date" required /></label><label>Reason<input name="reason" required minLength={2} maxLength={500} placeholder="e.g. Team holiday" /></label><button type="submit">Block dates</button></fieldset></form>{dirty && <p className={collection.muted}>Save your opening hours before blocking or reopening dates.</p>}
      <ul className={styles.blocks}>{data.blocks.map(block=><li key={block.id}><div><strong>{date.format(new Date(block.starts_at))} – {date.format(new Date(new Date(block.ends_at).getTime()-1))}</strong><p>{block.reason}</p></div><button type="button" disabled={busy || dirty} onClick={()=>void update("DELETE",{id:block.id},"Dates reopened.")}>Reopen dates</button></li>)}</ul>{!data.blocks.length && <p className={collection.muted}>No upcoming blocked dates. Your weekly opening days apply.</p>}
    </article>
  </div>;
}
