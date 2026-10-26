export type WatchlistCategory = 'crypto' | 'scalping' | 'favorites' | 'futures';

export type WatchlistFlagColor = 'red' | 'orange' | 'green' | 'blue' | 'purple' | null;

export interface WatchlistItem {
  id: string;
  symbol: string; // e.g. 'BTCUSDT'
  name: string; // e.g. 'BTC'
  description: string; // e.g. 'Bitcoin / TetherUS'
  category: WatchlistCategory;
  flagColor?: WatchlistFlagColor;
  hasAlert?: boolean;
  alertPrice?: string;
  alertDirection?: 'above' | 'below';
  entryPrice?: string;
  breakEvenPrice?: string;
  tradeAmount?: string;
  coinQuantity?: string;
  orderIndex?: number;
}

export interface WatchlistTickerData {
  price: string;
  priceChangePercent?: string;
  priceChangeAmount?: string;
  high24h?: string;
  low24h?: string;
  volume24h?: string;
  prevPrice?: string;
  lastUpdated?: number;
}

export const STORAGE_KEY_WATCHLIST = 'price_calc_v0_watchlist_items';

export const DEFAULT_WATCHLIST_ITEMS: WatchlistItem[] = [
  {
    id: 'wl_btc',
    symbol: 'BTCUSDT',
    name: 'BTC',
    description: 'Bitcoin / TetherUS',
    category: 'crypto',
    flagColor: 'orange',
    hasAlert: true,
    alertPrice: '82000',
    orderIndex: 0,
  },
  {
    id: 'wl_near',
    symbol: 'NEARUSDT',
    name: 'NEAR',
    description: 'NEAR / TetherUS',
    category: 'crypto',
    flagColor: null,
    orderIndex: 1,
  },
  {
    id: 'wl_ray',
    symbol: 'RAYUSDT',
    name: 'RAY',
    description: 'RAY / TetherUS',
    category: 'crypto',
    flagColor: null,
    orderIndex: 2,
  },
  {
    id: 'wl_zro',
    symbol: 'ZROUSDT',
    name: 'ZRO',
    description: 'ZRO / TetherUS',
    category: 'crypto',
    flagColor: null,
    orderIndex: 3,
  },
  {
    id: 'wl_inj',
    symbol: 'INJUSDT',
    name: 'INJ',
    description: 'INJ / TetherUS',
    category: 'crypto',
    flagColor: null,
    orderIndex: 4,
  },
  {
    id: 'wl_bat',
    symbol: 'BATUSDT',
    name: 'BAT',
    description: 'Basic Attention Token / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 5,
  },
  {
    id: 'wl_bnb',
    symbol: 'BNBUSDT',
    name: 'BNB',
    description: 'Binance Coin / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    hasAlert: true,
    alertPrice: '730',
    orderIndex: 6,
  },
  {
    id: 'wl_ar',
    symbol: 'ARUSDT',
    name: 'AR',
    description: 'AR / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 7,
  },
  {
    id: 'wl_zec',
    symbol: 'ZECUSDT',
    name: 'ZEC',
    description: 'Zcash / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 8,
  },
  {
    id: 'wl_ltc',
    symbol: 'LTCUSDT',
    name: 'LTC',
    description: 'Litecoin / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 9,
  },
  {
    id: 'wl_dash',
    symbol: 'DASHUSDT',
    name: 'DASH',
    description: 'Dash / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 10,
  },
  {
    id: 'wl_avax',
    symbol: 'AVAXUSDT',
    name: 'AVAX',
    description: 'AVAX / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 11,
  },
  {
    id: 'wl_link',
    symbol: 'LINKUSDT',
    name: 'LINK',
    description: 'ChainLink / TetherUS',
    category: 'crypto',
    flagColor: 'red',
    orderIndex: 12,
  },
  {
    id: 'wl_sol',
    symbol: 'SOLUSDT',
    name: 'SOL',
    description: 'Solana / TetherUS',
    category: 'scalping',
    flagColor: 'green',
    orderIndex: 13,
  },
  {
    id: 'wl_doge',
    symbol: 'DOGEUSDT',
    name: 'DOGE',
    description: 'Dogecoin / TetherUS',
    category: 'scalping',
    flagColor: 'orange',
    orderIndex: 14,
  },
];
