import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { contactRelationships, contacts, workspaces } from '../data/seededData';
import { Contact, ContactStatus, ContactType } from '../types';

const statusColors: Record<ContactStatus, string> = {
  PENDING: '#FFA500',
  VERIFIED: '#4ECDC4',
  INVITED: '#45B7D1',
  ACTIVE: '#4CAF50',
  INACTIVE: '#888',
  ARCHIVED: '#ddd',
};

const typeLabels: Record<ContactType, string> = {
  RIDER: 'Rider',
  CUSTOMER: 'Customer',
  BUSINESS: 'Business',
  SUPPLIER: 'Supplier',
  REFERRAL: 'Referral',
  UNCLASSIFIED: 'Unclassified',
};

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [importStep, setImportStep] = useState<number>(0);

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (filter !== 'all') {
      result = result.filter((c) => c.contactType === filter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(searchLower) ||
          c.emailAddresses.some((e) => e.toLowerCase().includes(searchLower)) ||
          c.companyName?.toLowerCase().includes(searchLower)
      );
    }

    return result.slice(0, 50);
  }, [filter, search]);

  // Get suggested relationships
  const suggestions = useMemo(() => {
    if (!selectedContact) return [];
    return contacts
      .filter(
        (c) =>
          c.id !== selectedContact.id &&
          c.workspaceId === selectedContact.workspaceId &&
          c.contactType !== selectedContact.contactType
      )
      .slice(0, 5);
  }, [selectedContact]);

  // Simulate import process
  const simulateImport = () => {
    setImportStep(1);
    setTimeout(() => setImportStep(2), 1000);
    setTimeout(() => setImportStep(3), 2000);
    setTimeout(() => setImportStep(4), 3000);
    setTimeout(() => setImportStep(0), 4000);
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

        <nav style={styles.nav}>
          <button style={styles.navItem} onClick={() => navigate('/jobs')}>
            📋 Jobs
          </button>
          <button style={styles.navItem} onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </button>
          <button style={styles.navItemActive}>👥 Contacts</button>
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
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>Contact Management</h1>
          <button style={styles.importBtn} onClick={simulateImport}>
            📥 Import Contacts
          </button>
        </header>

        {/* Import Simulation */}
        {importStep > 0 && (
          <div style={styles.importModal}>
            <div style={styles.importCard}>
              <h3>Importing Contacts...</h3>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${importStep * 25}%` }} />
              </div>
              <div style={styles.importSteps}>
                {importStep >= 1 && <div>✓ Parsing CSV file</div>}
                {importStep >= 2 && <div>✓ Normalizing phone numbers</div>}
                {importStep >= 3 && <div>✓ Running deduplication</div>}
                {importStep >= 4 && <div>✓ Import complete! 50 contacts added</div>}
              </div>
              {importStep === 0 && <button onClick={() => setImportStep(0)}>Close</button>}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{contacts.length}</div>
            <div style={styles.statLabel}>Total Contacts</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {contacts.filter((c) => c.status === 'ACTIVE').length}
            </div>
            <div style={styles.statLabel}>Active</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {contacts.filter((c) => c.status === 'INVITED').length}
            </div>
            <div style={styles.statLabel}>Invited</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{contactRelationships.length}</div>
            <div style={styles.statLabel}>Relationships</div>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
            <option value="all">All Types</option>
            <option value="CUSTOMER">Customers</option>
            <option value="RIDER">Riders</option>
            <option value="BUSINESS">Businesses</option>
            <option value="SUPPLIER">Suppliers</option>
            <option value="REFERRAL">Referrals</option>
          </select>
        </div>

        {/* Contact Grid */}
        <div style={styles.contentGrid}>
          <div style={styles.contactList}>
            {filteredContacts.map((contact) => {
              const ws = workspaces.find((w) => w.id === contact.workspaceId);
              return (
                <div
                  key={contact.id}
                  style={{
                    ...styles.contactCard,
                    borderLeft:
                      selectedContact?.id === contact.id
                        ? '3px solid #FF6B35'
                        : '3px solid transparent',
                  }}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div style={styles.contactHeader}>
                    <div style={styles.contactAvatar}>{contact.displayName.charAt(0)}</div>
                    <div style={styles.contactInfo}>
                      <div style={styles.contactName}>{contact.displayName}</div>
                      {contact.companyName && (
                        <div style={styles.contactCompany}>{contact.companyName}</div>
                      )}
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: statusColors[contact.status],
                      }}
                    >
                      {contact.status}
                    </span>
                  </div>
                  <div style={styles.contactMeta}>
                    <span>{typeLabels[contact.contactType]}</span>
                    <span>Strength: {contact.relationshipStrength}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Detail */}
          {selectedContact && (
            <div style={styles.contactDetail}>
              <div style={styles.detailHeader}>
                <div style={styles.detailAvatar}>{selectedContact.displayName.charAt(0)}</div>
                <div>
                  <h3>{selectedContact.displayName}</h3>
                  {selectedContact.companyName && <p>{selectedContact.companyName}</p>}
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4>Contact Information</h4>
                <div style={styles.detailRow}>
                  <span>📱</span>
                  <span>{selectedContact.phoneNumbers.join(', ') || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>📧</span>
                  <span>{selectedContact.emailAddresses.join(', ') || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span>📊</span>
                  <span>{typeLabels[selectedContact.contactType]}</span>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4>Relationship</h4>
                <div style={styles.strengthBar}>
                  <div
                    style={{
                      ...styles.strengthFill,
                      width: `${selectedContact.relationshipStrength}%`,
                      background:
                        selectedContact.relationshipStrength > 70
                          ? '#4CAF50'
                          : selectedContact.relationshipStrength > 40
                          ? '#FFA500'
                          : '#E74C3C',
                    }}
                  />
                </div>
                <div style={styles.strengthLabel}>
                  {selectedContact.relationshipStrength}% relationship strength
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4>Suggested Actions</h4>
                {suggestions.length > 0 ? (
                  <div style={styles.suggestions}>
                    {suggestions.map((s) => (
                      <div key={s.id} style={styles.suggestionItem}>
                        <span>{s.displayName}</span>
                        <button style={styles.inviteBtn}>Invite</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.noSuggestions}>No suggestions available</div>
                )}
              </div>
            </div>
          )}
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
  importBtn: {
    padding: '12px 24px',
    background: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  importModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  importCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '30px',
    minWidth: '400px',
  },
  progressBar: {
    height: '8px',
    background: '#eee',
    borderRadius: '4px',
    marginTop: '16px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#4CAF50',
    transition: 'width 0.3s ease',
  },
  importSteps: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#666',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
  },
  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#fff',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '24px',
  },
  contactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  contactCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  contactHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  contactAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#FF6B35',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontWeight: 'bold',
    color: '#333',
  },
  contactCompany: {
    fontSize: '12px',
    color: '#888',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#fff',
    textTransform: 'uppercase',
  },
  contactMeta: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px',
    fontSize: '12px',
    color: '#888',
  },
  contactDetail: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    height: 'fit-content',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  detailAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#FF6B35',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  detailSection: {
    marginBottom: '20px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    fontSize: '14px',
    color: '#666',
  },
  strengthBar: {
    height: '8px',
    background: '#eee',
    borderRadius: '4px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  strengthLabel: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  suggestionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    background: '#f9f9f9',
    borderRadius: '6px',
    fontSize: '13px',
  },
  inviteBtn: {
    padding: '4px 12px',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noSuggestions: {
    fontSize: '13px',
    color: '#888',
    fontStyle: 'italic',
  },
};

export default Contacts;
