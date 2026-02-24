import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSlaBreachRate, jobs, workspaces } from '../data/seededData';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [selectedReport, setSelectedReport] = useState('earnings');

  // Mock report data
  const reportData = {
    earnings: {
      title: 'Earnings Report',
      data: [
        { label: 'QuickBite', value: 45600, change: 12.5 },
        { label: 'SwiftMove', value: 12300, change: -5.2 },
        { label: 'FleetOps', value: 89000, change: 8.7 },
        { label: 'BulkHub', value: 67000, change: 15.3 },
      ],
    },
    jobs: {
      title: 'Job Performance',
      data: [
        { label: 'Total Jobs', value: 93, change: 0 },
        { label: 'Completed', value: 55, change: 10.2 },
        { label: 'Active', value: 23, change: -3.1 },
        { label: 'SLA Breaches', value: 8, change: -25.0 },
      ],
    },
    utilization: {
      title: 'Worker Utilization',
      data: [
        { label: 'Riders Available', value: 8, change: 14.3 },
        { label: 'Active Now', value: 6, change: 20.0 },
        { label: 'Utilization Rate', value: '75%', change: 5.1 },
      ],
    },
  };

  const currentData = reportData[selectedReport as keyof typeof reportData];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.userSection}>
          <div style={styles.userAvatar}>{currentUser?.avatar}</div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{currentUser?.name}</div>
            <div style={styles.userRole}>{currentUser?.role}</div>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>

        <nav style={styles.nav}>
          <button style={styles.navItem} onClick={() => navigate('/jobs')}>
            📋 Jobs
          </button>
          <button style={styles.navItem} onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </button>
          <button style={styles.navItem} onClick={() => navigate('/contacts')}>
            👥 Contacts
          </button>
          <button style={styles.navItem} onClick={() => navigate('/wallet')}>
            💰 Wallet
          </button>
          <button style={styles.navItem} onClick={() => navigate('/billing')}>
            🧾 Billing
          </button>
          <button style={styles.navItem} onClick={() => navigate('/maps')}>
            🗺️ Maps
          </button>
          <button style={styles.navItemActive}>📈 Reports</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Reports & Analytics</h1>
          <button style={styles.exportBtn}>📤 Export</button>
        </header>

        {/* Report Selector */}
        <div style={styles.reportTabs}>
          <button
            style={selectedReport === 'earnings' ? styles.tabActive : styles.tab}
            onClick={() => setSelectedReport('earnings')}
          >
            💰 Earnings
          </button>
          <button
            style={selectedReport === 'jobs' ? styles.tabActive : styles.tab}
            onClick={() => setSelectedReport('jobs')}
          >
            📋 Job Performance
          </button>
          <button
            style={selectedReport === 'utilization' ? styles.tabActive : styles.tab}
            onClick={() => setSelectedReport('utilization')}
          >
            👥 Utilization
          </button>
        </div>

        {/* Report Content */}
        <div style={styles.reportCard}>
          <h2 style={styles.reportTitle}>{currentData.title}</h2>

          <div style={styles.metricsGrid}>
            {currentData.data.map((metric, idx) => (
              <div key={idx} style={styles.metricCard}>
                <div style={styles.metricValue}>{metric.value}</div>
                <div style={styles.metricLabel}>{metric.label}</div>
                {metric.change !== 0 && (
                  <div
                    style={{
                      ...styles.metricChange,
                      color: metric.change > 0 ? '#4CAF50' : '#E74C3C',
                    }}
                  >
                    {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Workspace Breakdown */}
        <div style={styles.reportCard}>
          <h2 style={styles.reportTitle}>Workspace Breakdown</h2>
          <div style={styles.workspaceTable}>
            {workspaces.map((ws) => {
              const wsJobs = jobs.filter((j) => j.workspaceId === ws.id);
              const completed = wsJobs.filter((j) => j.status === 'COMPLETED').length;
              const earnings = wsJobs.reduce((sum, j) => sum + j.earnings, 0);

              return (
                <div key={ws.id} style={styles.workspaceRow}>
                  <div style={styles.wsCell}>
                    <span style={styles.wsLogo}>{ws.logo}</span>
                    <span style={styles.wsName}>{ws.name}</span>
                  </div>
                  <div style={styles.wsCell}>{wsJobs.length}</div>
                  <div style={styles.wsCell}>{completed}</div>
                  <div style={styles.wsCell}>KES {earnings.toLocaleString()}</div>
                  <div style={styles.wsCell}>
                    <span
                      style={{
                        ...styles.statusDot,
                        background: getSlaBreachRate(ws.id) > 10 ? '#E74C3C' : '#4CAF50',
                      }}
                    />
                    {getSlaBreachRate(ws.id).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: '280px',
    background: '#fff',
    borderRight: '1px solid #e0e0e0',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  userSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  userAvatar: {
    fontSize: '48px',
  },
  userInfo: {
    textAlign: 'center',
  },
  userName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    color: '#666',
  },
  navItemActive: {
    padding: '12px 16px',
    background: '#FFF5F0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  main: {
    flex: 1,
    padding: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
  },
  exportBtn: {
    padding: '10px 20px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  reportTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 24px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
  },
  tabActive: {
    padding: '12px 24px',
    background: '#FF6B35',
    border: '1px solid #FF6B35',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#fff',
    fontWeight: 'bold',
  },
  reportCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  reportTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  metricCard: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  metricChange: {
    fontSize: '12px',
    marginTop: '8px',
    fontWeight: 'bold',
  },
  workspaceTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  workspaceRow: {
    display: 'flex',
    padding: '16px 0',
    borderBottom: '1px solid #eee',
    alignItems: 'center',
  },
  wsCell: {
    flex: 1,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  wsLogo: {
    fontSize: '20px',
  },
  wsName: {
    fontWeight: 'bold',
    color: '#333',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
  },
};

export default Reports;
