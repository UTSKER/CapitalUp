import socket from './socket';

export const MARKET_UPDATE_EVENT = 'market:update:state';

export function emitMarketUpdate(detail) {
  if (!detail?.symbol) return;
  window.dispatchEvent(new CustomEvent(MARKET_UPDATE_EVENT, { detail }));
}

export function applyMarketUpdateToStock(stock, payload) {
  if (!stock || !payload?.symbol || !payload?.stockData) return stock;

  const price = Number(payload.stockData.price ?? payload.stockData.lastPrice ?? stock.lastPrice ?? stock.price ?? 0);
  const previousClose = Number(payload.stockData.previousClose ?? stock.previousClose ?? stock.lastPrice ?? price);

  return {
    ...stock,
    lastPrice: price,
    price,
    high: Number(payload.stockData.high ?? stock.high ?? price),
    low: Number(payload.stockData.low ?? stock.low ?? price),
    open: Number(payload.stockData.open ?? stock.open ?? price),
    previousClose,
    updatedAt: payload.stockData.updatedAt || new Date().toISOString(),
  };
}

export function listenToMarketUpdates(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(MARKET_UPDATE_EVENT, handler);
  return () => window.removeEventListener(MARKET_UPDATE_EVENT, handler);
}

export function initializeMarketSocketListener() {
  const handleSocketUpdate = (payload) => {
    if (!payload?.symbol || !payload?.stockData) return;
    emitMarketUpdate({
      symbol: payload.symbol,
      stockData: payload.stockData,
    });
  };

  socket.on('market:update', handleSocketUpdate);

  return () => {
    socket.off('market:update', handleSocketUpdate);
  };
}
