// src/utils/formatCurrency.js
// Nigerian Naira formatter. Consistent across the whole app.

const _formatter = new Intl.NumberFormat('en-NG', {
  style:    'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
});

/**
 * Format a number or string as NGN currency.
 * @param {number|string} amount
 * @returns {string} e.g. "₦2,500.00"
 */
export function formatNGN(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₦0.00';
  return _formatter.format(num);
}
