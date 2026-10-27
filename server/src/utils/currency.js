/**
 * Currency & Minor Units Utilities
 * Ensures zero floating point rounding errors by handling monetary quantities in integer cents.
 */

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR'];

export const isValidCurrency = (currency) => {
  if (!currency || typeof currency !== 'string') return false;
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
};

/**
 * Converts a decimal amount (e.g. 49.99) to integer minor units / cents (4999).
 */
export const toCents = (amount) => {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(Number(amount) * 100);
};

/**
 * Converts integer minor units / cents (4999) to decimal representation (49.99).
 */
export const fromCents = (cents) => {
  if (cents === undefined || cents === null) return 0;
  return Number((Number(cents) / 100).toFixed(2));
};

/**
 * Formats minor units / cents to localized currency string.
 */
export const formatCurrency = (cents, currency = 'USD', locale = 'en-US') => {
  const safeCurrency = isValidCurrency(currency) ? currency.toUpperCase() : 'USD';
  const decimalAmount = fromCents(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalAmount);
};

/**
 * Safe multi-currency aggregation verification.
 * Throws error if attempting to sum amounts across differing currencies.
 */
export const assertSameCurrency = (items, defaultCurrency = 'USD') => {
  if (!items || items.length === 0) return defaultCurrency;
  const firstCurrency = items[0]?.currency || defaultCurrency;
  for (const item of items) {
    if (item.currency && item.currency !== firstCurrency) {
      throw new Error(`Currency mismatch detected: cannot combine ${item.currency} with ${firstCurrency}`);
    }
  }
  return firstCurrency;
};
