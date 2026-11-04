// Background Web Worker for continuous price monitoring when tab is in background
let monitorTimer = null;
let currentSymbols = [];
let checkIntervalMs = 4000;

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'START_MONITORING') {
    if (Array.isArray(data.symbols)) {
      currentSymbols = data.symbols;
    }
    if (typeof data.intervalMs === 'number' && data.intervalMs >= 1500) {
      checkIntervalMs = data.intervalMs;
    }
    startMonitoringLoop();
  } else if (data.type === 'UPDATE_SYMBOLS') {
    if (Array.isArray(data.symbols)) {
      currentSymbols = data.symbols;
    }
  } else if (data.type === 'STOP_MONITORING') {
    stopMonitoringLoop();
  }
});

function stopMonitoringLoop() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

function startMonitoringLoop() {
  stopMonitoringLoop();
  // Fetch immediately
  fetchLatestPrices();
  monitorTimer = setInterval(fetchLatestPrices, checkIntervalMs);
}

async function fetchLatestPrices() {
  if (!currentSymbols || currentSymbols.length === 0) return;

  try {
    // If only 1-5 symbols, fetch targeted price or bulk
    const formattedSymbols = currentSymbols.map((s) => s.toUpperCase());
    
    // Use Binance direct REST endpoint for fastest background ticker
    const symbolsParam = JSON.stringify(formattedSymbols);
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbolsParam)}`;
    
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      // Fallback: fetch individual or mini-ticker if bulk query format failed
      return;
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      const priceMap = {};
      data.forEach((item) => {
        if (item.symbol && item.price) {
          priceMap[item.symbol] = item.price;
        }
      });
      self.postMessage({
        type: 'PRICE_UPDATE',
        prices: priceMap,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    // Network or offline, retry next cycle
  }
}
