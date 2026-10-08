/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS preview compiler */
const fs=require('fs'); const ts=require('typescript'); const path=require('path');
const destination=path.resolve('output/email-previews');
for(const name of ['boom-email-layout','booking-confirmation-template','payment-confirmation-template']) {
 const source=fs.readFileSync(`src/features/email/${name}.ts`,'utf8');
 fs.writeFileSync(`${destination}/${name}.js`,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
}
const data={outboxId:'design-preview',bookingNumber:12,recipientName:'BOOM Paystack Test',recipientEmail:'boomcleaninfo@gmail.com',serviceName:'Deep cleaning',scheduledStartAt:'2026-10-10T08:00:00Z',address:'BOOM Paystack test address, Kubwa',currency:'NGN',total:86000,paymentUrl:'https://checkout.paystack.com/pz3giqvz7bu4aqn'};
const booking=require(`${destination}/booking-confirmation-template.js`).buildBookingConfirmationEmail(data);
const payment=require(`${destination}/payment-confirmation-template.js`).buildPaymentConfirmationEmail(data);
fs.writeFileSync(`${destination}/booking.html`,booking.html);fs.writeFileSync(`${destination}/payment.html`,payment.html);
fs.writeFileSync(`${destination}/index.html`,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>BOOM email designs</title></head><body style="margin:0;background:#edf2f8;font:16px Arial;color:#0f2350"><nav style="padding:24px;display:flex;gap:24px"><a href="booking.html">Booking details</a><a href="payment.html">Payment & confirmation</a></nav><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:20px"><iframe title="Booking details email" src="booking.html" style="width:650px;height:1400px;border:0"></iframe><iframe title="Payment receipt email" src="payment.html" style="width:650px;height:1400px;border:0"></iframe></div></body></html>');
fs.writeFileSync(`${destination}/messages.json`,JSON.stringify([booking,payment]));
console.log('Email preview files generated.');
