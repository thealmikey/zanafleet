import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiderApi } from '../../services/api';

const vehicleTypes = [
  { value: 'MOTORCYCLE', label: 'Motorcycle', icon: '🏍️' },
  { value: 'CAR', label: 'Car', icon: '🚗' },
  { value: 'VAN', label: 'Van', icon: '🚐' },
  { value: 'BICYCLE', label: 'Bicycle', icon: '🚲' },
  { value: 'TRUCK', label: 'Truck', icon: '🚚' },
];

export const RiderManagement: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId, token } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    email: '',
    vehicleType: 'MOTORCYCLE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await RiderApi.create(
        {
          fullName: formData.fullName,
          nationalId: formData.nationalId,
          phone: formData.phone,
          vehicleType: formData.vehicleType,
          email: formData.email || undefined,
        },
        { workspaceId, token: token || '' }
      );

      if (result.success && result.data) {
        setSuccess(`Rider registered successfully! ID: ${result.data.id}`);
        setFormData({ fullName: '', nationalId: '', phone: '', email: '', vehicleType: 'MOTORCYCLE' });
      } else {
        setError(result.error?.message || 'Failed to register rider');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🏍️ Register New Rider</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Add a new rider to your fleet for delivery operations.
      </p>

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          marginBottom: '16px' 
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#e8f5e9', 
          color: '#2e7d32', 
          borderRadius: '4px',
          marginBottom: '16px' 
        }}>
          ✅ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            placeholder="e.g., John Doe"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            National ID *
          </label>
          <input
            type="text"
            required
            value={formData.nationalId}
            onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            placeholder="e.g., 12345678"
            maxLength={8}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            placeholder="+254700000000"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            placeholder="rider@example.com"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Vehicle Type *
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {vehicleTypes.map((type) => (
              <label
                key={type.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  border: formData.vehicleType === type.value ? '2px solid #2196f3' : '1px solid #ddd',
                  backgroundColor: formData.vehicleType === type.value ? '#e3f2fd' : 'white',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="vehicleType"
                  value={type.value}
                  checked={formData.vehicleType === type.value}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  style={{ display: 'none' }}
                />
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: loading ? '#ccc' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? 'Registering...' : 'Register Rider'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RiderManagement;
