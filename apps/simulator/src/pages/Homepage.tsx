import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspaces, contacts, jobs, users } from '../data/seededData';
import { Persona } from '../types';

const personaCards = [
  {
    persona: 'rider' as Persona,
    title: 'Rider',
    description: 'Accept delivery and moving jobs',
    icon: '🏍️',
    color: '#FF6B35',
  },
  {
    persona: 'fleet-manager' as Persona,
    title: 'Fleet Manager',
    description: 'Manage branches and track performance',
    icon: '🚛',
    color: '#45B7D1',
  },
  {
    persona: 'business-owner' as Persona,
    title: 'Business Owner',
    description: 'Oversee operations and analytics',
    icon: '📊',
    color: '#4ECDC4',
  },
  {
    persona: 'marketplace-contractor' as Persona,
    title: 'Marketplace Contractor',
    description: 'Bid on gigs and manage tasks',
    icon: '🎯',
    color: '#9B59B6',
  },
  {
    persona: 'admin' as Persona,
    title: 'System Admin',
    description: 'Platform-wide administration',
    icon: '⚙️',
    color: '#34495E',
  },
];

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const handleLogin = (persona: Persona) => {
    login(persona);
    navigate('/jobs');
  };

  // Get stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(j.status)).length;
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
  const totalContacts = contacts.length;
  const totalUsers = users.length;
  const totalWorkspaces = workspaces.length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>ZanaFleet</span>
        </div>
        <div style={styles.tagline}>Multi-Vertical Job Orchestration Platform</div>
      </header>

      {/* Hero Section */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Welcome to ZanaFleet Simulator</h1>
        <p style={styles.heroSubtitle}>
          Experience the full capabilities of a multi-workspace, multi-role job orchestration platform
        </p>
      </section>

      {/* System Overview */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Overview</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalWorkspaces}</div>
            <div style={styles.statLabel}>Workspaces</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalUsers}</div>
            <div style={styles.statLabel}>Users</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalJobs}</div>
            <div style={styles.statLabel}>Total Jobs</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeJobs}</div>
            <div style={styles.statLabel}>Active Jobs</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{completedJobs}</div>
            <div style={styles.statLabel}>Completed</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalContacts}</div>
            <div style={styles.statLabel}>Contacts</div>
          </div>
        </div>
      </section>

      {/* Workspace Cards */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Active Workspaces</h2>
        <div style={styles.workspaceGrid}>
          {workspaces.map(ws => (
            <div key={ws.id} style={{ ...styles.workspaceCard, borderLeftColor: ws.color }}>
              <div style={styles.workspaceHeader}>
                <span style={styles.workspaceLogo}>{ws.logo}</span>
                <div>
                  <div style={styles.workspaceName}>{ws.name}</div>
                  <div style={styles.workspaceType}>{ws.type}</div>
                </div>
              </div>
              <div style={styles.workspaceDesc}>{ws.description}</div>
              <div style={styles.workspaceMeta}>
                <span>👥 {ws.memberCount} members</span>
                {ws.branchCount && <span>🏢 {ws.branchCount} branches</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Persona Login */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Select Your Persona</h2>
        <p style={styles.sectionSubtitle}>
          Click a card to login as that persona and experience the platform from their perspective
        </p>
        <div style={styles.personaGrid}>
          {personaCards.map(card => (
            <button
              key={card.persona}
              onClick={() => handleLogin(card.persona)}
              style={{ ...styles.personaCard, borderTopColor: card.color }}
            >
              <div style={styles.personaIcon}>{card.icon}</div>
              <div style={styles.personaTitle}>{card.title}</div>
              <div style={styles.personaDesc}>{card.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Demo Data Status */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Demo Data Status</h2>
        <div style={styles.dataStatus}>
          <div style={styles.dataItem}>
            <span style={styles.dataCheck}>✓</span>
            <span>5 Workspaces (Delivery, Moving, Fleet, Wholesale, Marketplace)</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.dataCheck}>✓</span>
            <span>10 Users with multi-workspace memberships</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.dataCheck}>✓</span>
            <span>93+ Jobs (Active, Completed, SLA Breaches)</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.dataCheck}>✓</span>
            <span>200 Contacts with relationship graph</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.dataCheck}>✓</span>
            <span>Multi-worker moving jobs</span>
          </div>
          <div style={styles.dataItem}>
            <span style={styles.dataCheck}>✓</span>
            <span>Referral chains and relationship data</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>ZanaFleet Simulator v1.0 - Demo Environment</p>
        <p>No backend required • All data mocked in-memory</p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '32px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #FF6B35, #4ECDC4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  tagline: {
    color: '#888',
    fontSize: '14px',
  },
  hero: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#aaa',
    maxWidth: '600px',
    margin: '0 auto',
  },
  section: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '28px',
    marginBottom: '24px',
    borderBottom: '2px solid #FF6B35',
    paddingBottom: '12px',
    display: 'inline-block',
  },
  sectionSubtitle: {
    color: '#888',
    marginBottom: '24px',
    fontSize: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  statLabel: {
    color: '#888',
    marginTop: '8px',
    fontSize: '14px',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  workspaceCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px',
    borderLeft: '4px solid',
  },
  workspaceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  workspaceLogo: {
    fontSize: '32px',
  },
  workspaceName: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  workspaceType: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
  },
  workspaceDesc: {
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '12px',
  },
  workspaceMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#666',
  },
  personaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  personaCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '30px 20px',
    borderTop: '4px solid',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    border: 'none',
    color: '#fff',
  },
  personaIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  personaTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  personaDesc: {
    fontSize: '14px',
    color: '#888',
  },
  dataStatus: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '24px',
  },
  dataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    fontSize: '14px',
  },
  dataCheck: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '14px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
};

export default Homepage;
