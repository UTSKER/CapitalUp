import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

function TypewriterText({ text }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    const words = text.split(" ");
    setDisplayedText("");

    const interval = setInterval(() => {
      if (index < words.length) {
        setDisplayedText((prev) => (prev ? prev + " " + words[index] : words[index]));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 25); // snappier word-by-word streaming effect

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}

export function ChatView() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your CapitalUp AI Assistant. I can help you check your portfolio, look up live stock prices, review your KYC status, or answer questions about our trading platform. What can I do for you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  const messagesEndRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('capitalup-access-token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text) return;

    if (!textToSend) setInput('');

    // Append user message
    const userMessageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: text }
    ]);

    setLoading(true);

    try {
      let activeToken = localStorage.getItem('capitalup-access-token') || token;
      let res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ message: text })
      });

      let result = await res.json();

      // If token expired, attempt transparent automatic refresh and retry
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
              
              // Retry chat request with new access token
              res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${refreshResult.accessToken}`
                },
                body: JSON.stringify({ message: text })
              });
              result = await res.json();
            }
          } catch (refreshErr) {
            console.error('Auto refresh token failed:', refreshErr);
          }
        }
      }

      if (res.status === 401) {
        result.message = "Your session has expired. Please log in again to continue.";
      }

      if (res.ok && result.success) {
        let replyText = result.data.reply;
        let isUnrelated = false;
        if (replyText.includes("[UNRELATED_PROMPT_ALERT]")) {
          replyText = replyText.replace("[UNRELATED_PROMPT_ALERT]", "").trim();
          isUnrelated = true;
          setShowMascot(true);
          // auto dismiss mascot after 8 seconds
          setTimeout(() => {
            setShowMascot(false);
          }, 8000);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: replyText,
            sources: result.data.sources,
            intent: result.data.intent,
            isUnrelated
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: result.message || "Sorry, I encountered an error processing your request. Please try again.",
            error: true
          }
        ]);
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Unable to reach the server. Please check your connection and ensure the backend is running.",
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: "Check my portfolio status", query: "How is my portfolio performing?" },
    { label: "Get TCS stock price", query: "What is the price of TCS?" },
    { label: "Review my KYC status", query: "What is my KYC status?" },
    { label: "How to buy a stock?", query: "How do I place a buy order?" }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)', overflow: 'visible' }}>
      {/* Floating 3D Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-5%',
        left: '-8%',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(13, 148, 136, 0.08) 50%, transparent 100%)',
        borderRadius: '50%',
        filter: 'blur(55px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'floatOrb 14s infinite alternate ease-in-out'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-8%',
        right: '-5%',
        width: '380px',
        height: '380px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.22) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 100%)',
        borderRadius: '50%',
        filter: 'blur(65px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'floatOrb2 18s infinite alternate ease-in-out'
      }}></div>

      <style>{`
        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.15); }
        }
        @keyframes floatOrb2 {
          0% { transform: translate(0, 0) scale(1.15); }
          100% { transform: translate(-70px, -45px) scale(0.9); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes popMascot {
          0% { transform: translateY(50px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes floatMascot {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-8px) rotate(3deg); }
        }
      `}</style>

      {/* Main Glassmorphic Wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(var(--color-bg-panel-rgb), 0.75)',
        border: '1px solid rgba(var(--color-white-rgb), 0.08)',
        borderRadius: '24px',
        overflow: 'hidden',
        backdropFilter: 'blur(25px)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 28px',
          borderBottom: '1px solid rgba(var(--color-white-rgb), 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(var(--color-bg-panel-rgb), 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)'
            }}>
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                CapitalUp Assistant
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 7px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <span style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'inline-block'
                  }}></span>
                  Llama3 RAG
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Ask anything about your account, transactions, or market information
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          padding: '28px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                  animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  gap: '14px',
                  maxWidth: '75%'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isUser
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(var(--color-white-rgb), 0.08)',
                    color: isUser ? '#10b981' : 'var(--color-text-sub)',
                    border: isUser ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(var(--color-white-rgb), 0.1)',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
                  }}>
                    {isUser ? <User size={15} /> : <Bot size={15} />}
                  </div>

                  {/* Bubble Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* Bubble */}
                    <div style={{
                      background: isUser
                        ? 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)'
                        : msg.error
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(var(--color-white-rgb), 0.04)',
                      color: isUser ? '#ffffff' : 'var(--color-text-main)',
                      border: isUser 
                        ? '1px solid rgba(255, 255, 255, 0.2)' 
                        : msg.error 
                          ? '1px solid rgba(239, 68, 68, 0.3)' 
                          : '1px solid rgba(var(--color-white-rgb), 0.08)',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '12px 18px',
                      fontSize: '14px',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      boxShadow: isUser 
                        ? '0 10px 25px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                        : '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(5px)'
                    }}>
                      {isUser || msg.id === 'welcome' || msg.error ? msg.content : <TypewriterText text={msg.content} />}
                    </div>

                    {/* Metadata & RAG Sources */}
                    {!isUser && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        {msg.intent && (
                          <span style={{
                            fontSize: '9px',
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            Intent: {msg.intent}
                          </span>
                        )}
                        
                        {msg.sources && msg.sources.length > 0 && (
                          <>
                            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                              Sources:
                            </span>
                            {msg.sources.map((src, index) => (
                              <span
                                key={index}
                                title={`Similarity Match Score: ${(src.score * 100).toFixed(1)}%`}
                                style={{
                                  fontSize: '9.5px',
                                  color: 'var(--color-text-sub)',
                                  background: 'rgba(var(--color-white-rgb), 0.04)',
                                  border: '1px solid rgba(var(--color-white-rgb), 0.08)',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}
                              >
                                <ShieldCheck size={10} color="#10b981" />
                                {src.fileName}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', animation: 'slideIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', gap: '14px', maxWidth: '75%' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(var(--color-white-rgb), 0.08)',
                  color: 'var(--color-text-sub)',
                  border: '1px solid rgba(var(--color-white-rgb), 0.1)',
                  flexShrink: 0
                }}>
                  <Bot size={15} />
                </div>
                <div style={{
                  background: 'rgba(var(--color-white-rgb), 0.03)',
                  border: '1px solid rgba(var(--color-white-rgb), 0.06)',
                  borderRadius: '18px 18px 18px 4px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                }}>
                  <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--color-text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' }}></span>
                  <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--color-text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}></span>
                  <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--color-text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}></span>
                  <style>{`
                    @keyframes bounce {
                      0%, 80%, 100% { transform: scale(0); }
                      40% { transform: scale(1.0); }
                    }
                  `}</style>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid rgba(var(--color-white-rgb), 0.08)',
          background: 'rgba(var(--color-bg-panel-rgb), 0.85)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Suggestions */}
          {messages.length === 1 && !loading && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suggested Questions:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="max-sm:grid-cols-1">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.query)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(var(--color-white-rgb), 0.03)',
                      border: '1px solid rgba(var(--color-white-rgb), 0.08)',
                      borderRadius: '12px',
                      color: 'var(--color-text-main)',
                      fontSize: '12.5px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.06)';
                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                      e.currentTarget.style.color = 'var(--color-text-main)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.18)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(var(--color-white-rgb), 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(var(--color-white-rgb), 0.08)';
                      e.currentTarget.style.color = 'var(--color-text-main)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    {s.label}
                    <ArrowRight size={13} style={{ color: '#10b981' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '12px' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask a question about stocks, portfolio, KYC status..."
              style={{
                flex: 1,
                background: 'rgba(var(--color-white-rgb), 0.03)',
                border: '1px solid rgba(var(--color-white-rgb), 0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
                color: 'var(--color-text-main)',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                e.target.style.boxShadow = '0 0 14px rgba(16, 185, 129, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.background = 'rgba(255, 255, 255, 0.02)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '0 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                color: 'var(--color-text-inverted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
                opacity: (loading || !input.trim()) ? 0.6 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Cartoon Mascot Pop-up */}
      {showMascot && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          right: '40px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          animation: 'popMascot 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          pointerEvents: 'auto'
        }}>
          {/* Bubble Speech */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '16px 16px 4px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            maxWidth: '220px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            marginBottom: '12px',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)'
          }}>
            Bleep bloop! Let's stay on topic and talk about CapitalUp trading! 📈
            <button 
              onClick={() => setShowMascot(false)}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}
            >
              ✕
            </button>
          </div>

          {/* Mascot Figure */}
          <div style={{
            width: '85px',
            height: '85px',
            position: 'relative',
            animation: 'floatMascot 2.5s infinite alternate ease-in-out'
          }}>
            {/* Cute Cartoon Bot SVG */}
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))' }}>
              {/* Ears / Antennas */}
              <rect x="25" y="30" width="6" height="15" rx="3" fill="#0d9488" />
              <rect x="69" y="30" width="6" height="15" rx="3" fill="#0d9488" />
              <circle cx="28" cy="27" r="4" fill="#10b981" />
              <circle cx="72" cy="27" r="4" fill="#10b981" />
              
              {/* Body / Head */}
              <rect x="30" y="35" width="40" height="40" rx="12" fill="#1e293b" stroke="#10b981" strokeWidth="3" />
              
              {/* Face screen */}
              <rect x="37" y="42" width="26" height="18" rx="6" fill="#0f172a" />
              
              {/* Glowing Eyes */}
              <circle cx="44" cy="51" r="3" fill="#10b981" className="mascot-eye">
                <animate attributeName="r" values="3;1.5;3" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="56" cy="51" r="3" fill="#10b981" className="mascot-eye">
                <animate attributeName="r" values="3;1.5;3" dur="3s" repeatCount="indefinite" />
              </circle>
              
              {/* Smiling mouth */}
              <path d="M 45 56 Q 50 60 55 56" fill="transparent" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Floating feet/rocket fire */}
              <ellipse cx="50" cy="78" rx="8" ry="4" fill="#f59e0b">
                <animate attributeName="ry" values="4;8;4" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="fill" values="#f59e0b;#ef4444;#f59e0b" dur="1s" repeatCount="indefinite" />
              </ellipse>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
