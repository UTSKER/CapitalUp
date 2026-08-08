import { useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, FileText, ArrowRight, Wallet, BellRing } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function AuditTimeline() {
  const [orderId, setOrderId] = useState('');
  const [inputOrderId, setInputOrderId] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTimeline = async (id) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('capitalup-access-token');
      const res = await fetch(`${API_BASE_URL}/orders/${id}/timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success) {
        setEvents(result.data);
      } else {
        toast.error('Failed to load timeline', { description: result.message });
        setEvents([]);
      }
    } catch (err) {
      toast.error('Network error', { description: err.message });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputOrderId.trim()) {
      setOrderId(inputOrderId.trim());
      fetchTimeline(inputOrderId.trim());
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'RISK_APPROVED': return <CheckCircle2 size={16} color="var(--color-success)" />;
      case 'RISK_REJECTED': return <XCircle size={16} color="var(--color-error)" />;
      case 'ORDER_EXECUTED': return <ArrowRight size={16} color="var(--color-primary)" />;
      case 'PORTFOLIO_UPDATED': return <Wallet size={16} color="var(--color-warning)" />;
      case 'NOTIFICATION_QUEUED': return <BellRing size={16} color="var(--color-accent)" />;
      case 'DAILY_PNL_UPDATED': return <FileText size={16} color="var(--color-success)" />;
      default: return <Clock size={16} color="var(--color-text-sub)" />;
    }
  };

  const getEventTitle = (eventType) => {
    switch (eventType) {
      case 'RISK_APPROVED': return 'Risk Validation Passed';
      case 'RISK_REJECTED': return 'Risk Validation Failed';
      case 'ORDER_EXECUTED': return 'Executed in Matching Engine';
      case 'PORTFOLIO_UPDATED': return 'User Portfolio Updated';
      case 'NOTIFICATION_QUEUED': return 'Notification Event Fired';
      case 'DAILY_PNL_UPDATED': return 'Daily P&L Recorded';
      default: return eventType.replace(/_/g, ' ');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>Audit & Event Timeline</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Immutable audit log mapping the complete lifecycle of any order.</p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
            <input 
              type="text"
              value={inputOrderId}
              onChange={e => setInputOrderId(e.target.value)}
              placeholder="Enter Order ID..."
              style={{
                background: 'var(--color-bg-panel-0.6)',
                border: '1px solid var(--color-white-0.08)',
                padding: '12px 16px 12px 42px',
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                fontSize: '14px',
                fontFamily: 'JetBrains Mono',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button type="submit" className="btn-glass" style={{ padding: '0 24px', borderRadius: '8px' }} disabled={loading}>
            {loading ? 'Searching...' : 'Trace Order'}
          </button>
        </form>
      </div>

      {orderId && events.length > 0 && (
        <div style={{ 
          background: 'var(--color-bg-panel-0.6)', 
          border: '1px solid var(--color-white-0.08)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--color-white-0.08)' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Tracing Execution For</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', fontWeight: 600 }}>{orderId}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Correlation ID</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: 'var(--color-text-sub)' }}>{events[0]?.correlation_id}</div>
            </div>
          </div>

          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {/* Vertical Line */}
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              bottom: '16px', 
              left: '9px', 
              width: '2px', 
              background: 'var(--color-white-0.08)' 
            }} />

            {events.map((evt, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: idx === events.length - 1 ? 0 : '32px' }}>
                {/* Connector Dot */}
                <div style={{ 
                  position: 'absolute', 
                  left: '-24px', 
                  top: '12px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--color-bg-base)',
                  border: '2px solid var(--color-white-0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-sub)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px', alignItems: 'flex-start' }}>
                  <div style={{ paddingTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {getEventIcon(evt.event_type)}
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        {getEventTitle(evt.event_type)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono' }}>
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ 
                    background: 'var(--color-white-0.03)', 
                    border: '1px solid var(--color-white-0.06)',
                    borderRadius: '8px',
                    padding: '16px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                    color: 'var(--color-text-sub)',
                    overflowX: 'auto',
                    lineHeight: 1.5
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orderId && events.length === 0 && !loading && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-panel-0.6)', borderRadius: '16px', border: '1px solid var(--color-white-0.08)' }}>
          No audit events found for order ID: <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--color-text-main)' }}>{orderId}</span>
        </div>
      )}
    </div>
  );
}
