import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Star, Search, Bell } from 'lucide-react';

export function WatchlistPanel() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const [search, setSearch] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
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

    window.addEventListener('watchlistChanged', handleWatchlistChanged);
    return () => {
      window.removeEventListener('watchlistChanged', handleWatchlistChanged);
    };
  }, [API_BASE_URL, token]);

  const handleRemoveFromWatchlist = async (symbol) => {
    try {
      const res = await fetch(`${API_BASE_URL}/watchlist/${symbol}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
      }
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  const filtered = watchlist.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
      
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-white-0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContext: 'space-between', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Watchlist
          </div>
          <button
            style={{
              background: 'var(--color-accent-0.1)',
              border: '1px solid var(--color-accent-0.2)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: 'var(--color-accent)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
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
            background: 'var(--color-white-0.04)',
            border: '1px solid var(--color-white-0.08)',
            borderRadius: '8px',
            padding: '8px 12px'
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
              fontSize: '12px',
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
          padding: '8px 20px',
          borderBottom: '1px solid var(--color-white-0.05)'
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
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '11px' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '11px' }}>Watchlist empty</div>
        ) : (
          filtered.map((stock, idx) => {
            const price = Number(stock.price || 0);
            const prev = Number(stock.previousClose || 0);
            const pct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
            const isPositive = pct >= 0;

            return (
              <div
                key={stock.symbol}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 70px 50px',
                  padding: '10px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-white-0.04)' : 'none',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.025)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                
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
                    onClick={() => handleRemoveFromWatchlist(stock.symbol)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'inline-flex',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
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
  );
}

