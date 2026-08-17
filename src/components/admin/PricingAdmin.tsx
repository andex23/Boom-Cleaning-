"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import type { PricingAdminData } from "@/features/pricing/pricing-admin";
import styles from "./PricingAdmin.module.css";
import { adminErrorMessage, adminFetch, SESSION_EXPIRED_MESSAGE } from "./adminFetch";

type SaveState = "idle" | "saving" | "saved" | "error";

const priceKey = (serviceSlug: string, spaceSlug: string) => `${serviceSlug}::${spaceSlug}`;

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
        setSelectedService((current) => current || loaded.services[0]?.slug || "");
      } catch (loadFailure) {
        if (!cancelled) setLoadError(adminErrorMessage(loadFailure, "We couldn’t load pricing. Refresh to try again."));
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      <div><p className={styles.eyebrow}>PRICING</p><h2>What customers pay</h2><p className={styles.muted}>Changes apply to new quotes. Quotes already sent keep the prices they were created with.</p></div>
      <div className={styles.saveArea}>
        <button className={styles.save} onClick={save} disabled={saveState === "saving"}>{saveState === "saving" ? "Saving…" : "Save changes"}</button>
        {saveState === "saved" ? <small className={styles.ok}>Saved</small> : null}
        {saveState === "error" ? <small className={styles.error} role="alert">{saveError}</small> : null}
      </div>
    </header>

    <section className={styles.block}>
      <h3>Services</h3>
      <p className={styles.muted}>The base price covers the spaces marked as included below. A service set to “always quote” never returns an instant price.</p>
      <table className={styles.table}><thead><tr><th>Service</th><th>Base price</th><th>Minimum</th><th>Always quote</th></tr></thead>
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
      <p className={styles.muted}>A multiplier scales the whole job; the minimum keeps a small job in a demanding property profitable.</p>
      <table className={styles.table}><thead><tr><th>Property type</th><th>Multiplier</th><th>Minimum</th><th>Always quote</th></tr></thead>
        <tbody>{data.propertyTypes.map((type) => <tr key={type.slug}>
          <td>{type.name}</td>
          <td><input type="number" min={0.1} max={10} step={0.05} value={type.baseMultiplier} disabled={type.requiresReview} onChange={(event) => editPropertyType(type.slug, { baseMultiplier: Number(event.target.value) })} /></td>
          <td><input type="number" min={0} step={500} value={type.minimumCharge} disabled={type.requiresReview} onChange={(event) => editPropertyType(type.slug, { minimumCharge: Number(event.target.value) })} /></td>
          <td><input type="checkbox" checked={type.requiresReview} onChange={(event) => editPropertyType(type.slug, { requiresReview: event.target.checked })} /></td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className={styles.block}>
      <div className={styles.blockHead}>
        <div><h3>Space prices</h3><p className={styles.muted}>Per-unit prices for the service selected. A space left unpriced sends that scope to manual review instead of being cleaned for free.</p></div>
        <label className={styles.selectLabel}>Service
          <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>{data.services.map((service) => <option key={service.slug} value={service.slug}>{service.name}</option>)}</select>
        </label>
      </div>
      {activeService?.requiresReview ? <p className={styles.notice}>{activeService.name} is always quoted by a person, so space prices are not used.</p> : null}
      <table className={styles.table}><thead><tr><th>Space</th><th>Price each</th><th>Included in base</th><th>Status</th></tr></thead>
        <tbody>{data.spaceTypes.map((space) => {
          const price = data.spacePrices[priceKey(selectedService, space.slug)];
          return <tr key={space.slug}>
            <td>{space.name}</td>
            <td><input type="number" min={0} step={500} value={price?.unitPrice ?? 0} onChange={(event) => editSpacePrice(space.slug, { unitPrice: Number(event.target.value) })} /></td>
            <td><input type="number" min={0} step={1} value={price?.includedCount ?? 0} onChange={(event) => editSpacePrice(space.slug, { includedCount: Number(event.target.value) })} /></td>
            <td>{space.requiresReview ? <span className={styles.tagReview}>Site visit</span> : price ? <span className={styles.tagPriced}>{formatNaira(price.unitPrice)} each</span> : <span className={styles.tagReview}>Sent to review</span>}</td>
          </tr>;
        })}</tbody>
      </table>
    </section>

    <section className={styles.block}>
      <h3>Travel areas</h3>
      <table className={styles.table}><thead><tr><th>Area</th><th>Surcharge</th><th>Always quote</th></tr></thead>
        <tbody>{data.serviceAreas.map((area) => <tr key={area.slug}>
          <td>{area.name}</td>
          <td><input type="number" min={0} step={500} value={area.surcharge} disabled={area.requiresReview} onChange={(event) => editArea(area.slug, { surcharge: Number(event.target.value) })} /></td>
          <td><input type="checkbox" checked={area.requiresReview} onChange={(event) => editArea(area.slug, { requiresReview: event.target.checked })} /></td>
        </tr>)}</tbody>
      </table>
    </section>
  </article>;
}
