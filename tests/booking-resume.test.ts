import { afterEach, describe, expect, it, vi } from "vitest";
import { BOOKING_STORAGE_KEY, cancelledBookingPath, resumedBooking, safeBookingCheckout, saveStoredBooking, type StoredBooking } from "../src/lib/booking-store";
const reference = "BOOM-flw-07086bb9-0001-4367-8a41-1dcbf37f3cbf";
const booking: StoredBooking = { id: "BOOM-21", createdAt: "2026-10-08T16:00:00Z", customer: "Preview", phone: "08000000000", email: "preview@example.com", service: "Upholstery", serviceSlug: "upholstery-cleaning", address: "Preview address", date: "2026-10-23", time: "09:00", amount: 60000, status: "PENDING", paymentReference: reference, paymentUrl: "https://checkout.flutterwave.com/v3/hosted/pay/example" };
describe("return to saved booking", () => {
  it("returns a cancelled or failed attempt to its matching booking", () => {
    for (const status of ["cancelled", "canceled", "failed"]) expect(cancelledBookingPath(`?status=${status}&tx_ref=${reference}`, [booking])).toBe("/quote?resume=BOOM-21");
    expect(cancelledBookingPath(`?status=successful&tx_ref=${reference}`, [booking])).toBeNull();
    expect(cancelledBookingPath("?status=cancelled&tx_ref=invalid", [booking])).toBeNull();
  });
  it("restores appointment and price without creating another booking", () => {
    expect(resumedBooking(JSON.stringify([booking]), "BOOM-21")).toEqual(booking);
    expect(resumedBooking(JSON.stringify([{ ...booking, status: "CONFIRMED" }]), "BOOM-21")).toBeNull();
    expect(resumedBooking("invalid json", "BOOM-21")).toBeNull();
  });
  it("only resumes payment at the expected Flutterwave checkout host", () => {
    expect(safeBookingCheckout(booking.paymentUrl)).toBe(booking.paymentUrl);
    expect(safeBookingCheckout("https://checkout.flutterwave.com.evil.example/v3/hosted/pay/x")).toBeNull();
    expect(safeBookingCheckout("javascript:alert(1)")).toBeNull();
  });
});


describe("checkout with restricted browser storage", () => {
  afterEach(() => vi.unstubAllGlobals());
  function browser(setItem: ReturnType<typeof vi.fn>, blockedRead = false) {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { localStorage: { getItem: () => { if (blockedRead) throw new Error("Storage blocked"); return "[]"; }, setItem }, dispatchEvent });
    vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init: unknown) {} });
    return dispatchEvent;
  }
  it.each([false, true])("continues after a storage write fails, including blocked reads: %s", (blockedRead) => {
    const dispatch = browser(vi.fn(() => { throw new Error("Quota exceeded"); }), blockedRead);
    expect(() => saveStoredBooking(booking)).not.toThrow();
    expect(dispatch).toHaveBeenCalledOnce();
  });
  it("still persists bookings when browser storage works", () => {
    const write = vi.fn();
    browser(write);
    saveStoredBooking(booking);
    expect(write).toHaveBeenCalledWith(BOOKING_STORAGE_KEY, JSON.stringify([booking]));
  });
});
