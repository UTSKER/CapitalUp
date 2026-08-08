import { useState, useEffect } from 'react';
import { Search, Trash2, ListTree, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function LiveOrderBookInspector() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [inputSymbol, setInputSymbol] = useState('RELIANCE');
  const [book, setBook] = useState({ bids: [], asks: [], orderCount: 0 });
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBook = async (sym) => {
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const res = await fetch(`${API_BASE_URL}/admin/order-book/${sym}?depth=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setBook(result.data);
      }
    } catch (err) {
      console.error('Error fetching order book', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBook(symbol).finally(() => setLoading(false));
    const interval = setInterval(() => fetchBook(symbol), 2000);
    return () => clearInterval(interval);
  }, [symbol]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      setSymbol(inputSymbol.trim().toUpperCase());
      setExpandedRow(null);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const res = await fetch(`${API_BASE_URL}/admin/order-book/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Order cancelled successfully from the matching engine');
        fetchBook(symbol);
      } else {
        toast.error('Failed to cancel order', { description: result.message });
      }
    } catch (err) {
      toast.error('Network error', { description: err.message });
    }
  };

  const toggleRow = (price) => {
    setExpandedRow(expandedRow === price ? null : price);
  };

  const renderSide = (levels, type) => {
    const isAsk = type === 'ASK';
    const color = isAsk ? 'error' : 'success';

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr 40px', 
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-white-0.08)',
          background: 'var(--color-white-0.03)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div>Price</div>
          <div style={{ textAlign: 'right' }}>Total Qty</div>
          <div style={{ textAlign: 'right' }}>Orders</div>
          <div></div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
          {levels.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No {isAsk ? 'SELL' : 'BUY'} orders in book
            </div>
          ) : (
            levels.map((level) => (
              <div key={level.price} style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  onClick={() => toggleRow(level.price)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 40px',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--color-white-0.04)',
                    cursor: 'pointer',
                    background: expandedRow === level.price ? 'var(--color-white-0.06)' : 'transparent',
                    transition: 'background 0.2s',
                    alignItems: 'center'
                  }}
                  onMouseEnter={e => {
                    if (expandedRow !== level.price) e.currentTarget.style.background = 'var(--color-white-0.03)';
                  }}
                  onMouseLeave={e => {
                    if (expandedRow !== level.price) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ color: `var(--color-${color})`, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                    ₹{level.price.toFixed(2)}
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--color-text-main)' }}>
                    {level.totalQuantity}
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--color-text-sub)' }}>
                    {level.orderCount}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--color-text-muted)' }}>
                    {expandedRow === level.price ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>
                
                {expandedRow === level.price && (
                  <div style={{ background: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-white-0.04)', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={12} />
                      FIFO Queue Visualization
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {level.fifo.map((order, idx) => (
                        <div key={order.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          background: 'var(--color-white-0.03)',
                          border: '1px solid var(--color-white-0.06)',
                          padding: '8px 12px',
                          borderRadius: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              background: 'var(--color-white-0.08)', 
                              color: 'var(--color-text-main)', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontFamily: 'JetBrains Mono' 
                            }}>
                              #{idx + 1}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', color: 'var(--color-text-sub)' }}>
                                {order.id.slice(0, 8)}...
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--color-text-main)' }}>
                              Qty: {order.remainingQuantity}
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); cancelOrder(order.id); }}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                cursor: 'pointer',
                                color: 'var(--color-error)',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-error-0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              title="Cancel Order"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>Live Order Book Inspector</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Deep inspection of the Matching Engine's Red-Black Tree memory structures.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input 
              type="text"
              value={inputSymbol}
              onChange={e => setInputSymbol(e.target.value)}
              placeholder="Search symbol..."
              style={{
                background: 'var(--color-bg-panel-0.6)',
                border: '1px solid var(--color-white-0.08)',
                padding: '10px 16px 10px 36px',
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                fontSize: '14px',
                fontFamily: 'JetBrains Mono',
                width: '200px'
              }}
            />
          </div>
          <button type="submit" className="btn-glass" style={{ padding: '0 20px', borderRadius: '8px' }}>
            Inspect
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-panel-0.6)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-white-0.08)' }}>
          <ListTree size={16} color="var(--color-accent)" />
          <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>Tree Node Count:</span>
          <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'JetBrains Mono', color: 'var(--color-text-main)' }}>{book.orderCount}</span>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        opacity: loading && !book.bids.length ? 0.5 : 1,
        transition: 'opacity 0.2s'
      }}>
        <div style={{ 
          background: 'var(--color-bg-panel-0.6)', 
          border: '1px solid var(--color-white-0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-white-0.08)', background: 'var(--color-white-0.02)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-success)' }}>Bids (Buy)</h3>
          </div>
          {renderSide(book.bids, 'BID')}
        </div>

        <div style={{ 
          background: 'var(--color-bg-panel-0.6)', 
          border: '1px solid var(--color-white-0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-white-0.08)', background: 'var(--color-white-0.02)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-error)' }}>Asks (Sell)</h3>
          </div>
          {renderSide(book.asks, 'ASK')}
        </div>
      </div>
    </div>
  );
}
