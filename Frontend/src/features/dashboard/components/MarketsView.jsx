import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, TrendingDown, Wallet, ShieldAlert, Star, X } from 'lucide-react';
import { listenToMarketUpdates } from '../../../services/marketRealtime';

export function MarketsView({
  onNavigate,
  stocks = [],
  selectedStock,
  setSelectedStock,
  initialOrderSide = 'BUY',
  setInitialOrderSide
}) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(stocks.length === 0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [niftyHistory, setNiftyHistory] = useState([]);
  const [sensexHistory, setSensexHistory] = useState([]);
  
  // Watchlist mapping
  const [watchlist, setWatchlist] = useState([]);

  // Holdings and trade loading state
  const [holdings, setHoldings] = useState([]);
  const [tradeLoading, setTradeLoading] = useState(false);

  // Order placement state
  const [orderType, setOrderType] = useState('MARKET'); // MARKET, LIMIT, STOP or OCO (Limit + Stop-Loss)
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(0);
  const [stopPrice, setStopPrice] = useState(0);
  const [orderSide, setOrderSide] = useState(initialOrderSide || 'BUY'); // BUY or SELL
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [virtualBalance, setVirtualBalance] = useState(15000);

  const fetchHoldings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.data) {
        if (result.data.holdings) {
          setHoldings(result.data.holdings);
        }
        if (result.data.summary?.balance != null) {
          setVirtualBalance(Number(result.data.summary.balance));
        }
      }
    } catch (err) {
      console.error('Failed to fetch holdings:', err);
    }
  };

  // Sync stocks loading and initial order side
  useEffect(() => {
    setLoading(stocks.length === 0);
  }, [stocks]);

  useEffect(() => {
    if (initialOrderSide) {
      setOrderSide(initialOrderSide);
    }
  }, [initialOrderSide]);

  // Fetch watchlist & holdings on mount
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/watchlist`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok) {
          const list = Array.isArray(result) ? result : (result.data || []);
          setWatchlist(list.map(w => w.symbol));
        }
      } catch (err) {
        console.error('Failed to fetch watchlist:', err);
      }
    };

    const fetchIndexHistories = async () => {
      try {
        const niftyRes = await fetch(`${API_BASE_URL}/stocks/^NSEI/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const niftyData = await niftyRes.json();
        if (niftyData.success) {
          setNiftyHistory(niftyData.data);
        }

        const sensexRes = await fetch(`${API_BASE_URL}/stocks/^BSESN/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sensexData = await sensexRes.json();
        if (sensexData.success) {
          setSensexHistory(sensexData.data);
        }
      } catch (err) {
        console.error('Failed to fetch index histories:', err);
      }
    };

    fetchWatchlist();
    fetchIndexHistories();
    fetchHoldings();
  }, [API_BASE_URL, token]);

  // Real-time updates for Nifty 50 and Sensex histories
  useEffect(() => {
    const stopRealtime = listenToMarketUpdates(({ symbol, stockData }) => {
      const nextPrice = Number(stockData.price);
      const timestamp = stockData.updatedAt || new Date().toISOString();

      if (symbol === '^NSEI') {
        setNiftyHistory((prevHistory) => {
          if (!prevHistory.length) return [{ price: nextPrice, timestamp }];
          const lastItem = prevHistory[prevHistory.length - 1];
          if (lastItem.timestamp === timestamp) {
            const next = [...prevHistory];
            next[next.length - 1] = { ...lastItem, price: nextPrice };
            return next;
          }
          const next = [...prevHistory, { price: nextPrice, timestamp }];
          return next.slice(-50);
        });
      } else if (symbol === '^BSESN') {
        setSensexHistory((prevHistory) => {
          if (!prevHistory.length) return [{ price: nextPrice, timestamp }];
          const lastItem = prevHistory[prevHistory.length - 1];
          if (lastItem.timestamp === timestamp) {
            const next = [...prevHistory];
            next[next.length - 1] = { ...lastItem, price: nextPrice };
            return next;
          }
          const next = [...prevHistory, { price: nextPrice, timestamp }];
          return next.slice(-50);
        });
      }
    });

    return stopRealtime;
  }, []);

  // Fetch stock price history when selectedStock changes
  useEffect(() => {
    if (!selectedStock) return;

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await fetch(`${API_BASE_URL}/stocks/${selectedStock.symbol}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
          setHistory(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch stock history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
    fetchHoldings();
    // Default limit/stop price to lastPrice when stock changes
    setLimitPrice(selectedStock.lastPrice || 100);
    setStopPrice(selectedStock.lastPrice || 100);
    setTradeSuccess('');
    setTradeError('');
  }, [selectedStock?.symbol, API_BASE_URL, token]);

  useEffect(() => {
    if (!selectedStock?.symbol) return undefined;

    const stopRealtime = listenToMarketUpdates(({ symbol, stockData }) => {
      if (symbol !== selectedStock.symbol) return;
      const nextPrice = Number(stockData.price);
      const timestamp = stockData.updatedAt || new Date().toISOString();

      setHistory((prevHistory) => {
        if (!prevHistory.length) return [{ price: nextPrice, timestamp }];
        
        const lastItem = prevHistory[prevHistory.length - 1];
        if (lastItem.timestamp === timestamp) {
          const next = [...prevHistory];
          next[next.length - 1] = {
            ...lastItem,
            price: nextPrice,
          };
          return next;
        }

        const next = [...prevHistory, { price: nextPrice, timestamp }];
        if (next.length > 50) {
          next.shift();
        }
        return next;
      });
    });

    return stopRealtime;
  }, [selectedStock?.symbol]);

  // Handle balance updates
  const updateBalance = () => {
    window.dispatchEvent(new Event('balanceChanged'));
  };

  // Toggle watchlist
  const handleToggleWatchlist = async (stock) => {
    const isStarred = watchlist.includes(stock.symbol);
    try {
      if (isStarred) {
        const res = await fetch(`${API_BASE_URL}/watchlist/${stock.symbol}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setWatchlist(prev => prev.filter(sym => sym !== stock.symbol));
          window.dispatchEvent(new CustomEvent('watchlistChanged'));
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/watchlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ symbol: stock.symbol })
        });
        if (res.ok) {
          setWatchlist(prev => [...prev, stock.symbol]);
          window.dispatchEvent(new CustomEvent('watchlistChanged'));
        }
      }
    } catch (err) {
      console.error('Watchlist update failed:', err);
    }
  };

  // Handle buy/sell orders
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (tradeLoading) return;

    setTradeError('');
    setTradeSuccess('');

    if (quantity <= 0) {
      setTradeError('Quantity must be greater than 0');
      return;
    }

    const currentPrice = selectedStock.lastPrice || 0;
    const lowerBound = currentPrice * 0.75;
    const upperBound = currentPrice * 1.25;

    if (orderType === 'LIMIT' || orderType === 'OCO') {
      if (limitPrice <= 0) {
        setTradeError('Limit price must be greater than 0');
        return;
      }

      if (limitPrice < lowerBound || limitPrice > upperBound) {
        setTradeError(`Limit price must be within ±25% of current price (₹${lowerBound.toFixed(2)} - ₹${upperBound.toFixed(2)})`);
        return;
      }

      if (orderType === 'LIMIT' && orderSide === 'BUY' && limitPrice > currentPrice) {
        setTradeError(`Limit price for buying cannot be greater than the current market price (₹${currentPrice.toFixed(2)})`);
        return;
      }

      if (orderType === 'OCO' && limitPrice <= currentPrice) {
        setTradeError(`Target price must be above the current market price (₹${currentPrice.toFixed(2)})`);
        return;
      }
    }

    if (orderType === 'STOP' || orderType === 'OCO') {
      if (stopPrice <= 0) {
        setTradeError('Stop price must be greater than 0');
        return;
      }

      if (stopPrice < lowerBound || stopPrice > upperBound) {
        setTradeError(`Stop price must be within ±25% of current price (₹${lowerBound.toFixed(2)} - ₹${upperBound.toFixed(2)})`);
        return;
      }

      const stopSide = orderType === 'OCO' ? 'SELL' : orderSide;
      if (stopSide === 'BUY' && stopPrice <= currentPrice) {
        setTradeError(`Stop price for buying must be above the current market price (₹${currentPrice.toFixed(2)})`);
        return;
      }
      if (stopSide === 'SELL' && stopPrice >= currentPrice) {
        setTradeError(`Stop price for selling must be below the current market price (₹${currentPrice.toFixed(2)})`);
        return;
      }
    }

    const price = orderType === 'MARKET'
      ? currentPrice
      : orderType === 'STOP'
        ? stopPrice
        : limitPrice;
    if (!price || price <= 0) {
      setTradeError('Price must be greater than 0');
      return;
    }

    const totalCost = price * quantity;

    if (orderSide === 'BUY' && totalCost > virtualBalance) {
      setTradeError(`Insufficient cash balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${virtualBalance.toFixed(2)}`);
      return;
    }

    if (orderSide === 'SELL') {
      const holding = holdings.find(h => h.symbol === selectedStock.symbol);
      const ownedQty = holding ? Number(holding.quantity) : 0;
      if (ownedQty < quantity) {
        setTradeError(`Insufficient shares to sell. You own ${ownedQty} shares of ${selectedStock.symbol}, but tried to sell ${quantity}.`);
        return;
      }
    }

    // Call API
    try {
      setTradeLoading(true);
      const postHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      if (orderType === 'OCO') {
        // Leg 1: SELL limit (take profit)
        const limitRes = await fetch(`${API_BASE_URL}/limit-orders`, {
          method: 'POST',
          headers: postHeaders,
          body: JSON.stringify({
            symbol: selectedStock.symbol,
            side: 'SELL',
            quantity: Number(quantity),
            limitPrice: Number(limitPrice),
            limit_price: Number(limitPrice)
          })
        });
        const limitData = await limitRes.json();
        if (!limitRes.ok) {
          throw new Error(limitData.message || 'Failed to place target limit order');
        }
        const limitId = limitData.data.id;

        // Leg 2: linked SELL stop (stop-loss); roll back the limit leg on failure
        const stopRes = await fetch(`${API_BASE_URL}/stop-orders`, {
          method: 'POST',
          headers: postHeaders,
          body: JSON.stringify({
            symbol: selectedStock.symbol,
            side: 'SELL',
            quantity: Number(quantity),
            stopPrice: Number(stopPrice),
            stop_price: Number(stopPrice),
            linkedLimitOrderId: limitId,
            linked_limit_order_id: limitId
          })
        });
        if (!stopRes.ok) {
          const stopData = await stopRes.json();
          await fetch(`${API_BASE_URL}/limit-orders/${limitId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          throw new Error(stopData.message || 'Failed to place stop-loss order');
        }
      } else {
        const endpoint = orderType === 'MARKET'
          ? '/orders'
          : orderType === 'LIMIT'
            ? '/limit-orders'
            : '/stop-orders';
        const payload = orderType === 'MARKET'
          ? { symbol: selectedStock.symbol, side: orderSide, quantity: Number(quantity) }
          : orderType === 'LIMIT'
            ? { symbol: selectedStock.symbol, side: orderSide, quantity: Number(quantity), target_price: Number(limitPrice), limitPrice: Number(limitPrice), limit_price: Number(limitPrice) }
            : { symbol: selectedStock.symbol, side: orderSide, quantity: Number(quantity), stopPrice: Number(stopPrice), stop_price: Number(stopPrice) };

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: postHeaders,
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Transaction failed');
        }
      }

      // Force positions and balance updates
      window.dispatchEvent(new Event('holdingsChanged'));
      window.dispatchEvent(new Event('balanceChanged'));
      fetchHoldings();

      if (orderSide === 'BUY') {
        setTradeSuccess(`Successfully placed order to BUY ${quantity} shares of ${selectedStock.symbol}.`);
      } else {
        setTradeSuccess(
          orderType === 'OCO'
            ? `Placed OCO pair for ${quantity} shares of ${selectedStock.symbol}: target ₹${Number(limitPrice).toFixed(2)} / stop-loss ₹${Number(stopPrice).toFixed(2)}. If one executes, the other cancels automatically.`
            : orderType === 'MARKET'
              ? `Successfully placed order to SELL ${quantity} shares of ${selectedStock.symbol}.`
              : `Successfully placed pending SELL ${orderType} order for ${quantity} shares of ${selectedStock.symbol} at ₹${(orderType === 'STOP' ? stopPrice : limitPrice).toFixed(2)}.`
        );
      }

    } catch (err) {
      setTradeError(err.message);
    } finally {
      setTradeLoading(false);
    }
  };

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .index-card {
          background: var(--color-bg-panel-0.6);
          border: 1px solid var(--color-white-0.07);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
          cursor: pointer;
          min-height: 100px;
        }
        .index-card:hover {
          background: var(--color-white-0.03);
          border-color: var(--color-white-0.12);
          transform: translateY(-2px);
        }
        .stock-row {
          display: grid;
          grid-template-columns: 1fr 120px 120px 100px 100px 40px;
          padding: 14px 20px;
          align-items: center;
          border-bottom: 1px solid var(--color-white-0.04);
          cursor: pointer;
          transition: background 0.15s;
        }
        .stock-row:hover {
          background: var(--color-white-0.025);
        }
        .gainer-card, .loser-card {
          background: var(--color-bg-panel-0.6);
          border: 1px solid var(--color-white-0.07);
          border-radius: 16px;
          padding: 16px 20px;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          padding: 20px;
        }
        .modal-card {
          width: 100%;
          max-width: 780px;
          max-height: 90vh;
          background: var(--color-bg-card);
          border: 1px solid var(--color-white-0.1);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow-y: auto;
        }
        .modal-close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          background: var(--color-white-0.05);
          border: 1px solid var(--color-white-0.08);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: all 0.2s;
          z-index: 10;
        }
        .modal-close-btn:hover {
          background: var(--color-white-0.1);
          color: var(--color-text-main);
          transform: rotate(90deg);
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .modal-bottom-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          border-top: 1px solid var(--color-white-0.08);
          padding-top: 20px;
        }
        .buy-sell-box {
          background: var(--color-white-0.02);
          border: 1px solid var(--color-white-0.07);
          border-radius: 14px;
          padding: 16px;
        }
        @media (max-width: 768px) {
          .modal-bottom-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}} />

      {/* Header and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
            Indian Markets
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Live index summaries and stock prices from NSE</p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-white-0.04)',
          border: '1px solid var(--color-white-0.08)',
          borderRadius: '8px',
          padding: '8px 14px',
          width: '280px'
        }}>
          <Search size={14} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search stocks by name or ticker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-main)',
              fontSize: '12px',
              fontFamily: 'DM Sans, sans-serif',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Indices Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {/* Nifty 50 Card */}
        {(() => {
          const indexStock = stocks.find(idx => idx.symbol === '^NSEI');
          if (!indexStock) return null;
          const niftyChg = indexStock.previousClose ? ((indexStock.lastPrice - indexStock.previousClose) / indexStock.previousClose) * 100 : 0;
          const niftyChgVal = (indexStock.lastPrice - indexStock.previousClose) || 0;
          const isNiftyPos = niftyChg >= 0;
          return (
            <div className="index-card" onClick={() => setSelectedStock(indexStock)}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>NIFTY 50</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '4px' }}>
                  ₹{(indexStock.lastPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: isNiftyPos ? 'var(--color-success)' : 'var(--color-error)', marginTop: '4px', fontWeight: 500 }}>
                  {isNiftyPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  <span>{isNiftyPos ? '+' : ''}{niftyChgVal.toFixed(2)} ({isNiftyPos ? '+' : ''}{niftyChg.toFixed(2)}%)</span>
                </div>
              </div>
              <div style={{ width: '120px', height: '45px' }}>
                {niftyHistory.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={niftyHistory}>
                      <YAxis type="number" domain={['dataMin - 15', 'dataMax + 15']} hide={true} />
                      <Area type="monotone" dataKey="price" stroke={isNiftyPos ? 'var(--color-success)' : 'var(--color-error)'} strokeWidth={1.5} fillOpacity={0.06} fill={isNiftyPos ? 'var(--color-success)' : 'var(--color-error)'} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })()}

        {/* Sensex Card */}
        {(() => {
          const indexStock = stocks.find(idx => idx.symbol === '^BSESN');
          if (!indexStock) return null;
          const sensexChg = indexStock.previousClose ? ((indexStock.lastPrice - indexStock.previousClose) / indexStock.previousClose) * 100 : 0;
          const sensexChgVal = (indexStock.lastPrice - indexStock.previousClose) || 0;
          const isSensexPos = sensexChg >= 0;
          return (
            <div className="index-card" onClick={() => setSelectedStock(indexStock)}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>SENSEX</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '4px' }}>
                  ₹{(indexStock.lastPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: isSensexPos ? 'var(--color-success)' : 'var(--color-error)', marginTop: '4px', fontWeight: 500 }}>
                  {isSensexPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  <span>{isSensexPos ? '+' : ''}{sensexChgVal.toFixed(2)} ({isSensexPos ? '+' : ''}{sensexChg.toFixed(2)}%)</span>
                </div>
              </div>
              <div style={{ width: '120px', height: '45px' }}>
                {sensexHistory.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sensexHistory}>
                      <YAxis type="number" domain={['dataMin - 50', 'dataMax + 50']} hide={true} />
                      <Area type="monotone" dataKey="price" stroke={isSensexPos ? 'var(--color-success)' : 'var(--color-error)'} strokeWidth={1.5} fillOpacity={0.06} fill={isSensexPos ? 'var(--color-success)' : 'var(--color-error)'} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Gainers & Losers Section */}
      {(() => {
        const regularStocks = filteredStocks.filter(s => !s.symbol.startsWith('^'));
        const stocksWithChange = regularStocks.map(stock => {
          const chg = stock.previousClose ? ((stock.lastPrice - stock.previousClose) / stock.previousClose) * 100 : 0;
          return { ...stock, chg };
        });
        const topGainers = [...stocksWithChange]
          .filter(s => s.chg > 0)
          .sort((a, b) => b.chg - a.chg)
          .slice(0, 4);
        const topLosers = [...stocksWithChange]
          .filter(s => s.chg < 0)
          .sort((a, b) => a.chg - b.chg)
          .slice(0, 4);

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }} className="max-md:grid-cols-1">
            {/* Top Gainers */}
            <div className="gainer-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                <TrendingUp size={12} /> Top Gainers (Daily High)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topGainers.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>No gainers today</div>
                ) : (
                  topGainers.map(stock => (
                    <div key={stock.symbol} className="hover:bg-[var(--color-white-0.03)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSelectedStock(stock)}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>{stock.symbol}</div>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{stock.companyName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--color-text-main)', fontWeight: 500 }}>₹{(stock.lastPrice || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 500 }}>+{stock.chg.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Losers */}
            <div className="loser-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-error)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                <TrendingDown size={12} /> Top Losers (Daily Low)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topLosers.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>No losers today</div>
                ) : (
                  topLosers.map(stock => (
                    <div key={stock.symbol} className="hover:bg-[var(--color-white-0.03)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSelectedStock(stock)}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>{stock.symbol}</div>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{stock.companyName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--color-text-main)', fontWeight: 500 }}>₹{(stock.lastPrice || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-error)', fontWeight: 500 }}>{stock.chg.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* All Stocks List */}
      {(() => {
        const regularStocks = filteredStocks.filter(s => !s.symbol.startsWith('^'));
        return (
          <div style={{
            background: 'var(--color-bg-panel-0.6)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              All Listed Equities
            </div>
            
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px 100px 100px 40px',
              padding: '8px 20px',
              borderBottom: '1px solid var(--color-white-0.06)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Company</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sector</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Day High / Low</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Price</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>24h Change</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Watch</div>
            </div>

            {/* Stock rows */}
            <div style={{ overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '12px' }}>Loading stocks...</div>
              ) : regularStocks.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '12px' }}>No equities match search</div>
              ) : (
                regularStocks.map(stock => {
                  const chg = stock.previousClose ? ((stock.lastPrice - stock.previousClose) / stock.previousClose) * 100 : 0;
                  const isPositive = chg >= 0;
                  const isStarred = watchlist.includes(stock.symbol);
                  return (
                    <div key={stock.symbol} className="stock-row" onClick={() => setSelectedStock(stock)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: isPositive ? 'var(--color-success-0.08)' : 'var(--color-error-0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isPositive ? 'var(--color-success)' : 'var(--color-error)'
                        }}>
                          {stock.symbol.split('.')[0].slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{stock.symbol}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {stock.companyName}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{stock.sector || 'Equities'}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-success)', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>
                          ₹{(stock.high || stock.lastPrice || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-error)', fontFamily: 'JetBrains Mono', fontWeight: 500, marginTop: '2px' }}>
                          ₹{(stock.low || stock.lastPrice || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                        ₹{(stock.lastPrice || 0).toFixed(2)}
                      </div>
                      <div style={{ textAlign: 'right', color: isPositive ? 'var(--color-success)' : 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>
                        {isPositive ? '+' : ''}{chg.toFixed(2)}%
                      </div>
                      <div style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleWatchlist(stock)}
                          className="btn-glass"
                          style={{
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Star
                            size={12}
                            fill={isStarred ? 'var(--color-warning)' : 'none'}
                            color={isStarred ? 'var(--color-warning)' : 'var(--color-text-dim)'}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Floating Stock Details Modal Overlay */}
      {selectedStock && (
        <div className="modal-overlay" onClick={() => setSelectedStock(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedStock(null)}>
              <X size={14} />
            </button>
            
            <div className="modal-body">
              {/* Header Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-white-0.06)', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '24px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
                      {selectedStock.companyName}
                    </h1>
                    <button
                      onClick={() => handleToggleWatchlist(selectedStock)}
                      className="btn-glass"
                      style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Star
                        size={16}
                        fill={watchlist.includes(selectedStock.symbol) ? 'var(--color-warning)' : 'none'}
                        color={watchlist.includes(selectedStock.symbol) ? 'var(--color-warning)' : 'var(--color-text-muted)'}
                      />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', background: 'var(--color-white-0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                      {selectedStock.symbol}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>
                      Sector: {selectedStock.sector || 'Financial Markets'}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '24px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    ₹{(selectedStock.lastPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: selectedStock.lastPrice >= selectedStock.previousClose ? 'var(--color-success)' : 'var(--color-error)',
                    marginTop: '4px'
                  }}>
                    {selectedStock.lastPrice >= selectedStock.previousClose ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>
                      {selectedStock.lastPrice >= selectedStock.previousClose ? '+' : ''}
                      {((selectedStock.lastPrice - selectedStock.previousClose) || 0).toFixed(2)} (
                      {selectedStock.previousClose ? (((selectedStock.lastPrice - selectedStock.previousClose) / selectedStock.previousClose) * 100).toFixed(2) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div style={{ height: '280px', width: '100%', position: 'relative' }}>
                {historyLoading ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    Loading history charts...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                        tick={{ fill: 'var(--color-text-dim)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fill: 'var(--color-text-dim)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-white-0.08)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--color-text-muted)', fontSize: '10px' }}
                        itemStyle={{ color: 'var(--color-text-main)', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                        labelFormatter={(l) => new Date(l).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="price" stroke="var(--color-accent)" strokeWidth={1.8} fillOpacity={1} fill="url(#chartGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bottom section: metrics & trading form */}
              <div className="modal-bottom-grid">
                {/* Left side: range sliders & performance details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Today's High/Low Range Slider */}
                  {(() => {
                    const low = Number(selectedStock.low || selectedStock.lastPrice || 0);
                    const high = Number(selectedStock.high || selectedStock.lastPrice || 0);
                    const current = Number(selectedStock.lastPrice || 0);
                    const range = high - low;
                    const percentage = range > 0 ? ((current - low) / range) * 100 : 50;

                    return (
                      <div style={{ background: 'var(--color-white-0.02)', border: '1px solid var(--color-white-0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                          <span>Today's Low</span>
                          <span>Today's High</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono' }}>₹{low.toFixed(2)}</span>
                          <div style={{ flex: 1, height: '4px', background: 'var(--color-white-0.08)', borderRadius: '2px', position: 'relative' }}>
                            <div style={{ 
                              position: 'absolute', 
                              left: `${Math.min(Math.max(percentage, 0), 100)}%`, 
                              top: '-4px', 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              background: current >= selectedStock.previousClose ? 'var(--color-success)' : 'var(--color-error)', 
                              border: '2px solid var(--color-bg-card)',
                              transform: 'translateX(-50%)',
                              boxShadow: '0 0 6px rgba(0,0,0,0.5)'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono' }}>₹{high.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Key Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', background: 'var(--color-white-0.01)', border: '1px solid var(--color-white-0.04)', borderRadius: '12px', padding: '16px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prev. Close</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: 'var(--color-text-main)', fontWeight: 500 }}>₹{(selectedStock.previousClose || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Price</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: 'var(--color-text-main)', fontWeight: 500 }}>₹{(selectedStock.open || selectedStock.lastPrice || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sector</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>{selectedStock.sector || 'Equities'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-success)', fontWeight: 500 }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-success)' }} />
                        Active
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Trading Form or Index Disclaimer */}
                <div>
                  {selectedStock.symbol.startsWith('^') ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      textAlign: 'center', 
                      gap: '12px', 
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-white-0.02)',
                      border: '1px solid var(--color-white-0.06)',
                      borderRadius: '16px',
                      padding: '24px',
                      height: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--color-warning-0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--color-warning-0.2)'
                      }}>
                        <ShieldAlert size={20} color="var(--color-warning)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>Index Trading Unavailable</div>
                        <p style={{ fontSize: '10px', lineHeight: 1.4, margin: 0 }}>
                          {selectedStock.symbol === '^NSEI' ? 'NIFTY 50' : 'SENSEX'} is a market index representing overall market performance and cannot be traded directly.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="buy-sell-box">
                      <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Buy/Sell toggles */}
                        <div style={{ display: 'flex', background: 'var(--color-white-0.04)', borderRadius: '8px', padding: '3px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setOrderSide('BUY');
                              // OCO (target + stop-loss) is SELL-only
                              if (orderType === 'OCO') setOrderType('MARKET');
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: orderSide === 'BUY' ? 'var(--color-success)' : 'transparent',
                              color: orderSide === 'BUY' ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            BUY
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderSide('SELL')}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: orderSide === 'SELL' ? 'var(--color-error)' : 'transparent',
                              color: orderSide === 'SELL' ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            SELL
                          </button>
                        </div>

                        {/* Market/Limit toggles */}
                        <div style={{ display: 'flex', background: 'var(--color-white-0.04)', borderRadius: '6px', padding: '2px', border: '1px solid var(--color-white-0.08)' }}>
                          <button
                            type="button"
                            onClick={() => setOrderType('MARKET')}
                            style={{
                              flex: 1,
                              padding: '6px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: orderType === 'MARKET' ? 'var(--color-accent)' : 'transparent',
                              color: orderType === 'MARKET' ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            Market
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('LIMIT')}
                            style={{
                              flex: 1,
                              padding: '6px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: orderType === 'LIMIT' ? 'var(--color-accent)' : 'transparent',
                              color: orderType === 'LIMIT' ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            Limit
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('STOP')}
                            style={{
                              flex: 1,
                              padding: '6px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: orderType === 'STOP' ? 'var(--color-accent)' : 'transparent',
                              color: orderType === 'STOP' ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            Stop
                          </button>
                          {orderSide === 'SELL' && (
                            <button
                              type="button"
                              onClick={() => setOrderType('OCO')}
                              style={{
                                flex: 1.2,
                                padding: '6px',
                                borderRadius: '4px',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: orderType === 'OCO' ? 'var(--color-accent)' : 'transparent',
                                color: orderType === 'OCO' ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                                transition: 'all 0.15s'
                              }}
                            >
                              Limit + SL
                            </button>
                          )}
                        </div>

                        {/* Inputs Row */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Qty</label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={quantity}
                              onChange={(e) => setQuantity(Number(e.target.value))}
                              style={{
                                width: '100%',
                                background: 'var(--color-white-0.04)',
                                border: '1px solid var(--color-white-0.08)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                color: 'var(--color-text-main)',
                                boxSizing: 'border-box',
                                fontSize: '12px',
                                fontFamily: 'JetBrains Mono'
                              }}
                            />
                          </div>
                          {(orderType === 'LIMIT' || orderType === 'OCO') && (
                            <div style={{ flex: 1.2 }}>
                              <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                {orderType === 'OCO' ? 'Target (₹)' : 'Price (₹)'}
                              </label>
                              <input
                                type="number"
                                step="0.05"
                                value={limitPrice}
                                onChange={(e) => setLimitPrice(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  background: 'var(--color-white-0.04)',
                                  border: '1px solid var(--color-white-0.08)',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  color: 'var(--color-text-main)',
                                  boxSizing: 'border-box',
                                  fontSize: '12px',
                                  fontFamily: 'JetBrains Mono'
                                }}
                              />
                            </div>
                          )}
                          {(orderType === 'STOP' || orderType === 'OCO') && (
                            <div style={{ flex: 1.2 }}>
                              <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                {orderType === 'OCO' ? 'Stop-Loss (₹)' : 'Stop Price (₹)'}
                              </label>
                              <input
                                type="number"
                                step="0.05"
                                value={stopPrice}
                                onChange={(e) => setStopPrice(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  background: 'var(--color-white-0.04)',
                                  border: '1px solid var(--color-white-0.08)',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  color: 'var(--color-text-main)',
                                  boxSizing: 'border-box',
                                  fontSize: '12px',
                                  fontFamily: 'JetBrains Mono'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {orderType === 'STOP' && (
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            {orderSide === 'BUY'
                              ? `Triggers when price rises to ₹${Number(stopPrice || 0).toFixed(2)} or above; executes at market price.`
                              : `Triggers when price falls to ₹${Number(stopPrice || 0).toFixed(2)} or below; executes at market price.`}
                          </div>
                        )}

                        {orderType === 'OCO' && (
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            Sells at target ₹{Number(limitPrice || 0).toFixed(2)} or stop-loss ₹{Number(stopPrice || 0).toFixed(2)} — whichever hits first. The other order cancels automatically.
                          </div>
                        )}

                        {/* Summary values */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--color-white-0.03)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            <span>Available Cash</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                              ₹{virtualBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                            <span>Est. Cost</span>
                            <span style={{ color: 'var(--color-text-main)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                              ₹{((orderType === 'MARKET' ? selectedStock.lastPrice : orderType === 'STOP' ? stopPrice : limitPrice) * quantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Feedback messages */}
                        {tradeError && (
                          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-error-0.08)', border: '1px solid var(--color-error-0.15)', padding: '6px 10px', borderRadius: '6px', color: 'var(--color-error)', fontSize: '10px', alignItems: 'center' }}>
                            <ShieldAlert size={12} style={{ flexShrink: 0 }} />
                            <span>{tradeError}</span>
                          </div>
                        )}

                        {tradeSuccess && (
                          <div style={{ background: 'var(--color-success-0.08)', border: '1px solid var(--color-success-0.15)', padding: '6px 10px', borderRadius: '6px', color: 'var(--color-success)', fontSize: '10px', textAlign: 'center' }}>
                            {tradeSuccess}
                          </div>
                        )}

                        {/* Submit button */}
                        <button
                          type="submit"
                          disabled={tradeLoading}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-text-inverted)',
                            cursor: tradeLoading ? 'not-allowed' : 'pointer',
                            background: tradeLoading
                              ? 'var(--color-text-muted)'
                              : orderSide === 'BUY'
                                ? 'var(--color-success)'
                                : 'var(--color-error)',
                            boxShadow: tradeLoading
                              ? 'none'
                              : `0 3px 8px ${orderSide === 'BUY' ? 'var(--color-success-0.2)' : 'var(--color-error-0.2)'}`,
                            transition: 'transform 0.1s',
                            opacity: tradeLoading ? 0.7 : 1
                          }}
                          className={tradeLoading ? "" : "active:scale-[0.98]"}
                        >
                          {tradeLoading 
                            ? 'PROCESSING...' 
                            : orderSide === 'BUY' 
                              ? 'BUY STOCK' 
                              : 'SELL STOCK'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
