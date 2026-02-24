import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OrderApi, DeliveryApi } from '../services/api';

export const OrderCreation: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId, token } = useAuth();
  const [formData, setFormData] = useState({
    itemSummary: '',
    customerName: '',
    customerPhone: '',
    scheduledTime: '',
    recipientName: '',
    recipientPhone: '',
    pickupAddress: '123 Main St, Nairobi',
    dropoffAddress: '456 Market St, Nairobi',
    distanceKm: 5,
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
      // Step 1: Create Order
      const orderResult = await OrderApi.create(
        {
          businessId: '00000000-0000-0000-0000-000000000001', // Demo business
          itemSummary: formData.itemSummary,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          scheduledTime: formData.scheduledTime || undefined,
        },
        { workspaceId, token: token || '' }
      );

      if (!orderResult.success || !orderResult.data) {
        setError(orderResult.error?.message || 'Failed to create order');
        setLoading(false);
        return;
      }

      const orderId = orderResult.data.id;

      // Step 2: Request Delivery
      const deliveryResult = await DeliveryApi.request(
        {
          businessId: '00000000-0000-0000-0000-000000000001',
          workspaceId,
          actorId: 'actor-admin-001',
          pickup: {
            type: 'Point',
            coordinates: [36.82, -1.29],
            address: formData.pickupAddress,
            name: 'Pickup Location',
          },
          dropoff: {
            type: 'Point',
            coordinates: [36.85, -1.30],
            address: formData.dropoffAddress,
            name: 'Delivery Location',
          },
          recipientName: formData.recipientName || formData.customerName,
          recipientPhone: formData.recipientPhone || formData.customerPhone,
          distanceKm: formData.distanceKm,
        },
        { workspaceId, token: token || '' }
      );

      if (deliveryResult.success && deliveryResult.data) {
        setSuccess(`Order #${orderId.slice(0, 8)} created! Delivery #${deliveryResult.data.deliveryId.slice(0, 8)} requested.`);
        setFormData({
          itemSummary: '',
          customerName: '',
          customerPhone: '',
          scheduledTime: '',
          recipientName: '',
          recipientPhone: '',
          pickupAddress: '123 Main St, Nairobi',
          dropoffAddress: '456 Market St, Nairobi',
          distanceKm: 5,
        });
      } else {
        setError(deliveryResult.error?.message || 'Failed to request delivery');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <h2>📦 Create Order & Request Delivery</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Place an order and immediately request a delivery pickup.
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
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          borderLeft: '4px solid #2196f3'
        }}>
          <h3 style={{ marginTop: 0 }}>📋 Order Details</h3>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Item Summary *
            </label>
            <input
              type="text"
              required
              value={formData.itemSummary}
              onChange={(e) => setFormData({ ...formData, itemSummary: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="e.g., 5kg Rice, 2L Cooking Oil"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                placeholder="Customer name"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Customer Phone
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                placeholder="+254700000000"
              />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Scheduled Time (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          borderLeft: '4px solid #4caf50'
        }}>
          <h3 style={{ marginTop: 0 }}>🚚 Delivery Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Pickup Address *
              </label>
              <input
                type="text"
                required
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Dropoff Address *
              </label>
              <input
                type="text"
                required
                value={formData.dropoffAddress}
                onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Recipient Name
              </label>
              <input
                type="text"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                placeholder="If different from customer"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Recipient Phone
              </label>
              <input
                type="tel"
                value={formData.recipientPhone}
                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                placeholder="+254700000000"
              />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Distance (km): {formData.distanceKm}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={formData.distanceKm}
              onChange={(e) => setFormData({ ...formData, distanceKm: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '16px',
            }}
          >
            {loading ? 'Processing...' : '✓ Create Order & Request Delivery'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '14px 24px',
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

export default OrderCreation;
