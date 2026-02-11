import React, { useState, useMemo } from 'react';
import { Rider } from '../../types';

interface RiderSelectProps {
  riders: Rider[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RiderSelect({
  riders,
  value,
  onChange,
  placeholder = 'Select a rider',
  className = '',
}: RiderSelectProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredRiders = useMemo(() => {
    if (!search) return riders;
    const searchLower = search.toLowerCase();
    return riders.filter(
      (rider) =>
        rider.firstName.toLowerCase().includes(searchLower) ||
        rider.lastName.toLowerCase().includes(searchLower) ||
        rider.phone.includes(search)
    );
  }, [riders, search]);

  const selectedRider = useMemo(
    () => riders.find((r) => r.id === value),
    [riders, value]
  );

  const handleSelect = (riderId: string): void => {
    onChange(riderId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rider
      </label>
      <button
        type="button"
        className={`relative w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          {selectedRider ? (
            <>
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                <svg
                  className="h-3 w-3 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span className="block truncate">
                {selectedRider.firstName} {selectedRider.lastName} ({selectedRider.phone})
              </span>
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
                placeholder="Search riders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {filteredRiders.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No riders found
              </div>
            ) : (
              filteredRiders.map((rider) => (
                <button
                  key={rider.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                    rider.id === value ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleSelect(rider.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <svg
                          className="h-3 w-3 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {rider.firstName} {rider.lastName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{rider.phone}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 ml-8">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rider.status === 'Available'
                          ? 'bg-green-100 text-green-800'
                          : rider.status === 'Busy'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rider.status}
                    </span>
                    {rider.rating && (
                      <span className="text-xs text-gray-500">
                        ★ {rider.rating.toFixed(1)}
                      </span>
                    )}
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
