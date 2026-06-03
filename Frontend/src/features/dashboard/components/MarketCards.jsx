import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const genMini = (points, up) =>
  Array.from({ length: points }, (_, i) => ({
    i,
    v: 100 + (up ? 1 : -1) * (i / points) * 20 + Math.sin(i * 1.5) * 5 + Math.cos(i * 0.8) * 3
  }));

const markets = [
  {
    label: 'S&P 500',
    value: '5,248.32',
    change: '+33.64',
    pct: '+0.64%',
    positive: true,
    data: genMini(20, true)
  },
  {
    label: 'NASDAQ',
    value: '16,742.45',
    change: '+185.09',
    pct: '+1.12%',
    positive: true,
    data: genMini(20, true)
  },
  {
    label: 'DOW',
    value: '39,127.80',
    change: '+89.60',
    pct: '+0.23%',
    positive: true,
    data: genMini(20, true)
  },
  {
    label: 'VIX',
    value: '14.82',
    change: '-0.50',
    pct: '-3.24%',
    positive: false,
    data: genMini(20, false)
  },
  {
    label: 'Gold',
    value: '2,341.20',
    change: '+12.40',
    pct: '+0.53%',
    positive: true,
    data: genMini(20, true)
  },
  {
    label: '10Y Treasury',
    value: '4.312%',
    change: '-0.024',
    pct: '-0.55%',
    positive: false,
    data: genMini(20, false)
  }
];

export function MarketCards() {
  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        padding: '20px 24px'
      }}>
      
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Market Overview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }} className="max-xl:grid-cols-3 max-md:grid-cols-2">
        {markets.map((m) =>
          <div
            key={m.label}
            style={{
              background: 'var(--color-white-0.03)',
              border: '1px solid var(--color-white-0.06)',
              borderRadius: '10px',
              padding: '14px',
              transition: 'all 0.2s',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-white-0.05)';
              e.currentTarget.style.borderColor = 'var(--color-white-0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-white-0.03)';
              e.currentTarget.style.borderColor = 'var(--color-white-0.06)';
            }}>
            
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '4px' }}>
              {m.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '8px' }}>
              {m.positive ? <ArrowUpRight size={11} color="var(--color-success)" /> : <ArrowDownRight size={11} color="var(--color-error)" />}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: m.positive ? 'var(--color-success)' : 'var(--color-error)' }}>
                {m.pct}
              </span>
            </div>
            <div style={{ height: '32px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`mkt-${m.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={m.positive ? 'var(--color-success)' : 'var(--color-error)'} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={m.positive ? 'var(--color-success)' : 'var(--color-error)'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={m.positive ? 'var(--color-success)' : 'var(--color-error)'}
                    strokeWidth={1.5}
                    fill={`url(#mkt-${m.label})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
