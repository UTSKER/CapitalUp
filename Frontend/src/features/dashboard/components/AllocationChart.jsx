import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PALETTE = [
  '#3B82F6', // Electric Blue
  '#10B981', // Emerald Green
  '#8B5CF6', // Purple/Cyan
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{ background: 'var(--color-bg-panel-0.97)', border: '1px solid var(--color-white-0.12)', borderRadius: '8px', padding: '10px 14px', boxShadow: '0 8px 24px var(--color-black-0.4)' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-sub)', marginBottom: '3px', fontWeight: 600 }}>{d.name}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: 'var(--color-text-main)', fontWeight: 600 }}>
          ₹{Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '11px', color: d.color, marginTop: '2px', fontWeight: 500 }}>{d.value}% of portfolio</div>
      </div>
    );
  }
  return null;
};

export function AllocationChart({ summary, holdings = [] }) {
  const totalVal = Number(summary?.total_portfolio_value || 0);
  const cashVal = Number(summary?.balance || 0);

  // Map real user holdings to allocation chart data
  const chartData = holdings.map((h, idx) => {
    const val = Number(h.current_value || 0);
    const pct = totalVal > 0 ? Number(((val / totalVal) * 100).toFixed(1)) : 0;
    return {
      name: h.symbol,
      value: pct,
      amount: val,
      color: PALETTE[idx % PALETTE.length]
    };
  });

  // Add Cash Balance segment
  if (cashVal > 0 && totalVal > 0) {
    const cashPct = Number(((cashVal / totalVal) * 100).toFixed(1));
    chartData.push({
      name: 'Cash Balance',
      value: cashPct,
      amount: cashVal,
      color: '#10B981' // Green for cash
    });
  }

  // Fallback if no holdings or balance
  const displayData = chartData.length > 0 ? chartData : [
    { name: 'Available Cash', value: 100, amount: cashVal, color: '#10B981' }
  ];

  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Portfolio Allocation Breakdown
      </div>

      {/* Donut chart */}
      <div style={{ height: '170px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {displayData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1 }}>
            ₹{(totalVal / 1000).toFixed(1)}K
          </div>
          <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 600, letterSpacing: '0.05em' }}>
            TOTAL
          </div>
        </div>
      </div>

      {/* Legend list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', maxHeight: '140px', overflowY: 'auto' }}>
        {displayData.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-sub)', fontWeight: 500 }}>{d.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                ₹{Number(d.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: d.color,
                  background: `${d.color}18`,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  minWidth: '38px',
                  textAlign: 'right'
                }}
              >
                {d.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
