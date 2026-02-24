import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobs, getJobsForUser, getJobsForWorkspace, workspaces } from '../data/seededData';
import { Job, JobStatus } from '../types';

export const MapsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('active');

  if (!currentUser) return <div className="p-6">Please select a persona first</div>;

  // Get jobs based on user role
  let displayJobs: Job[];
  if (currentUser.role === 'RIDER' || currentUser.role === 'CONTRACTOR') {
    displayJobs = getJobsForUser(currentUser.id);
  } else {
    // For business owners/managers, show all workspace jobs
    const userWsIds = currentUser.memberships.map(m => m.workspaceId);
    displayJobs = jobs.filter(j => userWsIds.includes(j.workspaceId));
  }

  // Apply filter
  const filteredJobs = displayJobs.filter(job => {
    if (filter === 'active') return ['ASSIGNED', 'IN_PROGRESS'].includes(job.status);
    if (filter === 'pending') return job.status === 'PENDING';
    if (filter === 'completed') return job.status === 'COMPLETED';
    return true;
  });

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'PENDING':
        return 'bg-gray-500';
      case 'CANCELLED':
        return 'bg-red-500';
      case 'SLA_BREACH':
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate map center (Nairobi)
  const centerLat = -1.2921;
  const centerLng = 36.8219;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Map</h1>
        <p className="text-gray-500">Track jobs and driver locations</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['active', 'pending', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2 bg-gray-100 rounded-xl overflow-hidden" style={{ height: '600px' }}>
          {/* Simulated Map */}
          <div className="relative w-full h-full bg-gradient-to-br from-gray-200 to-gray-300">
            {/* Grid overlay to simulate map */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `
                linear-gradient(to right, #666 1px, transparent 1px),
                linear-gradient(to bottom, #666 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }} />

            {/* Map markers */}
            {filteredJobs.map((job, idx) => {
              // Random offset for demo
              const offsetLat = (Math.random() - 0.5) * 0.05;
              const offsetLng = (Math.random() - 0.5) * 0.05;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`absolute w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 shadow-lg ${getStatusColor(job.status)}`}
                  style={{
                    left: `${30 + (idx % 5) * 10 + Math.random() * 5}%`,
                    top: `${20 + Math.floor(idx / 5) * 15 + Math.random() * 5}%`,
                  }}
                  title={job.title}
                >
                  <span className="text-white text-sm">
                    {job.jobType === 'DELIVERY' ? '📦' : job.jobType === 'MOVING' ? '🚛' : job.jobType === 'FLEET' ? '🚚' : job.jobType === 'WHOLESALE' ? '📱' : '🎯'}
                  </span>
                </div>
              );
            })}

            {/* Center marker (HQ) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl">🏢</span>
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded">
                Nairobi HQ
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg">
              <div className="text-xs font-medium text-gray-500 mb-2">Job Status</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-700">Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-700">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-700">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-xs text-gray-700">Pending</span>
                </div>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="w-10 h-10 bg-white rounded-lg shadow flex items-center justify-center text-gray-600 hover:bg-gray-50">+</button>
              <button className="w-10 h-10 bg-white rounded-lg shadow flex items-center justify-center text-gray-600 hover:bg-gray-50">−</button>
            </div>
          </div>
        </div>

        {/* Job List / Details */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: '600px' }}>
          {selectedJob ? (
            // Selected Job Details
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  ← Back to list
                </button>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedJob.status)} text-white`}>
                  {selectedJob.status}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedJob.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedJob.jobType} Job</p>

              <div className="space-y-4">
                {/* Pickup */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Pickup</div>
                    <div className="text-sm text-gray-900">{selectedJob.pickup.address}</div>
                    <div className="text-xs text-gray-400">
                      {selectedJob.pickup.latitude.toFixed(4)}, {selectedJob.pickup.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Dropoff */}
                <div>
                  <div className="text-xs text-gray-500">Dropoff</div>
                  <div className="text-sm text-gray-900">{selectedJob.dropoff.address}</div>
                  <div className="text-xs text-gray-400">
                    {selectedJob.dropoff.latitude.toFixed(4)}, {selectedJob.dropoff.longitude.toFixed(4)}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500">Earnings</div>
                    <div className="text-sm font-bold text-green-600">{formatCurrency(selectedJob.earnings)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Distance</div>
                    <div className="text-sm font-medium text-gray-900">{selectedJob.distance?.toFixed(1)} km</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="text-sm font-medium text-gray-900">{selectedJob.estimatedDuration} min</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Workers</div>
                    <div className="text-sm font-medium text-gray-900">{selectedJob.workerCount}</div>
                  </div>
                </div>

                {/* Customer */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">Customer</div>
                  <div className="text-sm font-medium text-gray-900">{selectedJob.customerName}</div>
                  <div className="text-sm text-gray-600">{selectedJob.customerPhone}</div>
                </div>
              </div>
            </div>
          ) : (
            // Job List
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="text-sm text-gray-500">
                  {filteredJobs.length} jobs {filter !== 'all' && `(${filter})`}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredJobs.slice(0, 20).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {job.jobType === 'DELIVERY' ? '📦' : job.jobType === 'MOVING' ? '🚛' : job.jobType === 'FLEET' ? '🚚' : job.jobType === 'WHOLESALE' ? '📱' : '🎯'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{job.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(job.status)} text-white`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{job.pickup.address} → {job.dropoff.address}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-green-600">{formatCurrency(job.earnings)}</span>
                      <span className="text-xs text-gray-400">{job.distance?.toFixed(1)} km</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
