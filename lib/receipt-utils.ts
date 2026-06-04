export interface ReconcilableReceipt {
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  total: number;
}

// The amount by which the stated total differs from what the receipt's own
// numbers imply (subtotal − discount + tax). Positive means the total is higher
// than expected, negative means lower. Returns null when there's no subtotal to
// reconcile against, in which case there's nothing to flag.
export function reconciliationDelta(receipt: ReconcilableReceipt): number | null {
  if (receipt.subtotal == null) return null;
  const expected =
    receipt.subtotal - (receipt.discount ?? 0) + (receipt.tax ?? 0);
  return Math.round((receipt.total - expected) * 100) / 100;
}

// A receipt reconciles when its numbers add up (or there's nothing to check).
// We allow a 1-cent tolerance for rounding noise.
export function isReconciled(receipt: ReconcilableReceipt): boolean {
  const delta = reconciliationDelta(receipt);
  return delta === null || Math.abs(delta) < 0.01;
}
