import {
  LayoutDashboard, TrendingUp, PieChart, BarChart3, Star,
  ClipboardList, BookOpen, Settings, LogOut } from
'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'watchlist', label: 'Watchlist', icon: Star },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'research', label: 'Research', icon: BookOpen }
];

export function Sidebar({ activeTab, onTabChange, onNavigate }) {
  const user = JSON.parse(localStorage.getItem('capitalup-user') || '{}');
  const fullName = user.full_name || 'James Dornan';
  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'JD';

  return (
    <aside
      style={{
        width: '232px',
        flexShrink: 0,
        background: 'var(--color-bg-dark)',
        borderRight: '1px solid var(--color-white-0.06)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
        overflowY: 'auto'
      }}>
      
      {/* Logo */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--color-white-0.05)'
        }}>
        
        <button
          onClick={() => onNavigate('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0
          }}>
          
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px var(--color-accent-0.3)'
            }}>
            
            <TrendingUp size={15} color="var(--color-text-inverted)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1 }}>
              CapitalUp
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '7px', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.12em', marginTop: '1px' }}>
              GROW·CAPITAL·SMARTLY
            </div>
          </div>
        </button>
      </div>

      {/* Portfolio summary */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--color-white-0.05)'
        }}>
        
        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Portfolio Value
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '3px' }}>
          $2,847,392
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-success)' }}>+$24,839</span>
          <span style={{ fontSize: '10px', color: 'var(--color-success)', background: 'var(--color-success-0.1)', padding: '1px 5px', borderRadius: '4px' }}>+0.88%</span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', marginBottom: '4px' }}>
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-accent-0.1)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                fontFamily: 'DM Sans, sans-serif',
                textAlign: 'left',
                marginBottom: '2px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-white-0.05)';
                  e.currentTarget.style.color = 'var(--color-text-sub)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }
              }}>
              
              <item.icon size={15} strokeWidth={isActive ? 2 : 1.8} />
              {item.label}
              {item.id === 'orders' &&
                <span
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--color-accent)',
                    color: 'var(--color-text-inverted)',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '10px'
                  }}>
                  3
                </span>
              }
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-white-0.05)', margin: '12px 0' }} />

        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', marginBottom: '4px' }}>
          Settings
        </div>
        <button
          onClick={() => onTabChange('settings')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'settings' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            background: activeTab === 'settings' ? 'var(--color-accent-0.1)' : 'transparent',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'settings') {
              e.currentTarget.style.background = 'var(--color-white-0.05)';
              e.currentTarget.style.color = 'var(--color-text-sub)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'settings') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }
          }}>
          
          <Settings size={15} strokeWidth={1.8} />
          Settings
        </button>
      </nav>
 
      {/* User profile */}
      <div
        style={{
          padding: '12px 12px 16px',
          borderTop: '1px solid var(--color-white-0.05)'
        }}>
        
        <button
          onClick={() => onTabChange('profile')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: activeTab === 'profile' ? 'var(--color-accent-0.1)' : 'var(--color-white-0.03)',
            border: `1px solid ${activeTab === 'profile' ? 'var(--color-accent-0.3)' : 'var(--color-white-0.06)'}`,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'profile') {
              e.currentTarget.style.background = 'var(--color-white-0.06)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'profile') {
              e.currentTarget.style.background = 'var(--color-white-0.03)';
            }
          }}>
          
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #A78BFA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-inverted)',
              flexShrink: 0
            }}>
            {initials}
          </div>
          <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fullName}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Premium Plan</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              localStorage.removeItem('capitalup-access-token');
              localStorage.removeItem('capitalup-refresh-token');
              localStorage.removeItem('capitalup-user');
              localStorage.removeItem('capitalup-session-expiry');
              onNavigate('landing');
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}>
            <LogOut size={13} color="var(--color-text-muted)" />
          </button>
        </button>
      </div>
    </aside>
  );
}
