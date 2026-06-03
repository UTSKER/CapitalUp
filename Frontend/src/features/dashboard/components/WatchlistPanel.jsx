import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Star, Search, Bell } from 'lucide-react';

const watchlistData = [
  { ticker: 'AAPL', name: 'Apple Inc.', price: 189.87, change: 2.34, pct: 2.34, vol: '64.2M', mktCap: '2.94T', positive: true },
  { ticker: 'MSFT', name: 'Microsoft Corp.', price: 415.23, change: 3.58, pct: 0.87, vol: '22.1M', mktCap: '3.08T', positive: true },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 876.50, change: 34.62, pct: 4.12, vol: '48.3M', mktCap: '2.16T', positive: true },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 178.42, change: -0.41, pct: -0.23, vol: '28.7M', mktCap: '2.22T', positive: false },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 192.65, change: 2.74, pct: 1.44, vol: '35.4M', mktCap: '2.04T', positive: true },
  { ticker: 'TSLA', name: 'Tesla Inc.', price: 248.30, change: -4.72, pct: -1.87, vol: '89.6M', mktCap: '793B', positive: false },
  { ticker: 'META', name: 'Meta Platforms', price: 512.40, change: 7.23, pct: 1.43, vol: '19.2M', mktCap: '1.30T', positive: true },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', price: 418.70, change: 1.43, pct: 0.34, vol: '4.1M', mktCap: '898B', positive: true }
];

export function WatchlistPanel() {
  const [search, setSearch] = useState('');
  const [starred, setStarred] = useState(['AAPL', 'NVDA', 'MSFT']);

  const filtered = watchlistData.filter(
    (s) =>
      s.ticker.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
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
            placeholder="Search ticker or name..."
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
        {filtered.map((stock, idx) => {
          const isStarred = starred.includes(stock.ticker);
          return (
            <div
              key={stock.ticker}
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
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{stock.ticker}</span>
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-white-0.04)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      letterSpacing: '0.04em'
                    }}>
                    {stock.mktCap}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                  {stock.name}
                </div>
              </div>

              {/* Price */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>
                  ${stock.price.toFixed(2)}
                </span>
              </div>

              {/* Change */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                  {stock.positive ? <ArrowUpRight size={11} color="var(--color-success)" /> : <ArrowDownRight size={11} color="var(--color-error)" />}
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                      color: stock.positive ? 'var(--color-success)' : 'var(--color-error)',
                      fontWeight: 500
                    }}>
                    {stock.positive ? '+' : ''}{stock.pct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Star */}
              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() =>
                    setStarred((prev) =>
                      isStarred ? prev.filter((t) => t !== stock.ticker) : [...prev, stock.ticker]
                    )
                  }
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
                    color={isStarred ? 'var(--color-warning)' : 'var(--color-text-dim)'}
                    fill={isStarred ? 'var(--color-warning)' : 'none'}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
