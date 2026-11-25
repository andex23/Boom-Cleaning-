export const bundles = [
  { quantity: 1, price: 10000 },
  { quantity: 2, price: 18000 },
  { quantity: 3, price: 26000 },
] as const;

export const formatPrice = (price: number) => "₦" + price.toLocaleString("en-NG");

export const deliveryPaymentNote = "Pay for the paste online. Pay the delivery fee when your order arrives.";
