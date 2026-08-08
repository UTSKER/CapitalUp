import { useState, useRef, useEffect } from 'react';
import { PlayCircle, Square, Clock, ArrowRight, Zap, Target, Search } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function ReplayEngine() {
  const [symbol, setSymbol] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d.toISOString().slice(0, 16);
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const scrollRef = useRef(null);

  const startReplay = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('capitalup-access-token');
      
      const query = new URLSearchParams({
        from: new Date(fromDate).toISOString(),
        to: new Date(toDate).toISOString()
      });
      if (symbol.trim()) query.append('symbol', symbol.trim().toUpperCase());

      const res = await fetch(`${API_BASE_URL}/admin/replay?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success) {
        if (result.data.length === 0) {
          toast.info('No events found for this time period');
          setEvents([]);
        } else {
          setEvents(result.data);
          setCurrentIndex(0);
          setReplaying(true);
        }
      } else {
        toast.error('Failed to fetch replay data', { description: result.message });
      }
    } catch (err) {
      toast.error('Network error', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const stopReplay = () => {
    setReplaying(false);
    setCurrentIndex(-1);
  };

  useEffect(() => {
    let timer;
    if (replaying && currentIndex < events.length - 1) {
      timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 50); // fast replay
    } else if (replaying && currentIndex >= events.length - 1) {
      setReplaying(false);
      toast.success('Replay complete');
    }

    if (scrollRef.current && replaying) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    return () => clearTimeout(timer);
  }, [replaying, currentIndex, events.length]);

  const getIcon = (type) => {
    if (type === 'MARKET_TICK') return <Zap size={14} color="var(--color-primary)" />;
    if (type.includes('ORDER')) return <Target size={14} color="var(--color-accent)" />;
    if (type.includes('RISK')) return <Target size={14} color="var(--color-warning)" />;
    return <ArrowRight size={14} color="var(--color-success)" />;
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>Replay Engine</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Re-create exact market states and order flows by replaying historical ticks and events.</p>
      </div>

      <div style={{ 
        background: 'var(--color-bg-panel-0.6)', 
        border: '1px solid var(--color-white-0.08)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr auto',
        gap: '16px',
        alignItems: 'end',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Target Symbol (Optional)</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input 
              type="text" 
              placeholder="e.g. NVDA" 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={replaying}
              style={{
                background: 'var(--color-white-0.03)',
                border: '1px solid var(--color-white-0.1)',
                padding: '10px 12px 10px 36px',
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                fontSize: '14px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>From Time</label>
          <input 
            type="datetime-local" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={replaying}
            style={{
              background: 'var(--color-white-0.03)',
              border: '1px solid var(--color-white-0.1)',
              padding: '10px 12px',
              borderRadius: '8px',
              color: 'var(--color-text-main)',
              fontSize: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>To Time</label>
          <input 
            type="datetime-local" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            disabled={replaying}
            style={{
              background: 'var(--color-white-0.03)',
              border: '1px solid var(--color-white-0.1)',
              padding: '10px 12px',
              borderRadius: '8px',
              color: 'var(--color-text-main)',
              fontSize: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          {!replaying ? (
            <button 
              className="btn-glass-accent"
              onClick={startReplay}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 500,
                height: '42px'
              }}
            >
              <PlayCircle size={16} />
              {loading ? 'Fetching...' : 'Start Replay'}
            </button>
          ) : (
            <button 
              className="btn-glass-error"
              onClick={stopReplay}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 500,
                height: '42px'
              }}
            >
              <Square size={16} />
              Stop Replay
            </button>
          )}
        </div>
      </div>

      <div 
        ref={scrollRef}
        style={{ 
          background: 'var(--color-bg-panel-0.6)', 
          border: '1px solid var(--color-white-0.08)',
          borderRadius: '16px',
          height: '500px',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ position: 'sticky', top: 0, background: 'var(--color-bg-nav-0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--color-white-0.08)', padding: '12px 20px', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--color-accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>Terminal Output</span>
          </div>
          {events.length > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-sub)', fontFamily: 'JetBrains Mono' }}>
              Replaying {currentIndex + 1} / {events.length}
            </div>
          )}
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.slice(0, currentIndex + 1).map((evt, idx) => (
            <div key={idx} style={{ 
              display: 'grid', 
              gridTemplateColumns: '140px 140px 1fr', 
              gap: '16px',
              fontFamily: 'JetBrains Mono', 
              fontSize: '12px',
              borderBottom: '1px solid var(--color-white-0.03)',
              paddingBottom: '8px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ color: 'var(--color-text-muted)' }}>
                {new Date(evt.occurred_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 3 })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-sub)' }}>
                {getIcon(evt.type)}
                {evt.type}
              </div>
              <div style={{ color: 'var(--color-text-main)' }}>
                {evt.type === 'MARKET_TICK' ? (
                  <span>[TICK] {evt.symbol} @ ₹{evt.price}</span>
                ) : (
                  <span>[EVENT] {evt.entity_type} {evt.entity_id ? `(${evt.entity_id})` : ''} - {JSON.stringify(evt.payload).slice(0, 100)}...</span>
                )}
              </div>
            </div>
          ))}
          {events.length === 0 && !loading && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
              Terminal waiting for input...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
