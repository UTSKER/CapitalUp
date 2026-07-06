import { useState, useEffect } from 'react';
import { Landing } from './features/landing/Landing';
import { AuthScreen } from './features/auth/AuthScreen';
import { Dashboard } from './features/dashboard/Dashboard';
import { GoogleOAuthProvider } from '@react-oauth/google';
import socket from "./services/socket.js";
import { initializeMarketSocketListener } from "./services/marketRealtime.js";

const viewRoutes = {
  landing: '/',
  login: '/login',
  register: '/register',
  forgot: '/forgot',
  dashboard: '/dashboard'
};

function getViewFromPath(pathname) {
  if (pathname === '/login') return 'login';
  if (pathname === '/register') return 'register';
  if (pathname === '/forgot') return 'forgot';
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/user/')) return 'dashboard';
  return 'landing';
}

function hasActiveSession() {
  const token = localStorage.getItem('capitalup-access-token');
  const expiry = localStorage.getItem('capitalup-session-expiry');
  return Boolean(token && expiry && Date.now() < Number(expiry));
}

function clearSession() {
  localStorage.removeItem('capitalup-access-token');
  localStorage.removeItem('capitalup-refresh-token');
  localStorage.removeItem('capitalup-user');
  localStorage.removeItem('capitalup-session-expiry');
}

export default function App() {
  const [view, setView] = useState(() => {
    const routeView = getViewFromPath(window.location.pathname);
    if (hasActiveSession()) {
      return routeView;
    }
    clearSession();
    if (routeView === 'dashboard') {
      window.history.replaceState({}, '', '/login');
    }
    return routeView === 'dashboard' ? 'login' : routeView;
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('capitalup-theme') || 'default';
  });
  const [isAnimatingTheme, setIsAnimatingTheme] = useState(false);
  const [oldTheme, setOldTheme] = useState('default');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-default', 'theme-light', 'theme-hacker');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const handlePopState = () => {
      if (!hasActiveSession()) {
        clearSession();
        const routeView = getViewFromPath(window.location.pathname);
        if (routeView === 'dashboard') {
          window.history.replaceState({}, '', '/login');
        }
        setView(routeView === 'dashboard' ? 'login' : routeView);
        return;
      }
      setView(getViewFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const unsubscribeRealtime = initializeMarketSocketListener();

    socket.on("connect", () => {
      console.log("Socket Connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket Disconnected");
    });

    return () => {
      unsubscribeRealtime?.();
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  const changeTheme = (newTheme) => {
    if (newTheme === theme) return;
    setOldTheme(theme);
    setIsAnimatingTheme(true);
    setTheme(newTheme);
    localStorage.setItem('capitalup-theme', newTheme);
    setTimeout(() => {
      setIsAnimatingTheme(false);
    }, 1200);
  };

  const navigate = (v, options = {}) => {
    const nextPath = options.path || viewRoutes[v] || '/';
    const nextView = getViewFromPath(nextPath);

    if (!hasActiveSession() && nextView === 'dashboard') {
      window.history.pushState({}, '', '/login');
      setView('login');
      return;
    }

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setView(nextView);
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy_client_id'}>
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', color: 'var(--color-text-main)' }}>
        {/* MARKER-MAKE-KIT-INVOKED */}
        {view === 'landing' && (
          <Landing onNavigate={navigate} currentTheme={theme} onChangeTheme={changeTheme} />
        )}
        {(view === 'login' || view === 'register' || view === 'forgot') && (
          <AuthScreen mode={view} onNavigate={navigate} currentTheme={theme} onChangeTheme={changeTheme} />
        )}
        {view === 'dashboard' && (
          <Dashboard onNavigate={navigate} currentTheme={theme} onChangeTheme={changeTheme} />
        )}

        {/* 3D Page Turn Theme Switch Animation Overlay */}
        {isAnimatingTheme && (
          <div className="page-flip-container">
            <div className="page-flip-shadow" />
            <div className={`page-flip-leaf theme-${oldTheme}`} style={{ display: 'flex', minHeight: '100vh' }}>
              {/* Mock Layout for Old Theme Page Leaf */}
              <div style={{ width: '232px', background: 'var(--color-bg-dark)', borderRight: '1px solid var(--color-white-0.06)', display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box' }}>
                <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)', borderRadius: '8px', marginBottom: '32px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '14px', background: 'var(--color-white-0.05)', borderRadius: '4px', marginBottom: '16px', width: '80%' }} />
                  <div style={{ height: '14px', background: 'var(--color-white-0.05)', borderRadius: '4px', marginBottom: '16px', width: '60%' }} />
                  <div style={{ height: '14px', background: 'var(--color-white-0.05)', borderRadius: '4px', marginBottom: '16px', width: '70%' }} />
                  <div style={{ height: '14px', background: 'var(--color-white-0.05)', borderRadius: '4px', marginBottom: '16px', width: '50%' }} />
                </div>
              </div>
              <div style={{ flex: 1, background: 'var(--color-bg-base)', padding: '28px 32px', boxSizing: 'border-box' }}>
                <div style={{ height: '32px', background: 'var(--color-white-0.05)', borderRadius: '6px', marginBottom: '24px', width: '200px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ height: '240px', background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '14px' }} />
                  <div style={{ height: '240px', background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '14px' }} />
                </div>
                <div style={{ height: '180px', background: 'var(--color-white-0.03)', border: '1px solid var(--color-white-0.05)', borderRadius: '14px' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
