import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getActiveJobsCount,
  getJobsForWorkspace,
  getSlaBreachRate,
  jobs,
  workspaces,
} from '../data/seededData';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // Calculate stats
  const totalActiveJobs = getActiveJobsCount();
  const slaBreachRate = getSlaBreachRate();
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;
  const totalEarnings = currentUser?.totalEarnings ?? 0;

  // Workspace-specific stats
  const workspaceStats = workspaces.map((ws) => {
    const wsJobs = getJobsForWorkspace(ws.id);
    return {
      workspace: ws,
      activeJobs: wsJobs.filter((j) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(j.status))
        .length,
      completedJobs: wsJobs.filter((j) => j.status === 'COMPLETED').length,
      slaBreachRate: getSlaBreachRate(ws.id),
    };
  });

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
          <button style={styles.navItemActive}>📊 Dashboard</button>
          <button style={styles.navItem} onClick={() => navigate('/contacts')}>
            👥 Contacts
          </button>
          <button style={styles.navItem} onClick={() => navigate('/reports')}>
            📈 Reports
          </button>

          {/* New Flow Navigation */}
          <div
            style={{
              ...styles.navSection,
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #333',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: '#888',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Flows
            </div>
            <button style={styles.navItem} onClick={() => navigate('/business/onboard')}>
              🏪 Register Business
            </button>
            <button style={styles.navItem} onClick={() => navigate('/rider/register')}>
              🏍️ Register Rider
            </button>
            <button style={styles.navItem} onClick={() => navigate('/order/create')}>
              📦 Create Order
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <div style={styles.headerActions}>
            <span style={styles.date}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* KPI Cards */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>📋</div>
            <div style={styles.kpiContent}>
              <div style={styles.kpiValue}>{totalActiveJobs}</div>
              <div style={styles.kpiLabel}>Active Jobs</div>
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>✅</div>
            <div style={styles.kpiContent}>
              <div style={styles.kpiValue}>{completedJobs}</div>
              <div style={styles.kpiLabel}>Completed Jobs</div>
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>⚠️</div>
            <div style={styles.kpiContent}>
              <div
                style={{ ...styles.kpiValue, color: slaBreachRate > 10 ? '#E74C3C' : '#4CAF50' }}
              >
                {slaBreachRate.toFixed(1)}%
              </div>
              <div style={styles.kpiLabel}>SLA Breach Rate</div>
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiIcon}>💰</div>
            <div style={styles.kpiContent}>
              <div style={styles.kpiValue}>KES {totalEarnings.toLocaleString()}</div>
              <div style={styles.kpiLabel}>Total Earnings</div>
            </div>
          </div>
        </div>

        {/* Workspace Performance */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Workspace Performance</h2>
          <div style={styles.workspaceTable}>
            <div style={styles.tableHeader}>
              <div style={{ ...styles.th, flex: 1 }}>Workspace</div>
              <div style={{ ...styles.th, width: '120px' }}>Active Jobs</div>
              <div style={{ ...styles.th, width: '120px' }}>Completed</div>
              <div style={{ ...styles.th, width: '120px' }}>SLA Rate</div>
              <div style={{ ...styles.th, width: '100px' }}>Members</div>
            </div>
            {workspaceStats.map((stat) => (
              <div key={stat.workspace.id} style={styles.tableRow}>
                <div style={{ ...styles.td, flex: 1 }}>
                  <span style={styles.workspaceLogo}>{stat.workspace.logo}</span>
                  <span style={styles.workspaceName}>{stat.workspace.name}</span>
                  <span style={styles.workspaceType}>{stat.workspace.type}</span>
                </div>
                <div style={{ ...styles.td, width: '120px' }}>
                  <span style={styles.statValue}>{stat.activeJobs}</span>
                </div>
                <div style={{ ...styles.td, width: '120px' }}>
                  <span style={styles.statValue}>{stat.completedJobs}</span>
                </div>
                <div style={{ ...styles.td, width: '120px' }}>
                  <span
                    style={{
                      ...styles.statValue,
                      color: stat.slaBreachRate > 10 ? '#E74C3C' : '#4CAF50',
                    }}
                  >
                    {stat.slaBreachRate.toFixed(1)}%
                  </span>
                </div>
                <div style={{ ...styles.td, width: '100px' }}>
                  <span style={styles.statValue}>{stat.workspace.memberCount}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <div style={styles.actionsGrid}>
            <button style={styles.actionCard} onClick={() => navigate('/contacts')}>
              <span style={styles.actionIcon}>📥</span>
              <span style={styles.actionLabel}>Import Contacts</span>
            </button>
            <button style={styles.actionCard}>
              <span style={styles.actionIcon}>👥</span>
              <span style={styles.actionLabel}>Manage Workers</span>
            </button>
            <button style={styles.actionCard}>
              <span style={styles.actionIcon}>⚙️</span>
              <span style={styles.actionLabel}>Workspace Settings</span>
            </button>
            <button style={styles.actionCard} onClick={() => navigate('/reports')}>
              <span style={styles.actionIcon}>📊</span>
              <span style={styles.actionLabel}>View Reports</span>
            </button>
          </div>
        </section>
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
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    display: 'flex',
    gap: '16px',
  },
  date: {
    color: '#888',
    fontSize: '14px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  kpiCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  kpiIcon: {
    fontSize: '36px',
  },
  kpiContent: {},
  kpiValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
  },
  workspaceTable: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tableHeader: {
    display: 'flex',
    padding: '16px 20px',
    background: '#f9fafb',
    borderBottom: '1px solid #e0e0e0',
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
  },
  th: {
    textAlign: 'left',
  },
  tableRow: {
    display: 'flex',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    alignItems: 'center',
  },
  td: {
    fontSize: '14px',
    color: '#333',
  },
  workspaceLogo: {
    fontSize: '20px',
    marginRight: '12px',
  },
  workspaceName: {
    fontWeight: 'bold',
    marginRight: '8px',
  },
  workspaceType: {
    fontSize: '11px',
    color: '#888',
    background: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  statValue: {
    fontWeight: 'bold',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  actionCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s',
  },
  actionIcon: {
    fontSize: '32px',
  },
  actionLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  navSection: {
    padding: '12px 0',
  },
};

export default Dashboard;
