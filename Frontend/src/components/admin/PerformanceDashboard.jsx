import { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Zap, Database, Globe, AlertTriangle, ShieldAlert } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('capitalup-access-token');
      const res = await fetch(`${API_BASE_URL}/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success) {
        setMetrics(result.data);
        setHistory(prev => {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          const newPoint = {
            time: timeStr,
            ordersPerSec: result.data.ordersPerSecond,
            tradesPerSec: result.data.tradesPerSecond,
            latency: result.data.matchingEngine.p95LatencyMs || 0
          };
          const next = [...prev, newPoint];
          if (next.length > 20) return next.slice(next.length - 20);
          return next;
        });
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Poll every 2s to make the charts feel alive
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div style={{ color: 'var(--color-text-sub)' }}>Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: 'var(--color-error-0.1)', border: '1px solid var(--color-error-0.2)', borderRadius: '12px' }}>
        <h3 style={{ color: 'var(--color-error)', fontWeight: 600, marginBottom: '8px' }}>Error Loading Metrics</h3>
        <p style={{ color: 'var(--color-text-sub)' }}>{error}</p>
      </div>
    );
  }

  const MetricCard = ({ title, value, subtext, icon: Icon, color, trend = null }) => (
    <div style={{ 
      background: 'var(--color-bg-panel-0.6)', 
      border: '1px solid var(--color-white-0.08)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{title}</h4>
        <div style={{ 
          background: `var(--color-${color}-0.1)`, 
          padding: '6px', 
          borderRadius: '8px',
          border: `1px solid var(--color-${color}-0.2)`
        }}>
          <Icon size={16} color={`var(--color-${color})`} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
          {value}
        </span>
        {trend && (
          <span style={{ fontSize: '12px', color: trend > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <span style={{ fontSize: '12px', color: 'var(--color-text-sub)' }}>{subtext}</span>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>Engineering Performance</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Real-time telemetry and health metrics of the CapitalUp matching engine.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <MetricCard 
          title="Matching Engine P99" 
          value={`${metrics?.matchingEngine.p99LatencyMs?.toFixed(2) || 0}ms`} 
          subtext="Order processing latency"
          icon={Zap}
          color="accent"
        />
        <MetricCard 
          title="Risk Engine P99" 
          value={`${metrics?.riskP99LatencyMs?.toFixed(2) || 0}ms`} 
          subtext="Pre-trade validation time"
          icon={ShieldAlert}
          color="warning"
        />
        <MetricCard 
          title="Redis Hit Ratio" 
          value={`${((metrics?.redisHitRatio || 0) * 100).toFixed(1)}%`} 
          subtext={`${metrics?.redisReads || 0} read ops`}
          icon={Database}
          color="success"
        />
        <MetricCard 
          title="Active WebSockets" 
          value={metrics?.connectedWebSockets || 0} 
          subtext="Real-time client connections"
          icon={Globe}
          color="primary"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {/* Main Chart */}
        <div style={{ 
          background: 'var(--color-bg-panel-0.6)', 
          border: '1px solid var(--color-white-0.08)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '24px' }}>Throughput (Orders vs Trades)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTrades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-white-0.06)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-white-0.08)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                  labelStyle={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="ordersPerSec" stroke="var(--color-accent)" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} name="Orders/sec" />
                <Area type="monotone" dataKey="tradesPerSec" stroke="var(--color-success)" fillOpacity={1} fill="url(#colorTrades)" strokeWidth={2} name="Trades/sec" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ 
            background: 'var(--color-bg-panel-0.6)', 
            border: '1px solid var(--color-white-0.08)',
            borderRadius: '16px',
            padding: '24px',
            flex: 1
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '24px' }}>System State</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>Pending Orders Queue</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--color-text-main)' }}>{metrics?.matchingEngine.pendingOrders || 0}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--color-white-0.06)' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>Active Order Books</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--color-text-main)' }}>{metrics?.matchingEngine.orderBooks || 0}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--color-white-0.06)' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>DB Queue Size</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--color-text-main)' }}>{metrics?.databaseQueueSize || 0}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--color-white-0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>Risk Rejections (1m)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {metrics?.riskRejectionsLastMinute > 0 && <AlertTriangle size={14} color="var(--color-error)" />}
                  <span style={{ fontFamily: 'JetBrains Mono', color: metrics?.riskRejectionsLastMinute > 0 ? 'var(--color-error)' : 'var(--color-text-main)' }}>
                    {metrics?.riskRejectionsLastMinute || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
