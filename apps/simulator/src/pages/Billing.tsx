import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { invoices, subscriptions, workspaces } from '../data/seededData';
import { Subscription } from '../types';

export const BillingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscription'>('invoices');

  if (!currentUser) return <div className="p-6">Please select a persona first</div>;

  // Get user's workspaces
  const userWorkspaces = currentUser.memberships
    .map((m) => workspaces.find((w) => w.id === m.workspaceId))
    .filter(Boolean) as typeof workspaces;

  const userInvoices = userWorkspaces.flatMap((ws) =>
    invoices.filter((inv) => inv.workspaceId === ws.id)
  );

  const userSubscriptions = userWorkspaces
    .map((ws) => subscriptions.find((s) => s.workspaceId === ws.id))
    .filter(Boolean) as Subscription[];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'ACTIVE':
        return 'text-green-600 bg-green-50';
      case 'SENT':
      case 'DRAFT':
        return 'text-blue-600 bg-blue-50';
      case 'PENDING':
      case 'PROCESSING':
        return 'text-yellow-600 bg-yellow-50';
      case 'OVERDUE':
      case 'FAILED':
      case 'CANCELLED':
        return 'text-red-600 bg-red-50';
      case 'EXPIRED':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE':
        return 'from-purple-600 to-purple-800';
      case 'PROFESSIONAL':
        return 'from-emerald-500 to-emerald-700';
      case 'STARTER':
        return 'from-blue-500 to-blue-700';
      case 'FREE':
        return 'from-gray-500 to-gray-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500">Manage invoices and subscription plans</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscription'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Subscription Plans
          </button>
        </nav>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
            <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
              Download All
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userInvoices.map((invoice) => {
                  const ws = workspaces.find((w) => w.id === invoice.workspaceId);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-500">
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ws?.logo}</span>
                          <span className="text-sm font-medium text-gray-900">{ws?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-gray-500 text-sm mb-1">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  userInvoices
                    .filter((i) => i.status === 'PAID')
                    .reduce((sum, i) => sum + i.amount, 0)
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-gray-500 text-sm mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(
                  userInvoices
                    .filter((i) => i.status === 'SENT')
                    .reduce((sum, i) => sum + i.amount, 0)
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-gray-500 text-sm mb-1">Overdue</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  userInvoices
                    .filter((i) => i.status === 'OVERDUE')
                    .reduce((sum, i) => sum + i.amount, 0)
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Your Plans</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userSubscriptions.map((sub) => {
              const ws = workspaces.find((w) => w.id === sub.workspaceId);
              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className={`bg-gradient-to-r ${getPlanColor(sub.plan)} p-4 text-white`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm opacity-80">{ws?.name}</div>
                        <div className="text-xl font-bold">{sub.plan} Plan</div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          sub.status
                        )}`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(sub.price)}
                      </span>
                      <span className="text-gray-500">/month</span>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">Period:</span>{' '}
                        {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Features included:
                      </div>
                      {sub.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-500">✓</span>
                          {feature}
                        </div>
                      ))}
                      {sub.features.length > 4 && (
                        <div className="text-sm text-gray-500">
                          +{sub.features.length - 4} more features
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                        Manage Plan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Available Plans */}
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].map((plan) => (
                <div key={plan} className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500 mb-1">{plan}</div>
                  <div className="text-2xl font-bold text-gray-900 mb-4">
                    {plan === 'FREE'
                      ? 'Free'
                      : `${formatCurrency(
                          plan === 'ENTERPRISE' ? 100000 : plan === 'PROFESSIONAL' ? 25000 : 10000
                        )}/mo`}
                  </div>
                  {userSubscriptions.some((s) => s.plan === plan) ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button className="w-full px-4 py-2 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 text-sm font-medium">
                      Upgrade
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
