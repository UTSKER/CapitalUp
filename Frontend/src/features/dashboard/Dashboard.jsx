import { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Search, ChevronDown, ArrowUpRight } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { PortfolioChart } from './components/PortfolioChart';
import { AllocationChart } from './components/AllocationChart';
import { MarketCards } from './components/MarketCards';
import { PositionsTable } from './components/PositionsTable';
import { WatchlistPanel } from './components/WatchlistPanel';

const riskMetrics = [
  { label: 'Beta (1Y)', value: '0.94', neutral: true },
  { label: 'Volatility', value: '12.4%', neutral: true },
  { label: 'Max Drawdown', value: '-11.2%', negative: true },
  { label: 'Win Rate', value: '68.4%', positive: true }
];

const recentActivity = [
  { type: 'BUY', ticker: 'NVDA', shares: 15, price: 872.40, time: '09:42 AM', total: 13086.00 },
  { type: 'SELL', ticker: 'TSLA', shares: 20, price: 252.10, time: 'Yesterday', total: 5042.00 },
  { type: 'BUY', ticker: 'AAPL', shares: 30, price: 186.50, time: 'May 30', total: 5595.00 },
  { type: 'DIV', ticker: 'BRK.B', shares: 0, price: 0, time: 'May 28', total: 420.00 }
];

export function Dashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(3);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#111315',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        color: '#F7F8FA'
      }}>
      
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate} />

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: '232px', minWidth: 0 }}>
        {/* Top bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(17,19,21,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 32px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
          
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: searchOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${searchOpen ? 'rgba(79,140,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '8px',
              padding: '7px 14px',
              cursor: 'text',
              transition: 'all 0.2s',
              width: '280px',
              boxShadow: searchOpen ? '0 0 0 3px rgba(79,140,255,0.1)' : 'none'
            }}
            onClick={() => setSearchOpen(true)}>
            
            <Search size={13} color={searchOpen ? '#4F8CFF' : '#7A828E'} />
            <input
              type="text"
              placeholder="Search markets, assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F7F8FA',
                fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif',
                flex: 1
              }} />
            
            <span style={{ fontSize: '10px', color: '#4A5260', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>⌘K</span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Market status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(24,195,126,0.08)',
                border: '1px solid rgba(24,195,126,0.2)',
                borderRadius: '100px',
                padding: '5px 12px'
              }}>
              
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#18C37E', boxShadow: '0 0 6px rgba(24,195,126,0.7)' }} />
              <span style={{ fontSize: '11px', color: '#18C37E', fontWeight: 500 }}>Market Open</span>
            </div>

            {/* Notifications */}
            <button
              onClick={() => setNotifications(0)}
              style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
              
              <Bell size={15} color="#B2BAC5" />
              {notifications > 0 &&
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#E25D5D',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #111315'
                  }}>
                  {notifications}
                </span>
              }
            </button>

            {/* Avatar */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
              
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F8CFF, #A78BFA)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#fff'
                }}>
                JD
              </div>
              <ChevronDown size={12} color="#7A828E" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '28px 32px', maxWidth: '1600px' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>
            
            {/* Page header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#7A828E', marginBottom: '4px', fontWeight: 500 }}>
                Good morning, James — Tuesday, June 2, 2026
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontFamily: 'EB Garamond, Georgia, serif',
                    fontSize: '28px',
                    fontWeight: 600,
                    color: '#F7F8FA',
                    letterSpacing: '-0.2px',
                    lineHeight: 1.2
                  }}>
                  Portfolio Overview
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(24,195,126,0.1)', border: '1px solid rgba(24,195,126,0.2)', borderRadius: '6px', padding: '4px 10px' }}>
                  <ArrowUpRight size={13} color="#18C37E" />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#18C37E', fontWeight: 500 }}>
                    $2,847,392.50 · +0.88% today
                  </span>
                </div>
              </div>
            </div>

            {/* Row 1: Chart + Allocation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '20px' }} className="max-xl:grid-cols-1">
              <PortfolioChart />
              <AllocationChart />
            </div>

            {/* Row 2: Market overview */}
            <div style={{ marginBottom: '20px' }}>
              <MarketCards />
            </div>

            {/* Row 3: Positions + Watchlist + Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }} className="max-xl:grid-cols-1">
              {/* Left: Positions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <PositionsTable />

                {/* Risk metrics */}
                <div
                  style={{
                    background: 'rgba(28,33,38,0.6)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                    padding: '20px 24px'
                  }}>
                  
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#7A828E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
                    Risk Analytics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {riskMetrics.map((m) =>
                      <div key={m.label}>
                        <div style={{ fontSize: '10px', color: '#7A828E', marginBottom: '5px', fontWeight: 500 }}>{m.label}</div>
                        <div
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '18px',
                            fontWeight: 500,
                            color: m.positive ? '#18C37E' : m.negative ? '#E25D5D' : '#F7F8FA'
                          }}>
                          {m.value}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Watchlist + Recent activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ flex: 1, minHeight: '400px' }}>
                  <WatchlistPanel />
                </div>

                {/* Recent activity */}
                <div
                  style={{
                    background: 'rgba(28,33,38,0.6)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                    padding: '18px 20px'
                  }}>
                  
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#7A828E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
                    Recent Activity
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentActivity.map((act, idx) => {
                      const isBuy = act.type === 'BUY';
                      const isDiv = act.type === 'DIV';
                      const typeColor = isBuy ? '#4F8CFF' : isDiv ? '#18C37E' : '#E25D5D';
                      const typeBg = isBuy ? 'rgba(79,140,255,0.1)' : isDiv ? 'rgba(24,195,126,0.1)' : 'rgba(226,93,93,0.1)';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                color: typeColor,
                                background: typeBg,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '0.05em',
                                minWidth: '30px',
                                textAlign: 'center'
                              }}>
                              {act.type}
                            </span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 500, color: '#F7F8FA' }}>{act.ticker}</div>
                              <div style={{ fontSize: '10px', color: '#7A828E' }}>
                                {isDiv ? 'Dividend' : `${act.shares} shares @ $${act.price.toFixed(2)}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 500, color: '#F7F8FA' }}>
                              ${act.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '10px', color: '#4A5260' }}>{act.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
