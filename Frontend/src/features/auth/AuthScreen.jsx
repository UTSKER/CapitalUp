import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, Shield, CheckCircle, TrendingUp } from 'lucide-react';

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
    0%, 100% { box-shadow: 0 0 0 0 rgba(24,195,126,0.5); }
    50% { box-shadow: 0 0 0 5px rgba(24,195,126,0); }
  }
  .auth-live-dot { animation: auth-live-pulse 2.2s ease-in-out infinite; }
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

/* ─── LEFT PANEL ─────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #090C10 0%, #111315 35%, #0E1219 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '36px'
    }}>
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />

      {/* Background grid + glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          radial-gradient(ellipse 65% 55% at 50% 35%, rgba(79,140,255,0.1) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 15% 85%, rgba(24,195,126,0.07) 0%, transparent 60%),
          linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 28px 28px, 28px 28px'
      }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4F8CFF, #2860E8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(79,140,255,0.3)' }}>
          <TrendingUp size={15} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '17px', color: '#F7F8FA', letterSpacing: '-0.2px' }}>TradeX</div>
          <div style={{ fontSize: '8px', color: '#4F8CFF', fontWeight: 700, letterSpacing: '0.12em' }}>CAPITAL·HUB</div>
        </div>
      </div>

      {/* Center content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 0' }}>
        {/* Main portfolio card */}
        <div className="auth-float-a"
          style={{
            background: 'rgba(22,27,33,0.9)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', padding: '20px', backdropFilter: 'blur(16px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            marginBottom: '16px', position: 'relative', overflow: 'hidden'
          }}>
          
          {/* Inner highlight */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#4A5260', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '4px' }}>Portfolio Performance</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 500, color: '#F7F8FA', letterSpacing: '-0.3px' }}>$2,847,392</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#18C37E' }}>+$647,392</span>
                <span style={{ fontSize: '10px', color: '#18C37E', background: 'rgba(24,195,126,0.1)', padding: '1px 5px', borderRadius: '3px' }}>+29.4% YTD</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div className="auth-live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#18C37E' }} />
              <span style={{ fontSize: '10px', color: '#18C37E', fontWeight: 500 }}>Live</span>
            </div>
          </div>

          <div style={{ height: '86px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LEFT_CHART_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="authg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18C37E" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#18C37E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#18C37E" strokeWidth={2} fill="url(#authg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two mini cards below */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Holdings card */}
          <div className="auth-float-b"
            style={{
              background: 'rgba(22,27,33,0.88)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '14px', backdropFilter: 'blur(12px)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
            }}>
            
            <div style={{ fontSize: '9px', color: '#4A5260', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Holdings</div>
            {LEFT_STOCKS.map((s) =>
              <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#F7F8FA' }}>{s.ticker}</span>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#B2BAC5' }}>{s.price}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: s.up ? '#18C37E' : '#E25D5D' }}>{s.pct}</span>
                </div>
              </div>
            )}
          </div>

          {/* Allocation card */}
          <div style={{
            background: 'rgba(22,27,33,0.88)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '14px', backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '9px', color: '#4A5260', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Allocation</div>
            {[
              { l: 'Equities', p: 65, c: '#4F8CFF' },
              { l: 'Bonds', p: 20, c: '#18C37E' },
              { l: 'Cash', p: 8, c: '#F5B942' },
              { l: 'Alts', p: 7, c: '#A78BFA' }
            ].map((a) =>
              <div key={a.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: '#7A828E', width: '36px' }}>{a.l}</span>
                <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${a.p}%`, height: '100%', background: a.c }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#7A828E', width: '18px', textAlign: 'right' }}>{a.p}%</span>
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
            <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: '#F7F8FA', marginBottom: '2px' }}>{s.v}</div>
              <div style={{ fontSize: '9px', color: '#4A5260', fontWeight: 500 }}>{s.l}</div>
            </div>
          )}
        </div>

        {/* Quote */}
        <div style={{ borderLeft: '2px solid rgba(79,140,255,0.3)', paddingLeft: '14px' }}>
          <p style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '14px', color: '#7A828E', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '6px' }}>
            "The stock market is a device for transferring money from the impatient to the patient."
          </p>
          <span style={{ fontSize: '10px', color: '#4A5260' }}>— Warren Buffett</span>
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
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#B2BAC5', marginBottom: '7px', letterSpacing: '0.025em' }}>{label}</label>
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(79,140,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '9px', transition: 'all 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(79,140,255,0.1)' : 'none'
      }}>
        <div style={{ padding: '0 13px', color: focused ? '#4F8CFF' : '#4A5260', transition: 'color 0.2s', flexShrink: 0 }}>
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
            color: '#F7F8FA', fontSize: '13px', padding: '12px 0',
            fontFamily: 'DM Sans, sans-serif'
          }} />
        
        {isPass &&
          <button type="button" onClick={() => setShowPass((p) => !p)}
            style={{ padding: '0 13px', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5260', display: 'flex', alignItems: 'center' }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      </div>
    </div>
  );
}

/* ─── SUBMIT BUTTON ─────────────────────────────────────────────── */
function SubmitBtn({ label, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', padding: '13px', background: '#4F8CFF', border: 'none',
        borderRadius: '9px', color: '#fff', fontSize: '14px', fontWeight: 600,
        fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', marginBottom: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        transition: 'all 0.22s', boxShadow: '0 4px 20px rgba(79,140,255,0.3)'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#3D7BF0'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(79,140,255,0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#4F8CFF'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,140,255,0.3)'; }}>
      
      {label} <ArrowRight size={14} />
    </button>
  );
}

/* ─── GOOGLE BUTTON ─────────────────────────────────────────────── */
function GoogleBtn() {
  return (
    <button
      style={{
        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px',
        color: '#F7F8FA', fontSize: '13px', fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
        transition: 'all 0.2s', marginBottom: '20px'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}>
      
      <svg width="15" height="15" viewBox="0 0 24 24">
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
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontSize: '11px', color: '#4A5260' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

/* ─── FORMS ─────────────────────────────────────────────────────── */
function LoginForm({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <motion.div key="login" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: '#F7F8FA', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Welcome back</h1>
        <p style={{ fontSize: '13px', color: '#7A828E', lineHeight: 1.6 }}>Sign in to your TradeX account to manage your portfolio.</p>
      </div>

      <GoogleBtn />
      <Divider />

      <InputField type="email" label="Email Address" placeholder="you@example.com" icon={Mail} value={email} onChange={setEmail} />
      <InputField type="password" label="Password" placeholder="Your password" icon={Lock} value={password} onChange={setPassword} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: '#7A828E' }}>
          <input type="checkbox" style={{ accentColor: '#4F8CFF' }} />
          Remember me
        </label>
        <button onClick={() => onNavigate('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F8CFF', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
          Forgot password?
        </button>
      </div>

      <SubmitBtn label="Sign in to TradeX" onClick={() => onNavigate('dashboard')} />

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#7A828E' }}>
        No account yet?{' '}
        <button onClick={() => onNavigate('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F8CFF', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>Create one</button>
      </p>
    </motion.div>
  );
}

function RegisterForm({ onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: '#F7F8FA', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Create your account</h1>
        <p style={{ fontSize: '13px', color: '#7A828E', lineHeight: 1.6 }}>Join 180,000+ investors building institutional-grade portfolios.</p>
      </div>

      <InputField type="text" label="Full Name" placeholder="Your full name" icon={User} value={name} onChange={setName} />
      <InputField type="email" label="Email Address" placeholder="you@example.com" icon={Mail} value={email} onChange={setEmail} />
      <InputField type="password" label="Password" placeholder="Minimum 12 characters" icon={Lock} value={pass} onChange={setPass} />
      <InputField type="password" label="Confirm Password" placeholder="Repeat your password" icon={Lock} value={confirm} onChange={setConfirm} />

      <label style={{ display: 'flex', gap: '9px', marginBottom: '20px', cursor: 'pointer', alignItems: 'flex-start' }}>
        <input type="checkbox" style={{ accentColor: '#4F8CFF', marginTop: '3px', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: '#7A828E', lineHeight: 1.6 }}>
          I agree to TradeX's <span style={{ color: '#4F8CFF' }}>Terms of Service</span> and <span style={{ color: '#4F8CFF' }}>Privacy Policy</span>. I understand this is not financial advice.
        </span>
      </label>

      <SubmitBtn label="Create Account" onClick={() => onNavigate('dashboard')} />

      <p style={{ textAlign: 'center', fontSize: '12px', color: '#7A828E' }}>
        Already have an account?{' '}
        <button onClick={() => onNavigate('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F8CFF', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>Sign in</button>
      </p>
    </motion.div>
  );
}

function ForgotForm({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <motion.div key="forgot" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
      <button onClick={() => onNavigate('login')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5260', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', marginBottom: '24px', padding: 0, transition: 'color 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#B2BAC5'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#4A5260'}>
        <ArrowLeft size={13} /> Back to sign in
      </button>

      {!sent ?
        <>
          <div style={{ marginBottom: '26px' }}>
            <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '26px', fontWeight: 600, color: '#F7F8FA', letterSpacing: '-0.2px', lineHeight: 1.2, marginBottom: '8px' }}>Reset password</h1>
            <p style={{ fontSize: '13px', color: '#7A828E', lineHeight: 1.6 }}>Enter your email and we'll send you a secure reset link valid for 15 minutes.</p>
          </div>
          <InputField type="email" label="Email Address" placeholder="you@example.com" icon={Mail} value={email} onChange={setEmail} />
          <div style={{ marginTop: '8px' }}>
            <SubmitBtn label="Send Reset Link" onClick={() => setSent(true)} />
          </div>
        </> :

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(24,195,126,0.1)', border: '1px solid rgba(24,195,126,0.22)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <CheckCircle size={26} color="#18C37E" />
          </div>
          <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '21px', fontWeight: 600, color: '#F7F8FA', marginBottom: '10px' }}>Check your inbox</h2>
          <p style={{ fontSize: '13px', color: '#7A828E', lineHeight: 1.7, marginBottom: '24px' }}>
            A reset link has been sent to <strong style={{ color: '#B2BAC5' }}>{email || 'your email'}</strong>. It expires in 15 minutes.
          </p>
          <button onClick={() => onNavigate('login')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '9px', color: '#F7F8FA', fontSize: '13px', padding: '11px 22px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
            Return to sign in
          </button>
        </motion.div>
      }
    </motion.div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────── */
export function AuthScreen({ mode, onNavigate }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr',
      background: '#111315', fontFamily: 'DM Sans, system-ui, sans-serif'
    }}>
      {/* Left */}
      <LeftPanel />

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 40px', background: '#111315', position: 'relative' }}>
        {/* Back to home */}
        <button onClick={() => onNavigate('landing')}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '7px', padding: '7px 13px', color: '#7A828E', fontSize: '11px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F7F8FA'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#7A828E'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
          
          <ArrowLeft size={11} /> Home
        </button>

        {/* Auth card */}
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(22,27,33,0.6)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 72px rgba(0,0,0,0.4)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Top highlight */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', pointerEvents: 'none' }} />

          <AnimatePresence mode="wait">
            {mode === 'login' && <LoginForm onNavigate={onNavigate} />}
            {mode === 'register' && <RegisterForm onNavigate={onNavigate} />}
            {mode === 'forgot' && <ForgotForm onNavigate={onNavigate} />}
          </AnimatePresence>
        </div>

        {/* Security indicators */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[{ icon: Shield, t: 'SOC 2 Type II' }, { icon: Lock, t: '256-bit AES' }, { icon: CheckCircle, t: 'ISO 27001' }].map((item) =>
            <div key={item.t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <item.icon size={11} color="#4A5260" />
              <span style={{ fontSize: '10px', color: '#4A5260' }}>{item.t}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
