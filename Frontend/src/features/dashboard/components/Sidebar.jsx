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
  return (
    <aside
      style={{
        width: '232px',
        flexShrink: 0,
        background: '#0E1013',
        borderRight: '1px solid rgba(255,255,255,0.06)',
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
          borderBottom: '1px solid rgba(255,255,255,0.05)'
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
              background: 'linear-gradient(135deg, #4F8CFF 0%, #2D6BFF 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(79,140,255,0.3)'
            }}>
            
            <TrendingUp size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F7F8FA', letterSpacing: '-0.2px', lineHeight: 1 }}>
              CapitalUp
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '7px', color: '#4F8CFF', fontWeight: 700, letterSpacing: '0.12em', marginTop: '1px' }}>
              GROW·CAPITAL·SMARTLY
            </div>
          </div>
        </button>
      </div>

      {/* Portfolio summary */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
        
        <div style={{ fontSize: '10px', color: '#7A828E', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Portfolio Value
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 500, color: '#F7F8FA', marginBottom: '3px' }}>
          $2,847,392
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#18C37E' }}>+$24,839</span>
          <span style={{ fontSize: '10px', color: '#18C37E', background: 'rgba(24,195,126,0.1)', padding: '1px 5px', borderRadius: '4px' }}>+0.88%</span>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#4A5260', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', marginBottom: '4px' }}>
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
                color: isActive ? '#4F8CFF' : '#7A828E',
                background: isActive ? 'rgba(79,140,255,0.1)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                fontFamily: 'DM Sans, sans-serif',
                textAlign: 'left',
                marginBottom: '2px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#B2BAC5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#7A828E';
                }
              }}>
              
              <item.icon size={15} strokeWidth={isActive ? 2 : 1.8} />
              {item.label}
              {item.id === 'orders' &&
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#4F8CFF',
                    color: '#fff',
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
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />

        <div style={{ fontSize: '10px', fontWeight: 600, color: '#4A5260', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', marginBottom: '4px' }}>
          Settings
        </div>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            color: '#7A828E',
            background: 'transparent',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#B2BAC5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A828E'; }}>
          
          <Settings size={15} strokeWidth={1.8} />
          Settings
        </button>
      </nav>

      {/* User profile */}
      <div
        style={{
          padding: '12px 12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)'
        }}>
        
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
          
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F8CFF 0%, #A78BFA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0
            }}>
            JD
          </div>
          <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#F7F8FA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              James Dornan
            </div>
            <div style={{ fontSize: '10px', color: '#7A828E' }}>Premium Plan</div>
          </div>
          <LogOut size={13} color="#7A828E" />
        </button>
      </div>
    </aside>
  );
}
