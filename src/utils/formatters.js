// src/utils/formatters.js

/**
 * Format a number as currency (e.g., KES 1,234.56)
 * @param {number} amount - The amount to format
 * @param {string} currencySymbol - Optional, defaults to KES
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencySymbol = 'KES') => {
  if (amount === null || amount === undefined) return `${currencySymbol} 0.00`;
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numericAmount)) return `${currencySymbol} 0.00`;
  return `${currencySymbol} ${numericAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

/**
 * Format a date string to a readable format (e.g., Mar 28, 2026)
 * @param {string|Date} date - The date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return d.toLocaleDateString(undefined, options);
};

/**
 * Format a date-time string (short date + time)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date-time string
 */
export const formatDateTime = (date) => {
  return formatDate(date, true);
};

/**
 * Format time difference relative to now (e.g., "2 minutes ago")
 * @param {string|Date} date - The date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 7) return formatDate(date);
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
};