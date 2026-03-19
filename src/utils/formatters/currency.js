import useCurrencyStore from '@stores/currency';

export const formatCurrency = (value, currency) => {
  const storeCurrency = (useCurrencyStore && useCurrencyStore.getState && useCurrencyStore.getState().currency) || 'OMR';
  const curr = currency || storeCurrency || 'OMR';
  const num = typeof value === 'number' && !isNaN(value) ? value : Number(value || 0);
  return `${curr} ${num.toFixed(2)}`;
};

export default formatCurrency;
