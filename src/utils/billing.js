/**
 * Returns the effective billing date for a transaction.
 *
 * For credit card transactions: if the purchase was made AFTER the card's
 * closing day, it belongs to the NEXT month's bill.
 * For all other transactions: returns the actual transaction date.
 *
 * @param {object} tx - Transaction object with created_at, payment_method, credit_card_id
 * @param {Array}  cards - Array of credit_cards with id, closing_day
 * @returns {Date}
 */
export function getEffectiveBillingDate(tx, cards) {
  if (tx.payment_method !== "credit_card" || !tx.credit_card_id) {
    return new Date(tx.created_at);
  }
  const card = (cards || []).find(c => c.id === tx.credit_card_id);
  const closingDay = card?.closing_day ? parseInt(card.closing_day, 10) : null;
  if (!closingDay) return new Date(tx.created_at);

  const txDate = new Date(tx.created_at);
  if (txDate.getDate() > closingDay) {
    // After closing day → belongs to next month's bill
    return new Date(txDate.getFullYear(), txDate.getMonth() + 1, 1);
  }
  return txDate;
}
