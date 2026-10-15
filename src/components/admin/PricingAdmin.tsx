"use client";
import { useEffect,useState } from "react";
import type { PricingAdminData } from "@/features/pricing/pricing-admin";
import { adminFetch,adminErrorMessage } from "./adminFetch";
import { CollectionSummary } from "./AdminCollection";
import styles from "./AdminCollection.module.css";
import panel from "./PricingAdmin.module.css";
export function PricingAdmin() {
  const [data,setData] = useState<PricingAdminData|null>(null);
  const [selected,setSelected] = useState("");
  const [error,setError] = useState("");
  const [dirty,setDirty] = useState(false);
  const [saved,setSaved] = useState(false);
  const [creating,setCreating] = useState(false);
  const [createOpen,setCreateOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  useEffect(() => {
    let active=true;
    void adminFetch("/api/admin/pricing").then(async response => {
      if(!response.ok) throw new Error("load");
      const value=await response.json() as PricingAdminData;
      if(active) {setData(value);setSelected(value.services[0]?.slug ?? "");}
    }).catch(reason => {if(active) setError(adminErrorMessage(reason,"Unable to load the service catalogue."));});
    return () => {active=false;};
  },[]);
  useEffect(() => {
    if(!dirty) return;
    const warn = (event:BeforeUnloadEvent) => {event.preventDefault();};
    window.addEventListener("beforeunload",warn);
    return () => window.removeEventListener("beforeunload",warn);
  },[dirty]);
  function edit(update:(current:PricingAdminData)=>PricingAdminData) {
    setData(current => current ? update(current) : current);setDirty(true);setSaved(false);
  }
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!data) return;
    setSaving(true);setError("");
    try {
      const payload={services:data.services.map(({slug,name,description,isActive,durationMinutes,basePrice,minimumCharge,requiresReview}) => ({slug,name,description,isActive,durationMinutes,basePrice,minimumCharge,requiresReview})),propertyTypes:data.propertyTypes.map(({slug,baseMultiplier,minimumCharge,requiresReview}) => ({slug,baseMultiplier,minimumCharge,requiresReview})),serviceAreas:data.serviceAreas.map(({slug,surcharge,requiresReview}) => ({slug,surcharge,requiresReview})),spacePrices:Object.entries(data.spacePrices).map(([key,value]) => {const [serviceSlug,spaceSlug]=key.split("::");return {serviceSlug,spaceSlug,...value};}),bedroomTiers:data.bedroomTiers.map(({id,price}) => ({id,price})),spaceTiers:data.spaceTiers.map(({id,price}) => ({id,price}))};
      const response=await adminFetch("/api/admin/pricing",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const body=await response.json();if(!response.ok) throw new Error(body.error ?? "Unable to save prices.");
      setData(body);setDirty(false);setSaved(true);
    } catch(reason) {setError(adminErrorMessage(reason,reason instanceof Error ? reason.message : "Unable to save prices."));}
    finally {setSaving(false);}
  }
  async function createService(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setCreating(true);setError("");
    const values=Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response=await adminFetch("/api/admin/pricing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const result=await response.json();if(!response.ok) throw new Error(result.error ?? "Unable to create service.");
      setData(result.data);setSelected(result.slug);setCreateOpen(false);setSaved(false);setDirty(false);
    } catch(reason) {setError(adminErrorMessage(reason,reason instanceof Error ? reason.message : "Unable to create service."));}
    finally {setCreating(false);}
  }
  if(!data) return <article className={panel.panel}>{error ? <p role="alert" className={styles.alert}>{error}</p> : <p className={styles.muted}>Loading the service catalogue…</p>}</article>;
  const service=data.services.find(row => row.slug===selected);
  const bedroomTiers=data.bedroomTiers.filter(row => row.serviceSlug===selected);
  const spaceTiers=data.spaceTiers.filter(row => row.serviceSlug===selected);
  const spacePrices=Object.entries(data.spacePrices).filter(([key]) => key.startsWith(`${selected}::`));
  const moneyField=(value:number,onChange:(value:number)=>void,label:string) => <input aria-label={label} type="number" inputMode="decimal" min={0} max={100000000} step="0.01" required value={value} onChange={event => onChange(Number(event.target.value))} />;
  return <><CollectionSummary items={[{label:"Active services",value:data.services.filter(row => row.isActive).length},{label:"Bedroom packages",value:data.bedroomTiers.length},{label:"Space prices",value:Object.keys(data.spacePrices).length},{label:"Service areas",value:data.serviceAreas.length}]} />
    {error && <p className={styles.alert} role="alert">{error}</p>}
    <div className={styles.actions} style={{marginBottom:20}}><button type="button" disabled={dirty || saving || creating} onClick={() => setCreateOpen(value => !value)}>{createOpen ? "Close new service" : "Create service"}</button>{dirty && <span className={styles.muted}>Save your changes before creating a service.</span>}</div>
    {createOpen && <article className={panel.panel}><h2>Create a service</h2><p className={styles.muted}>Start with an existing service’s pricing setup. Your new service stays a draft until you review the prices and publish it.</p><form onSubmit={createService} className={styles.editor}><div className={styles.fields}>
      <label>Service name<input name="name" required minLength={2} maxLength={120} /></label>
      <label>Service link<input name="slug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="e.g. apartment-refresh" /><small>Lowercase words separated by hyphens. This link stays fixed.</small></label>
      <label>Start with<select name="templateSlug" required>{data.services.filter(row => row.isActive && !row.requiresReview).map(row => <option key={row.slug} value={row.slug}>{row.name}</option>)}</select></label>
      <label>What is included?<textarea name="description" required minLength={10} maxLength={3000} rows={4} /></label>
    </div><div className={styles.actions}><button disabled={creating} type="submit">{creating ? "Creating…" : "Create draft"}</button></div></form></article>}
    <form onSubmit={save}><div className={styles.saveBar}><p>Changes apply to new bookings. Existing booking prices are preserved.</p><span role="status">{saved ? "Changes saved" : dirty ? "Unsaved changes" : "Published catalogue"}</span><button type="submit" disabled={!dirty || saving}>{saving ? "Saving…" : "Save changes"}</button></div>
      <fieldset disabled={saving} className={styles.catalogueFieldset}><div className={styles.serviceWorkspace}>
        <nav className={styles.serviceList} aria-label="Choose a service">{data.services.map(row => <button type="button" key={row.slug} aria-pressed={selected===row.slug} onClick={() => setSelected(row.slug)}>{row.name}{!row.isActive ? " · Draft / hidden" : ""}</button>)}</nav>
        <article className={panel.panel}><div className={styles.editor}>{service && <><header><h2>{service.name}</h2><p>{bedroomTiers.length ? "Package prices by number of bedrooms, plus any additional spaces." : spaceTiers.length ? "Package and item prices used by the booking calculator." : "Published starting charge and prices for each item or space."}</p></header>
          <div className={styles.fields}>
          <label>Service name<input required minLength={2} maxLength={120} value={service.name} onChange={event => edit(current => ({...current,services:current.services.map(row => row.slug===selected ? {...row,name:event.target.value} : row)}))} /></label>
          <label>Description<textarea rows={4} maxLength={3000} value={service.description} onChange={event => edit(current => ({...current,services:current.services.map(row => row.slug===selected ? {...row,description:event.target.value} : row)}))} /></label>
          <label>Estimated duration (minutes)<input type="number" min={30} max={1440} step={1} required value={service.durationMinutes} onChange={event => edit(current => ({...current,services:current.services.map(row => row.slug===selected ? {...row,durationMinutes:Number(event.target.value)} : row)}))} /></label>
          <label>Visibility<select value={service.isActive ? "published" : "draft"} onChange={event => edit(current => ({...current,services:current.services.map(row => row.slug===selected ? {...row,isActive:event.target.value==="published"} : row)}))}><option value="published">Published — customers can book</option><option value="draft">Draft / hidden</option></select></label>
          {!bedroomTiers.length && <label>Starting charge (NGN){moneyField(service.basePrice,value => edit(current => ({...current,services:current.services.map(row => row.slug===selected ? {...row,basePrice:value} : row)})),`${service.name} starting charge`)}</label>}<label>Minimum charge (NGN){moneyField(service.minimumCharge,value => edit(current => ({...current,services:current.services.map(row => row.slug===selected ? {...row,minimumCharge:value} : row)})),`${service.name} minimum charge`)}</label></div>
          {bedroomTiers.length>0 && <section><h3>Bedroom packages</h3><div className={styles.tableScroll}><table className={styles.editorTable}><thead><tr><th>Property size</th><th>Full price (NGN)</th></tr></thead><tbody>{bedroomTiers.map(tier => <tr key={tier.id}><td>{tier.bedrooms} bedroom{tier.bedrooms===1 ? "" : "s"}</td><td>{moneyField(tier.price,value => edit(current => ({...current,bedroomTiers:current.bedroomTiers.map(row => row.id===tier.id ? {...row,price:value} : row)})),`${service.name}, ${tier.bedrooms} bedrooms price`)}</td></tr>)}</tbody></table></div></section>}
          {spaceTiers.length>0 && <section><h3>Space packages</h3><div className={styles.tableScroll}><table className={styles.editorTable}><thead><tr><th>Package</th><th>Full price (NGN)</th></tr></thead><tbody>{spaceTiers.map(tier => <tr key={tier.id}><td>{tier.quantity} × {data.spaceTypes.find(row => row.slug===tier.spaceSlug)?.name ?? tier.spaceSlug}</td><td>{moneyField(tier.price,value => edit(current => ({...current,spaceTiers:current.spaceTiers.map(row => row.id===tier.id ? {...row,price:value} : row)})),`${service.name}, ${tier.quantity} ${tier.spaceSlug} price`)}</td></tr>)}</tbody></table></div></section>}
          {spacePrices.length>0 && <section><h3>Item and additional-space prices</h3><div className={styles.tableScroll}><table className={styles.editorTable}><thead><tr><th>Item or space</th><th>Each (NGN)</th><th>Included</th></tr></thead><tbody>{spacePrices.map(([key,price]) => {const slug=key.split("::")[1],name=data.spaceTypes.find(row => row.slug===slug)?.name ?? slug;return <tr key={key}><td>{name}</td><td>{moneyField(price.unitPrice,value => edit(current => ({...current,spacePrices:{...current.spacePrices,[key]:{...current.spacePrices[key],unitPrice:value}}})),`${service.name}, ${name} unit price`)}</td><td><input aria-label={`${service.name}, ${name} included count`} type="number" min={0} max={100} step={1} required value={price.includedCount} onChange={event => edit(current => ({...current,spacePrices:{...current.spacePrices,[key]:{...current.spacePrices[key],includedCount:Number(event.target.value)}}}))} /></td></tr>;})}</tbody></table></div></section>}
        </>}</div></article>
      </div>
      <details className={styles.advanced}><summary>Property adjustments and travel charges</summary><div><p className={styles.muted}>These settings apply across the service catalogue.</p><div className={styles.tableScroll}><table className={styles.editorTable}><thead><tr><th>Property type</th><th>Price multiplier</th><th>Minimum (NGN)</th></tr></thead><tbody>{data.propertyTypes.map(type => <tr key={type.slug}><td>{type.name}</td><td><input aria-label={`${type.name} price multiplier`} type="number" min={0.1} max={10} step={0.01} required value={type.baseMultiplier} onChange={event => edit(current => ({...current,propertyTypes:current.propertyTypes.map(row => row.slug===type.slug ? {...row,baseMultiplier:Number(event.target.value)} : row)}))} /></td><td>{moneyField(type.minimumCharge,value => edit(current => ({...current,propertyTypes:current.propertyTypes.map(row => row.slug===type.slug ? {...row,minimumCharge:value} : row)})),`${type.name} minimum charge`)}</td></tr>)}</tbody></table></div><div className={styles.tableScroll}><table className={styles.editorTable}><thead><tr><th>Service area</th><th>Travel charge (NGN)</th></tr></thead><tbody>{data.serviceAreas.map(area => <tr key={area.slug}><td>{area.name}</td><td>{moneyField(area.surcharge,value => edit(current => ({...current,serviceAreas:current.serviceAreas.map(row => row.slug===area.slug ? {...row,surcharge:value} : row)})),`${area.name} travel charge`)}</td></tr>)}</tbody></table></div></div></details>
      </fieldset>
    </form>
  </>;
}
