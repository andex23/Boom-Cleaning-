"use client";

import Image from "next/image";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatNaira, formatNairaDelta, formatSlotTime } from "@/lib/format";
import { compoundWashBands, compoundWashLabel } from "@/features/pricing/compound-washing";
import type { PublicServiceView } from "@/features/services/public-catalog";
import { saveStoredBooking, resumedBooking, safeBookingCheckout, storedBookingsSnapshot, subscribeStoredBookings, type StoredBooking } from "@/lib/booking-store";
import { pricingCatalogSchema, quoteResultSchema, type PricingCatalog, type QuoteResult, type SpaceTypeOption } from "@/lib/validation/pricing";
import { publicCheckoutPayloadSchema, publicBookingResponseSchema } from "@/lib/validation/public-booking";
import { BookingCalendar } from "./BookingCalendar";
import { ServiceIcon } from "./ServiceIcon";
import { BrandLoader } from "@/components/brand/BrandLoader";
import styles from "./QuoteFlow.module.css";
import bookingStyles from "./QuoteReview.module.css";
import { Arrow } from "@/components/brand/Arrow";
import {
  DEEP_CLEANING_BUNDLE_SLUGS,
  deepCleaningExtrasFromSlug,
  deepCleaningSlugForExtras,
  isDeepCleaningPackage,
} from "@/features/booking/deep-cleaning-options";

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
  if (space.slug === "compound-pressure-wash") {
    const tier = space.priceTiers.find((item) => item.quantity === count);
    return tier ? `${compoundWashLabel(count)} · ${formatNaira(tier.price)}` : "Choose a size; above 700 m² requires a video or inspection";
  }
  if (space.priceTiers.length) {
    const selected = space.priceTiers.find((tier) => tier.quantity === count);
    if (selected) return formatNaira(selected.price);
    if (count > 0) return `Quoted individually above ${space.priceTiers.at(-1)?.quantity ?? 0}`;
    return space.priceTiers.map((tier) => `${tier.quantity} room${tier.quantity === 1 ? "" : "s"} ${formatNaira(tier.price)}`).join(" · ");
  }
  if (space.requiresReview) return "Confirmed after scope review";
  if (space.includedCount > 0 && count <= space.includedCount) return "Included";
  if (space.slug === "storey" && space.unitPrice !== null) return `${formatNaira(Math.max(0, count - space.includedCount) * space.unitPrice)} extra · first storey included`;
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

export function QuoteFlow({ services, initialService, resume, logoSrc, logoSrcOnLight }: { services: PublicServiceView[]; initialService?: string; resume?: string; logoSrc: string; logoSrcOnLight: string }) {
  const requestedService = services.find((item) => item.slug === initialService)?.slug ?? "";
  const [step, setStep] = useState(requestedService ? 1 : 0);
  const [createdBooking, setBooking] = useState<StoredBooking | null>(null);
  const savedBookings = useSyncExternalStore(subscribeStoredBookings, storedBookingsSnapshot, () => "[]");
  const [ignoreResume, setIgnoreResume] = useState(false);
  const booking = createdBooking ?? (ignoreResume ? null : resumedBooking(savedBookings, resume));
  const [error, setError] = useState("");
  const submissionKey = useRef<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    // A plain /quote visit starts with an intentional choice. Links from a service card
    // keep that service and open directly on its property step.
    serviceSlug: requestedService,
    propertyTypeSlug: "", areaSlug: "", address: "", preferredDate: "", timeSlot: "", name: "", phone: "", email: "", notes: "",
  });
  const service = useMemo(() => services.find((item) => item.slug === form.serviceSlug), [services, form.serviceSlug]);
  const serviceOptions = useMemo(() => services.filter((item) => !item.requiresReview && !DEEP_CLEANING_BUNDLE_SLUGS.has(item.slug)), [services]);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const spaces = useMemo(
    () => Object.entries(spaceCounts).filter(([, count]) => count > 0).map(([slug, count]) => ({ slug, count })),
    [spaceCounts],
  );

  // A catalogue loaded for a different service is stale, not current.
  const catalog = catalogState?.serviceSlug === form.serviceSlug ? catalogState.data : null;
  // The included first storey alone is not a cleaning scope.
  const hasScope = spaces.some((space) => space.slug !== "storey" || space.count > (catalog?.spaceTypes.find((type) => type.slug === "storey")?.includedCount ?? 0));
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
  const isPostConstruction = form.serviceSlug === "post-construction-cleaning" || form.serviceSlug === "post-renovation-cleaning";
  const isDeepCleaning = isDeepCleaningPackage(form.serviceSlug);
  const isUpholstery = form.serviceSlug === "upholstery-cleaning";
  const deepCleaningExtras = deepCleaningExtrasFromSlug(form.serviceSlug);
  const compoundTypes = otherSpaceTypes.filter((space) => space.slug === "compound-sweep" || space.slug === "compound-pressure-wash");
  const scopeSpaceTypes = otherSpaceTypes.filter((space) => space.slug !== "compound-sweep" && space.slug !== "compound-pressure-wash");
  const tierPrice = usesTiers ? catalog?.bedroomTiers.find((tier) => tier.bedrooms === (spaceCounts["bedroom"] ?? 0))?.price ?? null : null;
  const extrasCount = otherSpaceTypes.reduce((total, space) => total + (spaceCounts[space.slug] ?? 0), 0);
  const compoundChoice = (spaceCounts["compound-pressure-wash"] ?? 0) > 0 ? "compound-pressure-wash" : (spaceCounts["compound-sweep"] ?? 0) > 0 ? "compound-sweep" : "none";

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
        setSpaceCounts((current) => Object.fromEntries(parsed.data.spaceTypes.map((space) => [
          space.slug,
          current[space.slug] ?? (parsed.data.usesBedroomTiers && space.slug === "bedroom" ? 1 : space.includedCount),
        ])));
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
      if (slug === "compound-sweep" && count > 0) next["compound-pressure-wash"] = 0;
      if (slug === "compound-pressure-wash" && count > 0) next["compound-sweep"] = 0;
      return next;
    });
  }, []);

  const setCompoundChoice = useCallback((slug: "none" | "compound-sweep" | "compound-pressure-wash") => {
    setSpaceCounts((current) => ({
      ...current,
      "compound-sweep": slug === "compound-sweep" ? 1 : 0,
      "compound-pressure-wash": slug === "compound-pressure-wash" ? 1 : 0,
    }));
  }, []);

  const validate = () => {
    if (step === 0 && !form.serviceSlug) return "Choose the service you need.";
    if (step === 1 && !isUpholstery && !form.propertyTypeSlug) return "Tell us what type of property this is.";
    if (step === 1 && !hasScope) return isUpholstery ? "Add at least one furniture item so we can price the service." : "Add at least one room or area so we can price the service.";
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

  const selectService = (slug: string) => {
    setError("");
    update("serviceSlug", slug);
    goToStep(1);
  };

  const setDeepCleaningExtra = (extra: "upholstery" | "fumigation", checked: boolean) => {
    const upholstery = extra === "upholstery" ? checked : deepCleaningExtras.upholstery;
    const fumigation = extra === "fumigation" ? checked : deepCleaningExtras.fumigation;
    update("serviceSlug", deepCleaningSlugForExtras(upholstery, fumigation));
  };

  const startNewBooking = () => {
    submissionKey.current = null;
    setBooking(null);
    setIgnoreResume(true);
    setTermsAccepted(false);
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
    if (!termsAccepted) { setError("Please agree to the terms and conditions before continuing to payment."); return; }
    if (!quote || quote.requiresReview || quote.total === null) { setError("Choose a selection with a published price before payment."); return; }
    // No amount is sent: the database prices the scope inside the booking transaction.
    const payload = publicCheckoutPayloadSchema.safeParse({
      serviceSlug: form.serviceSlug, propertyTypeSlug: form.propertyTypeSlug, areaSlug: form.areaSlug, spaces,
      address: form.address, date: form.preferredDate, time: form.timeSlot,
      name: form.name, phone: form.phone, email: form.email, notes: form.notes, termsAccepted,
    });
    if (!payload.success) {
      setError("Please review the booking details and try again.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      submissionKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": submissionKey.current }, body: JSON.stringify(payload.data) });
      if (!response.ok) throw new Error(await bookingErrorMessage(response));

      const result = publicBookingResponseSchema.safeParse(await response.json().catch(() => null));
      if (!result.success) throw new Error("Your booking may have gone through, but we couldn’t read the confirmation. Please check your email before booking again, or call us.");

      const confirmed: StoredBooking = {
        id: result.data.booking.id, createdAt: result.data.booking.createdAt,
        customer: payload.data.name, phone: payload.data.phone, email: payload.data.email,
        service: service.name, serviceSlug: service.slug, address: payload.data.address,
        date: payload.data.date, time: payload.data.time,
        amount: result.data.booking.amount, status: result.data.booking.status,
        paymentReference: result.data.payment?.reference, paymentUrl: result.data.payment?.url ?? undefined,
      };
      saveStoredBooking(confirmed);
      setConfirmedQuote(quote);
      setBooking(confirmed);
      if (result.data.payment?.url) { window.location.assign(result.data.payment.url); return; }
      if (result.data.payment?.error) setError(result.data.payment.error);
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
        <div className={`${styles.serviceTypeLabel} ${styles.successServiceType}`}>
          <span>Service type</span>
          <strong>{booking.service}</strong>
        </div>
        <div className={styles.check}>✓</div>
        <p className={styles.eyebrow}>{inReview ? "REQUEST RECEIVED" : "BOOKING RECEIVED"}</p>
        <h1>{inReview ? "Payment is needed to confirm your booking." : "Payment is needed to confirm your booking."}</h1>
        <p className={styles.successLead}>{inReview
          ? "Choose a service and quantity with a published price before payment."
          : "Your booking details are saved. Complete payment when you’re ready to confirm your appointment."}</p>

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
            <li><strong>Pay securely</strong><span>Complete your full payment through Flutterwave.</span></li>
            <li><strong>You hear from us</strong><span>Your confirmation and receipt go to {booking.email} after verified payment.</span></li>
            <li><strong>Your team arrives</strong><span>{displayDate(booking.date)} at {formatSlotTime(booking.time)}.</span></li>
          </ol>
        </div>

        <p className={styles.successHelp}>Something not right? <a href="tel:+2349029799205">Call BOOM</a> and quote {booking.id}.</p>

        <div className={bookingStyles.successActions}>
          {safeBookingCheckout(booking.paymentUrl) ? <a className={styles.primaryButton} href={safeBookingCheckout(booking.paymentUrl)!}>Continue to payment <Arrow /></a> : null}
          <Link className={styles.secondaryButton} href="/">Return home</Link>
          <button className={styles.secondaryButton} onClick={startNewBooking}>Book another service</button>
        </div>
      </div>
    </section>;
  }

  const priceLabel = !hasScope && step > 0 ? (isUpholstery ? "Add your furniture" : "Add your rooms") : isPricing ? "Pricing…" : quote?.requiresReview ? "Scope review" : quote?.total !== null && quote?.total !== undefined ? formatNaira(quote.total) : "—";

  return <section className={styles.shell} aria-labelledby="quote-title">
    <aside className={styles.aside}><Link href="/" className={styles.brand} aria-label="BOOM Cleaning Services home"><Image src={logoSrc} alt="BOOM Cleaning Services" width={132} height={44} priority /></Link><div className={styles.asideCopy}><p className={styles.eyebrow}>Quote and booking</p><h1 id="quote-title">Choose your clean. Book your time.</h1><p>Describe your space exactly as it is — every room, and the extras too — and see a transparent estimate before you book.</p></div><ol className={styles.steps}>{steps.map((label, index) => <li key={label} className={index === step ? styles.current : index < step ? styles.complete : ""}><span>{index < step ? "✓" : `0${index + 1}`}</span>{label}</li>)}</ol><p className={styles.support}>Need help? <a href="tel:+2349029799205">Speak to BOOM</a></p></aside>

    <form className={`${styles.form} ${step === 2 ? bookingStyles.calendarForm : ""}`} onSubmit={submit} noValidate aria-busy={isSubmitting}>
      {isSubmitting ? <div className={styles.bookingLoader}>
        <BrandLoader logoSrc={logoSrc} label="Securing your booking" compact />
        <p>Please keep this page open while we prepare secure checkout.</p>
      </div> : null}
      <div className={styles.formTop}><div><p className={styles.mobileStep}>Step {step + 1} of {steps.length}</p><h2>{steps[step]}</h2><div className={styles.serviceTypeLabel}><span>Service type</span><strong>{service?.name ?? "Choose a service below"}</strong></div></div><p className={styles.progress}>{Math.round(((step + 1) / steps.length) * 100)}%</p></div>

      {step === 0 ? <fieldset className={styles.options}><legend>What kind of care do you need?</legend><div className={styles.serviceGrid}>{serviceOptions.map((item) => {
        const selected = item.slug === "deep-cleaning" ? isDeepCleaning : form.serviceSlug === item.slug;
        return <label key={item.id} className={`${styles.serviceOption} ${selected ? styles.selected : ""}`}><input type="radio" name="service" value={item.slug} checked={selected} onChange={() => selectService(item.slug)} /><span className={styles.optionIcon}><ServiceIcon icon={item.icon} /></span><span><strong>{item.name}</strong><small>{item.priceLabel}</small></span></label>;
      })}</div><p className={styles.selectionHint}>Choose a service to continue.</p></fieldset> : null}

      {step === 1 ? <div className={styles.fields}>
        {service?.summary ? <section className={styles.serviceDescription} aria-labelledby="service-description-title">
          <h3 id="service-description-title">What this service includes</h3>
          {service.summary.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section> : null}
        {catalogError ? <div className={styles.errorPanel} role="alert"><p>{catalogError}</p><button type="button" onClick={() => { setCatalogError(""); setCatalogAttempt((n) => n + 1); }}>Try again</button></div>
        : !catalog ? <p className={styles.help}>Loading options for {service?.name ?? "this service"}…</p> : <>
          {!isUpholstery ? <fieldset><legend>What type of property is it?</legend><div className={styles.pills}>{catalog.propertyTypes.map((type) => <label className={form.propertyTypeSlug === type.slug ? styles.activePill : ""} key={type.slug} title={type.description ?? undefined}><input type="radio" name="property" value={type.slug} checked={form.propertyTypeSlug === type.slug} onChange={() => update("propertyTypeSlug", type.slug)} />{type.name}</label>)}</div></fieldset> : null}

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

          {isDeepCleaning ? <fieldset className={styles.deepCleaningExtras}>
            <legend>Add to your Deep Cleaning</legend>
            <p className={styles.help}>Choose any extras you need. Your package and estimate update immediately.</p>
            <div className={styles.extraCards}>
              <label className={deepCleaningExtras.upholstery ? styles.extraCardActive : styles.extraCard}>
                <input type="checkbox" checked={deepCleaningExtras.upholstery} onChange={(event) => setDeepCleaningExtra("upholstery", event.target.checked)} />
                <span><strong>Upholstery (chair cleaning)</strong><small>For sofas, chairs and soft furnishings</small></span>
              </label>
              <label className={deepCleaningExtras.fumigation ? styles.extraCardActive : styles.extraCard}>
                <input type="checkbox" checked={deepCleaningExtras.fumigation} onChange={(event) => setDeepCleaningExtra("fumigation", event.target.checked)} />
                <span><strong>Fumigation</strong><small>Uses the published Deep Cleaning package price</small></span>
              </label>
              {compoundTypes.find((space) => space.slug === "compound-sweep") ? <label className={(spaceCounts["compound-sweep"] ?? 0) > 0 ? styles.extraCardActive : styles.extraCard}>
                <input type="checkbox" checked={(spaceCounts["compound-sweep"] ?? 0) > 0} onChange={(event) => setSpaceCount("compound-sweep", event.target.checked ? 1 : 0, 1)} />
                <span><strong>Compound</strong><small>+ ₦20,000</small></span>
              </label> : null}
            </div>
          </fieldset> : null}

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
                  <input type="radio" name="compound" checked={compoundChoice === space.slug} onChange={() => setCompoundChoice(space.slug as "compound-sweep" | "compound-pressure-wash")} />
                  {space.slug === "compound-sweep" ? `Sweep · ${formatNaira(space.unitPrice ?? 0)}` : "Pressure wash · choose size"}
                </label>)}
              </div>
              {compoundChoice === "compound-pressure-wash" ? <label className={styles.textField}>Compound size
                <select value={spaceCounts["compound-pressure-wash"] ?? 1} onChange={(event) => setSpaceCount("compound-pressure-wash", Number(event.target.value), 5)}>
                  {compoundWashBands.map((band) => {
                    const tier = compoundTypes.find((space) => space.slug === "compound-pressure-wash")?.priceTiers.find((item) => item.quantity === band.quantity);
                    return <option key={band.quantity} value={band.quantity}>{band.label}{tier ? ` · ${formatNaira(tier.price)}` : ""}</option>;
                  })}
                </select>
                <span className={styles.help}>Choose a published compound size up to 700 m².</span>
              </label> : null}
            </fieldset> : null}
          </div> : scopeSpaceTypes.length === 0 ? null : <details className={styles.extras} open={isUpholstery || extrasOpen} onToggle={(event) => { if (!isUpholstery) setExtrasOpen((event.currentTarget as HTMLDetailsElement).open); }}>
            <summary>
              <span className={styles.extrasTitle}>{isUpholstery ? "Sofas, chairs and bed frames" : form.serviceSlug === "fumigation" ? "BQ rooms" : "Bathrooms, living areas and extras"}</span>
              <span className={styles.extrasMeta}>{extrasCount ? `${extrasCount} counted` : "None yet"}<i aria-hidden="true">⌄</i></span>
            </summary>
            <p className={styles.help}>{isUpholstery ? "Choose a full 7-seater set or count its individual sofas and chairs—not both for the same furniture. Bed-frame prices exclude mattresses." : form.serviceSlug === "fumigation" ? "Add BQ rooms attached to the property." : "Count every other area you’d like cleaned, including outdoor spaces like a gazebo, BQ or terrace."}</p>
            {isUpholstery ? <section className={styles.seatingGuide} aria-labelledby="seating-guide-heading">
              <h3 id="seating-guide-heading">Which seating do you have?</h3>
              <p>Use these photos as examples. Count seating places, not loose cushions.</p>
              <figure>
                <Image src="/images/services/owner/upholstery-three-seater.jpg" alt="A straight sofa with three seating places between two armrests" width={1280} height={853} sizes="(max-width: 700px) 90vw, 600px" />
                <figcaption><strong>3-seater sofa</strong><span>One sofa with room for three people. Select one 3-seater for each sofa like this.</span></figcaption>
              </figure>
              <figure>
                <Image src="/images/services/owner/upholstery-full-set.jpg" alt="A seven-seat set: a three-seater at the back, a two-seater on the left and two separate armchairs on the right" width={1280} height={853} sizes="(max-width: 700px) 90vw, 600px" />
                <figcaption><strong>7-seater full set · 3 + 2 + 1 + 1</strong><span>Back: 3-seater. Left: 2-seater. Right: two 1-seater armchairs. A 1-seater means one armchair; a 2-seater is one sofa for two people.</span><span>For this whole arrangement, select one full set. For only some pieces, select those pieces individually.</span></figcaption>
              </figure>
              <figure>
                <Image src="/images/services/owner/upholstery-sectional.jpg" alt="An L-shaped sectional sofa with connected seating along two sides" width={1280} height={853} sizes="(max-width: 700px) 90vw, 600px" />
                <figcaption><strong>L-shaped / sectional sofa</strong><span>This describes the shape, not a fixed seat count. It is not automatically a 7-seater set. If you are unsure which option fits, <a href="tel:+2349029799205">ask BOOM before choosing</a>.</span></figcaption>
              </figure>
            </section> : null}
            <ul className={styles.spaceList}>{scopeSpaceTypes.map((space) => {
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

          {quoteFailed ? <div className={styles.errorPanel} role="alert"><p>We couldn’t calculate a price. Adjust your selection or try again before payment.</p></div> : null}
          {hasScope && quote?.requiresReview && quote.reviewReasons.length ? <div className={styles.reviewNotice}><strong>This selection is unavailable for checkout.</strong><ul>{quote.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>Please choose a priced service and quantity.</p></div> : null}
        </>}
        <label className={styles.textField}>Anything we should know?<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="For example: pets, stair access, priority rooms…" rows={4} /></label>
      </div> : null}

      {step === 2 ? <div className={styles.fields}><fieldset><legend>Where is the service?</legend><div className={styles.pills}>{(catalog?.serviceAreas ?? []).map((area) => <label className={form.areaSlug === area.slug ? styles.activePill : ""} key={area.slug}><input type="radio" name="location" value={area.slug} checked={form.areaSlug === area.slug} onChange={() => update("areaSlug", area.slug)} />{area.name}</label>)}</div></fieldset><label className={styles.textField}>Service address <input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, estate or landmark" autoComplete="street-address" /></label><BookingCalendar serviceSlug={form.serviceSlug} selectedDate={form.preferredDate} selectedTime={form.timeSlot} onDateChange={(value) => update("preferredDate", value)} onTimeChange={(value) => update("timeSlot", value)} /></div> : null}

      {step === 3 ? <div className={styles.fields}><p className={styles.help}>Who should receive the booking confirmation and arrival updates?</p><div className={styles.split}><label className={styles.textField}>Full name <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" placeholder="Your name" /></label><label className={styles.textField}>Phone number <input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" placeholder="0800 000 0000" /></label></div><label className={styles.textField}>Email address <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" placeholder="you@example.com" /></label></div> : null}

      {step === 4 ? <div className={bookingStyles.review}>
        <div className={bookingStyles.reviewHeading}><div><p>Nothing is booked yet</p><h3>{service?.name}</h3></div><strong>{priceLabel}</strong></div>
        <p className={`${styles.help} ${bookingStyles.reviewIntro}`}>Check the final price and details, then continue to secure payment.</p>

        {quote && !quote.requiresReview && quote.items.length ? <ul className={`${styles.breakdown} ${bookingStyles.reviewBreakdown}`}>{quote.items.map((item) => <li key={`${item.kind}-${item.sortOrder}`}><span>{item.label}</span><span>{item.kind === "PROPERTY_MULTIPLIER" ? formatNairaDelta(item.amount) : formatNaira(item.amount)}</span></li>)}<li className={styles.breakdownTotal}><span>Total</span><span>{quote.total === null ? "—" : formatNaira(quote.total)}</span></li></ul> : null}

        {quote?.requiresReview ? <div className={styles.reviewNotice}><strong>This selection is unavailable for checkout.</strong><ul>{quote.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}

        <dl><div><dt>Date</dt><dd>{displayDate(form.preferredDate)}</dd></div><div><dt>Arrival time</dt><dd>{formatSlotTime(form.timeSlot)}</dd></div>{!isUpholstery ? <div><dt>Property</dt><dd>{catalog?.propertyTypes.find((type) => type.slug === form.propertyTypeSlug)?.name ?? form.propertyTypeSlug}</dd></div> : null}<div><dt>{isUpholstery ? "Furniture" : "Spaces"}</dt><dd>{spaces.length ? spaces.map((space) => space.slug === "compound-pressure-wash" ? `Compound pressure washing: ${compoundWashLabel(space.count)}` : `${space.count} × ${catalog?.spaceTypes.find((type) => type.slug === space.slug)?.name ?? space.slug}`).join(", ") : "Not specified"}</dd></div><div><dt>Address</dt><dd>{form.address}</dd></div><div><dt>Customer</dt><dd>{form.name} · {form.phone}</dd></div></dl>

        <div className={bookingStyles.paymentNote}><span>₦</span><p><strong>Full payment confirms your booking.</strong>{quote?.requiresReview ? " Choose a priced service and quantity to continue." : " Continue to Flutterwave to pay securely."}</p></div>
        <label className={bookingStyles.termsConsent}><input type="checkbox" required checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); setError(""); }} /><span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">terms and conditions</Link>.</span></label>
      </div> : null}

      {step > 0 ? <div className={styles.liveEstimate} aria-live="polite" aria-atomic="true">
        <div className={styles.liveEstimateCopy}>
          <span>{quote?.requiresReview && hasScope ? "Your quote" : "Estimated total"}</span>
          {quote?.requiresReview && hasScope ? <small>Choose a priced selection.</small> : quote?.depositAmount ? <small>{formatNaira(quote.depositAmount)} due in full to reserve</small> : <small>Updates as you change your selections</small>}
        </div>
        <strong>{priceLabel}</strong>
      </div> : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {step > 0 ? <div className={styles.controls}><button type="button" className={styles.back} disabled={isSubmitting} onClick={() => { setError(""); goToStep(Math.max(0, step - 1)); }}>Back</button><button type={step === steps.length - 1 ? "submit" : "button"} className={styles.primaryButton} disabled={isSubmitting} onClick={step === steps.length - 1 ? undefined : (event) => { event.preventDefault(); next(); }}>{step === steps.length - 1 ? (isSubmitting ? "Preparing checkout…" : "Continue to payment") : step === 1 ? "Choose a time" : "Continue"} <Arrow /></button></div> : null}
    </form>
  </section>;
}
