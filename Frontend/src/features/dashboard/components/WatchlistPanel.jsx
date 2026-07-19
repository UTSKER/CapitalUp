import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Star, Search, Bell } from 'lucide-react';
import { applyMarketUpdateToStock, listenToMarketUpdates } from '../../../services/marketRealtime';

export function WatchlistPanel({ onSelectStock }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const [search, setSearch] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    const freshToken = localStorage.getItem('capitalup-access-token') || token;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/watchlist`, {
        headers: { Authorization: `Bearer ${freshToken}` }
      });
      const result = await res.json();
      if (res.ok) {
        const list = Array.isArray(result) ? result : (result.data || []);
        setWatchlist(list);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();

    const handleWatchlistChanged = () => {
      fetchWatchlist();
    };

    const stopRealtime = listenToMarketUpdates(({ symbol, stockData }) => {
      setWatchlist((prevWatchlist) => prevWatchlist.map((item) => {
        if (item.symbol !== symbol) return item;
        const updatedItem = applyMarketUpdateToStock(item, { symbol, stockData });
        return {
          ...item,
          ...updatedItem,
          price: Number(updatedItem.lastPrice ?? updatedItem.price ?? item.price ?? stockData.price),
          previousClose: Number(updatedItem.previousClose ?? item.previousClose ?? stockData.previousClose ?? stockData.price),
        };
      }));
    });

    window.addEventListener('watchlistChanged', handleWatchlistChanged);
    return () => {
      window.removeEventListener('watchlistChanged', handleWatchlistChanged);
      stopRealtime();
    };
  }, [API_BASE_URL, token]);

  const handleRemoveFromWatchlist = async (symbol) => {
    const freshToken = localStorage.getItem('capitalup-access-token') || token;
    // Optimistic removal
    setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
    window.dispatchEvent(new CustomEvent('watchlistChanged'));

    try {
      const res = await fetch(`${API_BASE_URL}/watchlist/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${freshToken}` }
      });
      if (!res.ok) {
        fetchWatchlist();
      }
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
      fetchWatchlist();
    }
  };

  const filtered = watchlist.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'visible' }}>
      {/* Floating Ambient Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '180px',
        height: '180px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 80%)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      <style>{`
        @keyframes watchRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(var(--color-bg-panel-rgb), 0.75)',
          border: '1px solid rgba(var(--color-white-rgb), 0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
        
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Watchlist
            </div>
            <button
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '4px 10px',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
              <Bell size={10} /> Alerts
            </button>
          </div>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              transition: 'all 0.25s'
            }}
            onFocusIn={(e) => {
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
            onFocusOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            }}>
            <Search size={13} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Search watchlist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text-main)',
                fontSize: '12.5px',
                fontFamily: 'DM Sans, sans-serif',
                flex: 1
              }} />
          </div>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 70px 50px',
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
          {['Symbol', 'Price', 'Change', ''].map((h, i) =>
            <div
              key={h}
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: 'var(--color-text-dim)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: i > 0 ? 'right' : 'left'
              }}>
              {h}
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '11px' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '11px' }}>Watchlist empty</div>
          ) : (
            filtered.map((stock, idx) => {
              const price = Number(stock.price || 0);
              const prev = Number(stock.previousClose || 0);
              const pct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
              const isPositive = pct >= 0;

              return (
                <div
                  key={stock.symbol}
                  onClick={() => onSelectStock && onSelectStock(stock)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 70px 50px',
                    padding: '12px 20px',
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    cursor: onSelectStock ? 'pointer' : 'default',
                    animation: `watchRowIn 0.3s ease-out ${idx * 0.04}s both`
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}>
                  
                  {/* Symbol + name */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{stock.symbol}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      {stock.name || 'Indian Market Stock'}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>
                      ₹{price.toFixed(2)}
                    </span>
                  </div>

                  {/* Change */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                      {isPositive ? <ArrowUpRight size={11} color="var(--color-success)" /> : <ArrowDownRight size={11} color="var(--color-error)" />}
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          color: isPositive ? 'var(--color-success)' : 'var(--color-error)',
                          fontWeight: 500
                        }}>
                        {isPositive ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Star */}
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWatchlist(stock.symbol);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { 
                        e.currentTarget.style.transform = 'scale(1.2) rotate(15deg)'; 
                        e.currentTarget.style.filter = 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))';
                      }}
                      onMouseLeave={(e) => { 
                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; 
                        e.currentTarget.style.filter = 'none';
                      }}>
                      <Star
                        size={13}
                        color="var(--color-warning)"
                        fill="var(--color-warning)"
                      />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

