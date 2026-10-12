import { formatNaira } from "@/lib/format";
type ContactBooking={reference:string;customer:string|null;customerPhone:string|null;customerEmail:string|null;serviceName:string;total:number};
export function bookingFollowUpLinks(booking:ContactBooking) {
  const raw=booking.customerPhone?.replace(/[\s().-]/g,"") ?? "";
  const phone=/^0\d{10}$/.test(raw) ? `234${raw.slice(1)}` : /^\+?[1-9]\d{7,14}$/.test(raw) ? raw.replace(/^\+/,"") : null;
  const message=`Hello ${booking.customer || "there"}, this is BOOM Cleaning Services following up on your ${booking.serviceName} booking (${booking.reference}), ${formatNaira(booking.total)}. Payment confirmation is still pending. Please let us know if you need help completing your booking.`;
  return {
    call:phone ? `tel:+${phone}` : null,
    whatsapp:phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null,
    email:booking.customerEmail ? `mailto:${encodeURIComponent(booking.customerEmail)}?subject=${encodeURIComponent(`Your BOOM booking ${booking.reference}`)}&body=${encodeURIComponent(message)}` : null,
  };
}
