export const compoundWashBands = [{ quantity: 1, label: "Up to 300 m²" }, { quantity: 2, label: "301–400 m²" }, { quantity: 3, label: "401–500 m²" }, { quantity: 4, label: "501–700 m²" }];
export function compoundWashLabel(quantity: number) { return compoundWashBands.find(b => b.quantity === quantity)?.label ?? "Size unavailable"; }
