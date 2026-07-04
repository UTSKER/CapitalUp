import { useState, useEffect } from 'react';
import { ClipboardList, AlertCircle, XCircle } from 'lucide-react';

export function OrdersView() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const [marketOrders, setMarketOrders] = useState([]);
  const [limitOrders, setLimitOrders] = useState([]);
  const [stopOrders, setStopOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch market orders
      const marketRes = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const marketData = await marketRes.json();

      // Fetch limit orders
      const limitRes = await fetch(`${API_BASE_URL}/limit-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const limitData = await limitRes.json();

      // Fetch stop orders
      const stopRes = await fetch(`${API_BASE_URL}/stop-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stopData = await stopRes.json();

      if (Array.isArray(marketData)) {
        setMarketOrders(marketData);
      } else if (marketData && Array.isArray(marketData.data)) {
        setMarketOrders(marketData.data);
      }

      if (Array.isArray(limitData)) {
        setLimitOrders(limitData);
      } else if (limitData && Array.isArray(limitData.data)) {
        setLimitOrders(limitData.data);
      }

      if (Array.isArray(stopData)) {
        setStopOrders(stopData);
      } else if (stopData && Array.isArray(stopData.data)) {
        setStopOrders(stopData.data);
      }

    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [API_BASE_URL, token]);

  const handleCancelLimitOrder = async (id) => {
    setCancelError('');
    setCancelSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/limit-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel limit order');
      }

      setCancelSuccess('Limit order cancelled successfully! Any linked OCO stop-loss was cancelled too.');
      fetchOrders();
      window.dispatchEvent(new Event('holdingsChanged')); // trigger portfolio update
    } catch (err) {
      setCancelError(err.message);
    }
  };

  const handleCancelStopOrder = async (id) => {
    setCancelError('');
    setCancelSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/stop-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel stop order');
      }

      setCancelSuccess('Stop order cancelled successfully! Any linked OCO limit order was cancelled too.');
      fetchOrders();
      window.dispatchEvent(new Event('holdingsChanged')); // trigger portfolio update
    } catch (err) {
      setCancelError(err.message);
    }
  };

  // Limit orders that have a live linked stop leg (OCO pairs)
  const ocoLimitIds = new Set(
    stopOrders
      .filter(s => s.status === 'PENDING' && (s.linkedLimitOrderId || s.linked_limit_order_id))
      .map(s => s.linkedLimitOrderId || s.linked_limit_order_id)
  );

  const ocoBadge = (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      color: 'var(--color-warning)',
      background: 'var(--color-warning-0.1)',
      padding: '2px 5px',
      borderRadius: '4px'
    }}>
      OCO
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
            Order Book
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Track executed market transactions and pending limit &amp; stop orders
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{
            background: 'var(--color-white-0.04)',
            border: '1px solid var(--color-white-0.08)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: 'var(--color-text-sub)',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Refresh Orders
        </button>
      </div>

      {cancelError && (
        <div style={{ background: 'var(--color-error-0.1)', border: '1px solid var(--color-error-0.2)', padding: '8px 12px', borderRadius: '8px', color: 'var(--color-error)', fontSize: '12px' }}>
          {cancelError}
        </div>
      )}

      {cancelSuccess && (
        <div style={{ background: 'var(--color-success-0.1)', border: '1px solid var(--color-success-0.2)', padding: '8px 12px', borderRadius: '8px', color: 'var(--color-success)', fontSize: '12px' }}>
          {cancelSuccess}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px', fontSize: '13px' }}>Loading orders...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="max-md:grid-cols-1">
          {/* Active Limit Orders */}
          <div style={{
            background: 'var(--color-bg-panel-0.6)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-white-0.06)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} color="var(--color-accent)" />
              Pending Limit Orders ({limitOrders.filter(o => o.status === 'PENDING').length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '450px' }}>
              {limitOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '12px' }}>No limit orders found</div>
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
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--color-white-0.03)',
                        border: '1px solid var(--color-white-0.05)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: isBuy ? 'var(--color-success)' : 'var(--color-error)',
                            background: isBuy ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)',
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}>
                            {order.side}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{order.symbol}</span>
                          {ocoLimitIds.has(order.id) && ocoBadge}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          Qty: {order.quantity} · Limit: ₹{Number(order.limitPrice || order.limit_price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                          {new Date(order.createdAt || order.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: order.status === 'PENDING' ? 'var(--color-warning)' : order.status === 'FILLED' ? 'var(--color-success)' : 'var(--color-text-dim)',
                          background: order.status === 'PENDING' ? 'var(--color-warning-0.1)' : order.status === 'FILLED' ? 'var(--color-success-0.1)' : 'var(--color-white-0.05)',
                          padding: '3px 8px',
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
                              background: 'var(--color-error-0.1)',
                              border: '1px solid var(--color-error-0.2)',
                              color: 'var(--color-error)',
                              fontSize: '10px',
                              fontWeight: 500,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <XCircle size={10} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Stop Orders */}
          <div style={{
            background: 'var(--color-bg-panel-0.6)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-white-0.06)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} color="var(--color-warning)" />
              Pending Stop Orders ({stopOrders.filter(o => o.status === 'PENDING').length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '450px' }}>
              {stopOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '12px' }}>No stop orders found</div>
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
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--color-white-0.03)',
                        border: '1px solid var(--color-white-0.05)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: isBuy ? 'var(--color-success)' : 'var(--color-error)',
                            background: isBuy ? 'var(--color-success-0.1)' : 'var(--color-error-0.1)',
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}>
                            {order.side} STOP
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{order.symbol}</span>
                          {isLinked && ocoBadge}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          Qty: {order.quantity} · Stop: ₹{Number(order.stopPrice || order.stop_price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                          {new Date(order.createdAt || order.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: order.status === 'PENDING' ? 'var(--color-warning)' : order.status === 'FILLED' ? 'var(--color-success)' : 'var(--color-text-dim)',
                          background: order.status === 'PENDING' ? 'var(--color-warning-0.1)' : order.status === 'FILLED' ? 'var(--color-success-0.1)' : 'var(--color-white-0.05)',
                          padding: '3px 8px',
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
                              background: 'var(--color-error-0.1)',
                              border: '1px solid var(--color-error-0.2)',
                              color: 'var(--color-error)',
                              fontSize: '10px',
                              fontWeight: 500,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <XCircle size={10} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Executed Market Orders */}
          <div style={{
            background: 'var(--color-bg-panel-0.6)',
            border: '1px solid var(--color-white-0.07)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-white-0.06)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={15} color="var(--color-success)" />
              Executed Market Orders ({marketOrders.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '450px' }}>
              {marketOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px', fontSize: '12px' }}>No executed orders found</div>
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
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--color-white-0.03)',
                        border: '1px solid var(--color-white-0.05)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: isBuy ? 'var(--color-accent)' : 'var(--color-error)',
                            background: isBuy ? 'var(--color-accent-0.1)' : 'var(--color-error-0.1)',
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}>
                            {order.side}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{order.symbol}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          Qty: {order.quantity} · Price: ₹{Number(order.price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                          {new Date(order.createdAt || order.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: 'var(--color-success)',
                          background: 'var(--color-success-0.1)',
                          padding: '3px 8px',
                          borderRadius: '100px'
                        }}>
                          FILLED
                        </span>
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
