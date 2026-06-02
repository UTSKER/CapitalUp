import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from
'recharts';
import { ArrowUpRight } from 'lucide-react';

const timeframes = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'All'];

const generateData = (points, start, end, volatility) =>
  Array.from({ length: points }, (_, i) => {
    const trend = start + (end - start) * (i / (points - 1));
    const noise =
      Math.sin(i * 1.2) * volatility +
      Math.cos(i * 0.7) * volatility * 0.6 +
      Math.sin(i * 2.1) * volatility * 0.3;
    return { i, value: Math.round(trend + noise) };
  });

const frameData = {
  '1D': {
    data: generateData(48, 2822553, 2847392, 8000),
    labels: Array.from({ length: 48 }, (_, i) => `${Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`),
    start: '2,822,553',
    change: '+24,839',
    pct: '+0.88%',
    positive: true
  },
  '1W': {
    data: generateData(35, 2780000, 2847392, 20000),
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    start: '2,780,000',
    change: '+67,392',
    pct: '+2.42%',
    positive: true
  },
  '1M': {
    data: generateData(30, 2690000, 2847392, 35000),
    labels: Array.from({ length: 30 }, (_, i) => `May ${i + 3}`),
    start: '2,690,000',
    change: '+157,392',
    pct: '+5.85%',
    positive: true
  },
  '3M': {
    data: generateData(60, 2450000, 2847392, 55000),
    labels: ['Mar', 'Apr', 'May', 'Jun'],
    start: '2,450,000',
    change: '+397,392',
    pct: '+16.22%',
    positive: true
  },
  'YTD': {
    data: generateData(90, 2310000, 2847392, 75000),
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    start: '2,310,000',
    change: '+537,392',
    pct: '+23.26%',
    positive: true
  },
  '1Y': {
    data: generateData(120, 2200000, 2847392, 90000),
    labels: ['Jun 25', 'Sep 25', 'Dec 25', 'Mar 26', 'Jun 26'],
    start: '2,200,000',
    change: '+647,392',
    pct: '+29.43%',
    positive: true
  },
  'All': {
    data: generateData(150, 850000, 2847392, 120000),
    labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    start: '850,000',
    change: '+1,997,392',
    pct: '+235.0%',
    positive: true
  }
};

const CustomTooltip = ({ active, payload, coordinate }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div
        style={{
          background: 'rgba(28,33,38,0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
        
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: '#F7F8FA' }}>
          ${val.toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

export function PortfolioChart() {
  const [frame, setFrame] = useState('1M');
  const current = frameData[frame];

  return (
    <div
      style={{
        background: 'rgba(28,33,38,0.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        padding: '24px'
      }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#7A828E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Portfolio Performance
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '28px',
              fontWeight: 400,
              color: '#F7F8FA',
              letterSpacing: '-0.5px',
              marginBottom: '4px'
            }}>
            $2,847,392.50
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(24,195,126,0.1)',
                border: '1px solid rgba(24,195,126,0.2)',
                borderRadius: '6px',
                padding: '3px 8px'
              }}>
              
              <ArrowUpRight size={12} color="#18C37E" />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#18C37E', fontWeight: 500 }}>
                +${current.change} ({current.pct})
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#7A828E' }}>vs ${current.start}</span>
          </div>
        </div>

        {/* Timeframe tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}>
          
          {timeframes.map((tf) =>
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
                background: tf === frame ? '#4F8CFF' : 'transparent',
                color: tf === frame ? '#fff' : '#7A828E',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (tf !== frame) e.currentTarget.style.color = '#B2BAC5';
              }}
              onMouseLeave={(e) => {
                if (tf !== frame) e.currentTarget.style.color = '#7A828E';
              }}>
              {tf}
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={current.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.22} />
                <stop offset="75%" stopColor="#4F8CFF" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false} />
            
            <XAxis
              dataKey="i"
              tick={{ fill: '#4A5260', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd" />
            
            <YAxis
              tick={{ fill: '#4A5260', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              width={52} />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(79,140,255,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4F8CFF"
              strokeWidth={2}
              fill="url(#perfGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#4F8CFF', stroke: 'rgba(79,140,255,0.3)', strokeWidth: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Total Return', value: '+29.43%', color: '#18C37E' },
          { label: 'Unrealized P&L', value: '+$648K', color: '#18C37E' },
          { label: 'Realized P&L', value: '+$142K', color: '#18C37E' },
          { label: 'Sharpe Ratio', value: '1.84', color: '#F7F8FA' }
        ].map((m) =>
          <div key={m.label}>
            <div style={{ fontSize: '10px', color: '#7A828E', marginBottom: '4px', fontWeight: 500 }}>{m.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: m.color }}>{m.value}</div>
          </div>
        )}
      </div>
    </div>
  );
}
