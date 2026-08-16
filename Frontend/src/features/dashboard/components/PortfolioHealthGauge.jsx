import { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export function PortfolioHealthGauge({ summary }) {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const healthScore = Number(summary?.health_score ?? 75.0);
  const healthStatus = summary?.health_status || (healthScore >= 75 ? 'Healthy' : healthScore >= 55 ? 'Balanced' : 'High Concentration');

  // Gauge calculations for semicircular arc (180 degrees)
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half circle
  const scoreClamped = Math.max(0, Math.min(100, healthScore));
  const strokeDashoffset = circumference - (scoreClamped / 100) * circumference;

  const getStatusColor = (status) => {
    if (status === 'Healthy') return 'var(--color-success)';
    if (status === 'Balanced') return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const statusColor = getStatusColor(healthStatus);

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
        position: 'relative',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Portfolio Health
          </div>
          <button
            onClick={() => setShowFormulaModal(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              transition: 'color 0.2s'
            }}
            title="View Health Score Calculation Formula"
          >
            <Info size={13} color="var(--color-text-muted)" />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
            borderRadius: '100px',
            padding: '3px 10px'
          }}
        >
          <ShieldCheck size={12} color={statusColor} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor }}>
            {healthStatus}
          </span>
        </div>
      </div>

      {/* Semicircular SVG Gauge Container */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '10px 0 6px' }}>
        <svg width="180" height="105" viewBox="0 0 180 105" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="healthGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="var(--color-white-0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress Gradient Arc */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="url(#healthGaugeGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gaugeGlow)"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>

        {/* Center Score Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--color-text-main)',
              letterSpacing: '-0.5px',
              lineHeight: 1
            }}
          >
            {healthScore.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 500, letterSpacing: '0.04em' }}>
            HEALTH SCORE
          </div>
        </div>
      </div>

      {/* Metric Breakdown Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-white-0.06)' }}>
        <div style={{ background: 'var(--color-white-0.03)', padding: '6px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Diversification</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-sub)', fontFamily: 'JetBrains Mono, monospace' }}>
            {summary?.holdings_count > 0 ? (summary.holdings_count >= 3 ? 'Optimal' : 'Moderate') : 'Low'}
          </div>
        </div>
        <div style={{ background: 'var(--color-white-0.03)', padding: '6px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Cash Ratio</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-sub)', fontFamily: 'JetBrains Mono, monospace' }}>
            {summary?.balance_distribution ? `${((summary.balance_distribution.cash / summary.balance_distribution.total) * 100).toFixed(0)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Formula Modal Overlay */}
      {showFormulaModal && (
        <>
          <div
            onClick={() => setShowFormulaModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 998 }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '20px',
              right: '20px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-white-0.15)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
              zIndex: 999
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
              Portfolio Health Score Formula
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
              The CapitalUp Health Score is calculated dynamically using 4 key portfolio characteristics:
            </p>
            <ul style={{ fontSize: '11px', color: 'var(--color-text-sub)', paddingLeft: '16px', margin: '0 0 10px 0', lineHeight: 1.6 }}>
              <li><strong>Asset Diversification (35%):</strong> Evaluated using the Herfindahl-Hirschman Index (HHI) of holdings weight.</li>
              <li><strong>Cash Allocation Ratio (25%):</strong> Optimal liquidity buffer between 10%–35% cash balance.</li>
              <li><strong>Unrealized P&L Performance (20%):</strong> Positive baseline return trend bonus.</li>
              <li><strong>Asset Count (20%):</strong> Position count score.</li>
            </ul>
            <button
              onClick={() => setShowFormulaModal(false)}
              style={{
                width: '100%',
                background: 'var(--color-accent)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--color-text-inverted)',
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
