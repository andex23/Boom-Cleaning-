import { boomEmailLayout, emailAmount, emailAppointment } from "./boom-email-layout";
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
  mode?: "test" | "live";
  paymentProvider?: string;
  paymentUrl?: string | null;
}
export function buildBookingConfirmationEmail(data: BookingConfirmationEmailData) {
  const appointment = emailAppointment(data.scheduledStartAt);
  return {
    subject: `Your BOOM booking details · BOOM-${data.bookingNumber}`,
    html: boomEmailLayout(data, false),
    text: `Hello ${data.recipientName?.trim() || "there"},\n\nYour booking details are saved. Full payment confirms your appointment automatically.\n\nReference: BOOM-${data.bookingNumber}\nService: ${data.serviceName}\nDate: ${appointment.day}\nArrival: ${appointment.time} (Abuja time)\nAddress: ${data.address}\nTotal due: ${emailAmount(data.total,data.currency)}\n\n${data.paymentUrl ? `Pay securely: ${data.paymentUrl}\n\n` : ""}Reply to this email for help.\nBOOM Cleaning Services · Abuja`,
  };
}
