export interface BookingConfirmationEmailData {
  outboxId: string;
  bookingNumber: number;
  recipientName: string | null;
  recipientEmail: string;
  serviceName: string;
  scheduledStartAt: string;
  address: string;
  currency: string;
  total: number;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatAppointment(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value));
}

export function buildBookingConfirmationEmail(data: BookingConfirmationEmailData) {
  const name = data.recipientName?.trim() || "there";
  const appointment = formatAppointment(data.scheduledStartAt);
  const amount = formatAmount(data.total, data.currency);
  const text = `Hello ${name},\n\nYour BOOM Cleaning booking BOOM-${data.bookingNumber} has been received.\n\nService: ${data.serviceName}\nAppointment: ${appointment} (Abuja time)\nAddress: ${data.address}\nEstimated total: ${amount}\n\nA BOOM coordinator will confirm your booking and next steps shortly.`;
  return {
    subject: `We received your BOOM booking · BOOM-${data.bookingNumber}`,
    text,
    html: `<main style="font-family:Arial,sans-serif;color:#15352b;max-width:560px;margin:0 auto;padding:28px"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#518162">BOOM CLEANING SERVICES</p><h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.1">Your booking is with us.</h1><p>Hello ${escapeHtml(name)},</p><p>We received booking <strong>BOOM-${data.bookingNumber}</strong>. A BOOM coordinator will confirm the final details and next steps shortly.</p><table style="width:100%;border-collapse:collapse;margin:24px 0"><tr><td style="padding:11px 0;border-top:1px solid #dbe4dc;color:#61756c">Service</td><td style="padding:11px 0;border-top:1px solid #dbe4dc;text-align:right;font-weight:700">${escapeHtml(data.serviceName)}</td></tr><tr><td style="padding:11px 0;border-top:1px solid #dbe4dc;color:#61756c">Appointment</td><td style="padding:11px 0;border-top:1px solid #dbe4dc;text-align:right;font-weight:700">${escapeHtml(appointment)}<br><span style="font-size:12px;font-weight:400">Abuja time</span></td></tr><tr><td style="padding:11px 0;border-top:1px solid #dbe4dc;color:#61756c">Address</td><td style="padding:11px 0;border-top:1px solid #dbe4dc;text-align:right;font-weight:700">${escapeHtml(data.address)}</td></tr><tr><td style="padding:11px 0;border-top:1px solid #dbe4dc;color:#61756c">Estimated total</td><td style="padding:11px 0;border-top:1px solid #dbe4dc;text-align:right;font-weight:700">${escapeHtml(amount)}</td></tr></table><p style="font-size:13px;color:#61756c">Questions? Reply to this email and our team will help.</p></main>`,
  };
}
