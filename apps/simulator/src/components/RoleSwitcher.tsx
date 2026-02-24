import React from 'react';
import { Role, User } from '../types';

interface RoleSwitcherProps {
  currentUser: User | null;
  onRoleSwitch: (role: Role) => void;
}

const roleColors: Record<Role, string> = {
  ADMIN: '#9c27b0',
  OPS: '#2196f3',
  BUSINESS_OWNER: '#4caf50',
  RIDER: '#ff9800',
  CUSTOMER: '#00bcd4',
};

const roleDescriptions: Record<Role, string> = {
  ADMIN: 'System Administrator',
  OPS: 'Operations Staff',
  BUSINESS_OWNER: 'Business Client',
  RIDER: 'Delivery Rider',
  CUSTOMER: 'End Customer',
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '20px',
  },
  label: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 500,
  },
  select: {
    padding: '4px 12px',
    borderRadius: '15px',
    border: '2px solid',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: 'white',
    outline: 'none',
  },
};

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentUser, onRoleSwitch }) => {
  const roles: Role[] = ['ADMIN', 'OPS', 'BUSINESS_OWNER', 'RIDER', 'CUSTOMER'];
  const currentRole = currentUser?.role || 'ADMIN';
  const borderColor = roleColors[currentRole];

  return (
    <div style={styles.container}>
      <span style={styles.label}>🎭 Role:</span>
      <select
        value={currentRole}
        onChange={(e) => onRoleSwitch(e.target.value as Role)}
        style={{ ...styles.select, borderColor, color: borderColor }}
        title={roleDescriptions[currentRole]}
      >
        {roles.map(role => (
          <option key={role} value={role} style={{ color: roleColors[role] }}>
            {role.replace('_', ' ')} - {roleDescriptions[role]}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RoleSwitcher;
