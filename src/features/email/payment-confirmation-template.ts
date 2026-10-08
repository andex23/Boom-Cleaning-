import { boomEmailLayout, emailAmount, emailAppointment } from "./boom-email-layout";
import type { BookingConfirmationEmailData } from "./booking-confirmation-template";
export type { BookingConfirmationEmailData } from "./booking-confirmation-template";
export function buildPaymentConfirmationEmail(data: BookingConfirmationEmailData) {
  const test = data.mode !== "live";
  const appointment = emailAppointment(data.scheduledStartAt);
  return {
    subject: `Payment received · Your booking is confirmed · BOOM-${data.bookingNumber}${test ? " [TEST]" : ""}`,
    html: boomEmailLayout(data, true),
    text: `Hello ${data.recipientName?.trim() || "there"},\n\n${test ? "Your full test payment has been verified and your booking is confirmed. No real money was collected." : "Your full payment has been verified and your booking is confirmed."}\n\nReference: BOOM-${data.bookingNumber}\nService: ${data.serviceName}\nDate: ${appointment.day}\nArrival: ${appointment.time} (Abuja time)\nAddress: ${data.address}\n${test ? "Paid in test mode" : "Paid"}: ${emailAmount(data.total,data.currency)}\nPayment: ${data.paymentProvider || "Paystack"} · Paid in full\n\nPlease make sure our team can access the property at your selected arrival time. Reply with your booking reference for any appointment changes.\nBOOM Cleaning Services · Abuja`,
  };
}

export function buildAdminConfirmationEmail(data: BookingConfirmationEmailData & { customerEmail: string | null; customerPhone: string | null }) {
  const test = data.mode !== "live";
  const appointment = emailAppointment(data.scheduledStartAt);
  return {
    subject: `New confirmed booking · BOOM-${data.bookingNumber}${test ? " [TEST]" : ""}`,
    html: boomEmailLayout(data, true, data),
    text: `Hello BOOM team,\n\nFull payment has been verified. Your booking is confirmed.\n\nReference: BOOM-${data.bookingNumber}\nCustomer: ${data.recipientName || "Not provided"}\nEmail: ${data.customerEmail || "Not provided"}\nPhone: ${data.customerPhone || "Not provided"}\nService: ${data.serviceName}\nDate: ${appointment.day}\nArrival: ${appointment.time} (Abuja time)\nAddress: ${data.address}\n${test ? "Paid in test mode" : "Paid"}: ${emailAmount(data.total, data.currency)}${test ? "\nNo real money was collected." : ""}\n\nArrange the cleaning team for this appointment.\nReturn to home: https://boomcleaning.site`,
  };
}
