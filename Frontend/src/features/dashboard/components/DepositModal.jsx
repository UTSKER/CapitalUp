import { useState, useEffect } from 'react';
import { X, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function DepositModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdDeposit, setCreatedDeposit] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');
  const user = JSON.parse(localStorage.getItem('capitalup-user') || '{}');

  useEffect(() => {
    if (isOpen) {
      setAmount('5000');
      setError(null);
      setSuccess(false);
      setCreatedDeposit(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickAmount = (val) => {
    setAmount(val.toString());
    setError(null);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      setLoading(false);
      return;
    }

    try {
      // 1. Create Order in Backend
      const res = await fetch(`${API_BASE_URL}/payments/deposits/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: numAmount, currency: 'INR' })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to create payment order");
      }

      const orderData = result.data;

      // 2. Check if we are running with Dummy Keys
      if (orderData.keyId.includes("dummy")) {
        console.log("Razorpay: Running in Simulation Mode (Dummy keys detected)");
        setTimeout(async () => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/payments/deposits/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: orderData.razorpay_order_id,
                razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
                razorpay_signature: "mock_signature_for_test"
              })
            });

            const verifyResult = await verifyRes.json();
            if (!verifyRes.ok || !verifyResult.success) {
              throw new Error(verifyResult.message || "Payment verification failed");
            }

            setSuccess(true);
            setCreatedDeposit(verifyResult.data);
            window.dispatchEvent(new Event('balanceChanged'));
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }, 1500); // 1.5s simulated loading delay
        return;
      }

      // 3. Load Razorpay SDK Script for real transactions
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay SDK. Check your internet connection.");
      }

      // 4. Configure Razorpay Options
      const options = {
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100), // paise
        currency: orderData.currency,
        name: "CapitalUp",
        description: "Deposit Funds to Wallet",
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: user.full_name || '',
          email: user.email || '',
          contact: user.mobile_number || ''
        },
        theme: {
          color: "#6366F1" // Match Indigo accent
        },
        handler: async function (response) {
          setLoading(true);
          try {
            // 4. Verify Payment in Backend
            const verifyRes = await fetch(`${API_BASE_URL}/payments/deposits/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyResult = await verifyRes.json();
            if (!verifyRes.ok || !verifyResult.success) {
              throw new Error(verifyResult.message || "Payment verification failed");
            }

            // Success
            setSuccess(true);
            setCreatedDeposit(verifyResult.data);
            
            // Dispatch balance changed event to update sidebar and overview
            window.dispatchEvent(new Event('balanceChanged'));
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Backdrop */}
      <div 
        onClick={loading ? undefined : onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 5, 5, 0.75)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s'
        }} 
      />

      {/* Modal Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-white-0.08)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--color-white-0.04)',
        padding: '30px',
        boxSizing: 'border-box',
        zIndex: 1,
        color: 'var(--color-text-main)',
        fontFamily: 'DM Sans, sans-serif'
      }}>
        {/* Close Button */}
        {!loading && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'var(--color-white-0.04)',
              border: '1px solid var(--color-white-0.08)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-main)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <X size={16} />
          </button>
        )}

        {success ? (
          /* SUCCESS VIEW */
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--color-success-0.1)',
              border: '1px solid var(--color-success-0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <CheckCircle2 size={28} color="var(--color-success)" />
            </div>
            
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
              Deposit Successful
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              An amount of <strong>₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> has been successfully credited to your wallet.
            </p>

            <div style={{
              background: 'var(--color-white-0.03)',
              border: '1px solid var(--color-white-0.06)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '28px',
              textAlign: 'left',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-dim)' }}>Payment ID:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>{createdDeposit?.razorpay_payment_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-dim)' }}>Status:</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>COMPLETED</span>
              </div>
            </div>

            <button 
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--color-accent)',
                color: 'var(--color-text-inverted)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Done
            </button>
          </div>
        ) : (
          /* FORM VIEW */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--color-accent-0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-accent-0.2)'
              }}>
                <CreditCard size={20} color="var(--color-accent)" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Add Funds</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Secure payment via Razorpay</p>
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '8px',
                background: 'var(--color-error-0.08)',
                border: '1px solid var(--color-error-0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '12px',
                color: 'var(--color-error)'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Enter Amount (INR)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '20px',
                    fontWeight: 500,
                    color: 'var(--color-text-muted)'
                  }}>₹</span>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(null); }}
                    disabled={loading}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 38px',
                      background: 'var(--color-white-0.04)',
                      border: '1px solid var(--color-white-0.08)',
                      borderRadius: '8px',
                      color: 'var(--color-text-main)',
                      fontSize: '20px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-white-0.08)'}
                  />
                </div>
              </div>

              {/* Quick Amount Choices */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '28px'
              }}>
                {[2000, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickAmount(val)}
                    style={{
                      background: 'var(--color-white-0.03)',
                      border: amount === val.toString() ? '1px solid var(--color-accent)' : '1px solid var(--color-white-0.08)',
                      color: amount === val.toString() ? 'var(--color-accent)' : 'var(--color-text-sub)',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    onMouseEnter={(e) => {
                      if (amount !== val.toString()) {
                        e.currentTarget.style.background = 'var(--color-white-0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (amount !== val.toString()) {
                        e.currentTarget.style.background = 'var(--color-white-0.03)';
                      }
                    }}
                  >
                    + ₹{val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <button 
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'var(--color-accent)',
                  color: 'var(--color-text-inverted)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
