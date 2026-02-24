import React, { useState, useEffect } from 'react';
import { ApiRequest, addDebugListener } from '../services/api';

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: 0,
    right: 0,
    width: '400px',
    maxHeight: '50vh',
    backgroundColor: '#1a1a2e',
    color: '#eee',
    borderTopLeftRadius: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 9999,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#16213e',
    borderTopLeftRadius: '8px',
    cursor: 'pointer',
    borderBottom: '1px solid #333',
  },
  title: {
    fontWeight: 'bold' as const,
    color: '#00d9ff',
  },
  badge: {
    backgroundColor: '#e94560',
    color: 'white',
    borderRadius: '10px',
    padding: '2px 8px',
    fontSize: '10px',
  },
  content: {
    overflow: 'auto',
    maxHeight: 'calc(50vh - 40px)',
    padding: '8px',
  },
  requestItem: {
    padding: '8px',
    marginBottom: '4px',
    borderRadius: '4px',
    backgroundColor: '#0f3460',
    borderLeft: '3px solid',
  },
  method: {
    fontWeight: 'bold' as const,
    marginRight: '8px',
  },
  url: {
    color: '#aaa',
    fontSize: '11px',
    wordBreak: 'break-all' as const,
  },
  status: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '3px',
    marginLeft: '8px',
    fontSize: '10px',
  },
  duration: {
    color: '#888',
    marginLeft: '8px',
    fontSize: '10px',
  },
  response: {
    marginTop: '4px',
    padding: '4px',
    backgroundColor: '#0a0a1a',
    borderRadius: '3px',
    fontSize: '10px',
    maxHeight: '100px',
    overflow: 'auto' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  clearBtn: {
    backgroundColor: '#e94560',
    border: 'none',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '10px',
  },
};

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET': return '#4caf50';
    case 'POST': return '#2196f3';
    case 'PATCH': return '#ff9800';
    case 'DELETE': return '#f44336';
    default: return '#888';
  }
};

const getStatusColor = (status: number | undefined) => {
  if (!status) return '#888';
  if (status >= 200 && status < 300) return '#4caf50';
  if (status >= 400) return '#f44336';
  return '#ff9800';
};

export const ApiDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<ApiRequest[]>([]);

  useEffect(() => {
    return addDebugListener(setRequests);
  }, []);

  const successCount = requests.filter(r => r.status === 'success').length;
  const errorCount = requests.filter(r => r.status === 'error').length;

  const handleClear = () => {
    import('../services/api').then(m => m.clearRequestHistory());
  };

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <span style={styles.title}>🔌 API Debug</span>
        <div>
          {successCount > 0 && <span style={{...styles.badge, backgroundColor: '#4caf50', marginRight: '4px'}}>{successCount} ✓</span>}
          {errorCount > 0 && <span style={styles.badge}>{errorCount} ✗</span>}
          <span style={{marginLeft: '8px', color: '#888'}}>{requests.length} requests</span>
        </div>
      </div>
      
      {isOpen && (
        <>
          <div style={{padding: '4px 8px', borderBottom: '1px solid #333'}}>
            <button style={styles.clearBtn} onClick={handleClear}>Clear History</button>
          </div>
          <div style={styles.content}>
            {requests.length === 0 ? (
              <div style={{color: '#888', textAlign: 'center', padding: '20px'}}>
                No API requests yet
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} style={{
                  ...styles.requestItem,
                  borderLeftColor: getStatusColor(req.statusCode),
                }}>
                  <div>
                    <span style={{...styles.method, color: getMethodColor(req.method)}}>
                      {req.method}
                    </span>
                    <span style={styles.url}>{req.url}</span>
                    {req.statusCode && (
                      <span style={{
                        ...styles.status,
                        backgroundColor: getStatusColor(req.statusCode),
                        color: 'white',
                      }}>
                        {req.statusCode}
                      </span>
                    )}
                    {req.duration && (
                      <span style={styles.duration}>{req.duration}ms</span>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div style={{color: '#ff9800', marginTop: '4px'}}>⏳ Pending...</div>
                  )}
                  {req.response && (
                    <div style={styles.response}>
                      {JSON.stringify(req.response, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ApiDebugPanel;
