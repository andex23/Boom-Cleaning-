"use client";

import Image from "next/image";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatNaira, formatNairaDelta, formatSlotTime } from "@/lib/format";
import type { PublicServiceView } from "@/features/services/public-catalog";
import { saveStoredBooking, type StoredBooking } from "@/lib/booking-store";
import { pricingCatalogSchema, quoteResultSchema, type PricingCatalog, type QuoteResult, type SpaceTypeOption } from "@/lib/validation/pricing";
import { publicBookingPayloadSchema, publicBookingResponseSchema } from "@/lib/validation/public-booking";
import { BookingCalendar } from "./BookingCalendar";
import { ServiceIcon } from "./ServiceIcon";
import { BrandLoader } from "@/components/brand/BrandLoader";
import styles from "./QuoteFlow.module.css";
import bookingStyles from "./QuoteReview.module.css";
import { Arrow } from "@/components/brand/Arrow";

type FormState = { serviceSlug: string; propertyTypeSlug: string; areaSlug: string; address: string; preferredDate: string; timeSlot: string; name: string; phone: string; email: string; notes: string };
const steps = ["Service", "Your space", "Book a time", "Contact", "Review"];
const dateFormatter = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function displayDate(value: string) {
  return value ? dateFormatter.format(new Date(`${value}T12:00:00`)) : "Not selected";
}

const postConstructionQuestions: Record<string, string> = {
  "living-room": "How many living rooms?",
  storey: "How many storeys does the building have?",
  "boys-quarters": "Does it have a BQ? If yes, how many rooms?",
  "penthouse-area": "Does it have a penthouse?",
  "extra-room": "Any extra rooms, such as a library, mini office or laundry room?",
};

function spacePriceText(space: SpaceTypeOption, count: number) {
  if (space.slug === "compound-wash") return "₦70,000–₦100,000 for about 500sqm · confirmed after scope";
  if (space.priceTiers.length) {
    const selected = space.priceTiers.find((tier) => tier.quantity === count);
    if (selected) return formatNaira(selected.price);
    if (count > 0) return `Quoted individually above ${space.priceTiers.at(-1)?.quantity ?? 0}`;
    return space.priceTiers.map((tier) => `${tier.quantity} room${tier.quantity === 1 ? "" : "s"} ${formatNaira(tier.price)}`).join(" · ");
  }
  if (space.requiresReview) return "Confirmed after scope review";
  if (space.includedCount > 0 && count <= space.includedCount) return "Included";
  return space.unitPrice ? `${formatNaira(space.unitPrice)} each` : "Confirmed after scope review";
}

/**
 * Turns a failed booking into something a customer can act on. A generic "try again" wastes
 * their time when the real problem is a taken slot or a detail they can correct.
 */
async function bookingErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  const serverMessage = typeof body?.error === "string" ? body.error : null;
  switch (response.status) {
    case 409: return "That time has just been taken. Please choose another slot and try again.";
    case 429: return "That’s a few booking attempts in a row. Please wait a few minutes, then try again.";
    case 422: return serverMessage ?? "Some of these details can’t be accepted. Please check them and try again.";
    case 413: return "That request was too large. Please shorten the notes and try again.";
    case 403: return "Your session expired while you were booking. Please refresh the page and try again.";
    case 500: case 502: case 503: case 504:
      return "We can’t reach our booking system right now. Your details are still here — please try again in a moment.";
    default: return serverMessage ?? "We couldn’t create your booking. Please try again.";
  }
}

export function QuoteFlow({ services, initialService, logoSrc, logoSrcOnLight }: { services: PublicServiceView[]; initialService?: string; logoSrc: string; logoSrcOnLight: string }) {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Both the catalogue and the quote are tagged with the inputs that produced them, so
  // staleness is derived rather than cleared — no synchronous setState in an effect body.
  const [catalogState, setCatalogState] = useState<{ serviceSlug: string; data: PricingCatalog } | null>(null);
  const [spaceCounts, setSpaceCounts] = useState<Record<string, number>>({});
  const [quoteState, setQuoteState] = useState<{ key: string; result: QuoteResult } | null>(null);
  const [quoteFailedKey, setQuoteFailedKey] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [confirmedQuote, setConfirmedQuote] = useState<QuoteResult | null>(null);

  const [form, setForm] = useState<FormState>({
    // Default to a service that can actually be quoted, so the first thing a visitor sees
    // is a live price rather than "Custom scope".
    serviceSlug: services.find((item) => item.slug === initialService)?.slug
      ?? services.find((item) => !item.requiresReview)?.slug
      ?? services[0]?.slug ?? "",
    propertyTypeSlug: "", areaSlug: "", address: "", preferredDate: "", timeSlot: "", name: "", phone: "", email: "", notes: "",
  });
  const service = useMemo(() => services.find((item) => item.slug === form.serviceSlug), [services, form.serviceSlug]);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const spaces = useMemo(
    () => Object.entries(spaceCounts).filter(([, count]) => count > 0).map(([slug, count]) => ({ slug, count })),
    [spaceCounts],
  );
  const hasScope = spaces.length > 0;

  // A catalogue loaded for a different service is stale, not current.
  const catalog = catalogState?.serviceSlug === form.serviceSlug ? catalogState.data : null;
  const quoteKey = useMemo(
    () => JSON.stringify([form.serviceSlug, form.propertyTypeSlug, form.areaSlug, spaces]),
    [form.serviceSlug, form.propertyTypeSlug, form.areaSlug, spaces],
  );
  const quote = quoteState?.key === quoteKey ? quoteState.result : null;
  // Bedrooms get their own slider. Quantity-tiered extras (for example fumigation BQ
  // rooms) stay visible even when the main service price comes from a bedroom table.
  const bedroomType = catalog?.spaceTypes.find((space) => space.slug === "bedroom") ?? null;
  const usesTiers = catalog?.usesBedroomTiers ?? false;
  const otherSpaceTypes = catalog?.spaceTypes.filter((space) => space.slug !== "bedroom") ?? [];
  const isPostConstruction = form.serviceSlug === "post-construction-cleaning";
  const compoundTypes = otherSpaceTypes.filter((space) => space.slug === "compound-sweep" || space.slug === "compound-wash");
  const scopeSpaceTypes = otherSpaceTypes.filter((space) => space.slug !== "compound-sweep" && space.slug !== "compound-wash");
  const tierPrice = usesTiers ? catalog?.bedroomTiers.find((tier) => tier.bedrooms === (spaceCounts["bedroom"] ?? 0))?.price ?? null : null;
  const extrasCount = otherSpaceTypes.reduce((total, space) => total + (spaceCounts[space.slug] ?? 0), 0);
  const compoundChoice = (spaceCounts["compound-wash"] ?? 0) > 0 ? "compound-wash" : (spaceCounts["compound-sweep"] ?? 0) > 0 ? "compound-sweep" : "none";

  const canPrice = Boolean(catalog && form.propertyTypeSlug && form.areaSlug);
  const quoteFailed = canPrice && quoteFailedKey === quoteKey;
  const isPricing = canPrice && !quote && !quoteFailed;

  // Options depend on the service: a gazebo is priced differently for a deep clean than
  // after construction, and some services do not price by space at all.
  useEffect(() => {
    if (!form.serviceSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/quote?service=${encodeURIComponent(form.serviceSlug)}`);
        if (!response.ok) throw new Error(response.status === 404 ? "This service isn’t available for booking right now. Please choose another, or call us." : "We couldn’t load the options for this service.");
        const parsed = pricingCatalogSchema.safeParse(await response.json());
        if (cancelled) return;
        if (!parsed.success) throw new Error("We couldn’t read the options for this service. Please refresh the page.");
        setCatalogError("");
        setCatalogState({ serviceSlug: form.serviceSlug, data: parsed.data });
        // Start from what the base price already covers, so the first number a customer
        // sees matches the "from" price they clicked.
        setSpaceCounts(Object.fromEntries(parsed.data.spaceTypes.map((space) =>
          [space.slug, parsed.data.usesBedroomTiers && space.slug === "bedroom" ? 1 : space.includedCount])));
        setForm((current) => ({
          ...current,
          propertyTypeSlug: parsed.data.propertyTypes.some((type) => type.slug === current.propertyTypeSlug) ? current.propertyTypeSlug : parsed.data.propertyTypes[0]?.slug ?? "",
          areaSlug: parsed.data.serviceAreas.some((area) => area.slug === current.areaSlug) ? current.areaSlug : parsed.data.serviceAreas[0]?.slug ?? "",
        }));
      } catch (loadError) {
        if (cancelled) return;
        setCatalogError(loadError instanceof TypeError
          ? "We couldn’t reach BOOM. Please check your internet connection."
          : loadError instanceof Error ? loadError.message : "We couldn’t load the options for this service.");
      }
    })();
    return () => { cancelled = true; };
  }, [form.serviceSlug, catalogAttempt]);

  // Every price shown comes from the server, so the estimate and the amount charged are
  // produced by the same calculation.
  useEffect(() => {
    if (!canPrice) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceSlug: form.serviceSlug, propertyTypeSlug: form.propertyTypeSlug, areaSlug: form.areaSlug, spaces }),
        });
        if (!response.ok) throw new Error(String(response.status));
        const parsed = quoteResultSchema.safeParse(await response.json());
        if (cancelled) return;
        if (parsed.success) setQuoteState({ key: quoteKey, result: parsed.data });
        else setQuoteFailedKey(quoteKey);
      } catch {
        if (!cancelled) setQuoteFailedKey(quoteKey);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [canPrice, quoteKey, form.serviceSlug, form.propertyTypeSlug, form.areaSlug, spaces]);

  const setSpaceCount = useCallback((slug: string, count: number, maxCount: number) => {
    setSpaceCounts((current) => {
      const next = { ...current, [slug]: Math.max(0, Math.min(maxCount, count)) };
      if (slug === "compound-sweep" && count > 0) next["compound-wash"] = 0;
      if (slug === "compound-wash" && count > 0) next["compound-sweep"] = 0;
      return next;
    });
  }, []);

  const setCompoundChoice = useCallback((slug: "none" | "compound-sweep" | "compound-wash") => {
    setSpaceCounts((current) => ({
      ...current,
      "compound-sweep": slug === "compound-sweep" ? 1 : 0,
      "compound-wash": slug === "compound-wash" ? 1 : 0,
    }));
  }, []);

  const validate = () => {
    if (step === 0 && !form.serviceSlug) return "Choose the service you need.";
    if (step === 1 && !form.propertyTypeSlug) return "Tell us what type of property this is.";
    if (step === 1 && !hasScope) return "Add at least one room or area so we can price the service.";
    if (step === 2 && (!form.areaSlug || !form.address.trim() || !form.preferredDate || !form.timeSlot)) return "Choose your area, an available date and time, then add the service address.";
    if (step === 3 && (!form.name.trim() || !form.phone.trim() || !form.email.includes("@"))) return "Please enter your name, phone number and a valid email.";
    return "";
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    // Each step is a different height; without this the viewport stays where the previous
    // step was scrolled to and the customer sees an empty screen.
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const next = () => {
    const message = validate();
    if (message) { setError(message); return; }
    setError("");
    goToStep(Math.min(step + 1, steps.length - 1));
  };

  const startNewBooking = () => {
    setBooking(null);
    setConfirmedQuote(null);
    setError("");
    setSpaceCounts({});
    setQuoteState(null);
    setQuoteFailedKey(null);
    setExtrasOpen(false);
    setForm((current) => ({
      // Keep the chosen service so the catalogue reload repopulates sensible defaults.
      serviceSlug: current.serviceSlug,
      propertyTypeSlug: current.propertyTypeSlug, areaSlug: current.areaSlug,
      address: "", preferredDate: "", timeSlot: "", name: "", phone: "", email: "", notes: "",
    }));
    setCatalogAttempt((n) => n + 1);
    goToStep(0);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !service) return;
    // No amount is sent: the database prices the scope inside the booking transaction.
    const payload = publicBookingPayloadSchema.safeParse({
      serviceSlug: form.serviceSlug, propertyTypeSlug: form.propertyTypeSlug, areaSlug: form.areaSlug, spaces,
      address: form.address, date: form.preferredDate, time: form.timeSlot,
      name: form.name, phone: form.phone, email: form.email, notes: form.notes,
    });
    if (!payload.success) {
      setError("Please review the booking details and try again.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload.data) });
      if (!response.ok) throw new Error(await bookingErrorMessage(response));

      const result = publicBookingResponseSchema.safeParse(await response.json().catch(() => null));
      if (!result.success) throw new Error("Your booking may have gone through, but we couldn’t read the confirmation. Please check your email before booking again, or call us.");

      const confirmed: StoredBooking = {
        id: result.data.booking.id, createdAt: result.data.booking.createdAt,
        customer: payload.data.name, phone: payload.data.phone, email: payload.data.email,
        service: service.name, serviceSlug: service.slug, address: payload.data.address,
        date: payload.data.date, time: payload.data.time,
        amount: result.data.booking.amount, status: result.data.booking.status,
      };
      saveStoredBooking(confirmed);
      setConfirmedQuote(quote);
      setBooking(confirmed);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch (submissionError) {
      // A thrown TypeError here is fetch failing to reach the server at all.
      setError(submissionError instanceof TypeError
        ? "We couldn’t reach BOOM. Please check your internet connection and try again."
        : submissionError instanceof Error ? submissionError.message : "We couldn’t create your booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (booking) {
    const inReview = booking.status === "REVIEW_REQUIRED";
    return <section className={styles.success} aria-live="polite">
      <div className={styles.successInner}>
        {/* The navy aside carried the brand through the flow and disappears here, so the
            confirmation re-establishes it rather than landing the customer on a bare page. */}
        <Link href="/" className={styles.successBrand} aria-label="BOOM Cleaning Services home">
          <Image src={logoSrcOnLight} alt="BOOM Cleaning Services" width={132} height={44} priority />
        </Link>
        <div className={styles.check}>✓</div>
        <p className={styles.eyebrow}>{inReview ? "REQUEST RECEIVED" : "BOOKING RECEIVED"}</p>
        <h1>{inReview ? "We’re preparing your quote." : "Your slot is reserved."}</h1>
        <p className={styles.successLead}>{inReview
          ? "Your time is held. Your space includes scope we price individually, so a BOOM team member will confirm the final amount before any payment."
          : "We’ve received your booking and held your time. BOOM will confirm the details before your appointment."}</p>

        <div className={bookingStyles.confirmationCard}>
          <div><span>Booking reference</span><strong>{booking.id}</strong></div>
          <dl>
            <div><dt>Service</dt><dd>{booking.service}</dd></div>
            <div><dt>Date</dt><dd>{displayDate(booking.date)}</dd></div>
            <div><dt>Arrival</dt><dd>{formatSlotTime(booking.time)}</dd></div>
            <div><dt>Address</dt><dd>{booking.address}</dd></div>
            <div><dt>Contact</dt><dd>{booking.customer} · {booking.phone}</dd></div>
            <div><dt>Total</dt><dd>{booking.amount === null ? "To be confirmed" : formatNaira(booking.amount)}</dd></div>
          </dl>
        </div>

        {confirmedQuote && !inReview && confirmedQuote.items.length ? <div className={styles.successBreakdown}>
          <h2>How this price was worked out</h2>
          <ul className={styles.breakdown}>
            {confirmedQuote.items.map((item) => <li key={`${item.kind}-${item.sortOrder}`}>
              <span>{item.label}</span>
              <span>{item.kind === "PROPERTY_MULTIPLIER" ? formatNairaDelta(item.amount) : formatNaira(item.amount)}</span>
            </li>)}
            <li className={styles.breakdownTotal}><span>Total</span><span>{booking.amount === null ? "—" : formatNaira(booking.amount)}</span></li>
          </ul>
        </div> : null}

        {inReview && confirmedQuote?.reviewReasons.length ? <div className={styles.reviewNotice}>
          <strong>Why we’re quoting this personally</strong>
          <ul>{confirmedQuote.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div> : null}

        <div className={styles.nextSteps}>
          <h2>What happens next</h2>
          <ol>
            <li><strong>We confirm your scope</strong><span>{inReview ? "A team member reviews your space and prepares your price." : "We check the details and your arrival window."}</span></li>
            <li><strong>You hear from us</strong><span>We’ll reach {booking.email} or {booking.phone}{inReview ? " with your final quote." : " to confirm."}</span></li>
            <li><strong>Your team arrives</strong><span>{displayDate(booking.date)} at {formatSlotTime(booking.time)}.</span></li>
          </ol>
        </div>

        <p className={styles.successHelp}>Something not right? <a href="tel:+2349029799205">Call BOOM</a> and quote {booking.id}.</p>

        <div className={bookingStyles.successActions}>
          <Link className={styles.primaryButton} href="/">Return home</Link>
          <button className={styles.secondaryButton} onClick={startNewBooking}>Book another service</button>
        </div>
      </div>
    </section>;
  }

  const priceLabel = !hasScope && step > 0 ? "Add your rooms" : isPricing ? "Pricing…" : quote?.requiresReview ? "Scope review" : quote?.total !== null && quote?.total !== undefined ? formatNaira(quote.total) : "—";

  return <section className={styles.shell} aria-labelledby="quote-title">
    <aside className={styles.aside}><Link href="/" className={styles.brand} aria-label="BOOM Cleaning Services home"><Image src={logoSrc} alt="BOOM Cleaning Services" width={132} height={44} priority /></Link><div className={styles.asideCopy}><p className={styles.eyebrow}>Quote and booking</p><h1 id="quote-title">Choose your clean. Book your time.</h1><p>Describe your space exactly as it is — every room, and the extras too — and see a transparent estimate before you book.</p></div><ol className={styles.steps}>{steps.map((label, index) => <li key={label} className={index === step ? styles.current : index < step ? styles.complete : ""}><span>{index < step ? "✓" : `0${index + 1}`}</span>{label}</li>)}</ol>{step > 0 ? <div className={styles.asideEstimate}><span>{quote?.requiresReview && hasScope ? "Your quote" : "Estimated total"}</span><strong>{priceLabel}</strong>{quote?.requiresReview && hasScope ? <small>A BOOM team member will confirm your price.</small> : quote?.depositAmount ? <small>{formatNaira(quote.depositAmount)} due in full to reserve</small> : null}</div> : null}<p className={styles.support}>Need help? <a href="tel:+2349029799205">Speak to BOOM</a></p></aside>

    <form className={`${styles.form} ${step === 2 ? bookingStyles.calendarForm : ""}`} onSubmit={submit} noValidate aria-busy={isSubmitting}>
      {isSubmitting ? <div className={styles.bookingLoader}>
        <BrandLoader logoSrc={logoSrc} label="Securing your booking" compact />
        <p>Please keep this page open while BOOM confirms your request.</p>
      </div> : null}
      <div className={styles.formTop}><div><p className={styles.mobileStep}>Step {step + 1} of {steps.length}</p><h2>{steps[step]}</h2></div><p className={styles.progress}>{Math.round(((step + 1) / steps.length) * 100)}%</p></div>

      {step === 0 ? <fieldset className={styles.options}><legend>What kind of care do you need?</legend><div className={styles.serviceGrid}>{services.map((item) => <label key={item.id} className={`${styles.serviceOption} ${form.serviceSlug === item.slug ? styles.selected : ""}`}><input type="radio" name="service" value={item.slug} checked={form.serviceSlug === item.slug} onChange={() => update("serviceSlug", item.slug)} /><span className={styles.optionIcon}><ServiceIcon icon={item.icon} /></span><span><strong>{item.name}</strong><small>{item.priceLabel}</small></span></label>)}</div></fieldset> : null}

      {step === 1 ? <div className={styles.fields}>
        {catalogError ? <div className={styles.errorPanel} role="alert"><p>{catalogError}</p><button type="button" onClick={() => { setCatalogError(""); setCatalogAttempt((n) => n + 1); }}>Try again</button></div>
        : !catalog ? <p className={styles.help}>Loading options for {service?.name ?? "this service"}…</p> : <>
          <fieldset><legend>What type of property is it?</legend><div className={styles.pills}>{catalog.propertyTypes.map((type) => <label className={form.propertyTypeSlug === type.slug ? styles.activePill : ""} key={type.slug} title={type.description ?? undefined}><input type="radio" name="property" value={type.slug} checked={form.propertyTypeSlug === type.slug} onChange={() => update("propertyTypeSlug", type.slug)} />{type.name}</label>)}</div></fieldset>

          {bedroomType ? <label className={styles.rangeLabel}>
            <span className={styles.rangeTitle}>{isPostConstruction ? "How many bedrooms?" : "Bedrooms"}</span>
            <strong>{spaceCounts[bedroomType.slug] ?? 0}{tierPrice !== null ? <em className={styles.tierPrice}>{formatNaira(tierPrice)}</em> : null}</strong>
            <input
              type="range" min={0} max={bedroomType.maxCount} step={1}
              value={spaceCounts[bedroomType.slug] ?? 0}
              aria-label="Number of bedrooms"
              onChange={(event) => setSpaceCount(bedroomType.slug, Number(event.target.value), bedroomType.maxCount)}
            />
            <span>0</span><span>{bedroomType.maxCount}</span>
          </label> : null}

          {isPostConstruction && otherSpaceTypes.length ? <div className={styles.scopeQuestions}>
            <div><strong>Complete the building scope</strong><p className={styles.help}>Use zero where an area does not apply. Your estimate updates as you answer.</p></div>
            <ul className={styles.spaceList}>{scopeSpaceTypes.map((space) => {
              const count = spaceCounts[space.slug] ?? 0;
              return <li key={space.slug} className={count > 0 ? styles.spaceRowActive : styles.spaceRow}>
                <div className={styles.spaceLabel}><strong>{postConstructionQuestions[space.slug] ?? space.name}</strong><small>{spacePriceText(space, count)}</small></div>
                <div className={styles.stepper}>
                  <button type="button" aria-label={`Remove one ${space.name}`} disabled={count === 0} onClick={() => setSpaceCount(space.slug, count - 1, space.maxCount)}>−</button>
                  <output aria-live="off">{count}</output>
                  <button type="button" aria-label={`Add one ${space.name}`} disabled={count >= space.maxCount} onClick={() => setSpaceCount(space.slug, count + 1, space.maxCount)}>+</button>
                </div>
              </li>;
            })}</ul>
            {compoundTypes.length ? <fieldset className={styles.compoundChoice}>
              <legend>Do you want the compound washed or just swept?</legend>
              <div className={styles.pills}>
                <label className={compoundChoice === "none" ? styles.activePill : ""}><input type="radio" name="compound" checked={compoundChoice === "none"} onChange={() => setCompoundChoice("none")} />Neither</label>
                {compoundTypes.map((space) => <label className={compoundChoice === space.slug ? styles.activePill : ""} key={space.slug} title={space.description ?? undefined}>
                  <input type="radio" name="compound" checked={compoundChoice === space.slug} onChange={() => setCompoundChoice(space.slug as "compound-sweep" | "compound-wash")} />
                  {space.slug === "compound-sweep" ? "Sweep · ₦20,000" : "Wash · ₦70,000–₦100,000"}
                </label>)}
              </div>
              {compoundChoice === "compound-wash" ? <p className={styles.help}>The washing range is for a typical 500sqm property. BOOM will confirm the final amount from the condition and scope.</p> : null}
            </fieldset> : null}
          </div> : otherSpaceTypes.length === 0 ? null : <details className={styles.extras} open={extrasOpen} onToggle={(event) => setExtrasOpen((event.currentTarget as HTMLDetailsElement).open)}>
            <summary>
              <span className={styles.extrasTitle}>{form.serviceSlug === "fumigation" ? "BQ rooms" : "Bathrooms, living areas and extras"}</span>
              <span className={styles.extrasMeta}>{extrasCount ? `${extrasCount} counted` : "None yet"}<i aria-hidden="true">⌄</i></span>
            </summary>
            <p className={styles.help}>{form.serviceSlug === "fumigation" ? "Add BQ rooms attached to the property." : "Count every other area you’d like cleaned, including outdoor spaces like a gazebo, BQ or terrace."}</p>
            <ul className={styles.spaceList}>{otherSpaceTypes.map((space) => {
              const count = spaceCounts[space.slug] ?? 0;
              return <li key={space.slug} className={count > 0 ? styles.spaceRowActive : styles.spaceRow}>
                <div className={styles.spaceLabel}><strong>{space.name}</strong><small>{spacePriceText(space, count)}</small></div>
                <div className={styles.stepper}>
                  <button type="button" aria-label={`Remove one ${space.name}`} disabled={count === 0} onClick={() => setSpaceCount(space.slug, count - 1, space.maxCount)}>−</button>
                  <output aria-live="off">{count}</output>
                  <button type="button" aria-label={`Add one ${space.name}`} disabled={count >= space.maxCount} onClick={() => setSpaceCount(space.slug, count + 1, space.maxCount)}>+</button>
                </div>
              </li>;
            })}</ul>
          </details>}

          {quoteFailed ? <div className={styles.errorPanel} role="alert"><p>We couldn’t work out a price for this just now. You can keep going and we’ll confirm your price by phone, or adjust a room count to try again.</p></div> : null}
          {hasScope && quote?.requiresReview && quote.reviewReasons.length ? <div className={styles.reviewNotice}><strong>We’ll quote this one personally.</strong><ul>{quote.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>You can still book a time — we’ll confirm the price before any payment.</p></div> : null}
        </>}
        <label className={styles.textField}>Anything we should know?<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="For example: pets, stair access, priority rooms…" rows={4} /></label>
      </div> : null}

      {step === 2 ? <div className={styles.fields}><fieldset><legend>Where is the service?</legend><div className={styles.pills}>{(catalog?.serviceAreas ?? []).map((area) => <label className={form.areaSlug === area.slug ? styles.activePill : ""} key={area.slug}><input type="radio" name="location" value={area.slug} checked={form.areaSlug === area.slug} onChange={() => update("areaSlug", area.slug)} />{area.name}</label>)}</div></fieldset><label className={styles.textField}>Service address <input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, estate or landmark" autoComplete="street-address" /></label><BookingCalendar serviceSlug={form.serviceSlug} selectedDate={form.preferredDate} selectedTime={form.timeSlot} onDateChange={(value) => update("preferredDate", value)} onTimeChange={(value) => update("timeSlot", value)} /></div> : null}

      {step === 3 ? <div className={styles.fields}><p className={styles.help}>Who should receive the booking confirmation and arrival updates?</p><div className={styles.split}><label className={styles.textField}>Full name <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" placeholder="Your name" /></label><label className={styles.textField}>Phone number <input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" placeholder="0800 000 0000" /></label></div><label className={styles.textField}>Email address <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" placeholder="you@example.com" /></label></div> : null}

      {step === 4 ? <div className={bookingStyles.review}>
        <div className={bookingStyles.reviewHeading}><div><p>Nothing is booked yet</p><h3>{service?.name}</h3></div><strong>{priceLabel}</strong></div>
        <p className={styles.help}>Check the details below, then send your request.</p>

        {quote && !quote.requiresReview && quote.items.length ? <ul className={styles.breakdown}>{quote.items.map((item) => <li key={`${item.kind}-${item.sortOrder}`}><span>{item.label}</span><span>{item.kind === "PROPERTY_MULTIPLIER" ? formatNairaDelta(item.amount) : formatNaira(item.amount)}</span></li>)}<li className={styles.breakdownTotal}><span>Total</span><span>{quote.total === null ? "—" : formatNaira(quote.total)}</span></li></ul> : null}

        {quote?.requiresReview ? <div className={styles.reviewNotice}><strong>Your price will be confirmed by our team.</strong><ul>{quote.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}

        <dl><div><dt>Date</dt><dd>{displayDate(form.preferredDate)}</dd></div><div><dt>Arrival time</dt><dd>{formatSlotTime(form.timeSlot)}</dd></div><div><dt>Property</dt><dd>{catalog?.propertyTypes.find((type) => type.slug === form.propertyTypeSlug)?.name ?? form.propertyTypeSlug}</dd></div><div><dt>Spaces</dt><dd>{spaces.length ? spaces.map((space) => `${space.count} × ${catalog?.spaceTypes.find((type) => type.slug === space.slug)?.name ?? space.slug}`).join(", ") : "Not specified"}</dd></div><div><dt>Address</dt><dd>{form.address}</dd></div><div><dt>Customer</dt><dd>{form.name} · {form.phone}</dd></div></dl>

        <div className={bookingStyles.paymentNote}><span>₦</span><p><strong>Payment is not taken in this flow.</strong>{quote?.requiresReview ? " BOOM will confirm your scope and price before reserving a team." : " BOOM will confirm availability, then take payment in full to reserve your appointment."}</p></div>
      </div> : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.controls}>{step > 0 ? <button type="button" className={styles.back} disabled={isSubmitting} onClick={() => { setError(""); goToStep(Math.max(0, step - 1)); }}>Back</button> : null}<button type={step === steps.length - 1 ? "submit" : "button"} className={styles.primaryButton} disabled={isSubmitting} onClick={step === steps.length - 1 ? undefined : next}>{step === steps.length - 1 ? (isSubmitting ? "Sending booking…" : "Send booking request") : step === 1 ? "Choose a time" : "Continue"} <Arrow /></button></div>
    </form>
  </section>;
}
