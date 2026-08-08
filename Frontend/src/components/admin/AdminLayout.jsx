import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart2, 
  ShieldAlert, 
  ListTree, 
  History, 
  PlayCircle,
  LogOut,
  ChevronLeft
} from 'lucide-react';

import { PerformanceDashboard } from './PerformanceDashboard';
import { RiskControls } from './RiskControls';
import { LiveOrderBookInspector } from './LiveOrderBookInspector';
import { AuditTimeline } from './AuditTimeline';
import { ReplayEngine } from './ReplayEngine';

export function AdminLayout({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('performance');

  const menuItems = [
    { id: 'performance', label: 'Performance', icon: BarChart2 },
    { id: 'risk', label: 'Risk Engine', icon: ShieldAlert },
    { id: 'orderbook', label: 'Order Book', icon: ListTree },
    { id: 'timeline', label: 'Audit Timeline', icon: History },
    { id: 'replay', label: 'Replay Engine', icon: PlayCircle },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        background: 'var(--color-bg-nav-0.9)',
        borderRight: '1px solid var(--color-white-0.08)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-accent)' }}>
            CapitalUp Admin
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            System Architecture Console
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: isActive ? 'var(--color-white-0.06)' : 'transparent',
                  color: isActive ? 'var(--color-text-main)' : 'var(--color-text-sub)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-white-0.03)';
                    e.currentTarget.style.color = 'var(--color-text-main)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-sub)';
                  }
                }}
              >
                <Icon size={18} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '0 12px', marginTop: 'auto' }}>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              width: '100%',
              background: 'transparent',
              color: 'var(--color-text-sub)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-main)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-sub)'}
          >
            <ChevronLeft size={16} />
            Back to Dashboard
          </button>
          
          <button
            onClick={() => {
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
              padding: '10px 12px',
              width: '100%',
              background: 'transparent',
              color: 'var(--color-error)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
              marginTop: '4px'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-error-0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'performance' && <PerformanceDashboard />}
          {activeTab === 'risk' && <RiskControls />}
          {activeTab === 'orderbook' && <LiveOrderBookInspector />}
          {activeTab === 'timeline' && <AuditTimeline />}
          {activeTab === 'replay' && <ReplayEngine />}
        </motion.div>
      </div>
    </div>
  );
}
