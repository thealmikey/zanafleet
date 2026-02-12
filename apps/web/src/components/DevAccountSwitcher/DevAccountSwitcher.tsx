import React, { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';

/**
 * DevAccountSwitcher - A development-only component for switching between test accounts.
 * Renders as a floating toolbar in the bottom-right corner of the page.
 * Only visible in non-production environments.
 */
export const DevAccountSwitcher: React.FC = () => {
  // Only render in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const authContext = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  if (!authContext) {
    return null;
  }

  const { user, isLoading, error, login, clearError } = authContext;

  const handleAccountSelect = async (email: string): Promise<void> => {
    clearError?.();
    await login({
      email,
      password: TEST_PASSWORD,
    });
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        title="Dev Account Switcher (dev mode only)"
      >
        <span className="text-sm font-medium">
          {user ? `🧪 ${user.name}` : '🧪 Dev'}
        </span>
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-white border border-slate-300 rounded-lg shadow-2xl p-4 space-y-3 max-h-96 overflow-y-auto">
          {/* Current user section */}
          {user && (
            <div className="pb-3 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Current User
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">{user.name}</p>
              <p className="text-xs text-slate-600">{user.email}</p>
              {user.roles && user.roles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.roles.map(role => (
                    <span
                      key={role}
                      className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex justify-between items-start gap-2">
              <span>{error}</span>
              <button
                onClick={() => clearError?.()}
                className="text-red-700 hover:text-red-900 font-bold flex-shrink-0"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
              <span className="inline-block animate-spin">⟳</span>
              <span>Logging in...</span>
            </div>
          )}

          {/* Test accounts section */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Test Accounts
            </p>
            <div className="space-y-2">
              {TEST_ACCOUNTS.map(account => {
                const isCurrentAccount = user?.id === account.id;
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.email)}
                    disabled={isLoading}
                    className={`w-full text-left p-3 rounded-md transition-all ${isCurrentAccount
                        ? 'bg-blue-100 border-2 border-blue-400 text-blue-900'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 hover:bg-slate-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed ${!isLoading ? 'cursor-pointer' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCurrentAccount && <span className="text-sm">✓</span>}
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{account.username}</div>
                        <div className="text-xs text-slate-600">{account.email}</div>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                        {account.type}
                      </span>
                    </div>
                    {account.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {account.roles.map(role => {
                          const isConsumer = role === 'Customer' || role === 'Shopper';
                          return (
                            <span
                              key={role}
                              className={`inline-flex text-xs ${isConsumer ? 'bg-pink-100 text-pink-800' : 'bg-green-100 text-green-800'
                                } px-2 py-0.5 rounded`}
                            >
                              {isConsumer ? 'CONSUMER' : role}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info footer */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Password: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">testpassword123</code>
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full text-center text-xs text-slate-600 hover:text-slate-900 font-medium py-2 rounded hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
