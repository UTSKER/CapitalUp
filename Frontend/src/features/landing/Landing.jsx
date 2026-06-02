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
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(24,195,126,0.4); }
    50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(24,195,126,0); }
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
  { label: 'Equities', pct: 65, color: '#4F8CFF' },
  { label: 'Fixed Income', pct: 20, color: '#18C37E' },
  { label: 'Cash', pct: 8, color: '#F5B942' },
  { label: 'Alternatives', pct: 7, color: '#A78BFA' }
];

const STATS = [
  { value: '$14.2B+', label: 'Assets Under Management', sub: '+$1.2B this quarter' },
  { value: '180K+', label: 'Active Investors', sub: 'Across 47 countries' },
  { value: '0.02%', label: 'Average Annual Fee', sub: 'vs industry avg 0.85%' },
  { value: '99.99%', label: 'Platform Uptime', sub: 'Backed by SLA' }
];

const FEATURES = [
  { icon: Zap, title: 'Real-Time Intelligence', desc: 'Live market feeds, AI-driven signals, and institutional-grade analytics updated every 250ms across 50,000+ global instruments.', accent: '#4F8CFF' },
  { icon: BarChart3, title: 'Portfolio Analytics', desc: 'Deep attribution analysis, factor exposure, benchmark comparison, and performance decomposition across any time horizon.', accent: '#18C37E' },
  { icon: Shield, title: 'Risk Management', desc: 'Comprehensive VaR calculations, stress testing, correlation matrices, and tail-risk monitoring to protect your capital.', accent: '#F5B942' },
  { icon: Eye, title: 'Smart Screeners', desc: 'Custom watchlists with 400+ filters, intelligent price alerts, and real-time sentiment signals from global news sources.', accent: '#A78BFA' },
  { icon: Cpu, title: 'Tax Optimization', desc: 'Automated tax-loss harvesting, wash-sale rule prevention, and detailed tax reporting across all linked accounts.', accent: '#4F8CFF' },
  { icon: FileText, title: 'Institutional Research', desc: 'Analyst reports, earnings transcripts, SEC filings, and quantitative factor research — unified in one workspace.', accent: '#18C37E' }
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
    <div style={{ background: '#0D0F11', borderBottom: '1px solid rgba(255,255,255,0.05)', height: '30px', overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 102 }}>
      {/* fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(90deg, #0D0F11, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(-90deg, #0D0F11, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div className="tx-ticker" style={{ display: 'flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
        {items.map((item, i) =>
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '10px', fontWeight: 500, color: '#4A5260', letterSpacing: '0.04em' }}>{item.label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#B2BAC5', fontWeight: 400 }}>{item.value}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: item.up ? '#18C37E' : '#E25D5D', fontWeight: 500 }}>
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
      background: scrolled ? 'rgba(13,15,17,0.94)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
      transition: 'all 0.3s ease',
      zIndex: 101
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: 'linear-gradient(135deg, #4F8CFF 0%, #2860E8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(79,140,255,0.3)'
        }}>
          <TrendingUp size={17} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '17px', color: '#F7F8FA', letterSpacing: '-0.3px' }}>CapitalUp</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: '#4F8CFF', fontWeight: 600, letterSpacing: '0.12em', display: 'block', lineHeight: 1, marginTop: '1px' }}>GROW·CAPITAL·SMARTLY</span>
        </div>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {['Features', 'Markets', 'Pricing', 'Research', 'About'].map((l) =>
          <button key={l} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A828E', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 450, transition: 'color 0.2s', letterSpacing: '0.01em' }}
            onMouseEnter={(e) => e.target.style.color = '#F7F8FA'}
            onMouseLeave={(e) => e.target.style.color = '#7A828E'}>{l}</button>
        )}
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={() => onNavigate('login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B2BAC5', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, padding: '8px 14px', borderRadius: '8px', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.target.style.color = '#F7F8FA'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={(e) => { e.target.style.color = '#B2BAC5'; e.target.style.background = 'none'; }}>
          Sign In
        </button>
        <button onClick={() => onNavigate('register')}
          style={{
            background: '#4F8CFF', border: 'none', cursor: 'pointer', color: '#fff',
            fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            padding: '9px 20px', borderRadius: '8px', transition: 'all 0.22s',
            boxShadow: '0 0 0 1px rgba(79,140,255,0.35), 0 4px 14px rgba(79,140,255,0.28)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3D7BF0'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(79,140,255,0.5), 0 8px 24px rgba(79,140,255,0.38)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#4F8CFF'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(79,140,255,0.35), 0 4px 14px rgba(79,140,255,0.28)'; }}>
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
        background: 'radial-gradient(ellipse at center, rgba(79,140,255,0.16) 0%, rgba(24,195,126,0.06) 50%, transparent 80%)',
        filter: 'blur(48px)', pointerEvents: 'none'
      }} />

      {/* Main dashboard card */}
      <div className="tx-card-float" style={{
        width: '100%', maxWidth: '560px',
        background: 'rgba(20,24,29,0.96)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '18px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 48px 120px -24px rgba(0,0,0,0.8), 0 0 80px rgba(79,140,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Inner top edge highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.14) 50%, transparent 95%)', pointerEvents: 'none' }} />

        {/* Mini browser/app nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(13,15,17,0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, #4F8CFF, #2860E8)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={11} color="#fff" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F7F8FA' }}>CapitalUp</span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Overview', 'Portfolio', 'Markets'].map((item, i) =>
              <span key={item} style={{ fontSize: '11px', color: i === 0 ? '#4F8CFF' : '#7A828E', fontWeight: i === 0 ? 500 : 400 }}>{item}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['rgba(226,93,93,0.7)', 'rgba(245,185,66,0.7)', 'rgba(24,195,126,0.7)'].map((c, i) =>
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
            )}
          </div>
        </div>

        {/* Portfolio header */}
        <div style={{ padding: '18px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#7A828E', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>Total Portfolio Value</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '26px', fontWeight: 500, color: '#F7F8FA', letterSpacing: '-0.5px', marginBottom: '5px' }}>$2,847,392.50</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(24,195,126,0.1)', border: '1px solid rgba(24,195,126,0.2)', borderRadius: '5px', padding: '3px 8px' }}>
                <ArrowUpRight size={11} color="#18C37E" />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#18C37E', fontWeight: 500 }}>+$24,839.20 · +0.88%</span>
              </div>
              <span style={{ fontSize: '10px', color: '#4A5260' }}>today</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div className="tx-live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#18C37E', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: '#18C37E', fontWeight: 500 }}>Live</span>
          </div>
        </div>

        {/* Area chart */}
        <div style={{ height: '110px', paddingBottom: '4px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HERO_CHART} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#4F8CFF" strokeWidth={1.8} fill="url(#hg1)" dot={false}
                activeDot={{ r: 3, fill: '#4F8CFF', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Two-column bottom */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: 0 }}>
          {/* Positions */}
          <div style={{ padding: '14px 16px 16px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#4A5260', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Top Positions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {HERO_POSITIONS.map((p) =>
                <div key={p.ticker} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#7A828E', flexShrink: 0 }}>{p.ticker.slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#F7F8FA' }}>{p.ticker}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: p.up ? '#18C37E' : '#E25D5D', fontWeight: 500 }}>{p.pct}</span>
                    </div>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: p.barW, height: '100%', background: p.up ? '#4F8CFF' : '#E25D5D', borderRadius: '2px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Allocation */}
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#4A5260', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Allocation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {ALLOCATION.map((a) =>
                <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: a.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: '#7A828E', flex: 1 }}>{a.label}</span>
                  <div style={{ width: '40px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#B2BAC5', width: '22px', textAlign: 'right' }}>{a.pct}%</span>
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
          background: 'rgba(20,24,29,0.97)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', padding: '12px 16px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)'
        }}>
        
        <div style={{ fontSize: '9px', color: '#4A5260', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Markets</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px' }}>
          {[{ l: 'S&P 500', v: '5,248', c: '+0.64%', up: true }, { l: 'NASDAQ', v: '16,742', c: '+1.12%', up: true }, { l: 'DOW', v: '39,127', c: '+0.23%', up: true }, { l: 'VIX', v: '14.82', c: '-3.24%', up: false }].map((m) =>
            <div key={m.l}>
              <div style={{ fontSize: '9px', color: '#4A5260', marginBottom: '2px' }}>{m.l}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#F7F8FA', fontWeight: 500 }}>{m.v}</div>
              <div style={{ fontSize: '9px', color: m.up ? '#18C37E' : '#E25D5D', marginTop: '1px' }}>{m.c}</div>
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
          background: 'rgba(20,24,29,0.97)', border: '1px solid rgba(24,195,126,0.25)',
          borderRadius: '10px', padding: '10px 14px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          minWidth: '180px'
        }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(24,195,126,0.12)', border: '1px solid rgba(24,195,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowUpRight size={13} color="#18C37E" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#F7F8FA', marginBottom: '1px' }}>NVDA · Buy Executed</div>
            <div style={{ fontSize: '10px', color: '#18C37E' }}>+15 shares · $876.50</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── HERO SECTION ───────────────────────────────────────────────── */
function Hero({ onNavigate }) {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      padding: '120px 80px 80px', position: 'relative', overflow: 'hidden', gap: '48px'
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          radial-gradient(ellipse 75% 65% at 85% 5%, rgba(79,140,255,0.11) 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 10% 90%, rgba(24,195,126,0.07) 0%, transparent 60%),
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)', borderRadius: '100px', padding: '5px 13px', marginBottom: '28px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4F8CFF' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#4F8CFF', letterSpacing: '0.06em' }}>GROW·CAPITAL·SMARTLY</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'EB Garamond, Georgia, serif',
          fontSize: 'clamp(52px, 5.5vw, 80px)',
          fontWeight: 600, lineHeight: 1.06, color: '#F7F8FA',
          letterSpacing: '-0.5px', marginBottom: '22px'
        }}>
          Build Wealth
          <br />
          <em style={{ fontStyle: 'italic', color: '#4F8CFF' }}>Intelligently.</em>
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: '17px', fontWeight: 400, lineHeight: 1.7, color: '#B2BAC5', maxWidth: '440px', marginBottom: '36px' }}>
          Institutional-grade portfolio analytics, real-time risk intelligence, and precision execution tools — designed for investors managing serious capital.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('register')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#4F8CFF', border: 'none', cursor: 'pointer', color: '#fff',
              fontSize: '14px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              padding: '13px 26px', borderRadius: '9px', transition: 'all 0.25s',
              boxShadow: '0 0 0 1px rgba(79,140,255,0.4), 0 8px 28px rgba(79,140,255,0.3)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#3D7BF0'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(79,140,255,0.5), 0 16px 44px rgba(79,140,255,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = '#4F8CFF'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(79,140,255,0.4), 0 8px 28px rgba(79,140,255,0.3)'; }}>
            
            Start Investing <ArrowRight size={15} />
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', color: '#F7F8FA', fontSize: '14px', fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif', padding: '13px 22px', borderRadius: '9px', transition: 'all 0.22s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            
            Explore Dashboard
          </button>
        </div>

        {/* Trust */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={13} fill="#F5B942" color="#F5B942" />)}
            <span style={{ fontSize: '12px', color: '#7A828E', marginLeft: '5px' }}>4.9 · 12,400+ reviews</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={12} color="#18C37E" />
            <span style={{ fontSize: '12px', color: '#7A828E' }}>SOC 2 · ISO 27001</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Lock size={12} color="#7A828E" />
            <span style={{ fontSize: '12px', color: '#7A828E' }}>256-bit AES Encrypted</span>
          </div>
        </div>
      </motion.div>

      {/* Right: Dashboard */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{ flex: '0 0 54%', position: 'relative', zIndex: 1 }}>
        
        <HeroDashboard />
      </motion.div>
    </section>
  );
}

/* ─── STATS ────────────────────────────────────────────────────────── */
function CountUp({ target, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return <span ref={ref} style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(30px, 3vw, 42px)', fontWeight: 700, color: '#F7F8FA', letterSpacing: '-0.3px' }}>{inView ? target : '—'}</span>;
}

function StatsBar() {
  return (
    <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(20,24,29,0.7)', padding: '48px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
        {STATS.map((s, i) =>
          <motion.div key={s.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} style={{ textAlign: 'center' }}>
            <CountUp target={s.value} />
            <div style={{ fontSize: '13px', color: '#7A828E', marginTop: '5px', fontWeight: 450 }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: '#4A5260', marginTop: '3px' }}>{s.sub}</div>
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
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#4F8CFF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Platform Capabilities
        </div>
        <h2 style={{
          fontFamily: 'EB Garamond, Georgia, serif',
          fontSize: 'clamp(34px, 3.5vw, 50px)',
          fontWeight: 600, color: '#F7F8FA', lineHeight: 1.1,
          letterSpacing: '-0.3px', maxWidth: '640px'
        }}>
          Every Tool a Serious Investor
          <em style={{ fontStyle: 'italic', color: '#B2BAC5' }}> Needs.</em>
        </h2>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {FEATURES.map((f, i) =>
          <motion.div key={f.title}
            initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            style={{
              background: 'rgba(28,33,38,0.55)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '26px', cursor: 'default',
              transition: 'border-color 0.3s, box-shadow 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${f.accent}30`; e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px ${f.accent}18`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = ''; }}>
            
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${f.accent}12`, border: `1px solid ${f.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <f.icon size={19} color={f.accent} strokeWidth={1.8} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F7F8FA', marginBottom: '9px', lineHeight: 1.3, fontFamily: 'DM Sans, sans-serif' }}>{f.title}</h3>
            <p style={{ fontSize: '13px', color: '#7A828E', lineHeight: 1.72, fontWeight: 400 }}>{f.desc}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ─── PLATFORM PREVIEW ────────────────────────────────────────────── */
function PlatformPreview({ onNavigate }) {
  return (
    <section style={{ padding: '0 80px 96px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '44px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#18C37E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Live Dashboard</div>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(30px, 3vw, 44px)', fontWeight: 600, color: '#F7F8FA', letterSpacing: '-0.3px', lineHeight: 1.15 }}>
          Your Capital Command Centre
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        {/* Browser-frame mockup */}
        <div style={{ background: 'rgba(20,24,29,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 60px 140px -20px rgba(0,0,0,0.7)' }}>
          {/* Browser chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,15,17,0.9)' }}>
            {['#E25D5D', '#F5B942', '#18C37E'].map((c, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.75 }} />)}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '4px 20px', fontSize: '11px', color: '#4A5260' }}>
                app.capitalup.com/dashboard
              </div>
            </div>
          </div>

          {/* Dashboard mock interior */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '500px' }}>
            {/* Sidebar */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: '20px 12px', background: 'rgba(13,15,17,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '28px', paddingLeft: '8px' }}>
                <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, #4F8CFF, #2860E8)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={11} color="#fff" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#F7F8FA' }}>CapitalUp</span>
              </div>
              {['Overview', 'Markets', 'Portfolio', 'Analytics', 'Watchlist', 'Orders', 'Research'].map((item, i) =>
                <div key={item} style={{ padding: '8px 10px', borderRadius: '7px', marginBottom: '2px', background: i === 0 ? 'rgba(79,140,255,0.1)' : 'transparent', color: i === 0 ? '#4F8CFF' : '#7A828E', fontSize: '12px', fontWeight: i === 0 ? 500 : 400 }}>{item}</div>
              )}
            </div>

            {/* Main content */}
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '10px', color: '#7A828E', marginBottom: '4px' }}>Total Portfolio Value</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 500, color: '#F7F8FA' }}>$2,847,392.50</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#18C37E', fontSize: '13px', fontWeight: 500 }}><ArrowUpRight size={14} />+$24,839 (0.88%)</span>
                </div>
              </div>
              <div style={{ height: '180px', marginBottom: '22px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HERO_CHART.slice(-30)} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <defs>
                      <linearGradient id="pvg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#4F8CFF" strokeWidth={1.5} fill="url(#pvg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[{ l: 'Total Return', v: '+29.43%', c: '#18C37E' }, { l: 'Unrealized P&L', v: '+$648K', c: '#18C37E' }, { l: 'Sharpe Ratio', v: '1.84', c: '#F7F8FA' }, { l: 'Beta (1Y)', v: '0.94', c: '#F7F8FA' }].map((m) =>
                  <div key={m.l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '9px', color: '#7A828E', marginBottom: '5px', fontWeight: 500 }}>{m.l}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 500, color: m.c }}>{m.v}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ textAlign: 'center', marginTop: '28px' }}>
        <button onClick={() => onNavigate('dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#4F8CFF', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'opacity 0.2s' }}
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
    <section style={{ background: 'rgba(20,24,29,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 80px 96px' }}>
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '52px' }}>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 600, color: '#F7F8FA', letterSpacing: '-0.3px', lineHeight: 1.15 }}>
          Trusted by Discerning Investors
        </h2>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {TESTIMONIALS.map((t, i) =>
          <motion.div key={t.name} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ background: 'rgba(28,33,38,0.65)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '26px' }}>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
              {Array.from({ length: t.r }).map((_, s) => <Star key={s} size={12} fill="#F5B942" color="#F5B942" />)}
            </div>
            <p style={{ fontSize: '15px', color: '#B2BAC5', lineHeight: 1.72, marginBottom: '20px', fontStyle: 'italic', fontFamily: 'EB Garamond, Georgia, serif' }}>
              "{t.quote}"
            </p>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F7F8FA' }}>{t.name}</div>
              <div style={{ fontSize: '11px', color: '#7A828E', marginTop: '2px' }}>{t.role}</div>
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
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(79,140,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 'clamp(34px, 4vw, 58px)', fontWeight: 600, color: '#F7F8FA', letterSpacing: '-0.4px', lineHeight: 1.1, marginBottom: '18px' }}>
          Ready to Grow Your Wealth?
        </h2>
        <p style={{ fontSize: '16px', color: '#B2BAC5', maxWidth: '420px', margin: '0 auto 38px', lineHeight: 1.7 }}>
          Join 180,000+ investors who trust CapitalUp with their most important financial decisions.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('register')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', background: '#4F8CFF', border: 'none',
              cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', padding: '15px 34px', borderRadius: '9px',
              boxShadow: '0 0 0 1px rgba(79,140,255,0.4), 0 12px 36px rgba(79,140,255,0.35)', transition: 'all 0.25s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(79,140,255,0.5), 0 20px 56px rgba(79,140,255,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(79,140,255,0.4), 0 12px 36px rgba(79,140,255,0.35)'; }}>
            Start Investing Today <ArrowRight size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '22px', flexWrap: 'wrap' }}>
          {[{ icon: CheckCircle, t: 'No minimum deposit' }, { icon: Lock, t: 'Bank-grade security' }, { icon: Globe, t: 'Available worldwide' }].map((item) =>
            <div key={item.t} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <item.icon size={13} color="#18C37E" />
              <span style={{ fontSize: '12px', color: '#7A828E' }}>{item.t}</span>
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
      borderTop: '1px solid rgba(255,255,255,0.05)',
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
          background: 'linear-gradient(90deg, rgba(79,140,255,0.08), rgba(24,195,126,0.06))',
          border: 'none',
          cursor: 'pointer',
          color: '#B2BAC5',
          fontSize: '11px',
          fontWeight: 600,
          transition: 'all 0.2s',
          borderBottom: isVisible ? '1px solid rgba(255,255,255,0.05)' : 'none'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'linear-gradient(90deg, rgba(79,140,255,0.12), rgba(24,195,126,0.1))';
          e.target.style.color = '#F7F8FA';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'linear-gradient(90deg, rgba(79,140,255,0.08), rgba(24,195,126,0.06))';
          e.target.style.color = '#B2BAC5';
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '10px', fontWeight: 500, color: '#4A5260', letterSpacing: '0.04em' }}>{item.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#B2BAC5', fontWeight: 400 }}>{item.value}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: item.up ? '#18C37E' : '#E25D5D', fontWeight: 500 }}>
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
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0D0F11', padding: '40px 80px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '48px', alignItems: 'start', marginBottom: '32px' }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #4F8CFF, #2860E8)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#F7F8FA' }}>CapitalUp</div>
              <div style={{ fontSize: '8px', color: '#4F8CFF', fontWeight: 700, letterSpacing: '0.1em' }}>GROW·CAPITAL·SMARTLY</div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#4A5260', lineHeight: 1.7, maxWidth: '160px' }}>
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
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4A5260', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>{col.heading}</div>
              {col.links.map((l) =>
                <div key={l} style={{ marginBottom: '7px' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A828E', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', padding: 0, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = '#B2BAC5'}
                    onMouseLeave={(e) => e.target.style.color = '#7A828E'}>{l}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: newsletter */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#B2BAC5', marginBottom: '10px' }}>Market Intelligence</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="email" placeholder="your@email.com" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '8px 12px', color: '#F7F8FA', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', width: '160px', outline: 'none' }} />
            <button style={{ background: '#4F8CFF', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', padding: '8px 14px', borderRadius: '7px', whiteSpace: 'nowrap' }}>Subscribe</button>
          </div>
          <div style={{ fontSize: '10px', color: '#4A5260', marginTop: '8px' }}>Weekly market insights. No spam.</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '11px', color: '#4A5260' }}>© 2026 CapitalUp. All rights reserved. Not financial advice. Investments involve risk.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Twitter', 'LinkedIn', 'GitHub'].map((s) =>
            <button key={s} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5260', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#7A828E'}
              onMouseLeave={(e) => e.target.style.color = '#4A5260'}>{s}</button>
          )}
        </div>
      </div>
    </footer>
  );
}

/* ─── MAIN ───────────────────────────────────────────────────────────── */
export function Landing({ onNavigate }) {
  const [bottomTickerVisible, setBottomTickerVisible] = useState(false);
  
  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', background: '#111315', color: '#F7F8FA', overflowX: 'hidden', paddingBottom: bottomTickerVisible ? '70px' : '0' }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <MarketTicker />
      <Nav onNavigate={onNavigate} />
      <Hero onNavigate={onNavigate} />
      <StatsBar />
      <FeaturesSection />
      <PlatformPreview onNavigate={onNavigate} />
      <TestimonialsSection />
      <CTASection onNavigate={onNavigate} />
      <Footer onNavigate={onNavigate} />
      <BottomTicker isVisible={bottomTickerVisible} onToggle={() => setBottomTickerVisible(!bottomTickerVisible)} />
    </div>
  );
}
