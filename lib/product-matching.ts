// Pure product-name normalization + fuzzy matching, shared by the Convex
// mutations (convex/productMatching.ts) and client-side suggestion UI.
//
// Receipt scans and manual entry spell the same item differently ("Coca-Cola
// 330ml" vs "coca cola 330ML"), so exact-string matching splits one product's
// price history across several records and the store-vs-store comparison
// rarely fires. Matching runs in two passes: an exact match on the normalized
// name, then a conservative token-overlap match that never merges names whose
// numeric tokens (sizes, counts) disagree.

export function normalizeProductName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      // Glue a number to a following short unit word so "2 L" and "2L"
      // produce the same size token.
      .replace(/(\p{N})\s+([a-z]{1,2})\b/gu, "$1$2")
      .trim()
  );
}

// Naive singularization so "Bananas" matches "Banana". Applied to both sides,
// so an over-stripped stem still only matches itself.
function stem(token: string): string {
  return token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
}

export function namesLikelySameProduct(a: string, b: string): boolean {
  const tokensA = normalizeProductName(a).split(" ").filter(Boolean);
  const tokensB = normalizeProductName(b).split(" ").filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Sizes and counts must agree exactly: "Milk 1L" is not "Milk 2L".
  const numeric = (tokens: string[]) =>
    tokens.filter((t) => /\p{N}/u.test(t)).sort().join("|");
  if (numeric(tokensA) !== numeric(tokensB)) return false;

  const setA = new Set(tokensA.map(stem));
  const setB = new Set(tokensB.map(stem));
  let shared = 0;
  for (const token of setA) {
    if (setB.has(token)) shared++;
  }
  // Dice coefficient. 0.85 keeps it strict: "Fresh Milk" vs "Fresh Almond
  // Milk" (0.8) stays separate, "Organic Whole Milk 2L" vs "Whole Milk 2L"
  // (0.857) merges.
  return (2 * shared) / (setA.size + setB.size) >= 0.85;
}
