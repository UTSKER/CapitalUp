import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'var(--color-bg-panel-0.97)',
          border: '1px solid var(--color-white-0.12)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 8px 24px var(--color-black-0.4)'
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '3px' }}>
          {data.dateStr || data.timestamp}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>
          ₹{Number(data.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    );
  }
  return null;
};

export function PortfolioChart({ summary }) {
  const token = localStorage.getItem('capitalup-access-token');

  const [frame, setFrame] = useState('1M');
  const [perfData, setPerfData] = useState({
    currentValue: 0,
    startValue: 0,
    change: 0,
    pctChange: 0,
    positive: true,
    points: []
  });
  const [loading, setLoading] = useState(true);

  const fetchPerformance = async (selectedFrame) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/portfolio/performance?period=${selectedFrame}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.data) {
        setPerfData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio performance history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance(frame);
  }, [frame, token]);

  const isPos = perfData.positive;
  const strokeColor = isPos ? 'var(--color-accent)' : 'var(--color-error)';
  const totalReturn = summary?.portfolio_return || 0;
  const unrealizedPnl = summary?.total_profit_loss || 0;
  const realizedPnl = summary?.realized_pnl || 0;
  const investedVal = summary?.total_invested || 0;

  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        padding: '24px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Portfolio Performance Trend
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              letterSpacing: '-0.5px',
              marginBottom: '4px'
            }}
          >
            ₹{Number(summary?.total_portfolio_value || perfData.currentValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: isPos ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)',
                border: `1px solid ${isPos ? 'var(--color-success-0.2)' : 'var(--color-error-0.2)'}`,
                borderRadius: '6px',
                padding: '3px 8px'
              }}
            >
              {isPos ? <ArrowUpRight size={12} color="var(--color-success)" /> : <ArrowDownRight size={12} color="var(--color-error)" />}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: isPos ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                {isPos ? '+' : ''}₹{Math.abs(perfData.change).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({isPos ? '+' : ''}{perfData.pctChange.toFixed(2)}%)
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              in selected {frame} period
            </span>
          </div>
        </div>

        {/* Timeframe selector tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--color-white-0.04)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}
        >
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setFrame(tf)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: tf === frame ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif',
                background: tf === frame ? 'var(--color-accent)' : 'transparent',
                color: tf === frame ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                transition: 'all 0.2s'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '240px', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: '8px', fontSize: '13px' }}>
            <RefreshCw size={16} className="animate-spin" color="var(--color-accent)" />
            Loading performance chart...
          </div>
        ) : perfData.points.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Historical performance isn't available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={perfData.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="75%" stopColor={strokeColor} stopOpacity={0.04} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-white-0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="dateStr"
                tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                width={56}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-accent-0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill="url(#perfGrad)"
                dot={false}
                activeDot={{ r: 5, fill: strokeColor, stroke: 'var(--color-bg-base)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom metrics summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-white-0.05)' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>Portfolio Return</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: totalReturn >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>Unrealized P&L</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: unrealizedPnl >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {unrealizedPnl >= 0 ? '+' : ''}₹{Math.abs(unrealizedPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>Realized P&L</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: realizedPnl >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {realizedPnl >= 0 ? '+' : ''}₹{Math.abs(realizedPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>Total Invested</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
            ₹{investedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}
