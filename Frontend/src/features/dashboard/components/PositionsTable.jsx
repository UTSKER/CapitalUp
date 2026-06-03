import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';

const positions = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', shares: 542, avgCost: 143.20, current: 189.87, value: 102849.54, pnl: 25261.14, pnlPct: 32.53, weight: 3.6 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', shares: 180, avgCost: 320.14, current: 415.23, value: 74741.40, pnl: 17119.80, pnlPct: 29.72, weight: 2.6 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', shares: 120, avgCost: 450.00, current: 876.50, value: 105180.00, pnl: 51180.00, pnlPct: 94.78, weight: 3.7 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', shares: 200, avgCost: 356.80, current: 418.70, value: 83740.00, pnl: 12380.00, pnlPct: 17.34, weight: 2.9 },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', shares: 130, avgCost: 175.20, current: 201.45, value: 26188.50, pnl: 3412.50, pnlPct: 14.98, weight: 0.9 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', shares: 95, avgCost: 130.42, current: 178.42, value: 16949.90, pnl: 4560.10, pnlPct: 36.80, weight: 0.6 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', shares: 75, avgCost: 158.30, current: 192.65, value: 14448.75, pnl: 2576.25, pnlPct: 21.70, weight: 0.5 },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', shares: 88, avgCost: 220.40, current: 279.80, value: 24622.40, pnl: 5227.20, pnlPct: 26.96, weight: 0.9 }
];

const sectorColors = {
  Technology: 'var(--color-accent)',
  Financials: 'var(--color-success)',
  Consumer: 'var(--color-warning)'
};

export function PositionsTable() {
  const [sort, setSort] = useState('value');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = [...positions].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const handleSort = (key) => {
    if (sort === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else {
      setSort(key);
      setSortDir('desc');
    }
  };

  const headerStyle = (key) => ({
    fontSize: '10px',
    fontWeight: 600,
    color: sort === key ? 'var(--color-accent)' : 'var(--color-text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    padding: '0 12px 10px',
    background: 'none',
    border: 'none',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'color 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  });

  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
      
      {/* Table header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Positions — {positions.length} Holdings
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'var(--color-accent-0.1)',
            border: '1px solid var(--color-accent-0.2)',
            borderRadius: '7px',
            padding: '6px 12px',
            color: 'var(--color-accent)',
            fontSize: '12px',
            fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-0.1)'; }}>
          
          <Plus size={12} />
          Add Position
        </button>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-white-0.06)' }}>
              <th style={{ padding: '0 24px 10px', textAlign: 'left' }}>
                <button onClick={() => handleSort('ticker')} style={headerStyle('ticker')}>
                  Asset {sort === 'ticker' ? sortDir === 'asc' ? '↑' : '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '0 12px 10px', textAlign: 'right' }}>
                <span style={{ ...headerStyle('value'), justifyContent: 'flex-end' }}>Shares</span>
              </th>
              <th style={{ padding: '0 12px 10px', textAlign: 'right' }}>
                <span style={{ ...headerStyle('value'), justifyContent: 'flex-end' }}>Avg Cost</span>
              </th>
              <th style={{ padding: '0 12px 10px', textAlign: 'right' }}>
                <span style={{ ...headerStyle('value'), justifyContent: 'flex-end' }}>Price</span>
              </th>
              <th style={{ padding: '0 12px 10px', textAlign: 'right' }}>
                <button onClick={() => handleSort('value')} style={{ ...headerStyle('value'), justifyContent: 'flex-end', marginLeft: 'auto' }}>
                  Mkt Value {sort === 'value' ? sortDir === 'asc' ? '↑' : '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '0 12px 10px', textAlign: 'right' }}>
                <button onClick={() => handleSort('pnl')} style={{ ...headerStyle('pnl'), justifyContent: 'flex-end', marginLeft: 'auto' }}>
                  P&L {sort === 'pnl' ? sortDir === 'asc' ? '↑' : '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '0 12px 10px', textAlign: 'right' }}>
                <button onClick={() => handleSort('pnlPct')} style={{ ...headerStyle('pnlPct'), justifyContent: 'flex-end', marginLeft: 'auto' }}>
                  Return {sort === 'pnlPct' ? sortDir === 'asc' ? '↑' : '↓' : ''}
                </button>
              </th>
              <th style={{ padding: '0 24px 10px', textAlign: 'right' }}>
                <button onClick={() => handleSort('weight')} style={{ ...headerStyle('weight'), justifyContent: 'flex-end', marginLeft: 'auto' }}>
                  Weight {sort === 'weight' ? sortDir === 'asc' ? '↑' : '↓' : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pos, idx) => {
              const isPos = pos.pnl >= 0;
              return (
                <tr
                  key={pos.ticker}
                  style={{
                    borderBottom: idx < sorted.length - 1 ? '1px solid var(--color-white-0.04)' : 'none',
                    transition: 'background 0.15s',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.025)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  
                  {/* Asset */}
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: `${sectorColors[pos.sector] || 'var(--color-text-muted)'}15`,
                          border: `1px solid ${sectorColors[pos.sector] || 'var(--color-text-muted)'}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: sectorColors[pos.sector] || 'var(--color-text-muted)',
                          letterSpacing: '0.02em',
                          flexShrink: 0
                        }}>
                        {pos.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '1px' }}>{pos.ticker}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {pos.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Shares */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--color-text-sub)' }}>{pos.shares.toLocaleString()}</span>
                  </td>

                  {/* Avg Cost */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--color-text-sub)' }}>${pos.avgCost.toFixed(2)}</span>
                  </td>

                  {/* Current Price */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--color-text-main)', fontWeight: 500 }}>${pos.current.toFixed(2)}</span>
                  </td>

                  {/* Market Value */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                      ${pos.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* P&L */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                      {isPos ? <ArrowUpRight size={12} color="var(--color-success)" /> : <ArrowDownRight size={12} color="var(--color-error)" />}
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: isPos ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                        ${Math.abs(pos.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>

                  {/* Return % */}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isPos ? 'var(--color-success)' : 'var(--color-error)',
                        background: isPos ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)',
                        padding: '3px 7px',
                        borderRadius: '5px'
                      }}>
                      {isPos ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                    </span>
                  </td>

                  {/* Weight */}
                  <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <div style={{ width: '40px', height: '3px', background: 'var(--color-white-0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(pos.weight / 4 * 100, 100)}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-text-muted)', width: '28px', textAlign: 'right' }}>
                        {pos.weight}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
