import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, Shield, CheckCircle, TrendingUp } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

const AUTH_CSS = `
  @keyframes auth-float-a {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes auth-float-b {
    0%, 100% { transform: translateY(-4px); }
    50% { transform: translateY(4px); }
  }
  .auth-float-a { animation: auth-float-a 5s ease-in-out infinite; }
  .auth-float-b { animation: auth-float-b 6s ease-in-out infinite; }
  @keyframes auth-live-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--color-success-0.5); }
    50% { box-shadow: 0 0 0 5px var(--color-success-0); }
  }
  .auth-live-dot { animation: auth-live-pulse 2.2s ease-in-out infinite; }
  
  /* Autofill fix */
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active {
    transition: background-color 5000s ease-in-out 0s;
    -webkit-text-fill-color: var(--color-text-main) !important;
  }

  /* Improve placeholder visibility */
  input::placeholder {
    color: var(--color-text-sub) !important;
    opacity: 0.65 !important;
  }
`;

const LEFT_CHART_DATA = Array.from({ length: 52 }, (_, i) => {
  const base = 1_800_000, end = 2_847_392;
  const t = base + (end - base) * i / 51;
  const n = Math.sin(i * 1.1) * 80_000 + Math.cos(i * 0.7) * 45_000;
  return { i, v: Math.round(t + n) };
});

const LEFT_STOCKS = [
  { ticker: 'NVDA', price: '876.50', pct: '+4.12%', up: true },
  { ticker: 'AAPL', price: '189.87', pct: '+2.34%', up: true },
  { ticker: 'MSFT', price: '415.23', pct: '+0.87%', up: true },
  { ticker: 'TSLA', price: '248.30', pct: '-1.87%', up: false }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function authRequest(path, body) {
  const response = await fetch(`${API_BASE_URL}/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = payload.errors?.[0]?.message;
    throw new Error(validationMessage || payload.message || 'Request failed');
  }

  return payload;
}

function storeAuthSession(result) {
  const data = result.data || result;

  if (data.accessToken) {
    localStorage.setItem('capitalup-access-token', data.accessToken);
  }

  if (data.refreshToken) {
    localStorage.setItem('capitalup-refresh-token', data.refreshToken);
  }

  if (data.user) {
    localStorage.setItem('capitalup-user', JSON.stringify(data.user));
  }

  // Store user's session expiry for 7 days
  localStorage.setItem('capitalup-session-expiry', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
}

/* ─── LEFT PANEL ─────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #090C10 0%, var(--color-bg-base) 35%, #0E1219 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '36px'
    }}>
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />

      {/* Background grid + glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          radial-gradient(ellipse 65% 55% at 50% 35%, var(--color-accent-0.1) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 15% 85%, var(--color-success-0.07) 0%, transparent 60%),
          linear-gradient(var(--color-white-0.016) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-white-0.016) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 28px 28px, 28px 28px'
      }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px var(--color-accent-0.3)' }}>
          <TrendingUp size={15} color="var(--color-text-inverted)" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--color-text-main)', letterSpacing: '-0.2px' }}>CapitalUp</div>
          <div style={{ fontSize: '8px', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.12em' }}>GROW·CAPITAL·SMARTLY</div>
        </div>
      </div>

      {/* Center content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 0' }}>
        {/* Main portfolio card */}
        <div className="auth-float-a"
          style={{
            background: 'var(--color-bg-panel-0.9)', border: '1px solid var(--color-white-0.1)',
            borderRadius: '14px', padding: '20px', backdropFilter: 'blur(16px)',
            boxShadow: '0 24px 64px var(--color-black-0.6), 0 0 0 1px var(--color-white-0.04)',
            marginBottom: '16px', position: 'relative', overflow: 'hidden'
          }}>
          
          {/* Inner highlight */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--color-white-0.12), transparent)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '4px' }}>Portfolio Performance</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 500, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>$2,847,392</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--color-success)' }}>+$647,392</span>
                <span style={{ fontSize: '10px', color: 'var(--color-success)', background: 'var(--color-success-0.1)', padding: '1px 5px', borderRadius: '3px' }}>+29.4% YTD</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div className="auth-live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
              <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 500 }}>Live</span>
            </div>
          </div>

          <div style={{ height: '86px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LEFT_CHART_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="authg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="var(--color-success)" strokeWidth={2} fill="url(#authg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two mini cards below */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Holdings card */}
          <div className="auth-float-b"
            style={{
              background: 'var(--color-bg-panel-0.88)', border: '1px solid var(--color-white-0.08)',
              borderRadius: '12px', padding: '14px', backdropFilter: 'blur(12px)',
              boxShadow: '0 12px 32px var(--color-black-0.5)'
            }}>
            
            <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Holdings</div>
            {LEFT_STOCKS.map((s) =>
              <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-main)' }}>{s.ticker}</span>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--color-text-sub)' }}>{s.price}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: s.up ? 'var(--color-success)' : 'var(--color-error)' }}>{s.pct}</span>
                </div>
              </div>
            )}
          </div>

          {/* Allocation card */}
          <div style={{
            background: 'var(--color-bg-panel-0.88)', border: '1px solid var(--color-white-0.08)',
            borderRadius: '12px', padding: '14px', backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 32px var(--color-black-0.5)'
          }}>
            <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Allocation</div>
            {[
              { l: 'Equities', p: 65, c: 'var(--color-accent)' },
              { l: 'Bonds', p: 20, c: 'var(--color-success)' },
              { l: 'Cash', p: 8, c: 'var(--color-warning)' },
              { l: 'Alts', p: 7, c: '#A78BFA' }
            ].map((a) =>
              <div key={a.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', width: '36px' }}>{a.l}</span>
                <div style={{ flex: 1, height: '3px', background: 'var(--color-white-0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${a.p}%`, height: '100%', background: a.c }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'var(--color-text-muted)', width: '18px', textAlign: 'right' }}>{a.p}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { v: '$14.2B+', l: 'AUM' },
            { v: '180K+', l: 'Investors' },
            { v: '4.2M+', l: 'Daily Trades' }
          ].map((s) =>
            <div key={s.l} style={{ background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.07)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '2px' }}>{s.v}</div>
              <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', fontWeight: 500 }}>{s.l}</div>
            </div>
          )}
        </div>

        {/* Quote */}
        <div style={{ borderLeft: '2px solid var(--color-accent-0.3)', paddingLeft: '14px' }}>
          <p style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '6px' }}>
            "The stock market is a device for transferring money from the impatient to the patient."
          </p>
          <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>— Warren Buffett</span>
        </div>
      </div>
    </div>
  );
}

/* ─── INPUT FIELD ─────────────────────────────────────────────── */
function InputField({ type, label, placeholder, icon: Icon, value, onChange }) {
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPass = type === 'password';

  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: '7px', letterSpacing: '0.025em' }}>{label}</label>
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        background: focused ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
        border: focused ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '9px', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: focused 
          ? '0 0 0 3px rgba(59, 130, 246, 0.15), 0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)' 
          : '0 4px 20px 0 rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{ padding: '0 13px', color: focused ? 'var(--color-accent)' : 'var(--color-text-dim)', transition: 'color 0.25s', flexShrink: 0 }}>
          <Icon size={14} />
        </div>
        <input
          type={isPass && showPass ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-text-main)', fontSize: '13px', padding: '12px 0',
            fontFamily: 'DM Sans, sans-serif'
          }} />
        
        {isPass &&
          <button type="button" onClick={() => setShowPass((p) => !p)}
            style={{ 
              padding: '0 13px', background: 'none', border: 'none', cursor: 'pointer', 
              color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-main)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-dim)'}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      </div>
    </div>
  );
}

/* ─── SUBMIT BUTTON ─────────────────────────────────────────────── */
function SubmitBtn({ label, onClick, loading = false }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{
        width: '100%', padding: '13px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.12) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: '9px', color: '#FFFFFF', fontSize: '14px', fontWeight: 600,
        fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', marginBottom: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        transition: 'all 0.22s',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 4px 15px rgba(59, 130, 246, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: loading ? 0.72 : 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.38) 0%, rgba(37, 99, 235, 0.2) 100%)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 12px 36px 0 rgba(0, 0, 0, 0.45), 0 8px 24px rgba(59, 130, 246, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.12) 100%)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 4px 15px rgba(59, 130, 246, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)';
      }}>
      
      {loading ? 'Please wait...' : label} {!loading && <ArrowRight size={14} />}
    </button>
  );
}

/* ─── GOOGLE BUTTON ─────────────────────────────────────────────── */
function GoogleBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{
        width: '100%', padding: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '9px',
        color: 'var(--color-text-main)', fontSize: '13px', fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
        transition: 'all 0.2s', marginBottom: '20px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: loading ? 0.7 : 1
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 12px 36px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)';
        }
      }}>
      
      <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--color-white-0.07)' }} />
      <span style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--color-white-0.07)' }} />
    </div>
  );
}

/* ─── FORMS ─────────────────────────────────────────────────────── */
function FormMessage({ type, children }) {
  if (!children) return null;

  return (
    <div style={{
      marginBottom: '14px',
      padding: '10px 12px',
      borderRadius: '8px',
      background: type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-success-0.1)',
      border: `1px solid ${type === 'error' ? 'rgba(239, 68, 68, 0.28)' : 'var(--color-success-0.22)'}`,
      color: type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
      fontSize: '12px',
      lineHeight: 1.5
    }}>
      {children}
    </div>
  );
}

/* ─── UNREGISTERED USER ALERT MODAL ────────────────────────────── */
function UnregisteredAlertModal({ isOpen, onClose, onSignUp }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(12px)',
      animation: 'auth-fade-in 0.2s ease-out',
      boxSizing: 'border-box',
      padding: '20px'
    }} onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes auth-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes auth-scale-up { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}} />
      <div style={{
        background: 'var(--color-bg-panel-0.98)', border: '1px solid var(--color-white-0.12)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '380px',
        boxShadow: '0 24px 64px var(--color-black-0.8), 0 0 40px var(--color-accent-0.1)',
        animation: 'auth-scale-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        textAlign: 'center',
        boxSizing: 'border-box'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Warning Icon */}
        <div style={{
          width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px'
        }}>
          <Shield size={26} color="var(--color-error)" />
        </div>

        <h3 style={{
          fontFamily: 'EB Garamond, Georgia, serif', fontSize: '22px',
          fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '10px'
        }}>
          Account Not Found
        </h3>
        
        <p style={{
          fontSize: '13.5px', color: 'var(--color-text-muted)',
          lineHeight: 1.6, marginBottom: '24px', marginHorizontal: 0
        }}>
          The email you entered is not registered on CapitalUp. Please register yourself first.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', background: 'var(--color-white-0.05)',
            border: '1px solid var(--color-white-0.08)', borderRadius: '8px',
            color: 'var(--color-text-sub)', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-white-0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-white-0.05)'}>
            Try Again
          </button>
          
          <button onClick={onSignUp} style={{
            flex: 1, padding: '11px', background: 'var(--color-accent)',
            border: 'none', borderRadius: '8px',
            color: 'var(--color-text-inverted)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            boxShadow: '0 4px 14px var(--color-accent-0.3)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#3D7BF0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-accent)'}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ALREADY REGISTERED ALERT MODAL ────────────────────────────── */
function AlreadyRegisteredAlertModal({ isOpen, onClose, onLogin }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(12px)',
      animation: 'auth-fade-in 0.2s ease-out',
      boxSizing: 'border-box',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-bg-panel-0.98)', border: '1px solid var(--color-white-0.12)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '380px',
        boxShadow: '0 24px 64px var(--color-black-0.8), 0 0 40px var(--color-accent-0.1)',
        animation: 'auth-scale-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        textAlign: 'center',
        boxSizing: 'border-box'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Info/Check Icon */}
        <div style={{
          width: '56px', height: '56px', background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px'
        }}>
          <CheckCircle size={26} color="var(--color-accent)" />
        </div>

        <h3 style={{
          fontFamily: 'EB Garamond, Georgia, serif', fontSize: '22px',
          fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '10px'
        }}>
          Already Registered
        </h3>
        
        <p style={{
          fontSize: '13.5px', color: 'var(--color-text-muted)',
          lineHeight: 1.6, marginBottom: '24px', marginHorizontal: 0
        }}>
          This email is already registered on CapitalUp. Please go to the log in page.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', background: 'var(--color-white-0.05)',
            border: '1px solid var(--color-white-0.08)', borderRadius: '8px',
            color: 'var(--color-text-sub)', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-white-0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-white-0.05)'}>
            Cancel
          </button>
          
          <button onClick={onLogin} style={{
            flex: 1, padding: '11px', background: 'var(--color-accent)',
            border: 'none', borderRadius: '8px',
            color: 'var(--color-text-inverted)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            boxShadow: '0 4px 14px var(--color-accent-0.3)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#3D7BF0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-accent)'}>
            Go to Log In
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onNavigate, onVerificationNeeded }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showUnregisteredAlert, setShowUnregisteredAlert] = useState(false);

  const loginWithGoogleAction = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const result = await authRequest('/google', {
          accessToken: tokenResponse.access_token,
        });
        storeAuthSession(result);
        onNavigate('dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError('Google Login Failed'),
  });

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await authRequest('/login', {
        identifier: email,
        password,
      });

      storeAuthSession(result);
      onNavigate('dashboard');
    } catch (err) {
      const errMsg = err.message.toLowerCase();
      if (errMsg.includes('verify your email')) {
        try {
          await authRequest('/send-otp', { email });
        } catch {
          // The login error is still the useful user-facing state here.
        }
        onVerificationNeeded(email);
      } else if (errMsg.includes('email not registered') || errMsg.includes('user not found')) {
        setShowUnregisteredAlert(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="login" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Welcome back</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Sign in to your CapitalUp account to manage your portfolio.</p>
      </div>

      <GoogleBtn onClick={() => loginWithGoogleAction()} loading={googleLoading} />
      <Divider />

      <InputField type="email" label="Email Address" placeholder="you@example.com" icon={Mail} value={email} onChange={setEmail} />
      <InputField type="password" label="Password" placeholder="Your password" icon={Lock} value={password} onChange={setPassword} />
      <FormMessage type="error">{error}</FormMessage>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <input type="checkbox" style={{ accentColor: 'var(--color-accent)' }} />
          Remember me
        </label>
        <button onClick={() => onNavigate('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
          Forgot password?
        </button>
      </div>

      <SubmitBtn label="Sign in to CapitalUp" loading={loading} onClick={handleLogin} />

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        No account yet?{' '}
        <button onClick={() => onNavigate('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>Create one</button>
      </p>

      <UnregisteredAlertModal 
        isOpen={showUnregisteredAlert} 
        onClose={() => setShowUnregisteredAlert(false)} 
        onSignUp={() => {
          setShowUnregisteredAlert(false);
          onNavigate('register');
        }} 
      />
    </motion.div>
  );
}

function RegisterForm({ onNavigate, onVerificationNeeded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showAlreadyRegisteredAlert, setShowAlreadyRegisteredAlert] = useState(false);

  const registerWithGoogleAction = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const result = await authRequest('/google', {
          accessToken: tokenResponse.access_token,
        });
        storeAuthSession(result);
        onNavigate('dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError('Google Registration Failed'),
  });

  const handleRegister = async () => {
    setError('');

    if (pass !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authRequest('/register', {
        full_name: name,
        email,
        password: pass,
      });
      onVerificationNeeded(email);
    } catch (err) {
      if (err.message.toLowerCase().includes('already exists') || err.message.toLowerCase().includes('already registered')) {
        setShowAlreadyRegisteredAlert(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Create your account</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Join 180,000+ investors building institutional-grade portfolios.</p>
      </div>

      <GoogleBtn onClick={() => registerWithGoogleAction()} loading={googleLoading} />
      <Divider />

      <InputField type="text" label="Full Name" placeholder="Your full name" icon={User} value={name} onChange={setName} />
      <InputField type="email" label="Email Address" placeholder="you@example.com" icon={Mail} value={email} onChange={setEmail} />
      <InputField type="password" label="Password" placeholder="Minimum 12 characters" icon={Lock} value={pass} onChange={setPass} />
      <InputField type="password" label="Confirm Password" placeholder="Repeat your password" icon={Lock} value={confirm} onChange={setConfirm} />
      <FormMessage type="error">{error}</FormMessage>

      <label style={{ display: 'flex', gap: '9px', marginBottom: '20px', cursor: 'pointer', alignItems: 'flex-start' }}>
        <input type="checkbox" style={{ accentColor: 'var(--color-accent)', marginTop: '3px', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          I agree to CapitalUp's <span style={{ color: 'var(--color-accent)' }}>Terms of Service</span> and <span style={{ color: 'var(--color-accent)' }}>Privacy Policy</span>. I understand this is not financial advice.
        </span>
      </label>

      <SubmitBtn label="Create Account" loading={loading} onClick={handleRegister} />

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <button onClick={() => onNavigate('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>Sign in</button>
      </p>

      <AlreadyRegisteredAlertModal 
        isOpen={showAlreadyRegisteredAlert} 
        onClose={() => setShowAlreadyRegisteredAlert(false)} 
        onLogin={() => {
          setShowAlreadyRegisteredAlert(false);
          onNavigate('login');
        }} 
      />
    </motion.div>
  );
}

function OTPForm({ email, onNavigate, onBack }) {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('OTP sent to your email.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await authRequest('/verify-otp', { email, otp });
      storeAuthSession(result);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authRequest('/resend-otp', { email });
      setMessage('A fresh OTP has been sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', marginBottom: '24px', padding: 0 }}>
        <ArrowLeft size={13} /> Back
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Verify your email</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Enter the 6-digit code sent to <strong style={{ color: 'var(--color-text-sub)' }}>{email}</strong>.</p>
      </div>

      <InputField type="text" label="Verification Code" placeholder="123456" icon={Shield} value={otp} onChange={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))} />
      <FormMessage type="success">{message}</FormMessage>
      <FormMessage type="error">{error}</FormMessage>
      <SubmitBtn label="Verify Email" loading={loading} onClick={handleVerify} />

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        Didn't get it?{' '}
        <button onClick={handleResend} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>Resend OTP</button>
      </p>
    </motion.div>
  );
}

function ForgotForm({ onNavigate }) {
  const [step, setStep] = useState('email'); // 'email' or 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authRequest('/send-otp', { email, forceSend: true });
      setSuccess('Reset code sent to your email.');
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authRequest('/reset-password', {
        email,
        otp,
        newPassword: password
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        onNavigate('login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="forgot" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <button onClick={() => onNavigate('login')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', marginBottom: '24px', padding: 0, transition: 'color 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-sub)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-dim)'}>
        <ArrowLeft size={13} /> Back to sign in
      </button>

      {step === 'email' ?
        <form onSubmit={handleSendOTP}>
          <div style={{ marginBottom: '26px' }}>
            <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '26px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Reset password</h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Enter your email and we'll send you a 6-digit verification code to reset your password.</p>
          </div>
          <InputField type="email" label="Email Address" placeholder="you@example.com" icon={Mail} value={email} onChange={setEmail} />
          <FormMessage type="error">{error}</FormMessage>
          <FormMessage type="success">{success}</FormMessage>
          <div style={{ marginTop: '8px' }}>
            <SubmitBtn label="Send Reset OTP" loading={loading} />
          </div>
        </form> :

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '26px' }}>
            <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '26px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Enter new password</h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>Verify the code sent to <strong style={{ color: 'var(--color-text-sub)' }}>{email}</strong> and choose your new password.</p>
          </div>
          
          <InputField type="text" label="Verification Code" placeholder="123456" icon={Shield} value={otp} onChange={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))} />
          <InputField type="password" label="New Password" placeholder="Minimum 8 characters" icon={Lock} value={password} onChange={setPassword} />
          <InputField type="password" label="Confirm New Password" placeholder="Repeat your new password" icon={Lock} value={confirmPassword} onChange={setConfirmPassword} />
          
          <FormMessage type="error">{error}</FormMessage>
          <FormMessage type="success">{success}</FormMessage>
          
          <div style={{ marginTop: '8px' }}>
            <SubmitBtn label="Reset Password" loading={loading} />
          </div>
        </form>
      }
    </motion.div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────── */
export function AuthScreen({ mode, onNavigate }) {
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');

  const handleVerificationNeeded = (email) => {
    setPendingVerificationEmail(email.trim().toLowerCase());
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr',
      background: 'var(--color-bg-base)', fontFamily: 'DM Sans, system-ui, sans-serif'
    }}>
      {/* Left */}
      <LeftPanel />

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 40px', background: 'var(--color-bg-base)', position: 'relative' }}>
        {/* Back to home */}
        <button onClick={() => onNavigate('landing')}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            background: 'var(--color-white-0.04)', border: '1px solid var(--color-white-0.08)',
            borderRadius: '7px', padding: '7px 13px', color: 'var(--color-text-muted)', fontSize: '11px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-main)'; e.currentTarget.style.borderColor = 'var(--color-white-0.14)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-white-0.08)'; }}>
          
          <ArrowLeft size={11} /> Home
        </button>

        {/* Auth card */}
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--color-bg-panel-0.6)', border: '1px solid var(--color-white-0.08)',
          borderRadius: '16px', padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 72px var(--color-black-0.4)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Top highlight */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--color-white-0.12), transparent)', pointerEvents: 'none' }} />

          <AnimatePresence mode="wait">
            {pendingVerificationEmail && <OTPForm email={pendingVerificationEmail} onNavigate={onNavigate} onBack={() => setPendingVerificationEmail('')} />}
            {!pendingVerificationEmail && mode === 'login' && <LoginForm onNavigate={onNavigate} onVerificationNeeded={handleVerificationNeeded} />}
            {!pendingVerificationEmail && mode === 'register' && <RegisterForm onNavigate={onNavigate} onVerificationNeeded={handleVerificationNeeded} />}
            {!pendingVerificationEmail && mode === 'forgot' && <ForgotForm onNavigate={onNavigate} />}
          </AnimatePresence>
        </div>

        {/* Security indicators */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[{ icon: Shield, t: 'SOC 2 Type II' }, { icon: Lock, t: '256-bit AES' }, { icon: CheckCircle, t: 'ISO 27001' }].map((item) =>
            <div key={item.t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <item.icon size={11} color="var(--color-text-dim)" />
              <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{item.t}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
