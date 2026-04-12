/**
 * Returns the effective billing date for a transaction.
 *
 * For credit card transactions: if the purchase was made ON or AFTER the card's
 * closing day, it belongs to the NEXT month's bill.
 * For all other transactions: returns the actual transaction date.
 *
 * @param {object} tx - Transaction object with created_at, payment_method, credit_card_id
 * @param {Array}  cards - Array of credit_cards with id, closing_day
 * @param {number} [defaultClosingDay] - Fallback closing day from credit_card_settings
 * @returns {Date}
 */
export function getEffectiveBillingDate(tx, cards, defaultClosingDay) {
  if (tx.payment_method !== "credit_card" || !tx.credit_card_id) {
    return new Date(tx.created_at);
  }
  const card = (cards || []).find(c => c.id === tx.credit_card_id);
  const closingDay = card?.closing_day
    ? parseInt(card.closing_day, 10)
    : (defaultClosingDay ? parseInt(defaultClosingDay, 10) : null);
  if (!closingDay) return new Date(tx.created_at);

  const txDate = new Date(tx.created_at);
  if (txDate.getDate() >= closingDay) {
    // On or after closing day → belongs to next month's bill
    const nextMonth = txDate.getMonth() + 1;
    return new Date(txDate.getFullYear(), nextMonth, 1);
  }
  return txDate;
}
