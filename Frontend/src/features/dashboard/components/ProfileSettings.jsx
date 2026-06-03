import { useState } from 'react';
import { User, Mail, Phone, Shield, Key, Check, Copy, Moon, Sun, Terminal, Eye, EyeOff, CheckCircle } from 'lucide-react';

export function ProfileSettings({ currentTheme, onChangeTheme }) {
  const [formData, setFormData] = useState({
    name: 'James Dornan',
    email: 'james.dornan@capitalup.com',
    phone: '+1 (555) 382-9421',
    company: 'CapitalUp Ventures'
  });

  const [toggles, setToggles] = useState({
    twoFactor: true,
    emailAlerts: true,
    weeklyReports: false
  });

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const rawApiKey = 'cu_live_83f920da1bcde0837e7a828e192ff83c79a1f';
  const displayApiKey = apiKeyVisible ? rawApiKey : 'cu_live_••••••••••••••••••••••••••••••••••••';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(rawApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const themeOptions = [
    {
      id: 'default',
      name: 'Default Dark',
      description: 'Sleek dark interface with neon blue accents. Premium & easy on the eyes.',
      bg: '#111315',
      primary: '#4F8CFF',
      foreground: '#F7F8FA',
      cardBg: '#1D2126',
      icon: Moon
    },
    {
      id: 'light',
      name: 'Greyish Light',
      description: 'Clean off-white backgrounds with deep slate text and rich cobalt accents.',
      bg: '#F4F5F6',
      primary: '#2563EB',
      foreground: '#1A1D20',
      cardBg: '#FFFFFF',
      icon: Sun
    },
    {
      id: 'hacker',
      name: 'Matrix Hacker',
      description: 'Pure green-black backdrop with retro terminal vibes and glowing neon-green accents.',
      bg: '#080C08',
      primary: '#22C55E',
      foreground: '#A3E635',
      cardBg: '#0D150D',
      icon: Terminal
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Title */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>
          Preferences & Controls
        </div>
        <h1
          style={{
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--color-text-main)',
            letterSpacing: '-0.2px',
            lineHeight: 1.2
          }}>
          Account Profile & Settings
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }} className="max-xl:grid-cols-1">
        
        {/* Left column: Forms & Theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Theme customizer */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif' }}>Platform Theme Customization</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Choose your platform theme. The transition applies a premium 3D page flip effect as the variables update globally.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="max-md:grid-cols-1">
              {themeOptions.map((opt) => {
                const isSelected = currentTheme === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onChangeTheme(opt.id)}
                    style={{
                      background: opt.cardBg,
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-white-0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                      boxShadow: isSelected ? '0 10px 25px -10px var(--color-accent-0.3)' : 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--color-white-0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--color-white-0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}>
                    
                    {/* Header: Icon + Color dots */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'var(--color-white-0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: opt.primary
                        }}>
                        <IconComponent size={16} />
                      </div>
                      
                      {/* Color Preview */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.bg, border: '1px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.cardBg, border: '1px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.primary }} />
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: opt.foreground, marginBottom: '4px' }}>{opt.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{opt.description}</div>
                    </div>

                    {/* Checkmark overlay */}
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--color-accent)',
                          color: 'var(--color-text-inverted)',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile form */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <User size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif' }}>Personal Information</h2>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="max-md:grid-cols-1">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="max-md:grid-cols-1">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>Investment Entity / Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--color-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-accent)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    color: 'var(--color-text-inverted)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px var(--color-accent-0.2)',
                    transition: 'all 0.2s'
                  }}>
                  Save Profiles Changes
                </button>

                {savedStatus && (
                  <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} />
                    Changes saved successfully!
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* API keys */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '24px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Key size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'DM Sans, sans-serif' }}>Developer API Key</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Use your API key to fetch portfolio allocations and asset metrics into external tools or Excel sheets.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.06)', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayApiKey}
              </span>
              
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-sub)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                {apiKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              <button
                onClick={handleCopyKey}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedKey ? 'var(--color-success)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { if (!copiedKey) e.currentTarget.style.color = 'var(--color-text-sub)' }}
                onMouseLeave={(e) => { if (!copiedKey) e.currentTarget.style.color = 'var(--color-text-muted)' }}>
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Card details / info widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* User overview card */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-0.1) 0%, rgba(167, 139, 250, 0.05) 100%)',
              border: '1px solid var(--color-white-0.08)',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}>
            
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #A78BFA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--color-text-inverted)',
                boxShadow: '0 8px 24px var(--color-accent-0.2)'
              }}>
              JD
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>James Dornan</h3>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>james.dornan@capitalup.com</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-accent-0.1)', border: '1px solid var(--color-accent-0.3)', borderRadius: '100px', padding: '4px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 600 }}>Premium Client</span>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--color-white-0.06)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Joined Platform</span>
                <span style={{ color: 'var(--color-text-sub)' }}>June 2, 2024</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Primary Currency</span>
                <span style={{ color: 'var(--color-text-sub)' }}>USD ($)</span>
              </div>
            </div>
          </div>

          {/* Security controls */}
          <div
            style={{
              background: 'var(--color-bg-panel-0.95)',
              border: '1px solid var(--color-white-0.07)',
              borderRadius: '14px',
              padding: '20px'
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Shield size={15} color="var(--color-accent)" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>Security Settings</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 2FA Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Two-Factor Auth (2FA)</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Secure login using SMS/Authenticator.</div>
                </div>
                <button
                  onClick={() => setToggles({ ...toggles, twoFactor: !toggles.twoFactor })}
                  style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '100px',
                    background: toggles.twoFactor ? 'var(--color-success)' : 'var(--color-white-0.12)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: toggles.twoFactor ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </button>
              </div>

              {/* Email Alerts Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Transaction Notifications</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Email alert on asset buy/sell order.</div>
                </div>
                <button
                  onClick={() => setToggles({ ...toggles, emailAlerts: !toggles.emailAlerts })}
                  style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '100px',
                    background: toggles.emailAlerts ? 'var(--color-success)' : 'var(--color-white-0.12)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: toggles.emailAlerts ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </button>
              </div>

              {/* Weekly Reports Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>Weekly Digest Reports</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Receive summary analysis every Monday.</div>
                </div>
                <button
                  onClick={() => setToggles({ ...toggles, weeklyReports: !toggles.weeklyReports })}
                  style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '100px',
                    background: toggles.weeklyReports ? 'var(--color-success)' : 'var(--color-white-0.12)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: toggles.weeklyReports ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
