import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Search, ChevronDown, ArrowUpRight, ArrowDownRight, ShieldCheck, LogOut, User as UserIcon, BarChart3 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ProfileSettings } from './components/ProfileSettings';
import { PortfolioChart } from './components/PortfolioChart';
import { AllocationChart } from './components/AllocationChart';
import { MarketCards } from './components/MarketCards';
import { PositionsTable } from './components/PositionsTable';
import { WatchlistPanel } from './components/WatchlistPanel';
import { KycVerification } from './components/KycVerification';
import { PersonalInformation } from './components/PersonalInformation';
import { MarketsView } from './components/MarketsView';
import { OrdersView } from './components/OrdersView';

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

function getTabFromPath(pathname) {
  if (pathname.endsWith('/personal-information')) return 'personal-information';
  if (pathname.startsWith('/user/')) return 'profile';

  const [, section, tab] = pathname.split('/');
  if (section !== 'dashboard') return 'markets';
  return tab || 'markets';
}

export function Dashboard({ onNavigate, currentTheme, onChangeTheme }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const user = JSON.parse(localStorage.getItem('capitalup-user') || '{}');
  const fullName = user.full_name || 'James Dornan';
  const firstName = fullName.split(' ')[0] || 'James';
  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'JD';
  const userId = user.user_id || user.id || 'profile';

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(window.location.pathname));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [initialOrderSide, setInitialOrderSide] = useState('BUY');

  const [portfolioValue, setPortfolioValue] = useState(0);

  const fetchStocks = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setStocks(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch stocks in dashboard:', err);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [API_BASE_URL, token]);

  const handleSelectStock = (stock, side) => {
    setSelectedStock(stock);
    if (side) {
      setInitialOrderSide(side);
    }
    changeTab('markets');
  };
  const [dayGain, setDayGain] = useState(0);
  const [dayGainPercent, setDayGainPercent] = useState(0);

  const fetchPortfolioData = async () => {
    const activeToken = localStorage.getItem('capitalup-access-token');
    if (!activeToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const result = await res.json();
      if (res.ok) {
        const cash = Number(localStorage.getItem('capitalup-cash-balance') || 10000);
        const holdingsVal = Number(result.data?.summary?.current_value || 0);
        setPortfolioValue(cash + holdingsVal);

        const invested = Number(result.data?.summary?.total_invested || 0);
        const profitLoss = holdingsVal - invested;
        setDayGain(profitLoss);
        setDayGainPercent(invested > 0 ? (profitLoss / invested) * 100 : 0);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard portfolio info:', err);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    window.addEventListener('balanceChanged', fetchPortfolioData);
    window.addEventListener('holdingsChanged', fetchPortfolioData);
    return () => {
      window.removeEventListener('balanceChanged', fetchPortfolioData);
      window.removeEventListener('holdingsChanged', fetchPortfolioData);
    };
  }, []);
  const [notifications, setNotifications] = useState(3);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const changeTab = (tab) => {
    const path = tab === 'personal-information'
      ? `/user/${userId}/personal-information`
      : tab === 'profile' || tab === 'settings'
      ? `/user/${userId}`
      : tab === 'markets'
      ? '/dashboard'
      : `/dashboard/${tab}`;

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    const handleChangeTab = (e) => {
      changeTab(e.detail);
    };
    const handlePopState = () => {
      setActiveTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('changeTab', handleChangeTab);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('changeTab', handleChangeTab);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [userId]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        color: 'var(--color-text-main)'
      }}>
      
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={changeTab} onNavigate={onNavigate} />

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: '232px', minWidth: 0 }}>
        {/* Top bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--color-bg-nav-0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--color-white-0.06)',
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
              background: searchOpen ? 'var(--color-white-0.07)' : 'var(--color-white-0.04)',
              border: `1px solid ${searchOpen ? 'var(--color-accent-0.4)' : 'var(--color-white-0.07)'}`,
              borderRadius: '8px',
              padding: '7px 14px',
              cursor: 'text',
              transition: 'all 0.2s',
              width: '280px',
              boxShadow: searchOpen ? '0 0 0 3px var(--color-accent-0.1)' : 'none'
            }}
            onClick={() => setSearchOpen(true)}>
            
            <Search size={13} color={searchOpen ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
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
                color: 'var(--color-text-main)',
                fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif',
                flex: 1
              }} />
            
            <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', background: 'var(--color-white-0.06)', padding: '2px 6px', borderRadius: '4px' }}>⌘K</span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Market status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-success-0.08)',
                border: '1px solid var(--color-success-0.2)',
                borderRadius: '100px',
                padding: '5px 12px'
              }}>
              
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success-0.7)' }} />
              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>Market Open</span>
            </div>

            {/* Notifications */}
            <button
              onClick={() => setNotifications(0)}
              style={{
                position: 'relative',
                background: 'var(--color-white-0.05)',
                border: '1px solid var(--color-white-0.08)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-white-0.05)'; }}>
              
              <Bell size={15} color="var(--color-text-sub)" />
              {notifications > 0 &&
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--color-error)',
                    color: 'var(--color-text-inverted)',
                    fontSize: '9px',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid var(--color-bg-base)'
                  }}>
                  {notifications}
                </span>
              }
            </button>

            {/* Avatar Dropdown Wrapper */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setAvatarMenuOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--color-white-0.04)',
                  border: '1px solid var(--color-white-0.08)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.07)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-white-0.04)'; }}>
                
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-accent), #A78BFA)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--color-text-inverted)'
                  }}>
                  {initials}
                </div>
                <ChevronDown size={12} color="var(--color-text-muted)" style={{ transform: avatarMenuOpen ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }} />
              </button>

              {avatarMenuOpen && (
                <>
                  {/* Click outside overlay */}
                  <div 
                    onClick={() => setAvatarMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'transparent' }}
                  />
                  
                  {/* Floating Menu */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '38px',
                      right: 0,
                      width: '200px',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px var(--color-white-0.04)',
                      padding: '6px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <button
                      onClick={() => { changeTab('profile'); setAvatarMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--color-text-sub)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.05)'; e.currentTarget.style.color = 'var(--color-text-main)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-sub)'; }}
                    >
                      <UserIcon size={14} />
                      Profile Settings
                    </button>

                    <button
                      onClick={() => { changeTab('kyc'); setAvatarMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--color-text-sub)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-white-0.05)'; e.currentTarget.style.color = 'var(--color-text-main)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-sub)'; }}
                    >
                      <ShieldCheck size={14} />
                      KYC Verification
                    </button>

                    <div style={{ height: '1px', background: 'var(--color-white-0.06)', margin: '4px 6px' }} />

                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        localStorage.removeItem('capitalup-access-token');
                        localStorage.removeItem('capitalup-refresh-token');
                        localStorage.removeItem('capitalup-user');
                        localStorage.removeItem('capitalup-session-expiry');
                        onNavigate('landing');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--color-error)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-error-0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '28px 32px', maxWidth: '1600px' }}>
          {activeTab === 'kyc' ? (
            <motion.div
              key="kyc-verification"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <KycVerification />
            </motion.div>
          ) : activeTab === 'personal-information' ? (
            <motion.div key="personal-information" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <PersonalInformation />
            </motion.div>
          ) : activeTab === 'profile' || activeTab === 'settings' ? (
            <motion.div
              key="profile-settings"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <ProfileSettings currentTheme={currentTheme} onChangeTheme={onChangeTheme} />
            </motion.div>
          ) : activeTab === 'markets' ? (
            <motion.div
              key="markets-view"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <MarketsView 
                onNavigate={onNavigate} 
                stocks={stocks}
                selectedStock={selectedStock}
                setSelectedStock={setSelectedStock}
                initialOrderSide={initialOrderSide}
                setInitialOrderSide={setInitialOrderSide}
              />
            </motion.div>
          ) : activeTab === 'orders' ? (
            <motion.div
              key="orders-view"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <OrdersView />
            </motion.div>
          ) : activeTab === 'overview' ? (
            <motion.div
              key="dashboard-overview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                  Market Overview
                </h1>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <MarketCards />
              </div>
              <div style={{
                background: 'var(--color-bg-panel-0.6)',
                border: '1px solid var(--color-white-0.07)',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 8px 32px var(--color-black-0.2)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid var(--color-accent-0.2)'
                }}>
                  <Bell size={24} color="var(--color-accent)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                  AI Financial Insights & News
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Our AI engine is currently analyzing global sentiment, real-time news, and earnings reports to deliver personalized trading ideas. This feature will be live soon!
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--color-white-0.08)' }}>
                  <ShieldCheck size={14} color="var(--color-success)" />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-sub)' }}>Analyzing 250+ global sources</span>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'portfolio' ? (
            <motion.div
              key="dashboard-portfolio"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
                  Good morning, {firstName} — Tuesday, June 2, 2026
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                    Portfolio Holdings
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: dayGain >= 0 ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)', border: `1px solid ${dayGain >= 0 ? 'var(--color-success-0.2)' : 'var(--color-error-0.2)'}`, borderRadius: '6px', padding: '4px 10px' }}>
                    {dayGain >= 0 ? <ArrowUpRight size={13} color="var(--color-success)" /> : <ArrowDownRight size={13} color="var(--color-error)" />}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: dayGain >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                      ₹{portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · {dayGain >= 0 ? '+' : ''}{dayGainPercent.toFixed(2)}% today
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <PositionsTable stocks={stocks} onSelectStock={handleSelectStock} />
              </div>
            </motion.div>
          ) : activeTab === 'watchlist' ? (
            <motion.div
              key="dashboard-watchlist"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                  My Watchlist
                </h1>
              </div>
              <div style={{ maxWidth: '800px', margin: '0 auto', height: '600px' }}>
                <WatchlistPanel />
              </div>
            </motion.div>
          ) : activeTab === 'research' ? (
            <motion.div
              key="dashboard-research"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                  Research Terminal
                </h1>
              </div>
              <div style={{
                background: 'var(--color-bg-panel-0.6)',
                border: '1px solid var(--color-white-0.07)',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 8px 32px var(--color-black-0.2)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid var(--color-accent-0.2)'
                }}>
                  <Search size={24} color="var(--color-accent)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                  Professional Stock Research & Analysis
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Access premium equity research report analysis, valuations, analyst consensus targets, and company financial statements. This feature will be live soon!
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--color-white-0.08)' }}>
                  <ShieldCheck size={14} color="var(--color-success)" />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-sub)' }}>Covering NSE & BSE listed equities</span>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'analytics' ? (
            <motion.div
              key="dashboard-analytics"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                  Analytics Dashboard
                </h1>
              </div>
              <div style={{
                background: 'var(--color-bg-panel-0.6)',
                border: '1px solid var(--color-white-0.07)',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 8px 32px var(--color-black-0.2)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid var(--color-accent-0.2)'
                }}>
                  <BarChart3 size={24} color="var(--color-accent)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                  Advanced Portfolio Analytics & Risk Analysis
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Understand your portfolio volatility, calculate beta exposures, Sharpe ratios, drawdowns, and analyze performance attribution. This feature will be live soon!
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-white-0.04)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--color-white-0.08)' }}>
                  <ShieldCheck size={14} color="var(--color-success)" />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-sub)' }}>Real-time statistics</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-overview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
                  Good morning, {firstName} — Tuesday, June 2, 2026
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                    Portfolio Overview
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: dayGain >= 0 ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)', border: `1px solid ${dayGain >= 0 ? 'var(--color-success-0.2)' : 'var(--color-error-0.2)'}`, borderRadius: '6px', padding: '4px 10px' }}>
                    {dayGain >= 0 ? <ArrowUpRight size={13} color="var(--color-success)" /> : <ArrowDownRight size={13} color="var(--color-error)" />}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: dayGain >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                      ₹{portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · {dayGain >= 0 ? '+' : ''}{dayGainPercent.toFixed(2)}% today
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '20px' }} className="max-xl:grid-cols-1">
                <PortfolioChart />
                <AllocationChart />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <MarketCards />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }} className="max-xl:grid-cols-1">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <PositionsTable stocks={stocks} onSelectStock={handleSelectStock} />
                  <div style={{ background: 'var(--color-bg-panel-0.6)', border: '1px solid var(--color-white-0.07)', borderRadius: '14px', padding: '20px 24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
                      Risk Analytics
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {riskMetrics.map((m) => (
                        <div key={m.label}>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '5px', fontWeight: 500 }}>{m.label}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 500, color: m.positive ? 'var(--color-success)' : m.negative ? 'var(--color-error)' : 'var(--color-text-main)' }}>
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ flex: 1, minHeight: '400px' }}>
                    <WatchlistPanel />
                  </div>
                  <div style={{ background: 'var(--color-bg-panel-0.6)', border: '1px solid var(--color-white-0.07)', borderRadius: '14px', padding: '18px 20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
                      Recent Activity
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {recentActivity.map((act, idx) => {
                        const isBuy = act.type === 'BUY';
                        const isDiv = act.type === 'DIV';
                        const typeColor = isBuy ? 'var(--color-accent)' : isDiv ? 'var(--color-success)' : 'var(--color-error)';
                        const typeBg = isBuy ? 'var(--color-accent-0.1)' : isDiv ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)';
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: typeColor, background: typeBg, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em', minWidth: '30px', textAlign: 'center' }}>
                                {act.type}
                              </span>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)' }}>{act.ticker}</div>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                  {isDiv ? 'Dividend' : `${act.shares} shares @ $${act.price.toFixed(2)}`}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)' }}>
                                ${act.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{act.time}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
