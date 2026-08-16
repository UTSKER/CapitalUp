import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function AssetMoversCards({ onSelectStock }) {
  const token = localStorage.getItem('capitalup-access-token');

  const [tab, setTab] = useState('gainers');
  const [moversData, setMoversData] = useState({ topGainers: [], topLosers: [], allMovers: [] });
  const [loading, setLoading] = useState(true);

  const fetchMovers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/portfolio/top-movers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.data) {
        setMoversData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch top movers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovers();
  }, [token]);

  const currentList = tab === 'gainers'
    ? moversData.topGainers
    : tab === 'losers'
      ? moversData.topLosers
      : moversData.allMovers;

  // Mini SVG Sparkline Generator
  const renderSparkline = (points, isPositive) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 110;
    const height = 36;

    const pathD = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 8) - 4;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    const strokeColor = isPositive ? 'var(--color-success)' : 'var(--color-error)';

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        padding: '24px'
      }}
    >
      {/* Header with Tab Selectors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} color="var(--color-accent)" />
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Market Movers & Sparklines
          </div>
        </div>

        <div style={{ display: 'flex', background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {[
            { id: 'gainers', label: 'Top Gainers' },
            { id: 'losers', label: 'Top Losers' },
            { id: 'all', label: 'All Watchlist' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: tab === t.id ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif',
                background: tab === t.id ? 'var(--color-accent)' : 'transparent',
                color: tab === t.id ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Asset Sparkline Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '12px' }}>Loading market movers...</div>
      ) : currentList.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '12px' }}>No market movers available</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
          {currentList.slice(0, 6).map((item) => {
            const isPos = item.pctChange >= 0;
            return (
              <div
                key={item.symbol}
                onClick={() => onSelectStock({ symbol: item.symbol, companyName: item.companyName, lastPrice: item.price }, 'BUY')}
                style={{
                  background: 'var(--color-white-0.03)',
                  border: '1px solid var(--color-white-0.06)',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-white-0.06)';
                  e.currentTarget.style.borderColor = 'var(--color-accent-0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-white-0.03)';
                  e.currentTarget.style.borderColor = 'var(--color-white-0.06)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.symbol}
                      {item.isHolding && (
                        <span style={{ fontSize: '9px', background: 'var(--color-accent-0.2)', color: 'var(--color-accent)', padding: '1px 4px', borderRadius: '3px' }}>HOLDING</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                      {item.companyName}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: isPos ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)',
                      border: `1px solid ${isPos ? 'var(--color-success-0.2)' : 'var(--color-error-0.2)'}`,
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: isPos ? 'var(--color-success)' : 'var(--color-error)'
                    }}
                  >
                    {isPos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {isPos ? '+' : ''}{item.pctChange.toFixed(2)}%
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>Price</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  {renderSparkline(item.sparkline, isPos)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
