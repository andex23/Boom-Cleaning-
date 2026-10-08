import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmationView } from "../src/app/payments/return/confirmation-view";
import { appointmentDate, bookingCalendar, confirmationState, maskReceiptEmail, type PaidConfirmation } from "../src/features/payments/payment-confirmation";

const payment: PaidConfirmation = {
  status: "PAID", bookingStatus: "CONFIRMED", bookingReference: "BOOM-15", amount: 220000, currency: "NGN", mode: "test", paidAt: "2026-10-05T08:50:00Z",
  appointment: { serviceName: "Post-construction cleaning", scheduledStartAt: "2026-10-16T13:00:00Z", scheduledEndAt: "2026-10-16T21:00:00Z", address: "Example home, Abuja" },
  receipt: { status: "sent", email: "b***@example.com" },
};
const noop = () => {};
const render = (value: unknown) => renderToStaticMarkup(<BookingConfirmationView state={confirmationState(value)} onRetry={noop} onCalendar={noop} onPrint={noop} />);

describe("booking confirmation page", () => {
  it("shows verified appointment details and removes verification after success", () => {
    const html = render(payment);
    expect(html).toContain("Your clean");
    expect(html).toContain("is booked.");
    expect(html).toContain("Post-construction cleaning");
    expect(html).toContain("2:00 pm");
    expect(html).toContain("Abuja time");
    expect(html).toContain("220,000.00");
    expect(html).toContain("BOOM-15");
    expect(html).toContain("Add to calendar");
    expect(html).not.toMatch(/Verify payment|Check payment status/);
  });

  it("offers retry for a pending payment without claiming a confirmed booking", () => {
    const html = render({ status: "PENDING" });
    expect(html).toContain("Check payment status");
    expect(html).not.toContain("is booked.");
    expect(html).not.toContain("Add to calendar");
  });

  it("does not confirm a paid cancelled booking or offer a calendar event", () => {
    const cancelled = { ...payment, bookingStatus: "CANCELLED" };
    expect(render(cancelled)).toContain("Resolve my booking");
    expect(render(cancelled)).not.toContain("is booked.");
    expect(render(cancelled)).not.toContain("Add to calendar");
    expect(() => bookingCalendar(cancelled)).toThrow();
  });

  it("keeps a completed appointment readable without offering another appointment", () => {
    const html = render({ ...payment, bookingStatus: "COMPLETED" });
    expect(html).toContain("is complete.");
    expect(html).not.toMatch(/Add to calendar|Resolve my booking/);
  });

  it("does not promise an email has been sent when it is queued", () => {
    const html = render({ ...payment, receipt: { status: "queued", email: null } });
    expect(html).toContain("Your receipt is being prepared");
    expect(html).not.toContain("Receipt sent");
    expect(maskReceiptEmail("private.person@example.com")).toBe("p***@example.com");
  });

  it("rejects incomplete success responses instead of displaying false confirmation", () => {
    expect(confirmationState({ status: "PAID", bookingStatus: "CONFIRMED" }).kind).toBe("error");
    expect(render(null)).not.toContain("is booked.");
  });
});

describe("calendar export", () => {
  it("uses the saved UTC window and displays appointments in Lagos time", () => {
    const ics = bookingCalendar(payment, new Date("2026-10-05T09:00:00Z"));
    expect(ics).toContain("DTSTART:20261016T130000Z\r\n");
    expect(ics).toContain("DTEND:20261016T210000Z\r\n");
    expect(ics).toContain("UID:BOOM-15@boomcleaning.site");
    expect(ics).toContain("No real money was collected.");
    expect(appointmentDate("2026-10-15T23:30:00Z").day).toBe("16");
    expect(appointmentDate("2026-10-15T23:30:00Z").time).toBe("12:30 am");
  });

  it("escapes user text and folds Unicode without injecting calendar properties", () => {
    const ics = bookingCalendar({ ...payment, appointment: { ...payment.appointment, address: "Abuja; room 2, path\\entry\nBEGIN:VEVENT " + "é".repeat(120) } });
    expect(ics.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
    const lines = ics.split("\r\n");
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).toContain("Abuja\\; room 2\\, path\\\\entry\\nBEGIN:VEVENT");
    expect(ics).not.toContain("�");
    expect(() => bookingCalendar({ ...payment, appointment: { ...payment.appointment, scheduledEndAt: payment.appointment.scheduledStartAt } })).toThrow();
  });
});
