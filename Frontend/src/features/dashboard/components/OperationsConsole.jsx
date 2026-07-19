import { useEffect, useMemo, useState } from 'react';
import { Activity, Database, Gauge, PauseCircle, PlayCircle, RefreshCw, Server, Wifi } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function Metric({ label, value, suffix = '' }) {
  return (
    <div style={{ padding: '16px', background: 'var(--color-bg-panel-0.6)', border: '1px solid var(--color-white-0.07)', borderRadius: '12px' }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ marginTop: '7px', fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', color: 'var(--color-text-main)' }}>
        {value ?? '—'}{value !== null && value !== undefined ? suffix : ''}
      </div>
    </div>
  );
}

export function OperationsConsole() {
  const token = localStorage.getItem('capitalup-access-token');
  const [metrics, setMetrics] = useState(null);
  const [symbol, setSymbol] = useState('TCS');
  const [book, setBook] = useState(null);
  const [replay, setReplay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Request failed');
    return payload.data;
  };

  const loadMetrics = async () => {
    const data = await request('/admin/metrics');
    setMetrics(data);
  };

  const loadBook = async () => {
    const data = await request(`/admin/order-book/${encodeURIComponent(symbol.trim().toUpperCase())}?depth=10`);
    setBook(data);
  };

  const loadReplay = async () => {
    const from = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const data = await request(`/admin/replay?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}&from=${encodeURIComponent(from)}&limit=100`);
    setReplay(data);
  };

  const refresh = async () => {
    setLoading(true);
    setMessage('');
    try {
      await Promise.all([loadMetrics(), loadBook(), loadReplay()]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const setCircuitBreaker = async (tradingEnabled) => {
    try {
      await request('/admin/risk/circuit-breaker', {
        method: 'POST',
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), tradingEnabled, reason: tradingEnabled ? 'Operations console resumed trading' : 'Operations console halted trading' }),
      });
      setMessage(tradingEnabled ? `${symbol.toUpperCase()} trading resumed.` : `${symbol.toUpperCase()} trading halted.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const cancelOrder = async (id) => {
    try {
      await request(`/admin/order-book/orders/${id}`, { method: 'DELETE' });
      setMessage(`Order ${id} cancelled.`);
      await Promise.all([loadBook(), loadMetrics()]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const Levels = ({ title, levels, color }) => (
    <div style={{ flex: 1, minWidth: '280px' }}>
      <div style={{ color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px' }}>{title}</div>
      {(levels || []).length === 0 ? <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>No open levels</div> : levels.map((level) => (
        <div key={level.price} style={{ borderTop: '1px solid var(--color-white-0.06)', padding: '9px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
            <span style={{ color }}>{Number(level.price).toFixed(2)}</span>
            <span>{level.totalQuantity}</span>
            <span style={{ color: 'var(--color-text-muted)', textAlign: 'right' }}>{level.orderCount} FIFO</span>
          </div>
          {level.fifo.map((order) => (
            <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
              <span>{order.id.slice(0, 8)} · {order.remainingQuantity} qty</span>
              <button onClick={() => cancelOrder(order.id)} style={{ background: 'var(--color-error-0.1)', border: '1px solid var(--color-error-0.2)', color: 'var(--color-error)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'EB Garamond, Georgia, serif', fontSize: '30px' }}>Operations Console</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--color-text-muted)', fontSize: '12px' }}>Live engineering telemetry, risk controls, and matching-engine inspection.</p>
        </div>
        <button onClick={refresh} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-white-0.05)', border: '1px solid var(--color-white-0.1)', color: 'var(--color-text-main)', padding: '7px 11px', borderRadius: '7px', cursor: 'pointer' }}><RefreshCw size={13} /> Refresh</button>
      </div>

      {message && <div style={{ padding: '9px 12px', borderRadius: '7px', background: 'var(--color-white-0.05)', color: 'var(--color-text-sub)', fontSize: '12px' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <Metric label="Orders / sec" value={metrics?.ordersPerSecond?.toFixed(2)} />
        <Metric label="Trades / sec" value={metrics?.tradesPerSecond?.toFixed(2)} />
        <Metric label="Risk P95" value={metrics?.riskP95LatencyMs} suffix=" ms" />
        <Metric label="Risk P99" value={metrics?.riskP99LatencyMs} suffix=" ms" />
        <Metric label="Matching P95" value={metrics?.matchingEngine?.p95LatencyMs} suffix=" ms" />
        <Metric label="Queue size" value={metrics?.databaseQueueSize} />
        <Metric label="Redis hit ratio" value={metrics?.redisHitRatio === null ? null : `${(metrics.redisHitRatio * 100).toFixed(1)}`} suffix="%" />
        <Metric label="Sockets" value={metrics?.connectedWebSockets} />
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap', padding: '14px', background: 'var(--color-bg-panel-0.5)', border: '1px solid var(--color-white-0.07)', borderRadius: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: 'var(--color-text-muted)' }}>Symbol
          <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} style={{ width: '120px', background: 'var(--color-bg-base)', color: 'var(--color-text-main)', border: '1px solid var(--color-white-0.1)', borderRadius: '6px', padding: '7px' }} />
        </label>
        <button onClick={() => Promise.all([loadBook(), loadReplay()])} style={{ background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}>Inspect</button>
        <button onClick={() => setCircuitBreaker(false)} style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'var(--color-error-0.1)', border: '1px solid var(--color-error-0.25)', color: 'var(--color-error)', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}><PauseCircle size={13} /> Halt</button>
        <button onClick={() => setCircuitBreaker(true)} style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'var(--color-success-0.1)', border: '1px solid var(--color-success-0.25)', color: 'var(--color-success)', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}><PlayCircle size={13} /> Resume</button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '18px', background: 'var(--color-bg-panel-0.5)', border: '1px solid var(--color-white-0.07)', borderRadius: '12px' }}>
        <Levels title="BUY BIDS" levels={book?.bids} color="var(--color-success)" />
        <Levels title="SELL ASKS" levels={book?.asks} color="var(--color-error)" />
      </div>

      <div style={{ padding: '18px', background: 'var(--color-bg-panel-0.5)', border: '1px solid var(--color-white-0.07)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}><Activity size={15} color="var(--color-accent)" /> Replay timeline · {symbol}</div>
        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
          {replay.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No ticks or events in the last 15 minutes.</div> : replay.map((event, index) => (
            <div key={`${event.type}-${index}`} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '12px', padding: '7px 0', borderTop: '1px solid var(--color-white-0.05)', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-accent)' }}>{event.type}</span>
              <span style={{ color: 'var(--color-text-sub)' }}>{event.symbol || event.payload?.symbol || 'system'} {event.price ? `₹${event.price}` : ''}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{new Date(event.occurred_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
