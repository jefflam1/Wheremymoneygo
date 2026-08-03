// Canonical payment method values stored on receipts, with display labels.
// Shared by the receipt form select and the stats filter.
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "debit", label: "Debit Card" },
  { value: "gift_card", label: "Gift Card" },
  { value: "other", label: "Other" },
] as const;

export function formatPaymentLabel(value: string): string {
  const known = PAYMENT_METHODS.find((m) => m.value === value.toLowerCase());
  if (known) return known.label;
  const words = value.replace(/[-_]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : value;
}
