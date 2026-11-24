export function formatCurrency(amount: number, currency = "INR"): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  const code = (currency || "INR").trim().toUpperCase();
  const locale = code === "INR" ? "en-IN" : "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch {
    return `${code} ${safeAmount.toLocaleString("en-IN")}`;
  }
}

export function formatCostPair(
  inrAmount: number,
  localAmount?: number,
  localCurrency?: string
): { primaryInr: string; approxLocal: string | null } {
  const primaryInr = formatCurrency(inrAmount, "INR");
  const code = localCurrency?.trim().toUpperCase();
  if (!code || code === "INR" || typeof localAmount !== "number" || !Number.isFinite(localAmount)) {
    return { primaryInr, approxLocal: null };
  }
  return {
    primaryInr,
    approxLocal: `≈ ${formatCurrency(localAmount, code)}`,
  };
}
