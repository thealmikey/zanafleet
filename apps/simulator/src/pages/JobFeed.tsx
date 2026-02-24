import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobs, workspaces } from '../data/seededData';
import { Job, JobStatus } from '../types';

const statusColors: Record<JobStatus, string> = {
  PENDING: '#FFA500',
  ASSIGNED: '#4ECDC4',
  IN_PROGRESS: '#45B7D1',
  COMPLETED: '#4CAF50',
  CANCELLED: '#E74C3C',
  SLA_BREACH: '#E74C3C',
};

const statusLabels: Record<JobStatus, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  SLA_BREACH: 'SLA Breach',
};

const JobFeed: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Get jobs for current user across all their workspaces
  const userJobs = useMemo(() => {
    if (!currentUser) return [];

    // For demo, show all active jobs across all workspaces
    return jobs
      .filter((j) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(j.status))
      .slice(0, 20);
  }, [currentUser]);

  const filteredJobs =
    filter === 'all' ? userJobs : userJobs.filter((j) => j.workspaceId === filter);

  const workspacesForUser = useMemo(() => {
    if (!currentUser) return workspaces;
    return workspaces.filter((ws) => currentUser.memberships.some((m) => m.workspaceId === ws.id));
  }, [currentUser]);

  const handleAcceptJob = (jobId: string) => {
    alert(`Job ${jobId} accepted! In a real app, this would update the backend.`);
  };

  const handleDeclineJob = (jobId: string) => {
    alert(`Job ${jobId} declined.`);
  };

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

        {/* Navigation */}
        <nav style={styles.nav}>
          <button style={styles.navItemActive}>📋 Jobs</button>
          <button style={styles.navItem} onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </button>
          <button style={styles.navItem} onClick={() => navigate('/contacts')}>
            👥 Contacts
          </button>
          <button style={styles.navItem} onClick={() => navigate('/reports')}>
            📈 Reports
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
        </nav>

        {/* Availability Toggle */}
        <div style={styles.availability}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={currentUser?.isAvailable}
              readOnly
              style={styles.toggle}
            />
            <span>Available for Jobs</span>
          </label>
        </div>

        {/* Workspace Filter */}
        <div style={styles.filterSection}>
          <div style={styles.filterTitle}>Filter by Workspace</div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
            <option value="all">All Workspaces</option>
            {workspacesForUser.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.logo} {ws.name}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Job Feed</h1>
          <div style={styles.headerStats}>
            <div style={styles.headerStat}>
              <span style={styles.headerStatValue}>{userJobs.length}</span>
              <span style={styles.headerStatLabel}>Available Jobs</span>
            </div>
            <div style={styles.headerStat}>
              <span style={styles.headerStatValue}>
                KES {userJobs.reduce((sum, j) => sum + j.earnings, 0).toLocaleString()}
              </span>
              <span style={styles.headerStatLabel}>Total Earnings</span>
            </div>
          </div>
        </header>

        {/* Job List */}
        <div style={styles.jobList}>
          {filteredJobs.map((job) => {
            const workspace = workspaces.find((w) => w.id === job.workspaceId);
            return (
              <div
                key={job.id}
                style={styles.jobCard}
                onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
              >
                <div style={styles.jobHeader}>
                  <div style={styles.jobWorkspace}>
                    <span style={styles.workspaceBadge}>
                      {workspace?.logo} {workspace?.name}
                    </span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: statusColors[job.status],
                      }}
                    >
                      {statusLabels[job.status]}
                    </span>
                  </div>
                  <div style={styles.jobEarnings}>KES {job.earnings.toLocaleString()}</div>
                </div>

                <h3 style={styles.jobTitle}>{job.title}</h3>

                <div style={styles.jobDetails}>
                  <div style={styles.jobDetail}>
                    <span style={styles.detailLabel}>📍 From:</span> {job.pickup.address}
                  </div>
                  <div style={styles.jobDetail}>
                    <span style={styles.detailLabel}>🏁 To:</span> {job.dropoff.address}
                  </div>
                  <div style={styles.jobDetail}>
                    <span style={styles.detailLabel}>👥 Workers:</span> {job.workerCount}
                  </div>
                  <div style={styles.jobDetail}>
                    <span style={styles.detailLabel}>🕐 Scheduled:</span>{' '}
                    {new Date(job.scheduledAt).toLocaleString()}
                  </div>
                </div>

                {job.isSlaBreached && (
                  <div style={styles.slaWarning}>⚠️ SLA BREACHED - Urgent attention required</div>
                )}

                {selectedJob?.id === job.id && (
                  <div style={styles.jobActions}>
                    <button
                      style={styles.acceptBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptJob(job.id);
                      }}
                    >
                      ✓ Accept Job
                    </button>
                    <button
                      style={styles.declineBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeclineJob(job.id);
                      }}
                    >
                      ✕ Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredJobs.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div style={styles.emptyTitle}>No jobs available</div>
            <div style={styles.emptyText}>Check back later or adjust your filters</div>
          </div>
        )}
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
    transition: 'all 0.2s',
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
  availability: {
    padding: '16px',
    background: '#f9f9f9',
    borderRadius: '8px',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  toggle: {
    width: '18px',
    height: '18px',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
  },
  select: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    background: '#fff',
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
  headerStats: {
    display: 'flex',
    gap: '30px',
  },
  headerStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  headerStatLabel: {
    fontSize: '12px',
    color: '#888',
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  jobCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  jobWorkspace: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  workspaceBadge: {
    padding: '4px 10px',
    background: '#f0f0f0',
    borderRadius: '20px',
    fontSize: '12px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#fff',
  },
  jobEarnings: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  jobTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  jobDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  jobDetail: {
    fontSize: '13px',
    color: '#666',
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#444',
  },
  slaWarning: {
    marginTop: '12px',
    padding: '10px',
    background: '#FFEBEE',
    color: '#E74C3C',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  jobActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #eee',
  },
  acceptBtn: {
    flex: 1,
    padding: '12px',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  declineBtn: {
    flex: 1,
    padding: '12px',
    background: '#f0f0f0',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  emptyText: {
    color: '#888',
  },
};

export default JobFeed;
