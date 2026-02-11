import React, { useState, useMemo } from 'react';
import { Sacco } from '../../types';

interface SaccoSelectProps {
  saccos: Sacco[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SaccoSelect({
  saccos,
  value,
  onChange,
  placeholder = 'Select a sacco',
  className = '',
}: SaccoSelectProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredSaccos = useMemo(() => {
    if (!search) return saccos;
    const searchLower = search.toLowerCase();
    return saccos.filter(
      (sacco) =>
        sacco.name.toLowerCase().includes(searchLower) ||
        sacco.phone.includes(search)
    );
  }, [saccos, search]);

  const selectedSacco = useMemo(
    () => saccos.find((s) => s.id === value),
    [saccos, value]
  );

  const handleSelect = (saccoId: string): void => {
    onChange(saccoId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Sacco
      </label>
      <button
        type="button"
        className={`relative w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          {selectedSacco ? (
            <>
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                <svg
                  className="h-3 w-3 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span className="block truncate">{selectedSacco.name}</span>
            </>
          ) : (
            <span className="block truncate text-gray-500">{placeholder}</span>
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.26a.75.75 0 01-1.02-1.1l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            <div className="sticky top-0 bg-white border-b px-2 py-1">
              <input
                type="text"
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search saccos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {filteredSaccos.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No saccos found
              </div>
            ) : (
              filteredSaccos.map((sacco) => (
                <button
                  key={sacco.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                    sacco.id === value ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSelect(sacco.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                        <svg
                          className="h-3 w-3 text-purple-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {sacco.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{sacco.phone}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 ml-8">
                    <span className="text-xs text-gray-500">
                      {sacco.memberCount} members
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        sacco.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {sacco.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
