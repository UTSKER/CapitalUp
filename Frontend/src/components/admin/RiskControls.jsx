import { useState } from 'react';
import { AlertOctagon, ShieldCheck, Power } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function RiskControls() {
  const [symbol, setSymbol] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCircuitBreaker = async (enabled) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('capitalup-access-token');
      
      const payload = {
        symbol: symbol.trim() || null,
        tradingEnabled: enabled,
        reason: reason.trim() || (enabled ? 'Manual override: Trading resumed' : 'Manual override: Trading halted')
      };

      const res = await fetch(`${API_BASE_URL}/admin/risk/circuit-breaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(`Circuit breaker ${enabled ? 'lifted' : 'activated'} for ${payload.symbol || 'GLOBAL'}`, {
          description: result.data.reason
        });
        setSymbol('');
        setReason('');
      } else {
        toast.error('Action failed', { description: result.message });
      }
    } catch (err) {
      toast.error('Network error', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>Risk Controls</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Independent risk engine controls to halt trading and protect the firm.</p>
      </div>

      <div style={{ 
        background: 'var(--color-bg-panel-0.6)', 
        border: '1px solid var(--color-white-0.08)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '700px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ 
            background: 'var(--color-error-0.1)', 
            padding: '10px', 
            borderRadius: '10px',
            border: '1px solid var(--color-error-0.2)'
          }}>
            <Power size={24} color="var(--color-error)" />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-main)' }}>Circuit Breaker</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>Instantly halt trading for a specific symbol or globally across the platform.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Target Symbol (Leave blank for GLOBAL)</label>
            <input 
              type="text" 
              placeholder="e.g. TCS, RELIANCE" 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              style={{
                background: 'var(--color-white-0.03)',
                border: '1px solid var(--color-white-0.1)',
                padding: '12px 16px',
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                fontSize: '14px',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Reason / Justification</label>
            <input 
              type="text" 
              placeholder="e.g. Extreme volatility" 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                background: 'var(--color-white-0.03)',
                border: '1px solid var(--color-white-0.1)',
                padding: '12px 16px',
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <button 
              className="btn-glass-error"
              disabled={loading}
              onClick={() => toggleCircuitBreaker(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              <AlertOctagon size={18} />
              HALT TRADING
            </button>

            <button 
              className="btn-glass-success"
              disabled={loading}
              onClick={() => toggleCircuitBreaker(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              <ShieldCheck size={18} />
              RESUME TRADING
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
