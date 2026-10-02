export interface CurrencyItem {
  id: string;
  name: string;
  createdAt: number;
  entryPrice: string;
  tradeAmount: string;
  entryFeePercent: string;
  exitFeePercent: string;
  entryFeeFixed: string;
  exitFeeFixed: string;
  testPrices: string[];
}

export const STORAGE_KEY_CURRENCIES = 'price_calc_v0_currencies';
export const STORAGE_KEY_THEME = 'price_calc_v0_theme';
export const STORAGE_KEY_DEFAULTS = 'price_calc_v0_defaults';
export const MAX_CURRENCIES = 10;
