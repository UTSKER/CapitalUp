import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import { listenToMarketUpdates } from '../../../services/marketRealtime';

const sectorColors = {
  Technology: 'var(--color-accent)',
  Financials: 'var(--color-success)',
  Consumer: 'var(--color-warning)'
};

export function PositionsTable({ stocks, onSelectStock }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('value');
  const [sortDir, setSortDir] = useState('desc');

  const fetchHoldings = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.data?.holdings) {
        const mapped = result.data.holdings.map(h => {
          const invested = Number(h.invested_value || 0);
          const currentVal = Number(h.current_value || 0);
          const pnl = Number(h.profit_loss || 0);
          const pnlPct = Number(h.profit_loss_percentage || 0);
          
          return {
            ticker: h.symbol,
            name: h.symbol === 'TCS.NS' ? 'Tata Consultancy Services' : h.symbol === 'INFY.NS' ? 'Infosys' : h.symbol === 'SBIN.NS' ? 'State Bank of India' : h.symbol + ' Holdings',
            sector: h.symbol === 'TCS.NS' || h.symbol === 'INFY.NS' ? 'Technology' : 'Financials',
            shares: h.quantity,
            avgCost: h.average_buy_price,
            current: h.current_price,
            value: currentVal,
            pnl: pnl,
            pnlPct: pnlPct,
            weight: 0
          };
        });

        const totalPortfolioVal = mapped.reduce((acc, curr) => acc + curr.value, 0);
        const mappedWithWeights = mapped.map(item => ({
          ...item,
          weight: totalPortfolioVal > 0 ? parseFloat(((item.value / totalPortfolioVal) * 100).toFixed(1)) : 0
        }));

        setPositions(mappedWithWeights);
      }
    } catch (err) {
      console.error('Failed to fetch holdings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();

    const stopRealtime = listenToMarketUpdates(({ symbol, stockData }) => {
      setPositions((prevPositions) => prevPositions.map((position) => {
        if (position.ticker !== symbol) return position;
        const price = Number(stockData.price);
        const shares = Number(position.shares || 0);
        const avgCost = Number(position.avgCost || 0);
        return {
          ...position,
          current: price,
          value: price * shares,
          pnl: (price - avgCost) * shares,
          pnlPct: avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0,
        };
      }));
    });

    window.addEventListener('holdingsChanged', fetchHoldings);
    return () => {
      window.removeEventListener('holdingsChanged', fetchHoldings);
      stopRealtime();
    };
  }, [token, API_BASE_URL]);

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

  const handleAddPosition = () => {
    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'markets' }));
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
          onClick={handleAddPosition}
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
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '12px' }}>Loading positions...</div>
        ) : positions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px', fontSize: '12px' }}>
            No holdings found. Click 'Add Position' to start trading.
          </div>
        ) : (
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
                <th style={{ padding: '0 24px 10px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((pos, idx) => {
                const isPos = pos.pnl >= 0;
                const matchingStock = stocks?.find(s => s.symbol === pos.ticker);
                const displayName = matchingStock ? matchingStock.companyName : pos.name;
                const displaySector = matchingStock ? matchingStock.sector : pos.sector;

                return (
                  <tr
                    key={pos.ticker}
                        onClick={() => {
                          const stockObj = matchingStock || { symbol: pos.ticker, companyName: pos.name, lastPrice: pos.current };
                          onSelectStock(stockObj, 'BUY');
                        }}
                        style={{
                          borderBottom: idx < sorted.length - 1 ? '1px solid var(--color-white-0.04)' : 'none',
                          transition: 'background 0.15s',
                          cursor: 'pointer'
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
                                background: `${sectorColors[displaySector] || 'var(--color-text-muted)'}15`,
                                border: `1px solid ${sectorColors[displaySector] || 'var(--color-text-muted)'}30`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: sectorColors[displaySector] || 'var(--color-text-muted)',
                                letterSpacing: '0.02em',
                                flexShrink: 0
                              }}>
                              {pos.ticker.slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '1px' }}>{pos.ticker}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                {displayName}
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
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--color-text-sub)' }}>₹{pos.avgCost.toFixed(2)}</span>
                        </td>

                        {/* Current Price */}
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--color-text-main)', fontWeight: 500 }}>₹{pos.current.toFixed(2)}</span>
                        </td>

                        {/* Market Value */}
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                            ₹{pos.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* P&L */}
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                            {isPos ? <ArrowUpRight size={12} color="var(--color-success)" /> : <ArrowDownRight size={12} color="var(--color-error)" />}
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: isPos ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                              ₹{Math.abs(pos.pnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                        {/* Actions */}
                        <td style={{ padding: '14px 24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                const stockObj = matchingStock || { symbol: pos.ticker, companyName: displayName, lastPrice: pos.current };
                                onSelectStock(stockObj, 'BUY');
                              }}
                              style={{
                                background: 'var(--color-success-0.08)',
                                border: '1px solid var(--color-success-0.2)',
                                borderRadius: '6px',
                                color: 'var(--color-success)',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '4px 10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-success-0.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-success-0.08)'; }}
                            >
                              BUY
                            </button>
                            <button
                              onClick={() => {
                                const stockObj = matchingStock || { symbol: pos.ticker, companyName: displayName, lastPrice: pos.current };
                                onSelectStock(stockObj, 'SELL');
                              }}
                              style={{
                                background: 'var(--color-error-0.08)',
                                border: '1px solid var(--color-error-0.2)',
                                borderRadius: '6px',
                                color: 'var(--color-error)',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '4px 10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-error-0.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-error-0.08)'; }}
                            >
                              SELL
                            </button>
                          </div>
                        </td>
                      </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
