import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  ArrowUpRight, ArrowRight, Shield, Zap, BarChart3,
  Eye, FileText, TrendingUp, Star, Globe, CheckCircle, Lock,
  Cpu, ChevronRight, ChevronUp } from
'lucide-react';

/* ─── CSS ─────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes ticker-move {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .tx-ticker { animation: ticker-move 48s linear infinite; }
  .tx-ticker:hover { animation-play-state: paused; }

  @keyframes tx-float {
    0%, 100% { transform: perspective(1200px) rotateY(-5deg) rotateX(3deg) translateY(0px); }
    50%       { transform: perspective(1200px) rotateY(-5deg) rotateX(3deg) translateY(-10px); }
  }
  .tx-card-float { animation: tx-float 7s ease-in-out infinite; }

  @keyframes tx-pulse-dot {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--color-success-0.4); }
    50% { opacity: 0.8; box-shadow: 0 0 0 6px var(--color-success-0); }
  }
  .tx-live-dot { animation: tx-pulse-dot 2s ease-in-out infinite; }

  @keyframes tx-shimmer {
    from { background-position: -200% 0; }
    to   { background-position: 200% 0; }
  }

  @keyframes tx-notification-in {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .tx-notif { animation: tx-notification-in 0.4s ease forwards; }
`;

/* ─── DATA ──────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  { label: 'S&P 500', value: '5,248.32', change: '+0.64%', up: true },
  { label: 'NASDAQ', value: '16,742.45', change: '+1.12%', up: true },
  { label: 'DOW', value: '39,127.80', change: '+0.23%', up: true },
  { label: 'AAPL', value: '189.87', change: '+2.34%', up: true },
  { label: 'MSFT', value: '415.23', change: '+0.87%', up: true },
  { label: 'NVDA', value: '876.50', change: '+4.12%', up: true },
  { label: 'GOOGL', value: '178.42', change: '-0.23%', up: false },
  { label: 'TSLA', value: '248.30', change: '-1.87%', up: false },
  { label: 'META', value: '512.40', change: '+1.43%', up: true },
  { label: 'JPM', value: '201.45', change: '+0.62%', up: true },
  { label: 'GLD', value: '2,341.20', change: '+0.53%', up: true },
  { label: '10Y Yield', value: '4.312%', change: '-0.55%', up: false },
  { label: 'EUR/USD', value: '1.0842', change: '+0.18%', up: true },
  { label: 'VIX', value: '14.82', change: '-3.24%', up: false },
  { label: 'BRK.B', value: '418.70', change: '+0.34%', up: true },
  { label: 'AMZN', value: '192.65', change: '+1.44%', up: true }
];

const HERO_CHART = Array.from({ length: 60 }, (_, i) => {
  const base = 2_200_000, end = 2_847_392;
  const trend = base + (end - base) * i / 59;
  const noise = Math.sin(i * 0.9) * 52_000 + Math.cos(i * 1.6) * 28_000 + Math.sin(i * 0.4) * 14_000;
  return { i, v: Math.round(trend + noise) };
});

const HERO_POSITIONS = [
  { ticker: 'NVDA', price: '876.50', pct: '+4.12%', barW: '88%', up: true },
  { ticker: 'AAPL', price: '189.87', pct: '+2.34%', barW: '72%', up: true },
  { ticker: 'MSFT', price: '415.23', pct: '+0.87%', barW: '56%', up: true },
  { ticker: 'GOOGL', price: '178.42', pct: '-0.23%', barW: '18%', up: false }
];

const ALLOCATION = [
  { label: 'Equities', pct: 65, color: 'var(--color-accent)' },
  { label: 'Fixed Income', pct: 20, color: 'var(--color-success)' },
  { label: 'Cash', pct: 8, color: 'var(--color-warning)' },
  { label: 'Alternatives', pct: 7, color: '#A78BFA' }
];

const STATS = [
  { value: '$14.2B+', label: 'Assets Under Management', sub: '+$1.2B this quarter' },
  { value: '180K+', label: 'Active Investors', sub: 'Across 47 countries' },
  { value: '0.02%', label: 'Average Annual Fee', sub: 'vs industry avg 0.85%' },
  { value: '99.99%', label: 'Platform Uptime', sub: 'Backed by SLA' }
];

const FEATURES = [
  { icon: Zap, title: 'Real-Time Intelligence', desc: 'Live market feeds, AI-driven signals, and institutional-grade analytics updated every 250ms across 50,000+ global instruments.', accent: 'var(--color-accent)' },
  { icon: BarChart3, title: 'Portfolio Analytics', desc: 'Deep attribution analysis, factor exposure, benchmark comparison, and performance decomposition across any time horizon.', accent: 'var(--color-success)' },
  { icon: Shield, title: 'Risk Management', desc: 'Comprehensive VaR calculations, stress testing, correlation matrices, and tail-risk monitoring to protect your capital.', accent: 'var(--color-warning)' },
  { icon: Eye, title: 'Smart Screeners', desc: 'Custom watchlists with 400+ filters, intelligent price alerts, and real-time sentiment signals from global news sources.', accent: '#A78BFA' },
  { icon: Cpu, title: 'Tax Optimization', desc: 'Automated tax-loss harvesting, wash-sale rule prevention, and detailed tax reporting across all linked accounts.', accent: 'var(--color-accent)' },
  { icon: FileText, title: 'Institutional Research', desc: 'Analyst reports, earnings transcripts, SEC filings, and quantitative factor research — unified in one workspace.', accent: 'var(--color-success)' }
];

const TESTIMONIALS = [
  { quote: 'CapitalUp operates at a level I previously only had access to at my prime brokerage desk. The analytics depth is exceptional.', name: 'Marcus Chen', role: 'Former Portfolio Manager · 18 yrs experience', r: 5 },
  { quote: 'The risk tooling is precisely what serious private investors need. VaR, stress tests, and factor exposure all in one panel.', name: 'Priya Anand', role: 'Independent Wealth Manager · $220M AUM', r: 5 },
  { quote: 'Finally a platform that respects investor intelligence. The data quality and execution precision is unmatched at this price point.', name: 'James Whitmore', role: 'PE Professional · LP in 9 Funds', r: 5 }
];

/* ─── TICKER ────────────────────────────────────────────────────── */
function MarketTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ background: '#0D0F11', borderBottom: '1px solid var(--color-white-0.05)', height: '30px', overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 102 }}>
      {/* fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(90deg, #0D0F11, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(-90deg, #0D0F11, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div className="tx-ticker" style={{ display: 'flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
        {items.map((item, i) =>
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 20px', borderRight: '1px solid var(--color-white-0.04)' }}>
            <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}>{item.label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-text-sub)', fontWeight: 400 }}>{item.value}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: item.up ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
              {item.up ? '▲' : '▼'} {item.change}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── NAV ────────────────────────────────────────────────────────── */
function Nav({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'relative',
      height: '60px', display: 'flex', alignItems: 'center', padding: '0 48px',
      justifyContent: 'space-between',
      background: scrolled ? 'var(--color-bg-nav-0.94)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--color-white-0.05)' : '1px solid transparent',
      transition: 'all 0.3s ease',
      zIndex: 101
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px var(--color-accent-0.3)'
        }}>
          <TrendingUp size={17} color="var(--color-text-inverted)" strokeWidth={2.5} />
        </div>
        <div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>CapitalUp</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'var(--color-accent)', fontWeight: 600, letterSpacing: '0.12em', display: 'block', lineHeight: 1, marginTop: '1px' }}>GROW·CAPITAL·SMARTLY</span>
        </div>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {['Features', 'Markets', 'Pricing', 'Research', 'About'].map((l) =>
          <button key={l} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 450, transition: 'color 0.2s', letterSpacing: '0.01em' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--color-text-main)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}>{l}</button>
        )}
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={() => onNavigate('login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-sub)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, padding: '8px 14px', borderRadius: '8px', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.target.style.color = 'var(--color-text-main)'; e.target.style.background = 'var(--color-white-0.04)'; }}
          onMouseLeave={(e) => { e.target.style.color = 'var(--color-text-sub)'; e.target.style.background = 'none'; }}>
          Sign In
        </button>
        <button onClick={() => onNavigate('register')}
          style={{
            background: 'var(--color-accent)', border: 'none', cursor: 'pointer', color: 'var(--color-text-inverted)',
            fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            padding: '9px 20px', borderRadius: '8px', transition: 'all 0.22s',
            boxShadow: '0 0 0 1px var(--color-accent-0.35), 0 4px 14px var(--color-accent-0.28)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3D7BF0'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-0.5), 0 8px 24px var(--color-accent-0.38)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-0.35), 0 4px 14px var(--color-accent-0.28)'; }}>
          Start Investing
        </button>
      </div>
    </nav>
  );
}

/* ─── HERO DASHBOARD PREVIEW ──────────────────────────────────────── */
function HeroDashboard() {
  return (
    <div style={{ position: 'relative', flex: '0 0 54%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ambient glow behind card */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%', right: '10%', bottom: '15%',
        background: 'radial-gradient(ellipse at center, var(--color-accent-0.16) 0%, var(--color-success-0.06) 50%, transparent 80%)',
        filter: 'blur(48px)', pointerEvents: 'none'
      }} />

      {/* Main dashboard card */}
      <div className="tx-card-float" style={{
        width: '100%', maxWidth: '560px',
        background: 'var(--color-bg-panel-0.96)',
        border: '1px solid var(--color-white-0.1)',
        borderRadius: '18px',
        boxShadow: '0 0 0 1px var(--color-white-0.04), 0 48px 120px -24px var(--color-black-0.8), 0 0 80px var(--color-accent-0.06)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Inner top edge highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, var(--color-white-0.14) 50%, transparent 95%)', pointerEvents: 'none' }} />

        {/* Mini browser/app nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid var(--color-white-0.05)',
          background: 'var(--color-bg-nav-0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={11} color="var(--color-text-inverted)" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)' }}>CapitalUp</span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Overview', 'Portfolio', 'Markets'].map((item, i) =>
              <span key={item} style={{ fontSize: '11px', color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: i === 0 ? 500 : 400 }}>{item}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['var(--color-error-0.7)', 'rgba(245,185,66,0.7)', 'var(--color-success-0.7)'].map((c, i) =>
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
            )}
          </div>
        </div>

        {/* Portfolio header */}
        <div style={{ padding: '18px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>Total Portfolio Value</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '26px', fontWeight: 500, color: 'var(--color-text-main)', letterSpacing: '-0.5px', marginBottom: '5px' }}>$2,847,392.50</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--color-success-0.1)', border: '1px solid var(--color-success-0.2)', borderRadius: '5px', padding: '3px 8px' }}>
                <ArrowUpRight size={11} color="var(--color-success)" />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>+$24,839.20 · +0.88%</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>today</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div className="tx-live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 500 }}>Live</span>
          </div>
        </div>

        {/* Area chart */}
        <div style={{ height: '110px', paddingBottom: '4px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HERO_CHART} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={1.8} fill="url(#hg1)" dot={false}
                activeDot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-white-0.05)' }} />

        {/* Two-column bottom */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: 0 }}>
          {/* Positions */}
          <div style={{ padding: '14px 16px 16px', borderRight: '1px solid var(--color-white-0.05)' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Top Positions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {HERO_POSITIONS.map((p) =>
                <div key={p.ticker} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--color-white-0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0 }}>{p.ticker.slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-main)' }}>{p.ticker}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: p.up ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>{p.pct}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--color-white-0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: p.barW, height: '100%', background: p.up ? 'var(--color-accent)' : 'var(--color-error)', borderRadius: '2px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Allocation */}
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Allocation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {ALLOCATION.map((a) =>
                <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: a.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', flex: 1 }}>{a.label}</span>
                  <div style={{ width: '40px', height: '3px', background: 'var(--color-white-0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--color-text-sub)', width: '22px', textAlign: 'right' }}>{a.pct}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating market card (bottom-left) */}
      <motion.div
        initial={{ opacity: 0, y: 20, x: -10 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{
          position: 'absolute', bottom: '-16px', left: '-12px', zIndex: 3,
          background: 'var(--color-bg-panel-0.97)', border: '1px solid var(--color-white-0.1)',
          borderRadius: '12px', padding: '12px 16px',
          boxShadow: '0 16px 40px var(--color-black-0.6)'
        }}>
        
        <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Markets</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px' }}>
          {[{ l: 'S&P 500', v: '5,248', c: '+0.64%', up: true }, { l: 'NASDAQ', v: '16,742', c: '+1.12%', up: true }, { l: 'DOW', v: '39,127', c: '+0.23%', up: true }, { l: 'VIX', v: '14.82', c: '-3.24%', up: false }].map((m) =>
            <div key={m.l}>
              <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', marginBottom: '2px' }}>{m.l}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--color-text-main)', fontWeight: 500 }}>{m.v}</div>
              <div style={{ fontSize: '9px', color: m.up ? 'var(--color-success)' : 'var(--color-error)', marginTop: '1px' }}>{m.c}</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Trade notification (top-right) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="tx-notif"
        style={{
          position: 'absolute', top: '-14px', right: '-10px', zIndex: 3,
          background: 'var(--color-bg-panel-0.97)', border: '1px solid var(--color-success-0.25)',
          borderRadius: '10px', padding: '10px 14px',
          boxShadow: '0 12px 32px var(--color-black-0.5)',
          minWidth: '180px'
        }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--color-success-0.12)', border: '1px solid var(--color-success-0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowUpRight size={13} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '1px' }}>NVDA · Buy Executed</div>
            <div style={{ fontSize: '10px', color: 'var(--color-success)' }}>+15 shares · $876.50</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── HERO SECTION ───────────────────────────────────────────────── */
function Hero({ onNavigate, onShowPreview }) {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      padding: '120px 80px 80px', position: 'relative', overflow: 'hidden', gap: '48px'
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          radial-gradient(ellipse 75% 65% at 85% 5%, var(--color-accent-0.11) 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 10% 90%, var(--color-success-0.07) 0%, transparent 60%),
          linear-gradient(var(--color-white-0.018) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-white-0.018) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px'
      }} />

      {/* Left copy */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ flex: '0 0 44%', position: 'relative', zIndex: 1 }}>
        
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--color-accent-0.08)', border: '1px solid var(--color-accent-0.2)', borderRadius: '100px', padding: '5px 13px', marginBottom: '28px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-accent)' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>GROW·CAPITAL·SMARTLY</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'EB Garamond, Georgia, serif',
          fontSize: 'clamp(52px, 5.5vw, 80px)',
          fontWeight: 600, lineHeight: 1.06, color: 'var(--color-text-main)',
          letterSpacing: '-0.5px', marginBottom: '22px'
        }}>
          Build Wealth
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>Intelligently.</em>
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: '17px', fontWeight: 400, lineHeight: 1.7, color: 'var(--color-text-sub)', maxWidth: '440px', marginBottom: '36px' }}>
          Institutional-grade portfolio analytics, real-time risk intelligence, and precision execution tools — designed for investors managing serious capital.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('register')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--color-accent)', border: 'none', cursor: 'pointer', color: 'var(--color-text-inverted)',
              fontSize: '14px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              padding: '13px 26px', borderRadius: '9px', transition: 'all 0.25s',
              boxShadow: '0 0 0 1px var(--color-accent-0.4), 0 8px 28px var(--color-accent-0.3)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#3D7BF0'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-0.5), 0 20px 56px var(--color-accent-0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-0.4), 0 8px 28px var(--color-accent-0.3)'; }}>
            
            Start Investing <ArrowRight size={15} />
          </button>
          <button
            onClick={onShowPreview}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.1)',
              cursor: 'pointer', color: 'var(--color-text-main)', fontSize: '14px', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif', padding: '13px 22px', borderRadius: '9px', transition: 'all 0.22s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.07)'; e.currentTarget.style.borderColor = 'var(--color-white-0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-white-0.04)'; e.currentTarget.style.borderColor = 'var(--color-white-0.1)'; }}>
            
            Explore Dashboard
          </button>
        </div>

        {/* Trust */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={13} fill="var(--color-warning)" color="var(--color-warning)" />)}
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '5px' }}>4.9 · 12,400+ reviews</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: 'var(--color-white-0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={12} color="var(--color-success)" />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>SOC 2 · ISO 27001</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: 'var(--color-white-0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Lock size={12} color="var(--color-text-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>256-bit AES Encrypted</span>
          </div>
        </div>
      </motion.div>

      {/* Right: Dashboard */}
      <motion.div
        onClick={onShowPreview}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{ flex: '0 0 54%', position: 'relative', zIndex: 1, cursor: 'pointer' }}
        whileHover={{ scale: 1.015, filter: 'brightness(1.04)' }}
      >
        <HeroDashboard />
      </motion.div>
    </section>
  );
}

/* ─── STATS ────────────────────────────────────────────────────────── */
function CountUp({ target, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return <span ref={ref} style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(30px, 3vw, 42px)', fontWeight: 700, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>{inView ? target : '—'}</span>;
}

function StatsBar() {
  return (
    <section style={{ borderTop: '1px solid var(--color-white-0.06)', borderBottom: '1px solid var(--color-white-0.06)', background: 'var(--color-bg-panel-0.7)', padding: '48px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
        {STATS.map((s, i) =>
          <motion.div key={s.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} style={{ textAlign: 'center' }}>
            <CountUp target={s.value} />
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '5px', fontWeight: 450 }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginTop: '3px' }}>{s.sub}</div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ─── FEATURES ────────────────────────────────────────────────────── */
function FeaturesSection() {
  return (
    <section style={{ padding: '96px 80px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: '60px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Platform Capabilities
        </div>
        <h2 style={{
          fontFamily: 'EB Garamond, Georgia, serif',
          fontSize: 'clamp(34px, 3.5vw, 50px)',
          fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.1,
          letterSpacing: '-0.3px', maxWidth: '640px'
        }}>
          Every Tool a Serious Investor
          <em style={{ fontStyle: 'italic', color: 'var(--color-text-sub)' }}> Needs.</em>
        </h2>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {FEATURES.map((f, i) =>
          <motion.div key={f.title}
            initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            style={{
              background: 'var(--color-bg-panel-0.55)', border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px', padding: '26px', cursor: 'default',
              transition: 'border-color 0.3s, box-shadow 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${f.accent}30`; e.currentTarget.style.boxShadow = `0 16px 48px var(--color-black-0.35), 0 0 0 1px ${f.accent}18`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-white-0.07)'; e.currentTarget.style.boxShadow = ''; }}>
            
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${f.accent}12`, border: `1px solid ${f.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <f.icon size={19} color={f.accent} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '9px', lineHeight: 1.3, fontFamily: 'DM Sans, sans-serif' }}>{f.title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.72, fontWeight: 400 }}>{f.desc}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ─── PLATFORM PREVIEW ────────────────────────────────────────────── */
function PlatformPreview({ onShowPreview }) {
  return (
    <section style={{ padding: '0 80px 96px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '44px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-success)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Live Dashboard</div>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(30px, 3vw, 44px)', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px', lineHeight: 1.15 }}>
          Your Capital Command Centre
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        {/* Browser-frame mockup */}
        <div 
          onClick={onShowPreview}
          style={{ 
            background: 'var(--color-bg-panel-0.95)', 
            border: '1px solid var(--color-white-0.08)', 
            borderRadius: '18px', 
            overflow: 'hidden', 
            boxShadow: '0 60px 140px -20px var(--color-black-0.7)',
            cursor: 'pointer',
            transition: 'transform 0.3s ease, filter 0.3s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.008)'; e.currentTarget.style.filter = 'brightness(1.03)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
        >
          {/* Browser chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderBottom: '1px solid var(--color-white-0.06)', background: 'var(--color-bg-nav-0.9)' }}>
            {['var(--color-error)', 'var(--color-warning)', 'var(--color-success)'].map((c, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.75 }} />)}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '6px', padding: '4px 20px', fontSize: '11px', color: 'var(--color-text-dim)' }}>
                app.capitalup.com/dashboard
              </div>
            </div>
          </div>

          {/* Dashboard mock interior */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '500px' }}>
            {/* Sidebar */}
            <div style={{ borderRight: '1px solid var(--color-white-0.05)', padding: '20px 12px', background: 'var(--color-bg-nav-0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '28px', paddingLeft: '8px' }}>
                <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={11} color="var(--color-text-inverted)" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)' }}>CapitalUp</span>
              </div>
              {['Overview', 'Markets', 'Portfolio', 'Analytics', 'Watchlist', 'Orders', 'Research'].map((item, i) =>
                <div key={item} style={{ padding: '8px 10px', borderRadius: '7px', marginBottom: '2px', background: i === 0 ? 'var(--color-accent-0.1)' : 'transparent', color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: '12px', fontWeight: i === 0 ? 500 : 400 }}>{item}</div>
              )}
            </div>

            {/* Main content */}
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Total Portfolio Value</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 500, color: 'var(--color-text-main)' }}>$2,847,392.50</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 500 }}><ArrowUpRight size={14} />+$24,839 (0.88%)</span>
                </div>
              </div>
              <div style={{ height: '180px', marginBottom: '22px', background: 'var(--color-white-0.02)', borderRadius: '10px', border: '1px solid var(--color-white-0.05)', overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HERO_CHART.slice(-30)} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <defs>
                      <linearGradient id="pvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={1.5} fill="url(#pvg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[{ l: 'Total Return', v: '+29.43%', c: 'var(--color-success)' }, { l: 'Unrealized P&L', v: '+$648K', c: 'var(--color-success)' }, { l: 'Sharpe Ratio', v: '1.84', c: 'var(--color-text-main)' }, { l: 'Beta (1Y)', v: '0.94', c: 'var(--color-text-main)' }].map((m) =>
                  <div key={m.l} style={{ background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.06)', borderRadius: '9px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '5px', fontWeight: 500 }}>{m.l}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 500, color: m.c }}>{m.v}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ textAlign: 'center', marginTop: '28px' }}>
        <button onClick={onShowPreview} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
          Open Live Dashboard <ChevronRight size={15} />
        </button>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */
function TestimonialsSection() {
  return (
    <section style={{ background: 'var(--color-bg-panel-0.5)', borderTop: '1px solid var(--color-white-0.06)', padding: '80px 80px 96px' }}>
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '52px' }}>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px', lineHeight: 1.15 }}>
          Trusted by Discerning Investors
        </h2>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {TESTIMONIALS.map((t, i) =>
          <motion.div key={t.name} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ background: 'var(--color-bg-panel-0.65)', border: '1px solid var(--color-white-0.07)', borderRadius: '14px', padding: '26px' }}>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
              {Array.from({ length: t.r }).map((_, s) => <Star key={s} size={12} fill="var(--color-warning)" color="var(--color-warning)" />)}
            </div>
            <p style={{ fontSize: '15px', color: 'var(--color-text-sub)', lineHeight: 1.72, marginBottom: '20px', fontStyle: 'italic', fontFamily: 'EB Garamond, Georgia, serif' }}>
              "{t.quote}"
            </p>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{t.role}</div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────────── */
function CTASection({ onNavigate }) {
  return (
    <section style={{ padding: '100px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, var(--color-accent-0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(34px, 4vw, 58px)', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.4px', lineHeight: 1.1, marginBottom: '18px' }}>
          Ready to Grow Your Wealth?
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--color-text-sub)', maxWidth: '420px', margin: '0 auto 38px', lineHeight: 1.7 }}>
          Join 180,000+ investors who trust CapitalUp with their most important financial decisions.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('register')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-accent)', border: 'none',
              cursor: 'pointer', color: 'var(--color-text-inverted)', fontSize: '15px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', padding: '15px 34px', borderRadius: '9px',
              boxShadow: '0 0 0 1px var(--color-accent-0.4), 0 12px 36px var(--color-accent-0.35)', transition: 'all 0.25s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-0.5), 0 20px 56px var(--color-accent-0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-0.4), 0 12px 36px var(--color-accent-0.35)'; }}>
            Start Investing Today <ArrowRight size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '22px', flexWrap: 'wrap' }}>
          {[{ icon: CheckCircle, t: 'No minimum deposit' }, { icon: Lock, t: 'Bank-grade security' }, { icon: Globe, t: 'Available worldwide' }].map((item) =>
            <div key={item.t} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <item.icon size={13} color="var(--color-success)" />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{item.t}</span>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}

/* ─── BOTTOM TICKER ────────────────────────────────────────────────── */
function BottomTicker({ isVisible, onToggle }) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: '#0D0F11',
      borderTop: '1px solid var(--color-white-0.05)',
      transition: 'all 0.3s ease',
      height: isVisible ? 'auto' : '40px',
      overflow: 'hidden'
    }}>
      {/* Toggle Button Bar */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'linear-gradient(90deg, var(--color-accent-0.08), var(--color-success-0.06))',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-sub)',
          fontSize: '11px',
          fontWeight: 600,
          transition: 'all 0.2s',
          borderBottom: isVisible ? '1px solid var(--color-white-0.05)' : 'none'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'linear-gradient(90deg, var(--color-accent-0.12), var(--color-success-0.1))';
          e.target.style.color = 'var(--color-text-main)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'linear-gradient(90deg, var(--color-accent-0.08), var(--color-success-0.06))';
          e.target.style.color = 'var(--color-text-sub)';
        }}
      >
        <span style={{ letterSpacing: '0.1em' }}>📊 LIVE MARKETS</span>
        <ChevronUp size={16} style={{ transform: isVisible ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
      </button>

      {/* Ticker Ticker Content */}
      {isVisible && (
        <div style={{
          height: '30px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          background: '#0D0F11'
        }}>
          <div style={{ position: 'absolute', left: 0, top: '40px', bottom: 0, width: '60px', background: 'linear-gradient(90deg, #0D0F11, transparent)', zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: '40px', bottom: 0, width: '60px', background: 'linear-gradient(-90deg, #0D0F11, transparent)', zIndex: 2, pointerEvents: 'none' }} />
          <div className="tx-ticker" style={{ display: 'flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
            {items.map((item, i) =>
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 20px', borderRight: '1px solid var(--color-white-0.04)' }}>
                <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}>{item.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-text-sub)', fontWeight: 400 }}>{item.value}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: item.up ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                  {item.up ? '▲' : '▼'} {item.change}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── FOOTER ────────────────────────────────────────────────────────── */
function Footer({ onNavigate }) {
  return (
    <footer style={{ borderTop: '1px solid var(--color-white-0.06)', background: '#0D0F11', padding: '40px 80px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '48px', alignItems: 'start', marginBottom: '32px' }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} color="var(--color-text-inverted)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-main)' }}>CapitalUp</div>
              <div style={{ fontSize: '8px', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.1em' }}>GROW·CAPITAL·SMARTLY</div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', lineHeight: 1.7, maxWidth: '160px' }}>
            Institutional-grade wealth management for serious investors.
          </p>
        </div>

        {/* Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[
            { heading: 'Platform', links: ['Features', 'Markets', 'Portfolio', 'Analytics'] },
            { heading: 'Company', links: ['About', 'Careers', 'Press', 'Partners'] },
            { heading: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Compliance'] }
          ].map((col) =>
            <div key={col.heading}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>{col.heading}</div>
              {col.links.map((l) =>
                <div key={l} style={{ marginBottom: '7px' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', padding: 0, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--color-text-sub)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}>{l}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: newsletter */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: '10px' }}>Market Intelligence</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="email" placeholder="your@email.com" style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.08)', borderRadius: '7px', padding: '8px 12px', color: 'var(--color-text-main)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', width: '160px', outline: 'none' }} />
            <button style={{ background: 'var(--color-accent)', border: 'none', cursor: 'pointer', color: 'var(--color-text-inverted)', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', padding: '8px 14px', borderRadius: '7px', whiteSpace: 'nowrap' }}>Subscribe</button>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '8px' }}>Weekly market insights. No spam.</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-white-0.05)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>© 2026 CapitalUp. All rights reserved. Not financial advice. Investments involve risk.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Twitter', 'LinkedIn', 'GitHub'].map((s) =>
            <button key={s} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = 'var(--color-text-muted)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--color-text-dim)'}>{s}</button>
          )}
        </div>
      </div>
    </footer>
  );
}

/* ─── PREVIEW MODAL ────────────────────────────────────────────────── */
function PreviewModal({ isOpen, onClose, onRegister }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 7, 10, 0.82)',
        backdropFilter: 'blur(16px)',
        padding: '20px',
        animation: 'tx-fade-in 0.25s ease-out'
      }} 
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tx-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tx-slide-up {
          from { transform: translateY(24px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}} />
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          background: 'var(--color-bg-panel-0.98)',
          border: '1px solid var(--color-white-0.12)',
          borderRadius: '20px',
          boxShadow: '0 32px 80px var(--color-black-0.9), 0 0 60px var(--color-accent-0.15)',
          overflow: 'hidden',
          animation: 'tx-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(90deg, var(--color-accent-0.2) 0%, var(--color-success-0.15) 100%)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-white-0.08)'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ✨ Interactive Dashboard Preview (Mock)
          </span>
          <button 
            onClick={onClose}
            style={{
              background: 'var(--color-white-0.05)',
              border: '1px solid var(--color-white-0.1)',
              borderRadius: '6px',
              color: 'var(--color-text-sub)',
              fontSize: '11px',
              fontWeight: 500,
              padding: '5px 12px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'var(--color-white-0.12)'; e.target.style.color = 'var(--color-text-main)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'var(--color-white-0.05)'; e.target.style.color = 'var(--color-text-sub)'; }}
          >
            Close
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{
            background: 'var(--color-bg-panel-0.96)',
            border: '1px solid var(--color-white-0.1)',
            borderRadius: '18px',
            boxShadow: '0 0 0 1px var(--color-white-0.04), 0 24px 60px -12px var(--color-black-0.8)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Inner top edge highlight */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, var(--color-white-0.14) 50%, transparent 95%)', pointerEvents: 'none' }} />

            {/* Mini browser/app nav */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: '1px solid var(--color-white-0.05)',
              background: 'var(--color-bg-nav-0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={11} color="var(--color-text-inverted)" />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)' }}>CapitalUp</span>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                {['Overview', 'Portfolio', 'Markets'].map((item, i) =>
                  <span key={item} style={{ fontSize: '11px', color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: i === 0 ? 500 : 400 }}>{item}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['var(--color-error-0.7)', 'rgba(245,185,66,0.7)', 'var(--color-success-0.7)'].map((c, i) =>
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                )}
              </div>
            </div>

            {/* Portfolio header */}
            <div style={{ padding: '18px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>Total Portfolio Value</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '26px', fontWeight: 500, color: 'var(--color-text-main)', letterSpacing: '-0.5px', marginBottom: '5px' }}>$2,847,392.50</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--color-success-0.1)', border: '1px solid var(--color-success-0.2)', borderRadius: '5px', padding: '3px 8px' }}>
                    <ArrowUpRight size={11} color="var(--color-success)" />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>+$24,839.20 · +0.88%</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>today</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div className="tx-live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 500 }}>Live</span>
              </div>
            </div>

            {/* Area chart */}
            <div style={{ height: '110px', paddingBottom: '4px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HERO_CHART} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="hg1_modal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={1.8} fill="url(#hg1_modal)" dot={false}
                    activeDot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-white-0.05)' }} />

            {/* Two-column bottom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: 0 }}>
              {/* Positions */}
              <div style={{ padding: '14px 16px 16px', borderRight: '1px solid var(--color-white-0.05)' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Top Positions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {HERO_POSITIONS.map((p) =>
                    <div key={p.ticker} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--color-white-0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0 }}>{p.ticker.slice(0, 2)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-main)' }}>{p.ticker}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: p.up ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>{p.pct}</span>
                        </div>
                        <div style={{ height: '3px', background: 'var(--color-white-0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: p.barW, height: '100%', background: p.up ? 'var(--color-accent)' : 'var(--color-error)', borderRadius: '2px', transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Allocation */}
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Allocation</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {ALLOCATION.map((a) =>
                    <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: a.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', flex: 1 }}>{a.label}</span>
                      <div style={{ width: '40px', height: '3px', background: 'var(--color-white-0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--color-text-sub)', width: '22px', textAlign: 'right' }}>{a.pct}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          background: 'var(--color-bg-dark)',
          padding: '18px 24px',
          borderTop: '1px solid var(--color-white-0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: 450 }}>
            This is a mock dashboard preview. Register to track and build your actual portfolio.
          </span>
          <button 
            onClick={() => {
              onClose();
              onRegister();
            }}
            style={{
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--color-text-inverted)',
              fontWeight: 600,
              fontSize: '13px',
              padding: '10px 20px',
              cursor: 'pointer',
              transition: 'all 0.22s',
              boxShadow: '0 4px 14px var(--color-accent-0.3)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3D7BF0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.transform = 'none'; }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ───────────────────────────────────────────────────────────── */
export function Landing({ onNavigate }) {
  const [bottomTickerVisible, setBottomTickerVisible] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const showPreview = () => setIsPreviewOpen(true);
  const closePreview = () => setIsPreviewOpen(false);

  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', overflowX: 'hidden', paddingBottom: bottomTickerVisible ? '70px' : '0' }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <MarketTicker />
      <Nav onNavigate={onNavigate} />
      <Hero onNavigate={onNavigate} onShowPreview={showPreview} />
      <StatsBar />
      <FeaturesSection />
      <PlatformPreview onShowPreview={showPreview} />
      <TestimonialsSection />
      <CTASection onNavigate={onNavigate} />
      <Footer onNavigate={onNavigate} />
      <BottomTicker isVisible={bottomTickerVisible} onToggle={() => setBottomTickerVisible(!bottomTickerVisible)} />
      
      <PreviewModal isOpen={isPreviewOpen} onClose={closePreview} onRegister={() => onNavigate('register')} />
    </div>
  );
}
