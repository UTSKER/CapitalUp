import { Wallet, PieChart, Lock } from 'lucide-react';

export function BalanceDistributionCard({ summary }) {
  const total = Number(summary?.total_portfolio_value || 0);
  const invested = Number(summary?.current_value || 0);
  const cash = Number(summary?.balance || 0);
  const hold = Number(summary?.hold_balance || 0);

  const investedPct = total > 0 ? ((invested / total) * 100).toFixed(1) : '0.0';
  const cashPct = total > 0 ? ((cash / total) * 100).toFixed(1) : '0.0';
  const holdPct = total > 0 ? ((hold / total) * 100).toFixed(1) : '0.0';

  return (
    <div
      style={{
        background: 'var(--color-bg-panel-0.6)',
        border: '1px solid var(--color-white-0.07)',
        borderRadius: '14px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Balance Distribution
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)' }} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Invested</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', marginLeft: '6px' }} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Cash</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            Total Portfolio Balance
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.5px' }}>
            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Visual Progress Stacked Bar */}
        <div style={{ height: '10px', width: '100%', background: 'var(--color-white-0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex', gap: '2px', marginBottom: '20px' }}>
          <div style={{ width: `${investedPct}%`, background: 'var(--color-accent)', borderRadius: '4px 0 0 4px', transition: 'width 0.6s ease' }} title={`Invested: ₹${invested.toLocaleString()} (${investedPct}%)`} />
          <div style={{ width: `${cashPct}%`, background: 'var(--color-success)', borderRadius: hold > 0 ? '0' : '0 4px 4px 0', transition: 'width 0.6s ease' }} title={`Available Cash: ₹${cash.toLocaleString()} (${cashPct}%)`} />
          {hold > 0 && (
            <div style={{ width: `${holdPct}%`, background: 'var(--color-warning)', borderRadius: '0 4px 4px 0', transition: 'width 0.6s ease' }} title={`Reserved Balance: ₹${hold.toLocaleString()} (${holdPct}%)`} />
          )}
        </div>
      </div>

      {/* Grid of balance details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-white-0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-accent-0.1)', border: '1px solid var(--color-accent-0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart size={15} color="var(--color-accent)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Invested Capital</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              ₹{invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 600 }}>{investedPct}% of total</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-success-0.1)', border: '1px solid var(--color-success-0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={15} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Available Cash</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              ₹{cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 600 }}>{cashPct}% of total</div>
          </div>
        </div>

        {hold > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: 'span 2' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-warning-0.1)', border: '1px solid var(--color-warning-0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={15} color="var(--color-warning)" />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Locked / Hold Balance</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--color-warning)' }}>
                ₹{hold.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({holdPct}%)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
