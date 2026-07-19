import { useState, useEffect } from 'react';
import { ClipboardList, AlertCircle, XCircle, RefreshCw, Clock, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';

export function OrdersView() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const [marketOrders, setMarketOrders] = useState([]);
  const [limitOrders, setLimitOrders] = useState([]);
  const [stopOrders, setStopOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const getFreshToken = () => localStorage.getItem('capitalup-access-token') || '';

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let activeToken = getFreshToken();

      const fetchWithAuth = async (url) => {
        let res = await fetch(url, { headers: { Authorization: `Bearer ${activeToken}` } });
        if (res.status === 401) {
          const refreshToken = localStorage.getItem('capitalup-refresh-token');
          if (refreshToken) {
            try {
              const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
              });
              const refreshResult = await refreshRes.json();
              if (refreshRes.ok && refreshResult.accessToken) {
                localStorage.setItem('capitalup-access-token', refreshResult.accessToken);
                localStorage.setItem('capitalup-session-expiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
                activeToken = refreshResult.accessToken;
                res = await fetch(url, { headers: { Authorization: `Bearer ${activeToken}` } });
              }
            } catch (e) {}
          }
        }
        return res.json();
      };

      // Fetch market, limit, and stop orders concurrently
      const [marketData, limitData, stopData] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/orders`),
        fetchWithAuth(`${API_BASE_URL}/limit-orders`),
        fetchWithAuth(`${API_BASE_URL}/stop-orders`)
      ]);

      if (Array.isArray(marketData)) setMarketOrders(marketData);
      else if (marketData && Array.isArray(marketData.data)) setMarketOrders(marketData.data);

      if (Array.isArray(limitData)) setLimitOrders(limitData);
      else if (limitData && Array.isArray(limitData.data)) setLimitOrders(limitData.data);

      if (Array.isArray(stopData)) setStopOrders(stopData);
      else if (stopData && Array.isArray(stopData.data)) setStopOrders(stopData.data);

    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelLimitOrder = async (id) => {
    setCancelError('');
    setCancelSuccess('');
    try {
      const activeToken = getFreshToken();
      const res = await fetch(`${API_BASE_URL}/limit-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel limit order');

      setCancelSuccess('Limit order cancelled successfully! Any linked OCO stop-loss was cancelled too.');
      fetchOrders();
      window.dispatchEvent(new Event('holdingsChanged'));
    } catch (err) {
      setCancelError(err.message);
    }
  };

  const handleCancelStopOrder = async (id) => {
    setCancelError('');
    setCancelSuccess('');
    try {
      const activeToken = getFreshToken();
      const res = await fetch(`${API_BASE_URL}/stop-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel stop order');

      setCancelSuccess('Stop order cancelled successfully! Any linked OCO limit order was cancelled too.');
      fetchOrders();
      window.dispatchEvent(new Event('holdingsChanged'));
    } catch (err) {
      setCancelError(err.message);
    }
  };

  const openTimeline = async (id) => {
    setTimelineLoading(true);
    setCancelError('');
    try {
      const activeToken = getFreshToken();
      const res = await fetch(`${API_BASE_URL}/orders/${id}/timeline`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load timeline');
      setTimeline({ id, events: data.data || [] });
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const ocoLimitIds = new Set(
    stopOrders
      .map((o) => o.linkedLimitOrderId || o.linked_limit_order_id)
      .filter(Boolean)
  );

  const ocoBadge = (
    <span style={{
      fontSize: '9.5px',
      fontWeight: 700,
      color: '#f59e0b',
      background: 'rgba(245, 158, 11, 0.15)',
      padding: '2px 7px',
      borderRadius: '6px',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      letterSpacing: '0.04em'
    }}>
      OCO
    </span>
  );

  const timelineButton = (id) => (
    <button
      onClick={() => openTimeline(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(var(--color-white-rgb), 0.04)',
        border: '1px solid rgba(var(--color-white-rgb), 0.09)',
        color: 'var(--color-text-sub)',
        fontSize: '11px',
        padding: '4px 9px',
        borderRadius: '7px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.08)';
        e.currentTarget.style.color = 'var(--color-text-main)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.04)';
        e.currentTarget.style.color = 'var(--color-text-sub)';
      }}
    >
      <Clock size={11} /> Timeline
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', minHeight: 'calc(100vh - 120px)' }}>
      {/* Background Orbs */}
      <div style={{
        position: 'absolute',
        top: '-5%',
        right: '-5%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
            Order Book
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Track real-time market executions, pending limit orders, and stop-loss triggers
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(var(--color-white-rgb), 0.05)',
            border: '1px solid rgba(var(--color-white-rgb), 0.1)',
            borderRadius: '12px',
            padding: '8px 16px',
            color: 'var(--color-text-main)',
            fontSize: '12.5px',
            fontWeight: 500,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.05)';
            e.currentTarget.style.borderColor = 'rgba(var(--color-white-rgb), 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: '#10b981' }} />
          Refresh Book
        </button>
      </div>

      {cancelError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '10px 16px', borderRadius: '12px', color: '#ef4444', fontSize: '13px', fontWeight: 500 }}>
          {cancelError}
        </div>
      )}

      {cancelSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px 16px', borderRadius: '12px', color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
          {cancelSuccess}
        </div>
      )}

      {/* Audit Timeline Drawer */}
      {timeline && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          background: 'rgba(var(--color-bg-panel-rgb), 0.85)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '18px 22px',
          borderRadius: '18px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} color="#10b981" /> Audit Trail Timeline · <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{timeline.id.slice(0, 8)}</span>
            </div>
            <button
              onClick={() => setTimeline(null)}
              style={{
                background: 'rgba(var(--color-white-rgb), 0.05)',
                border: '1px solid rgba(var(--color-white-rgb), 0.1)',
                color: 'var(--color-text-muted)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>

          {timeline.events.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>No timeline events recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {timeline.events.map((event) => (
                <div
                  key={event.sequence}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr auto',
                    gap: '12px',
                    fontSize: '12px',
                    borderTop: '1px solid rgba(var(--color-white-rgb), 0.06)',
                    paddingTop: '8px',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>{event.event_type}</span>
                  <span style={{ color: 'var(--color-text-main)' }}>{event.payload?.code || event.payload?.symbol || 'Order lifecycle event logged'}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px', fontSize: '14px', position: 'relative', zIndex: 1 }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#10b981' }} />
          Loading Order Book...
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="max-xl:grid-cols-1">
          {/* Pending Limit Orders */}
          <div style={{
            background: 'rgba(var(--color-bg-panel-rgb), 0.75)',
            border: '1px solid rgba(var(--color-white-rgb), 0.08)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              borderBottom: '1px solid rgba(var(--color-white-rgb), 0.08)',
              paddingBottom: '12px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#3b82f6" /> Pending Limit Orders
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                {limitOrders.filter(o => o.status === 'PENDING').length}
              </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '480px' }}>
              {limitOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px 10px', fontSize: '12.5px' }}>No limit orders found</div>
              ) : (
                limitOrders.map((order) => {
                  const isBuy = order.side === 'BUY';
                  return (
                    <div
                      key={order.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'rgba(var(--color-white-rgb), 0.03)',
                        border: '1px solid rgba(var(--color-white-rgb), 0.06)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(var(--color-white-rgb), 0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: isBuy ? '#10b981' : '#ef4444',
                            background: isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            {isBuy ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {order.side}
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-main)' }}>{order.symbol}</span>
                          {ocoLimitIds.has(order.id) && ocoBadge}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                          Qty: <strong style={{ color: 'var(--color-text-main)' }}>{order.quantity}</strong> · Limit: <strong style={{ color: '#10b981' }}>₹{Number(order.limitPrice || order.limit_price).toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {new Date(order.createdAt || order.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: order.status === 'PENDING' ? '#f59e0b' : order.status === 'FILLED' ? '#10b981' : 'var(--color-text-muted)',
                          background: order.status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : order.status === 'FILLED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(var(--color-white-rgb), 0.05)',
                          padding: '3px 9px',
                          borderRadius: '100px'
                        }}>
                          {order.status}
                        </span>
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelLimitOrder(order.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <XCircle size={11} /> Cancel
                          </button>
                        )}
                        {timelineButton(order.id)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Stop Orders */}
          <div style={{
            background: 'rgba(var(--color-bg-panel-rgb), 0.75)',
            border: '1px solid rgba(var(--color-white-rgb), 0.08)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              borderBottom: '1px solid rgba(var(--color-white-rgb), 0.08)',
              paddingBottom: '12px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#f59e0b" /> Pending Stop Orders
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                {stopOrders.filter(o => o.status === 'PENDING').length}
              </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '480px' }}>
              {stopOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px 10px', fontSize: '12.5px' }}>No stop orders found</div>
              ) : (
                stopOrders.map((order) => {
                  const isBuy = order.side === 'BUY';
                  const isLinked = Boolean(order.linkedLimitOrderId || order.linked_limit_order_id);
                  return (
                    <div
                      key={order.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'rgba(var(--color-white-rgb), 0.03)',
                        border: '1px solid rgba(var(--color-white-rgb), 0.06)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(var(--color-white-rgb), 0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: isBuy ? '#10b981' : '#ef4444',
                            background: isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            {isBuy ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {order.side} STOP
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-main)' }}>{order.symbol}</span>
                          {isLinked && ocoBadge}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                          Qty: <strong style={{ color: 'var(--color-text-main)' }}>{order.quantity}</strong> · Stop: <strong style={{ color: '#ef4444' }}>₹{Number(order.stopPrice || order.stop_price).toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {new Date(order.createdAt || order.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: order.status === 'PENDING' ? '#f59e0b' : order.status === 'FILLED' ? '#10b981' : 'var(--color-text-muted)',
                          background: order.status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : order.status === 'FILLED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(var(--color-white-rgb), 0.05)',
                          padding: '3px 9px',
                          borderRadius: '100px'
                        }}>
                          {order.status}
                        </span>
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelStopOrder(order.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <XCircle size={11} /> Cancel
                          </button>
                        )}
                        {timelineButton(order.id)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Executed Market Orders */}
          <div style={{
            background: 'rgba(var(--color-bg-panel-rgb), 0.75)',
            border: '1px solid rgba(var(--color-white-rgb), 0.08)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              borderBottom: '1px solid rgba(var(--color-white-rgb), 0.08)',
              paddingBottom: '12px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={16} color="#10b981" /> Executed Market Orders
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                {marketOrders.length}
              </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '480px' }}>
              {marketOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px 10px', fontSize: '12.5px' }}>No executed orders found</div>
              ) : (
                marketOrders.map((order) => {
                  const isBuy = order.side === 'BUY';
                  return (
                    <div
                      key={order.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'rgba(var(--color-white-rgb), 0.03)',
                        border: '1px solid rgba(var(--color-white-rgb), 0.06)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(var(--color-white-rgb), 0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: isBuy ? '#10b981' : '#ef4444',
                            background: isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            {isBuy ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {order.side}
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-main)' }}>{order.symbol}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                          Qty: <strong style={{ color: 'var(--color-text-main)' }}>{order.quantity}</strong> · Price: <strong style={{ color: 'var(--color-text-main)' }}>₹{Number(order.price).toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          {new Date(order.createdAt || order.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.15)',
                          padding: '3px 9px',
                          borderRadius: '100px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle2 size={11} /> FILLED
                        </span>
                        {timelineButton(order.id)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
