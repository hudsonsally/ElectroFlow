export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  min_threshold: number;
  max_threshold: number;
  unit_price: number;
  location: string;
  rack_number: string;
  updated_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  created_at: string;
  items?: string;
}

export interface Transaction {
  id: number;
  product_id: number;
  product_name: string;
  type: 'incoming' | 'outgoing' | 'adjustment';
  quantity: number;
  reference_id: string;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  pendingOrders: number;
  recentTransactions: Transaction[];
}

export interface User {
  id: number;
  username: string;
  role: 'manager' | 'staff';
  name: string;
}
