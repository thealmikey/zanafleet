import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWalletTransactions, payoutRequests } from '../data/seededData';
import { WalletTransaction } from '../types';

export const WalletPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  if (!currentUser) return <div className="p-6">Please select a persona first</div>;

  const userTransactions = getWalletTransactions(currentUser.id);
  const userPayouts = payoutRequests.filter((p) => p.userId === currentUser.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getTransactionIcon = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'EARNING':
        return '💰';
      case 'PAYOUT':
        return '📤';
      case 'REFERRAL_BONUS':
        return '🎁';
      case 'ADJUSTMENT':
        return '🔧';
      case 'COMMISSION':
        return '📊';
      default:
        return '💵';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'ACTIVE':
      case 'PAID':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
      case 'PROCESSING':
        return 'text-yellow-600 bg-yellow-50';
      case 'FAILED':
      case 'CANCELLED':
      case 'OVERDUE':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-gray-500">Manage your earnings and payouts</p>
        </div>
        <button
          onClick={() => setShowPayoutModal(true)}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Request Payout
        </button>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-6 text-white">
          <div className="text-emerald-100 text-sm mb-1">Available Balance</div>
          <div className="text-3xl font-bold">{formatCurrency(currentUser.walletBalance)}</div>
          <div className="text-emerald-100 text-sm mt-2">Ready to withdraw</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-gray-500 text-sm mb-1">Pending Payouts</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(currentUser.pendingPayouts)}
          </div>
          <div className="text-gray-400 text-sm mt-2">Processing</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-gray-500 text-sm mb-1">Total Earnings</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(currentUser.totalEarnings)}
          </div>
          <div className="text-gray-400 text-sm mt-2">All time</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-gray-500 text-sm mb-1">Jobs Completed</div>
          <div className="text-2xl font-bold text-gray-900">{currentUser.totalJobs}</div>
          <div className="text-gray-400 text-sm mt-2">{currentUser.successRate}% success rate</div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg flex-1">
            <div className="text-2xl">📱</div>
            <div>
              <div className="font-medium text-gray-900">M-Pesa</div>
              <div className="text-sm text-gray-500">Instant transfers</div>
            </div>
            <span className="ml-auto text-green-600 text-sm">Connected</span>
          </div>
          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg flex-1">
            <div className="text-2xl">🏦</div>
            <div>
              <div className="font-medium text-gray-900">Bank Transfer</div>
              <div className="text-sm text-gray-500">2-3 business days</div>
            </div>
            <button className="ml-auto text-emerald-600 text-sm hover:underline">Add</button>
          </div>
          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg flex-1">
            <div className="text-2xl">📱</div>
            <div>
              <div className="font-medium text-gray-900">Airtel Money</div>
              <div className="text-sm text-gray-500">Instant transfers</div>
            </div>
            <button className="ml-auto text-emerald-600 text-sm hover:underline">Add</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payouts'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payout Requests
          </button>
        </nav>
      </div>

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTransactionIcon(txn.type)}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {txn.type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{txn.description}</div>
                    <div className="text-xs text-gray-500">
                      Balance after: {formatCurrency(txn.balanceAfter)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-bold ${
                        txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {txn.amount >= 0 ? '+' : ''}
                      {formatCurrency(txn.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        txn.status
                      )}`}
                    >
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(txn.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userPayouts.length > 0 ? (
                userPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {payout.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>
                          {payout.method === 'MPESA'
                            ? '📱'
                            : payout.method === 'BANK'
                            ? '🏦'
                            : '📱'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{payout.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace font-bold text-gray-900">
                      -nowrap text-sm {formatCurrency(payout.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          payout.status
                        )}`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payout.requestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payout.processedAt ? formatDate(payout.processedAt) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No payout requests yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Payout</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: {formatCurrency(currentUser.walletBalance)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setPayoutAmount('');
                  alert('Payout request submitted! (Demo)');
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
