"use client";
import { useState, useSyncExternalStore } from "react";
const subscribe = (listener: () => void) => { window.addEventListener("hashchange",listener); return () => window.removeEventListener("hashchange",listener); };
const snapshot = () => { const value=window.location.hash.slice(1); return /^[a-f0-9]{64}$/.test(value) ? value : ""; };
export function TemporaryAccessForm() {
  const token=useSyncExternalStore(subscribe,snapshot,()=>"");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!token || busy)return;setBusy(true);setError("");
    try {
      const response=await fetch("/api/admin/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
      const body=await response.json();if(!response.ok)throw new Error(body.error || "Unable to open temporary access.");
      window.history.replaceState(null,"","/admin/access");window.location.assign(new URL("/admin/services",window.location.origin).href);
    } catch(reason) {setError(reason instanceof Error ? reason.message : "Unable to open temporary access.");setBusy(false);}
  }
  return <form onSubmit={submit}>{error && <p role="alert">{error}</p>}<button type="submit" disabled={!token || busy}>{busy ? "Opening dashboard…" : "Open temporary admin session"}</button>{!token && <p>Open the complete private link you were given to continue.</p>}</form>;
}
