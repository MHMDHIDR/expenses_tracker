type FormatCurrencyProps = {
  price: number;
  minimumFractionDigits?: number;
  locale?: string;
  currency?: string;
  toPence?: boolean;
};

/**
 * Pure function to format currency - does NOT use hooks
 * Use this when you already have the locale or inside loops/maps
 */
export function formatCurrency({
  price,
  minimumFractionDigits = 0,
  locale = "en-GB",
  currency = "GBP",
  toPence = false,
}: FormatCurrencyProps) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
  }).format(price / (toPence ? 100 : 1));
}
