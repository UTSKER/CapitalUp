import { useState } from 'react';
import { Landing } from './features/landing/Landing';
import { AuthScreen } from './features/auth/AuthScreen';
import { Dashboard } from './features/dashboard/Dashboard';

export default function App() {
  const [view, setView] = useState('landing');

  const navigate = (v) => setView(v);

  return (
    <div style={{ minHeight: '100vh', background: '#111315', color: '#F7F8FA' }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      {view === 'landing' && <Landing onNavigate={navigate} />}
      {(view === 'login' || view === 'register' || view === 'forgot') &&
      <AuthScreen mode={view} onNavigate={navigate} />
      }
      {view === 'dashboard' && <Dashboard onNavigate={navigate} />}
    </div>
  );
}
