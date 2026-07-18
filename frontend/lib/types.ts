export type Role = 'AGENT' | 'ADMIN';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  companyName?: string | null;
  avatarUrl?: string | null;
  deletedAt?: string | null;
  storefront?: Storefront | null;
  wallet?: Wallet | null;
};

export type StorefrontWallet = {
  id: string;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  transactions?: StorefrontWalletTransaction[];
};

export type StorefrontWalletTransaction = {
  id: string;
  type: string;
  category: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference: string;
  createdAt: string;
};

export type WalletTransaction = {
  id: string;
  type: string;
  category: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference: string;
  createdAt: string;
};

export type Network = {
  id: string;
  name: string;
  code: string;
  color: string;
};

export type RolePrice = {
  id: string;
  role: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  dataSize: string;
  sellingPrice: number;
  agentPrice: number;
  resellerPrice: number;
  buyingPrice: number;
  promoPrice?: number | null;
  stock?: number;
  showInShop?: boolean;
  showForAgents?: boolean;
  status: boolean;
  networkId: string;
  network: Network;
  rolePrices?: RolePrice[];
  isOnStorefront?: boolean;
  customPrice?: number | null;
  storefrontProductId?: string | null;
};

export type Order = {
  id: string;
  phoneNumber: string;
  amount: number;
  status: string;
  receiptNumber: string;
  providerReference?: string | null;
  source?: string;
  createdAt: string;
  product: Product;
  refund?: Refund | null;
};

export type OrderBatch = {
  id: string;
  status: string;
  fileName: string;
  totalRecords: number;
  totalAmount: number;
  successfulCount: number;
  failedCount: number;
  processingCount: number;
  createdAt: string;
  orders?: Order[];
};

export type Complaint = {
  id: string;
  title: string;
  description: string;
  evidenceUrl?: string | null;
  status: string;
  createdAt: string;
};

export type Refund = {
  id: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
};

export type Commission = {
  id: string;
  amount: number;
  source: string;
  createdAt: string;
  order?: Order;
};

export type Payment = {
  id: string;
  amount: number;
  method: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  reference: string;
  providerRef: string | null;
  createdAt: string;
};

export type Wallet = {
  id: string;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  transactions?: WalletTransaction[];
  pendingPayments?: Payment[];
};

export type Withdrawal = {
  id: string;
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  bankName?: string | null;
  status: string;
  reference: string;
  source?: 'MAIN_WALLET' | 'STOREFRONT_WALLET';
  createdAt: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  createdAt: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  targetRole?: Role | null;
  createdAt: string;
};

export type Storefront = {
  id: string;
  slug: string;
  displayName: string;
  tagline: string;
  description: string;
  themeColor: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  whatsappUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  visits: number;
  sales: number;
  conversionRate: number;
  user?: User;
};

export type DashboardResponse = {
  user: User;
  wallet: Wallet;
  metrics: {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    pendingOrders: number;
    totalSpending: number;
    totalEarnings: number;
    walletBalance: number;
    pendingBalance: number;
  };
  revenueSeries: { label: string; revenue: number }[];
  orders: Order[];
  batches: OrderBatch[];
  commissions: Commission[];
  notifications: Notification[];
  announcements: Announcement[];
  networkUsage: { networkCode: string; orders: number }[];
};

export type AdminDashboardResponse = {
  metrics: {
    revenue: number;
    walletBalances: number;
    activeUsers: number;
    activeAgents: number;
    orders: number;
    refunds: number;
    complaints: number;
    commissions: number;
    pendingWithdrawals: number;
    successRate: number;
  };
  charts: {
    revenueTrends: { label: string; value: number }[];
    orderTrends: { label: string; value: number }[];
    networkUsage: { code: string; count: number }[];
  };
  recentOrders: Order[];
  products: Product[];
};
