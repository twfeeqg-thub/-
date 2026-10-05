export type FeeCalculationMethod = 'cumulative' | 'separate';

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
  // Live monitoring optional fields
  isMonitoringActive?: boolean;
  binanceSymbol?: string;
  targetPrice?: string;
  targetDirection?: 'above' | 'below';
  // Fee calculation method (تراكمي أو منفصل)
  feeMethod?: FeeCalculationMethod;
}

export const STORAGE_KEY_CURRENCIES = 'price_calc_v0_currencies';
export const STORAGE_KEY_THEME = 'price_calc_v0_theme';
export const STORAGE_KEY_DEFAULTS = 'price_calc_v0_defaults';
export const MAX_CURRENCIES = 25;
export const MAX_TEST_PRICES = 10;
