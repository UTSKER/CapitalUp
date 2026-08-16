import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Wallet, PieChart, ShieldCheck, TrendingUp, Layers, RefreshCw } from 'lucide-react';
import { PortfolioChart } from './PortfolioChart';
import { PortfolioHealthGauge } from './PortfolioHealthGauge';
import { BalanceDistributionCard } from './BalanceDistributionCard';
import { AllocationChart } from './AllocationChart';
import { AssetMoversCards } from './AssetMoversCards';
import { PositionsTable } from './PositionsTable';
import { listenToMarketUpdates } from '../../../services/marketRealtime';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function PortfolioDashboard({ stocks, onSelectStock, userName }) {
  const token = localStorage.getItem('capitalup-access-token');

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortfolioData = useCallback(async () => {
    let activeToken = localStorage.getItem('capitalup-access-token');
    if (!activeToken) return;

    try {
      setError(null);
      let res = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      if (res.status === 401) {
        const refreshToken = localStorage.getItem('capitalup-refresh-token');
        if (refreshToken) {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          const refreshResult = await refreshRes.json();
          if (refreshRes.ok && refreshResult.accessToken) {
            localStorage.setItem('capitalup-access-token', refreshResult.accessToken);
            activeToken = refreshResult.accessToken;
            res = await fetch(`${API_BASE_URL}/portfolio`, {
              headers: { Authorization: `Bearer ${activeToken}` }
            });
          }
        }
      }

      const result = await res.json();
      if (res.ok && result.data) {
        setPortfolioData(result.data);
      } else {
        setError(result.message || 'Failed to load portfolio data');
      }
    } catch (err) {
      console.error('Failed to fetch full portfolio data:', err);
      setError('Network error loading portfolio. Click retry.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortfolioData();

    // Listen to real-time market updates via WebSocket
    const stopRealtime = listenToMarketUpdates(({ symbol, stockData }) => {
      setPortfolioData((prev) => {
        if (!prev || !prev.holdings) return prev;

        let priceUpdated = false;
        let newTodayPnl = 0;
        let newCurrentValue = 0;

        const updatedHoldings = prev.holdings.map((h) => {
          const newPrice = h.symbol === symbol ? Number(stockData.price) : h.current_price;
          if (h.symbol === symbol) priceUpdated = true;

          const investedVal = h.invested_value;
          const currentHoldingVal = Number(h.quantity) * newPrice;
          const pnl = currentHoldingVal - investedVal;
          const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

          const prevClose = h.previous_close || newPrice;
          const holdingTodayPnl = (newPrice - prevClose) * Number(h.quantity);

          newTodayPnl += holdingTodayPnl;
          newCurrentValue += currentHoldingVal;

          return {
            ...h,
            current_price: newPrice,
            current_value: currentHoldingVal,
            profit_loss: pnl,
            profit_loss_percentage: Number(pnlPct.toFixed(2)),
            today_pnl: holdingTodayPnl,
          };
        });

        if (!priceUpdated) return prev;

        const balance = prev.summary?.balance || 0;
        const totalPortfolioVal = balance + newCurrentValue;
        const totalInvested = prev.summary?.total_invested || 0;
        const totalPnl = newCurrentValue - totalInvested;
        const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        const todayPnlPct = (totalPortfolioVal - newTodayPnl) > 0 ? (newTodayPnl / (totalPortfolioVal - newTodayPnl)) * 100 : 0;

        // Recalculate weights
        const holdingsWithNewWeights = updatedHoldings.map(h => ({
          ...h,
          portfolio_weight: totalPortfolioVal > 0 ? Number(((h.current_value / totalPortfolioVal) * 100).toFixed(1)) : 0
        }));

        return {
          ...prev,
          summary: {
            ...prev.summary,
            total_portfolio_value: totalPortfolioVal,
            current_value: newCurrentValue,
            total_profit_loss: totalPnl,
            total_profit_loss_percentage: Number(totalPnlPct.toFixed(2)),
            today_pnl: newTodayPnl,
            today_pnl_percentage: Number(todayPnlPct.toFixed(2)),
            risk_asset_exposure: newCurrentValue,
            risk_asset_exposure_pct: totalPortfolioVal > 0 ? Number(((newCurrentValue / totalPortfolioVal) * 100).toFixed(1)) : 0,
            balance_distribution: {
              ...prev.summary?.balance_distribution,
              invested: newCurrentValue,
              total: totalPortfolioVal
            }
          },
          holdings: holdingsWithNewWeights
        };
      });
    });

    window.addEventListener('balanceChanged', fetchPortfolioData);
    window.addEventListener('holdingsChanged', fetchPortfolioData);

    return () => {
      window.removeEventListener('balanceChanged', fetchPortfolioData);
      window.removeEventListener('holdingsChanged', fetchPortfolioData);
      stopRealtime();
    };
  }, [fetchPortfolioData]);

  const summary = portfolioData?.summary || {};
  const holdings = portfolioData?.holdings || [];

  const totalValue = summary.total_portfolio_value || (summary.balance || 0) + (summary.current_value || 0);
  const todayPnl = summary.today_pnl || 0;
  const todayPnlPct = summary.today_pnl_percentage || 0;
  const totalPnl = summary.total_profit_loss || 0;
  const totalPnlPct = summary.total_profit_loss_percentage || 0;
  const isTodayPos = todayPnl >= 0;
  const isTotalPos = totalPnl >= 0;

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. PORTFOLIO HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
            Good day, {userName || 'Investor'} — {currentDateStr}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '32px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px', margin: 0 }}>
              Portfolio Intelligence
            </h1>

            {/* Today's Gain / Loss Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isTodayPos ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)',
                border: `1px solid ${isTodayPos ? 'var(--color-success-0.2)' : 'var(--color-error-0.2)'}`,
                borderRadius: '8px',
                padding: '5px 12px'
              }}
            >
              {isTodayPos ? <ArrowUpRight size={14} color="var(--color-success)" /> : <ArrowDownRight size={14} color="var(--color-error)" />}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: isTodayPos ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                {isTodayPos ? '+' : ''}₹{Math.abs(todayPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isTodayPos ? '+' : ''}{todayPnlPct.toFixed(2)}% Today)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '10px', padding: '8px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invested</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              ₹{Number(summary.total_invested || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '10px', padding: '8px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Available Cash</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-success)' }}>
              ₹{Number(summary.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '10px', padding: '8px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Return</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: isTotalPos ? 'var(--color-success)' : 'var(--color-error)' }}>
              {isTotalPos ? '+' : ''}{totalPnlPct.toFixed(2)}%
            </div>
          </div>

          <div style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '10px', padding: '8px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Holdings</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', textAlign: 'right' }}>
              {summary.holdings_count || holdings.length}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-0.1)', border: '1px solid var(--color-error-0.2)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-error)', fontSize: '13px' }}>
          <span>{error}</span>
          <button
            onClick={fetchPortfolioData}
            style={{ background: 'var(--color-error)', border: 'none', borderRadius: '6px', color: 'var(--color-text-inverted)', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* 2. MAIN PORTFOLIO PERFORMANCE CHART */}
      <PortfolioChart summary={summary} />

      {/* 3. MIDDLE ROW (2 Columns): HEALTH GAUGE + BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.2fr)', gap: '20px' }}>
        
        {/* Health Gauge */}
        <PortfolioHealthGauge summary={summary} />

        {/* Portfolio Breakdown Card */}
        <div
          style={{
            background: 'var(--color-bg-panel-0.6)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Portfolio Analytics & Breakdown
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Risk Asset Exposure */}
            <div style={{ background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Risk Asset Exposure</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                ₹{Number(summary.risk_asset_exposure || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '2px', fontWeight: 500 }}>
                {summary.risk_asset_exposure_pct || 0}% of portfolio
              </div>
            </div>

            {/* Total Value Invested */}
            <div style={{ background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Total Value Invested</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                ₹{Number(summary.total_invested || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Principal capital
              </div>
            </div>

            {/* Available Cash */}
            <div style={{ background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Available Liquidity</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600, color: 'var(--color-success)' }}>
                ₹{Number(summary.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px', fontWeight: 500 }}>
                Instant buying power
              </div>
            </div>

            {/* Unrealized P&L */}
            <div style={{ background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Unrealized P&L</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 600, color: isTotalPos ? 'var(--color-success)' : 'var(--color-error)' }}>
                {isTotalPos ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '11px', color: isTotalPos ? 'var(--color-success)' : 'var(--color-error)', marginTop: '2px', fontWeight: 500 }}>
                {isTotalPos ? '+' : ''}{totalPnlPct.toFixed(2)}% net return
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BALANCE DISTRIBUTION & ALLOCATION ROW (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1fr)', gap: '20px' }}>
        <BalanceDistributionCard summary={summary} />
        <AllocationChart summary={summary} holdings={holdings} />
      </div>

      {/* 5. TOP MOVERS & SPARKLINES CARDS */}
      <AssetMoversCards onSelectStock={onSelectStock} />

      {/* 6. POSITIONS & HOLDINGS TABLE */}
      <PositionsTable stocks={stocks} onSelectStock={onSelectStock} />

    </div>
  );
}
