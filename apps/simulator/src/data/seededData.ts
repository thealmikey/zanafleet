import {
  Activity,
  Contact,
  ContactRelationship,
  ContactSource,
  ContactStatus,
  ContactType,
  Invoice,
  Job,
  JobStatus,
  JobType,
  Notification,
  PayoutRequest,
  Subscription,
  User,
  WalletTransaction,
  Workspace,
} from '../types';

// Helper to generate IDs
const genId = (prefix: string, num: number) => `${prefix}-${num.toString().padStart(4, '0')}`;

// Helper to generate dates
const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const hoursFromNow = (hours: number): Date => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
};

// ==================== WORKSPACES ====================
export const workspaces: Workspace[] = [
  {
    id: 'ws-0001',
    name: 'QuickBite',
    type: 'DELIVERY',
    description: 'Fast food delivery service in Nairobi',
    logo: '🍔',
    color: '#FF6B35',
    isActive: true,
    memberCount: 45,
    subscriptionPlan: 'PROFESSIONAL',
  },
  {
    id: 'ws-0002',
    name: 'SwiftMove',
    type: 'MOVING',
    description: 'Professional moving and relocation services',
    logo: '📦',
    color: '#4ECDC4',
    isActive: true,
    memberCount: 28,
    subscriptionPlan: 'PROFESSIONAL',
  },
  {
    id: 'ws-0003',
    name: 'FleetOps Logistics',
    type: 'FLEET',
    description: 'Multi-branch fleet management company',
    logo: '🚛',
    color: '#45B7D1',
    isActive: true,
    branchCount: 5,
    memberCount: 120,
    subscriptionPlan: 'ENTERPRISE',
  },
  {
    id: 'ws-0004',
    name: 'BulkHub Distribution',
    type: 'WHOLESALE',
    description: 'Wholesale distribution and bulk delivery',
    logo: '📟',
    color: '#96CEB4',
    isActive: true,
    memberCount: 35,
    subscriptionPlan: 'STARTER',
  },
  {
    id: 'ws-0005',
    name: 'OpenTasks Marketplace',
    type: 'MARKETPLACE',
    description: 'Bidding marketplace for gig workers',
    logo: '🎯',
    color: '#9B59B6',
    isActive: true,
    memberCount: 250,
    subscriptionPlan: 'FREE',
  },
];

// ==================== USERS ====================
export const users: User[] = [
  {
    id: 'user-0001',
    name: 'Alex Mutua',
    email: 'alex.mutua@email.com',
    phone: '+254712345678',
    avatar: '👨🏿',
    role: 'RIDER',
    memberships: [
      { workspaceId: 'ws-0001', role: 'RIDER', earnings: 45600, joinedAt: daysAgo(180) },
      { workspaceId: 'ws-0002', role: 'RIDER', earnings: 12300, joinedAt: daysAgo(90) },
    ],
    isAvailable: true,
    rating: 4.8,
    totalEarnings: 57900,
    walletBalance: 12450,
    pendingPayouts: 3500,
    totalJobs: 234,
    successRate: 96.5,
  },
  {
    id: 'user-0002',
    name: 'Maria Wanjiku',
    email: 'maria.wanjiku@email.com',
    phone: '+254723456789',
    avatar: '👩🏾',
    role: 'FLEET_MANAGER',
    memberships: [
      { workspaceId: 'ws-0003', role: 'FLEET_MANAGER', earnings: 125000, joinedAt: daysAgo(365) },
    ],
    isAvailable: true,
    rating: 4.9,
    totalEarnings: 125000,
    walletBalance: 45000,
    pendingPayouts: 0,
    totalJobs: 0,
    successRate: 100,
  },
  {
    id: 'user-0003',
    name: 'David Ochieng',
    email: 'david.ochieng@email.com',
    phone: '+254734567890',
    avatar: '👨🏽',
    role: 'BUSINESS_OWNER',
    memberships: [
      { workspaceId: 'ws-0001', role: 'BUSINESS_OWNER', earnings: 89000, joinedAt: daysAgo(400) },
      { workspaceId: 'ws-0004', role: 'BUSINESS_OWNER', earnings: 156000, joinedAt: daysAgo(200) },
    ],
    isAvailable: true,
    rating: 4.7,
    totalEarnings: 245000,
    walletBalance: 78000,
    pendingPayouts: 12000,
    totalJobs: 0,
    successRate: 100,
  },
  {
    id: 'user-0004',
    name: 'Sarah Akinyi',
    email: 'sarah.akinyi@email.com',
    phone: '+254745678901',
    avatar: '👩🏿',
    role: 'CONTRACTOR',
    memberships: [
      { workspaceId: 'ws-0005', role: 'CONTRACTOR', earnings: 34500, joinedAt: daysAgo(120) },
    ],
    isAvailable: true,
    rating: 4.6,
    totalEarnings: 34500,
    walletBalance: 8900,
    pendingPayouts: 2100,
    totalJobs: 56,
    successRate: 92.1,
  },
  {
    id: 'user-0005',
    name: 'System Admin',
    email: 'admin@zanafleet.com',
    phone: '+254700000000',
    avatar: '👨‍💻',
    role: 'PLATFORM_ADMIN',
    memberships: [
      { workspaceId: 'ws-0001', role: 'PLATFORM_ADMIN', earnings: 0, joinedAt: daysAgo(500) },
      { workspaceId: 'ws-0002', role: 'PLATFORM_ADMIN', earnings: 0, joinedAt: daysAgo(500) },
      { workspaceId: 'ws-0003', role: 'PLATFORM_ADMIN', earnings: 0, joinedAt: daysAgo(500) },
      { workspaceId: 'ws-0004', role: 'PLATFORM_ADMIN', earnings: 0, joinedAt: daysAgo(500) },
      { workspaceId: 'ws-0005', role: 'PLATFORM_ADMIN', earnings: 0, joinedAt: daysAgo(500) },
    ],
    isAvailable: true,
    rating: 5.0,
    totalEarnings: 0,
    walletBalance: 0,
    pendingPayouts: 0,
    totalJobs: 0,
    successRate: 100,
  },
];

// Add more team members for workspaces
const additionalUsers: User[] = [
  {
    id: 'user-0006',
    name: 'James Kiprotich',
    email: 'james.kiprotich@email.com',
    phone: '+254756789012',
    avatar: '👨🏿',
    role: 'RIDER',
    memberships: [
      { workspaceId: 'ws-0001', role: 'RIDER', earnings: 32100, joinedAt: daysAgo(150) },
    ],
    isAvailable: true,
    rating: 4.5,
    totalEarnings: 32100,
    walletBalance: 8900,
    pendingPayouts: 0,
    totalJobs: 156,
    successRate: 94.2,
  },
  {
    id: 'user-0007',
    name: 'Grace Atieno',
    email: 'grace.atieno@email.com',
    phone: '+254767890123',
    avatar: '👩🏾',
    role: 'RIDER',
    memberships: [
      { workspaceId: 'ws-0001', role: 'RIDER', earnings: 28900, joinedAt: daysAgo(120) },
    ],
    isAvailable: false,
    rating: 4.7,
    totalEarnings: 28900,
    walletBalance: 5600,
    pendingPayouts: 1500,
    totalJobs: 98,
    successRate: 97.1,
  },
  {
    id: 'user-0008',
    name: 'Peter Odhiambo',
    email: 'peter.odhiambo@email.com',
    phone: '+254778901234',
    avatar: '👨🏽',
    role: 'RIDER',
    memberships: [
      { workspaceId: 'ws-0002', role: 'RIDER', earnings: 45600, joinedAt: daysAgo(200) },
    ],
    isAvailable: true,
    rating: 4.9,
    totalEarnings: 45600,
    walletBalance: 12300,
    pendingPayouts: 0,
    totalJobs: 187,
    successRate: 98.4,
  },
  {
    id: 'user-0009',
    name: 'Faith Nekesa',
    email: 'faith.nekesa@email.com',
    phone: '+254789012345',
    avatar: '👩🏿',
    role: 'RIDER',
    memberships: [
      { workspaceId: 'ws-0003', role: 'RIDER', earnings: 67800, joinedAt: daysAgo(180) },
    ],
    isAvailable: true,
    rating: 4.8,
    totalEarnings: 67800,
    walletBalance: 18900,
    pendingPayouts: 4200,
    totalJobs: 245,
    successRate: 95.8,
  },
  {
    id: 'user-0010',
    name: 'Daniel Maina',
    email: 'daniel.maina@email.com',
    phone: '+254790123456',
    avatar: '👨🏿',
    role: 'RIDER',
    memberships: [
      { workspaceId: 'ws-0003', role: 'RIDER', earnings: 54200, joinedAt: daysAgo(150) },
    ],
    isAvailable: true,
    rating: 4.6,
    totalEarnings: 54200,
    walletBalance: 15600,
    pendingPayouts: 0,
    totalJobs: 198,
    successRate: 93.9,
  },
];

users.push(...additionalUsers);

// ==================== WALLET TRANSACTIONS ====================
export const walletTransactions: WalletTransaction[] = [
  {
    id: 'txn-0001',
    userId: 'user-0001',
    type: 'EARNING',
    amount: 2500,
    balanceAfter: 12450,
    description: 'Job #1234 completed - Westlands Delivery',
    status: 'COMPLETED',
    createdAt: hoursFromNow(-2),
  },
  {
    id: 'txn-0002',
    userId: 'user-0001',
    type: 'PAYOUT',
    amount: -5000,
    balanceAfter: 9950,
    description: 'Payout to M-Pesa',
    status: 'COMPLETED',
    createdAt: daysAgo(1),
  },
  {
    id: 'txn-0003',
    userId: 'user-0001',
    type: 'REFERRAL_BONUS',
    amount: 1000,
    balanceAfter: 10950,
    description: 'Referral bonus - John Kamau joined',
    status: 'COMPLETED',
    createdAt: daysAgo(3),
  },
  {
    id: 'txn-0004',
    userId: 'user-0001',
    type: 'COMMISSION',
    amount: -250,
    balanceAfter: 10700,
    description: 'Platform commission',
    status: 'COMPLETED',
    createdAt: daysAgo(3),
  },
  {
    id: 'txn-0005',
    userId: 'user-0001',
    type: 'EARNING',
    amount: 1750,
    balanceAfter: 12450,
    description: 'Job #1235 completed - Kilimani Delivery',
    status: 'COMPLETED',
    createdAt: hoursFromNow(-6),
  },
];

// ==================== PAYOUT REQUESTS ====================
export const payoutRequests: PayoutRequest[] = [
  {
    id: 'payout-0001',
    userId: 'user-0001',
    amount: 3500,
    method: 'MPESA',
    status: 'PENDING',
    requestedAt: hoursFromNow(-4),
  },
  {
    id: 'payout-0002',
    userId: 'user-0004',
    amount: 2100,
    method: 'MPESA',
    status: 'PROCESSING',
    requestedAt: hoursFromNow(-12),
  },
];

// ==================== INVOICES ====================
export const invoices: Invoice[] = [
  {
    id: 'inv-0001',
    workspaceId: 'ws-0001',
    invoiceNumber: 'INV-2024-001',
    amount: 45000,
    status: 'PAID',
    dueDate: daysAgo(10),
    createdAt: daysAgo(40),
    items: [
      { description: 'Professional Plan - Monthly', quantity: 1, unitPrice: 25000, total: 25000 },
      { description: 'Additional API calls', quantity: 20000, unitPrice: 1, total: 20000 },
    ],
  },
  {
    id: 'inv-0002',
    workspaceId: 'ws-0001',
    invoiceNumber: 'INV-2024-002',
    amount: 45000,
    status: 'SENT',
    dueDate: daysAgo(20),
    createdAt: daysAgo(10),
    items: [
      { description: 'Professional Plan - Monthly', quantity: 1, unitPrice: 25000, total: 25000 },
      { description: 'Additional API calls', quantity: 20000, unitPrice: 1, total: 20000 },
    ],
  },
  {
    id: 'inv-0003',
    workspaceId: 'ws-0003',
    invoiceNumber: 'INV-2024-003',
    amount: 120000,
    status: 'PAID',
    dueDate: daysAgo(5),
    createdAt: daysAgo(35),
    items: [
      { description: 'Enterprise Plan - Monthly', quantity: 1, unitPrice: 100000, total: 100000 },
      { description: 'Branch management', quantity: 5, unitPrice: 4000, total: 20000 },
    ],
  },
];

// ==================== SUBSCRIPTIONS ====================
export const subscriptions: Subscription[] = workspaces.map((ws) => ({
  id: `sub-${ws.id}`,
  workspaceId: ws.id,
  plan: ws.subscriptionPlan || 'FREE',
  status: 'ACTIVE',
  currentPeriodStart: daysAgo(15),
  currentPeriodEnd: daysAgo(-15),
  price:
    ws.subscriptionPlan === 'ENTERPRISE'
      ? 100000
      : ws.subscriptionPlan === 'PROFESSIONAL'
      ? 25000
      : ws.subscriptionPlan === 'STARTER'
      ? 10000
      : 0,
  features: [
    'Basic job management',
    'Up to 10 team members',
    'Email support',
    ...(ws.subscriptionPlan === 'STARTER' ? ['Analytics dashboard', 'Priority support'] : []),
    ...(ws.subscriptionPlan === 'PROFESSIONAL'
      ? ['Advanced analytics', 'API access', 'Custom branding']
      : []),
    ...(ws.subscriptionPlan === 'ENTERPRISE'
      ? ['Dedicated support', 'Custom integrations', 'SLA guarantee']
      : []),
  ],
}));

// ==================== JOBS ====================
export const jobs: Job[] = [];

// Generate active jobs (30+)
const activeJobData = [
  {
    ws: 'ws-0001',
    type: 'DELIVERY' as JobType,
    title: 'Food Delivery - Westlands',
    workerCount: 1,
    earnings: 450,
    distance: 5.2,
  },
  {
    ws: 'ws-0001',
    type: 'DELIVERY' as JobType,
    title: 'Food Delivery - Kilimani',
    workerCount: 1,
    earnings: 380,
    distance: 3.8,
  },
  {
    ws: 'ws-0001',
    type: 'DELIVERY' as JobType,
    title: 'Food Delivery - CBD',
    workerCount: 1,
    earnings: 520,
    distance: 8.1,
  },
  {
    ws: 'ws-0001',
    type: 'DELIVERY' as JobType,
    title: 'Food Delivery - Karen',
    workerCount: 1,
    earnings: 650,
    distance: 12.5,
  },
  {
    ws: 'ws-0001',
    type: 'DELIVERY' as JobType,
    title: 'Food Delivery - Runda',
    workerCount: 1,
    earnings: 420,
    distance: 4.3,
  },
  {
    ws: 'ws-0002',
    type: 'MOVING' as JobType,
    title: 'House Move - Loresho to Kilimani',
    workerCount: 3,
    earnings: 8500,
    distance: 15.0,
  },
  {
    ws: 'ws-0002',
    type: 'MOVING' as JobType,
    title: 'Office Move - CBD to Mombasa Rd',
    workerCount: 4,
    earnings: 12000,
    distance: 8.5,
  },
  {
    ws: 'ws-0002',
    type: 'MOVING' as JobType,
    title: 'Apartment Move - Parklands',
    workerCount: 2,
    earnings: 5500,
    distance: 6.2,
  },
  {
    ws: 'ws-0003',
    type: 'FLEET' as JobType,
    title: 'Warehouse Delivery - Industrial Area',
    workerCount: 1,
    earnings: 2800,
    distance: 22.0,
  },
  {
    ws: 'ws-0003',
    type: 'FLEET' as JobType,
    title: 'Branch Transfer - South C',
    workerCount: 1,
    earnings: 1900,
    distance: 10.5,
  },
  {
    ws: 'ws-0003',
    type: 'FLEET' as JobType,
    title: 'Client Delivery - Airport',
    workerCount: 1,
    earnings: 3500,
    distance: 18.2,
  },
  {
    ws: 'ws-0004',
    type: 'WHOLESALE' as JobType,
    title: 'Bulk Order - Supermart',
    workerCount: 1,
    earnings: 4200,
    distance: 25.0,
  },
  {
    ws: 'ws-0004',
    type: 'WHOLESALE' as JobType,
    title: 'Wholesale Delivery - Kasongo',
    workerCount: 1,
    earnings: 3100,
    distance: 30.5,
  },
  {
    ws: 'ws-0004',
    type: 'WHOLESALE' as JobType,
    title: 'Restaurant Supply - Langata',
    workerCount: 1,
    earnings: 5600,
    distance: 12.0,
  },
  {
    ws: 'ws-0005',
    type: 'MARKETPLACE' as JobType,
    title: 'Furniture Assembly - Gigiri',
    workerCount: 1,
    earnings: 2200,
    distance: 7.5,
  },
  {
    ws: 'ws-0005',
    type: 'MARKETPLACE' as JobType,
    title: 'Event Setup - KICC',
    workerCount: 2,
    earnings: 4500,
    distance: 5.0,
  },
  {
    ws: 'ws-0005',
    type: 'MARKETPLACE' as JobType,
    title: 'Cleaning Service - Riverside',
    workerCount: 1,
    earnings: 1800,
    distance: 3.2,
  },
];

// Create 30+ active jobs
activeJobData.forEach((data, idx) => {
  const ws = workspaces.find((w) => w.id === data.ws)!;
  const isSlaBreached = idx % 5 === 0;

  jobs.push({
    id: genId('job-active', idx + 1),
    workspaceId: data.ws,
    jobType: data.type,
    status: idx < 20 ? 'ASSIGNED' : 'PENDING',
    title: data.title,
    description: `${data.type} job for ${ws.name}`,
    pickup: {
      address: `Pickup Point ${idx + 1}, Nairobi`,
      latitude: -1.2921 + (Math.random() - 0.5) * 0.1,
      longitude: 36.8219 + (Math.random() - 0.5) * 0.1,
    },
    dropoff: {
      address: `Dropoff Point ${idx + 1}, Nairobi`,
      latitude: -1.2921 + (Math.random() - 0.5) * 0.1,
      longitude: 36.8219 + (Math.random() - 0.5) * 0.1,
    },
    scheduledAt: hoursFromNow(idx % 12),
    assignedWorkers:
      data.workerCount === 1
        ? ['user-0001']
        : ['user-0001', 'user-0006', 'user-0008'].slice(0, data.workerCount),
    workerCount: data.workerCount,
    earnings: data.earnings,
    customerName: `Customer ${idx + 1}`,
    customerPhone: `+25471${(1000000 + idx * 1111).toString().slice(-7)}`,
    slaDeadline: hoursFromNow(isSlaBreached ? -1 : 4),
    isSlaBreached,
    distance: data.distance,
    estimatedDuration: Math.round(data.distance * 3 + 15),
  });
});

// Generate completed jobs (50+)
for (let i = 0; i < 55; i++) {
  const ws = workspaces[i % 5];
  const type: JobType = ws.type === 'MARKETPLACE' ? 'MARKETPLACE' : (ws.type as JobType);
  const earnings = 300 + Math.floor(Math.random() * 5000);
  const distance = 3 + Math.random() * 30;

  jobs.push({
    id: genId('job-completed', i + 1),
    workspaceId: ws.id,
    jobType: type,
    status: 'COMPLETED' as JobStatus,
    title: `Completed ${type} Job ${i + 1}`,
    description: `Completed job for ${ws.name}`,
    pickup: {
      address: `Pickup ${i}, Nairobi`,
      latitude: -1.2921,
      longitude: 36.8219,
    },
    dropoff: {
      address: `Dropoff ${i}, Nairobi`,
      latitude: -1.3,
      longitude: 36.85,
    },
    scheduledAt: daysAgo(Math.floor(Math.random() * 30)),
    completedAt: daysAgo(Math.floor(Math.random() * 30)),
    assignedWorkers: ['user-0001'],
    workerCount: 1,
    earnings,
    customerName: `Customer ${i}`,
    customerPhone: `+25471${(2000000 + i * 1111).toString().slice(-7)}`,
    distance,
    estimatedDuration: Math.round(distance * 3 + 15),
  });
}

// Add some SLA breaches
for (let i = 0; i < 8; i++) {
  jobs.push({
    id: genId('job-breach', i + 1),
    workspaceId: workspaces[i % 5].id,
    jobType: 'DELIVERY' as JobType,
    status: 'SLA_BREACH' as JobStatus,
    title: `SLA Breached Job ${i + 1}`,
    description: 'Job that breached SLA',
    pickup: { address: 'Pickup', latitude: -1.2921, longitude: 36.8219 },
    dropoff: { address: 'Dropoff', latitude: -1.3, longitude: 36.85 },
    scheduledAt: daysAgo(1),
    assignedWorkers: ['user-0001'],
    workerCount: 1,
    earnings: 400,
    customerName: `Customer Breach ${i}`,
    customerPhone: '+254711111111',
    slaDeadline: daysAgo(2),
    isSlaBreached: true,
    distance: 5.0,
    estimatedDuration: 20,
  });
}

// ==================== CONTACTS (200+) ====================
export const contacts: Contact[] = [];

const contactNames = [
  'John Kamau',
  'Ann Wambui',
  'Robert Otieno',
  'Mary Achieng',
  'Michael Ochieng',
  'Josephine Njeri',
  "Paul Kipng'eno",
  'Elizabeth Kemunto',
  'Simon Owino',
  'Catherine Adhiambo',
  'Emmanuel Kiprono',
  'Joyce Wairimu',
  'Samuel Njoroge',
  'Grace Nyambura',
  'Daniel Kipkorir',
  'Esther Muthoni',
  'Francis Kariuki',
  'Sarah Wangari',
  'George Onyango',
  'Agnes Akinyi',
  'Kevin Kiprotich',
  'Mercy Wanjiku',
  'Brian Odhiambo',
  'Faith Nekesa',
  'Andrew Kipchirchir',
  'Linda Wambui',
  'Nicholas Korir',
  'Beatrice Aoko',
  'Martin Ouma',
  'Rosemary Akoth',
  'Patrick Kiprop',
  'Catherine Wanjiru',
  'Samson Kipyegon',
  'Judith Moraa',
  'Henry Omolo',
  'Phoebe Adhiambo',
  'Victor Odero',
  'Ruth Atieno',
  'Felix Otieno',
  'Gladys Auma',
];

const companies = [
  'Kenya Power',
  'Safaricom',
  'Kenya Airways',
  'KCB Bank',
  'Equity Bank',
  'East Africa Breweries',
  'Bamburi Cement',
  'Kenyatta University',
  'JKUAT',
  'KEBS',
  'Nairobi County',
  'Telkom Kenya',
  'Airtel Kenya',
  'Family Bank',
  'Co-op Bank',
];

// Generate 200 contacts
for (let i = 0; i < 200; i++) {
  const nameIdx = i % contactNames.length;
  const isBusiness = i % 7 === 0;
  const statuses: ContactStatus[] = ['PENDING', 'INVITED', 'ACTIVE', 'VERIFIED'];
  const types: ContactType[] = ['CUSTOMER', 'RIDER', 'BUSINESS', 'SUPPLIER', 'REFERRAL'];

  contacts.push({
    id: genId('contact', i + 1),
    workspaceId: i < 100 ? 'ws-0001' : i < 150 ? 'ws-0002' : 'ws-0003',
    displayName: `${contactNames[nameIdx]} ${i > 40 ? `Jr. ${i}` : ''}`.trim(),
    phoneNumbers: [`+2547${(10000000 + i * 11111).toString().slice(-8)}`],
    emailAddresses:
      i % 3 === 0 ? [`${contactNames[nameIdx].toLowerCase().replace(' ', '.')}${i}@email.com`] : [],
    companyName: isBusiness ? companies[i % companies.length] : undefined,
    contactType: types[i % types.length],
    status: statuses[i % statuses.length],
    source: ['DEVICE', 'CSV', 'CRM', 'REFERRAL'][i % 4] as ContactSource,
    relationshipStrength: Math.min(100, 30 + (i % 70)),
    lastInteractionAt: i % 5 === 0 ? daysAgo(i % 30) : undefined,
    matchedUserId: i % 10 === 0 ? `user-${(i % 10) + 1}`.padStart(8, '0') : undefined,
  });
}

// ==================== RELATIONSHIPS ====================
export const contactRelationships: ContactRelationship[] = [];

// Create referral chains
for (let i = 0; i < 50; i++) {
  contactRelationships.push({
    fromContactId: genId('contact', i + 1),
    toContactId: genId('contact', ((i + 10) % 200) + 1),
    relationshipType: 'REFERRED_BY',
    strength: 40 + Math.floor(Math.random() * 60),
  });
}

// Create business relationships
for (let i = 0; i < 30; i++) {
  contactRelationships.push({
    fromContactId: genId('contact', i + 1),
    toContactId: genId('contact', ((i + 5) % 200) + 1),
    relationshipType: 'CUSTOMER_OF',
    strength: 50 + Math.floor(Math.random() * 50),
  });
}

// ==================== NOTIFICATIONS ====================
export const notifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'JOB_ASSIGNED',
    title: 'New Job Assigned',
    message: 'You have been assigned to "Food Delivery - Westlands" - KES 450',
    timestamp: hoursFromNow(-1),
    read: false,
    workspaceId: 'ws-0001',
    actionUrl: '/jobs',
  },
  {
    id: 'notif-002',
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: 'KES 2,500 deposited to your wallet',
    timestamp: hoursFromNow(-3),
    read: false,
    amount: 2500,
    actionUrl: '/wallet',
  },
  {
    id: 'notif-003',
    type: 'JOB_COMPLETED',
    title: 'Job Completed',
    message: 'Moving job to Kilimani completed successfully',
    timestamp: hoursFromNow(-5),
    read: true,
    workspaceId: 'ws-0002',
    actionUrl: '/jobs',
  },
  {
    id: 'notif-004',
    type: 'SLA_WARNING',
    title: 'SLA Warning',
    message: 'Job deadline approaching in 30 minutes',
    timestamp: hoursFromNow(-1),
    read: false,
    workspaceId: 'ws-0001',
    actionUrl: '/jobs',
  },
  {
    id: 'notif-005',
    type: 'WALLET',
    title: 'Payout Processed',
    message: 'KES 5,000 sent to your M-Pesa',
    timestamp: daysAgo(1),
    read: true,
    amount: 5000,
    actionUrl: '/wallet',
  },
  {
    id: 'notif-006',
    type: 'REFERRAL',
    title: 'Referral Bonus Earned',
    message: 'John Kamau completed their first job - KES 500 bonus',
    timestamp: daysAgo(2),
    read: true,
    amount: 500,
    actionUrl: '/wallet',
  },
  {
    id: 'notif-007',
    type: 'EARNING',
    title: 'Weekly Summary',
    message: 'You earned KES 12,500 this week!',
    timestamp: daysAgo(2),
    read: true,
    amount: 12500,
  },
  {
    id: 'notif-008',
    type: 'SYSTEM',
    title: 'Welcome to ZanaFleet',
    message: 'Your account is ready. Start accepting jobs!',
    timestamp: daysAgo(30),
    read: true,
  },
  {
    id: 'notif-009',
    type: 'JOB_ASSIGNED',
    title: 'Multi-Worker Job',
    message: 'You have been assigned to a team moving job - 3 workers needed',
    timestamp: hoursFromNow(-2),
    read: false,
    workspaceId: 'ws-0002',
  },
  {
    id: 'notif-010',
    type: 'SLA_WARNING',
    title: 'Urgent: SLA Breach Risk',
    message: 'Job #1240 at risk of SLA breach',
    timestamp: hoursFromNow(-30),
    read: false,
    workspaceId: 'ws-0001',
  },
];

// ==================== ACTIVITIES ====================
export const activities: Activity[] = [
  {
    id: 'act-001',
    type: 'job_completed',
    description: 'Completed food delivery to Kilimani - KES 520',
    timestamp: hoursFromNow(-2),
    metadata: { earnings: 520, jobId: 'job-active-003' },
  },
  {
    id: 'act-002',
    type: 'job_assigned',
    description: 'Assigned to moving job - Loresho to Kilimani',
    timestamp: hoursFromNow(-4),
    metadata: { jobId: 'job-active-006' },
  },
  {
    id: 'act-003',
    type: 'referral',
    description: 'Referred John Kamau to QuickBite',
    timestamp: daysAgo(1),
    metadata: { contactId: 'contact-0001' },
  },
  {
    id: 'act-004',
    type: 'payment',
    description: 'Weekly payout: KES 12,500',
    timestamp: daysAgo(2),
    metadata: { amount: 12500 },
  },
  {
    id: 'act-005',
    type: 'contact_added',
    description: 'Imported 50 contacts from CSV',
    timestamp: daysAgo(3),
    metadata: { count: 50 },
  },
];

// ==================== LOOKUP FUNCTIONS ====================
export const getWorkspace = (id: string) => workspaces.find((w) => w.id === id);
export const getUser = (id: string) => users.find((u) => u.id === id);
export const getJob = (id: string) => jobs.find((j) => j.id === id);
export const getContact = (id: string) => contacts.find((c) => c.id === id);

export const getJobsForUser = (userId: string): Job[] => {
  return jobs.filter(
    (j) => j.assignedWorkers.includes(userId) || (j.status === 'PENDING' && j.workerCount > 0)
  );
};

export const getJobsForWorkspace = (workspaceId: string): Job[] => {
  return jobs.filter((j) => j.workspaceId === workspaceId);
};

export const getContactsForWorkspace = (workspaceId: string): Contact[] => {
  return contacts.filter((c) => c.workspaceId === workspaceId);
};

export const getEarningsByWorkspace = (userId: string): Record<string, number> => {
  const user = getUser(userId);
  if (!user) return {};

  const earnings: Record<string, number> = {};
  for (const membership of user.memberships) {
    earnings[membership.workspaceId] = membership.earnings;
  }
  return earnings;
};

export const getTotalEarnings = (userId: string): number => {
  const user = getUser(userId);
  return user?.totalEarnings ?? 0;
};

export const getActiveJobsCount = (workspaceId?: string): number => {
  if (workspaceId) {
    return jobs.filter(
      (j) =>
        j.workspaceId === workspaceId && ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(j.status)
    ).length;
  }
  return jobs.filter((j) => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(j.status)).length;
};

export const getSlaBreachRate = (workspaceId?: string): number => {
  const completedJobs = workspaceId
    ? jobs.filter((j) => j.workspaceId === workspaceId && j.status === 'COMPLETED')
    : jobs.filter((j) => j.status === 'COMPLETED');

  if (completedJobs.length === 0) return 0;

  const breachedJobs = workspaceId
    ? jobs.filter((j) => j.workspaceId === workspaceId && j.isSlaBreached)
    : jobs.filter((j) => j.isSlaBreached);

  return (breachedJobs.length / completedJobs.length) * 100;
};

export const getNotificationsForUser = (userId: string): Notification[] => {
  return notifications;
};

export const getWalletTransactions = (userId: string): WalletTransaction[] => {
  return walletTransactions.filter((t) => t.userId === userId);
};

export const getInvoicesForWorkspace = (workspaceId: string): Invoice[] => {
  return invoices.filter((inv) => inv.workspaceId === workspaceId);
};
