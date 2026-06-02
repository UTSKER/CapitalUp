import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const allocationData = [
  { name: 'Equities', value: 65, color: '#4F8CFF', amount: '$1,850,805' },
  { name: 'Fixed Income', value: 20, color: '#18C37E', amount: '$569,478' },
  { name: 'Cash', value: 8, color: '#F5B942', amount: '$227,791' },
  { name: 'Alternatives', value: 7, color: '#A78BFA', amount: '$199,317' }
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{ background: 'rgba(28,33,38,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: '12px', color: '#B2BAC5', marginBottom: '3px' }}>{d.name}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: '#F7F8FA', fontWeight: 500 }}>{d.amount}</div>
        <div style={{ fontSize: '11px', color: d.color, marginTop: '2px' }}>{d.value}%</div>
      </div>
    );
  }
  return null;
};

export function AllocationChart() {
  return (
    <div
      style={{
        background: 'rgba(28,33,38,0.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        padding: '24px',
        height: '100%'
      }}>
      
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#7A828E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '20px' }}>
        Asset Allocation
      </div>

      {/* Donut chart */}
      <div style={{ height: '160px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}>
              
              {allocationData.map((entry) =>
                <Cell key={entry.name} fill={entry.color} />
              )}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
          
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 500, color: '#F7F8FA', lineHeight: 1 }}>
            $2.85M
          </div>
          <div style={{ fontSize: '9px', color: '#7A828E', marginTop: '3px', fontWeight: 500, letterSpacing: '0.05em' }}>
            TOTAL
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
        {allocationData.map((d) =>
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#B2BAC5' }}>{d.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#7A828E', fontFamily: 'JetBrains Mono, monospace' }}>{d.amount}</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  color: d.color,
                  background: `${d.color}18`,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  minWidth: '36px',
                  textAlign: 'right'
                }}>
                {d.value}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
