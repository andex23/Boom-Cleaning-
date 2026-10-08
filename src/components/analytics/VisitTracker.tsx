"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_ANALYTICS_PATHS } from "@/features/analytics/validation";
export function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!PUBLIC_ANALYTICS_PATHS.some(value => value === path) || !["boomcleaning.site","www.boomcleaning.site"].includes(window.location.hostname) || navigator.doNotTrack === "1" || (navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl) return;
    // A visit is counted once per page per half-hour. The anonymous session expires
    // after 30 minutes of inactivity; server hashing also rotates every Lagos day.
    try {
      const now = Date.now();
      const previous = JSON.parse(sessionStorage.getItem("boom-visit-session") ?? "null") as {id:string;last:number} | null;
      const session = previous && now-previous.last<1800000 ? previous.id : crypto.randomUUID();
      sessionStorage.setItem("boom-visit-session",JSON.stringify({id:session,last:now}));
      const marker = `boom-visit:${session}:${path}:${Math.floor(now/1800000)}`;
      if (sessionStorage.getItem(marker)) return;
      void fetch("/api/analytics/visit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path,session,referrer:document.referrer ? new URL(document.referrer).origin : ""}),keepalive:true}).then(response => {if(response.ok) sessionStorage.setItem(marker,"1");}).catch(() => {});
    } catch { /* Browsing and booking still work when storage is unavailable. */ }
  },[path]);
  return null;
}
