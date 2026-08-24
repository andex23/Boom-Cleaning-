"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import type { PricingAdminData } from "@/features/pricing/pricing-admin";
import styles from "./PricingAdmin.module.css";
import { adminErrorMessage, adminFetch, SESSION_EXPIRED_MESSAGE } from "./adminFetch";

type SaveState = "idle" | "saving" | "saved" | "error";

const priceKey = (serviceSlug: string, spaceSlug: string) => `${serviceSlug}::${spaceSlug}`;

/** 1.6 reads as "+60%"; 0.9 as "-10%". */
const toPercent = (multiplier: number) => Math.round((multiplier - 1) * 100);
const fromPercent = (percent: number) => Number((1 + percent / 100).toFixed(3));
const signed = (percent: number) => `${percent > 0 ? "+" : ""}${percent}%`;

/**
 * Lets staff change what customers pay without a deploy. Edits apply to new quotes only —
 * line items on existing quotes were frozen when those quotes were created.
 */
/** An expired session needs a way out, not just a red sentence. */
function AdminError({ message }: { message: string }) {
  const expired = message === SESSION_EXPIRED_MESSAGE;
  return <article className={styles.panel}>
    <p className={styles.error} role="alert">{message}</p>
    {expired ? <form action="/api/admin/logout" method="post"><button className={styles.save} type="submit">Sign in again</button></form> : null}
  </article>;
}

export function PricingAdmin() {
  const [data, setData] = useState<PricingAdminData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [selectedService, setSelectedService] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/pricing");
        if (!response.ok) throw new Error("load");
        const loaded = await response.json() as PricingAdminData;
        if (cancelled) return;
        setData(loaded);
        // Default to a service that can be priced, so the worked example has something to show.
        setSelectedService((current) => current || loaded.services.find((row) => !row.requiresReview)?.slug || loaded.services[0]?.slug || "");
      } catch (loadFailure) {
        if (!cancelled) setLoadError(adminErrorMessage(loadFailure, "We couldn’t load pricing. Refresh to try again."));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // A worked example turns abstract numbers into the answer staff actually care about:
  // what does a normal job cost after this edit?
  const example = useMemo(() => {
    if (!data || !selectedService) return null;
    const service = data.services.find((row) => row.slug === selectedService);
    const property = data.propertyTypes.find((row) => row.slug === "duplex") ?? data.propertyTypes[0];
    const area = data.serviceAreas.find((row) => !row.requiresReview) ?? data.serviceAreas[0];
    if (!service || !property || !area || service.requiresReview || property.requiresReview) return null;

    const rooms = [
      { slug: "bedroom", count: 3 }, { slug: "bathroom", count: 2 },
      { slug: "living-room", count: 1 }, { slug: "kitchen", count: 1 },
    ];
    let rooms_total = 0;
    const lines: { label: string; amount: number }[] = [];
    for (const room of rooms) {
      const price = data.spacePrices[priceKey(selectedService, room.slug)];
      const name = data.spaceTypes.find((t) => t.slug === room.slug)?.name ?? room.slug;
      if (!price) { lines.push({ label: `${room.count} × ${name} (quoted by hand)`, amount: 0 }); continue; }
      const chargeable = Math.max(0, room.count - price.includedCount);
      const amount = chargeable * price.unitPrice;
      rooms_total += amount;
      lines.push({ label: `${room.count} × ${name}${price.includedCount ? ` (${price.includedCount} free)` : ""}`, amount });
    }
    const beforeUplift = service.basePrice + rooms_total + area.surcharge;
    const uplifted = Math.round(beforeUplift * property.baseMultiplier);
    const floor = Math.max(service.minimumCharge, property.minimumCharge);
    const total = Math.max(uplifted, floor);
    return {
      serviceName: service.name, propertyName: property.name, areaName: area.name,
      basePrice: service.basePrice, lines, surcharge: area.surcharge,
      upliftPercent: toPercent(property.baseMultiplier), upliftAmount: uplifted - beforeUplift,
      floorApplied: total > uplifted, floor, total,
    };
  }, [data, selectedService]);

  const activeService = useMemo(() => data?.services.find((service) => service.slug === selectedService) ?? null, [data, selectedService]);

  const editService = (slug: string, patch: Partial<PricingAdminData["services"][number]>) =>
    setData((current) => current && ({ ...current, services: current.services.map((row) => row.slug === slug ? { ...row, ...patch } : row) }));

  const editPropertyType = (slug: string, patch: Partial<PricingAdminData["propertyTypes"][number]>) =>
    setData((current) => current && ({ ...current, propertyTypes: current.propertyTypes.map((row) => row.slug === slug ? { ...row, ...patch } : row) }));

  const editArea = (slug: string, patch: Partial<PricingAdminData["serviceAreas"][number]>) =>
    setData((current) => current && ({ ...current, serviceAreas: current.serviceAreas.map((row) => row.slug === slug ? { ...row, ...patch } : row) }));

  const editSpacePrice = (spaceSlug: string, patch: Partial<{ unitPrice: number; includedCount: number }>) =>
    setData((current) => {
      if (!current || !selectedService) return current;
      const key = priceKey(selectedService, spaceSlug);
      const existing = current.spacePrices[key] ?? { unitPrice: 0, includedCount: 0 };
      return { ...current, spacePrices: { ...current.spacePrices, [key]: { ...existing, ...patch } } };
    });

  const save = async () => {
    if (!data) return;
    setSaveState("saving");
    setSaveError("");
    try {
      const response = await adminFetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: data.services.map(({ slug, basePrice, minimumCharge, requiresReview }) => ({ slug, basePrice, minimumCharge, requiresReview })),
          propertyTypes: data.propertyTypes.map(({ slug, baseMultiplier, minimumCharge, requiresReview }) => ({ slug, baseMultiplier, minimumCharge, requiresReview })),
          serviceAreas: data.serviceAreas.map(({ slug, surcharge, requiresReview }) => ({ slug, surcharge, requiresReview })),
          spacePrices: Object.entries(data.spacePrices).map(([key, value]) => {
            const [serviceSlug, spaceSlug] = key.split("::");
            return { serviceSlug, spaceSlug, unitPrice: value.unitPrice, includedCount: value.includedCount };
          }),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "We couldn’t save these prices.");
      }
      setData(await response.json() as PricingAdminData);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setSaveError(adminErrorMessage(error, error instanceof Error ? error.message : "We couldn’t save these prices."));
    }
  };

  if (loadError) return <AdminError message={loadError} />;
  if (!data) return <article className={styles.panel}><p className={styles.muted}>Loading pricing…</p></article>;

  return <article className={styles.panel}>
    <header className={styles.head}>
      <div><p className={styles.eyebrow}>PRICING</p><h2>What customers pay</h2><p className={styles.muted}>Change any number here and new quotes use it straight away. Bookings customers already made keep the price they were given.</p></div>
      <div className={styles.saveArea}>
        <button className={styles.save} onClick={save} disabled={saveState === "saving"}>{saveState === "saving" ? "Saving…" : "Save changes"}</button>
        {saveState === "saved" ? <small className={styles.ok}>Saved</small> : null}
        {saveState === "error" ? <small className={styles.error} role="alert">{saveError}</small> : null}
      </div>
    </header>

    {example ? <section className={styles.example}>
      <h3>What a typical job costs right now</h3>
      <p>A 3-bedroom {example.propertyName.toLowerCase()} in {example.areaName}, booked for {example.serviceName.toLowerCase()}.</p>
      <ul>
        <li><span>Starting price</span><span>{formatNaira(example.basePrice)}</span></li>
        {example.lines.map((line) => <li key={line.label}><span>{line.label}</span><span>{formatNaira(line.amount)}</span></li>)}
        {example.surcharge > 0 ? <li><span>Travel to {example.areaName}</span><span>{formatNaira(example.surcharge)}</span></li> : null}
        {example.upliftPercent !== 0 ? <li><span>{example.propertyName} is {signed(example.upliftPercent)}</span><span>{formatNaira(example.upliftAmount)}</span></li> : null}
        {example.floorApplied ? <li><span>Brought up to your minimum of {formatNaira(example.floor)}</span><span /></li> : null}
        <li className={styles.exampleTotal}><span>Customer pays</span><span>{formatNaira(example.total)}</span></li>
      </ul>
      <small>This updates as you edit. Nothing is saved until you press Save changes.</small>
    </section> : null}

    <section className={styles.block}>
      <h3>Services</h3>
      <p className={styles.muted}>The starting price covers the rooms marked “included” further down. Tick “always quote by hand” for work you never want priced automatically — the customer is told your team will confirm the price.</p>
      <table className={styles.table}><thead><tr><th>Service</th><th>Starting price</th><th>Never charge less than</th><th>Always quote by hand</th></tr></thead>
        <tbody>{data.services.map((service) => <tr key={service.slug}>
          <td>{service.name}</td>
          <td><input type="number" min={0} step={500} value={service.basePrice} disabled={service.requiresReview} onChange={(event) => editService(service.slug, { basePrice: Number(event.target.value) })} /></td>
          <td><input type="number" min={0} step={500} value={service.minimumCharge} disabled={service.requiresReview} onChange={(event) => editService(service.slug, { minimumCharge: Number(event.target.value) })} /></td>
          <td><input type="checkbox" checked={service.requiresReview} onChange={(event) => editService(service.slug, { requiresReview: event.target.checked })} /></td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className={styles.block}>
      <h3>Property types</h3>
      <p className={styles.muted}>Some properties are simply harder work. A penthouse set to <strong>+60%</strong> costs 60% more than the same rooms in an apartment. Set it to <strong>0%</strong> to charge the standard price. The “never charge less than” amount protects you on small jobs in demanding properties.</p>
      <table className={styles.table}><thead><tr><th>Property type</th><th>Price change</th><th>Never charge less than</th><th>Always quote by hand</th></tr></thead>
        <tbody>{data.propertyTypes.map((type) => <tr key={type.slug}>
          <td>{type.name}</td>
          <td><span className={styles.percentField}>
            <input type="number" min={-90} max={400} step={5} value={toPercent(type.baseMultiplier)} disabled={type.requiresReview}
              onChange={(event) => editPropertyType(type.slug, { baseMultiplier: fromPercent(Number(event.target.value)) })} />
            <small>{type.requiresReview ? "—" : signed(toPercent(type.baseMultiplier))}</small>
          </span></td>
          <td><input type="number" min={0} step={500} value={type.minimumCharge} disabled={type.requiresReview} onChange={(event) => editPropertyType(type.slug, { minimumCharge: Number(event.target.value) })} /></td>
          <td><input type="checkbox" checked={type.requiresReview} onChange={(event) => editPropertyType(type.slug, { requiresReview: event.target.checked })} /></td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className={styles.block}>
      <div className={styles.blockHead}>
        <div><h3>Space prices</h3><p className={styles.muted}>What each extra room costs for the service you pick on the right. Leave a room at 0 and it is <strong>not</strong> free — the whole job is sent to your team to quote by hand instead.</p></div>
        <label className={styles.selectLabel}>Service
          <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>{data.services.map((service) => <option key={service.slug} value={service.slug}>{service.name}</option>)}</select>
        </label>
      </div>
      {activeService?.requiresReview ? <p className={styles.notice}>{activeService.name} is always quoted by hand, so these prices are never used.</p> : null}
      <table className={styles.table}><thead><tr><th>Room or area</th><th>Price for each one</th><th>How many are free</th><th>What the customer sees</th></tr></thead>
        <tbody>{data.spaceTypes.map((space) => {
          const price = data.spacePrices[priceKey(selectedService, space.slug)];
          return <tr key={space.slug}>
            <td>{space.name}</td>
            <td><input type="number" min={0} step={500} value={price?.unitPrice ?? 0} onChange={(event) => editSpacePrice(space.slug, { unitPrice: Number(event.target.value) })} /></td>
            <td><input type="number" min={0} step={1} value={price?.includedCount ?? 0} onChange={(event) => editSpacePrice(space.slug, { includedCount: Number(event.target.value) })} /></td>
            <td>{space.requiresReview ? <span className={styles.tagReview}>Needs a site visit</span> : price ? <span className={styles.tagPriced}>{formatNaira(price.unitPrice)} each</span> : <span className={styles.tagReview}>Quoted by hand</span>}</td>
          </tr>;
        })}</tbody>
      </table>
    </section>

    <section className={styles.block}>
      <h3>Travel charges</h3>
      <table className={styles.table}><thead><tr><th>Area</th><th>Added to every job</th><th>Always quote by hand</th></tr></thead>
        <tbody>{data.serviceAreas.map((area) => <tr key={area.slug}>
          <td>{area.name}</td>
          <td><input type="number" min={0} step={500} value={area.surcharge} disabled={area.requiresReview} onChange={(event) => editArea(area.slug, { surcharge: Number(event.target.value) })} /></td>
          <td><input type="checkbox" checked={area.requiresReview} onChange={(event) => editArea(area.slug, { requiresReview: event.target.checked })} /></td>
        </tr>)}</tbody>
      </table>
    </section>
  </article>;
}
