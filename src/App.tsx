import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  RefreshCw,
  BrainCircuit,
  ChevronRight,
  Filter,
  MoreVertical,
  Database as DatabaseIcon,
  Code,
  MessageSquare,
  Send,
  X,
  Truck,
  MapPin,
  CheckCircle,
  Map as MapIcon
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { Product, Order, OrderTracking, DashboardStats, Transaction, User } from './types';
import { getInventoryInsights } from './services/geminiService';
import { WarehouseMap3D } from './components/WarehouseMap3D';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'database' | 'map'>('dashboard');
  const [dbData, setDbData] = useState<any>(null);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const [visualPreviews, setVisualPreviews] = useState<{id: string, url: string}[]>([]);
  const [isVisualLoading, setIsVisualLoading] = useState(false);
  const [blueprintAnalysis, setBlueprintAnalysis] = useState<string | null>(null);
  const [isBlueprintLoading, setIsBlueprintLoading] = useState(false);

  const handleBlueprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBlueprintLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { analyzeWarehouseBlueprint } = await import('./services/geminiService');
        const analysis = await analyzeWarehouseBlueprint(base64, file.type);
        setBlueprintAnalysis(analysis);
        setIsBlueprintLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Blueprint upload error:", error);
      setIsBlueprintLoading(false);
    }
  };

  const loadVisualPreviews = async () => {
    setIsVisualLoading(true);
    try {
      const { generateWarehouseVisuals } = await import('./services/visualService');
      const visuals = await generateWarehouseVisuals();
      setVisualPreviews(visuals);
    } catch (error) {
      console.error("Visual generation error:", error);
    } finally {
      setIsVisualLoading(false);
    }
  };

  const fetchDbData = async () => {
    setIsDbLoading(true);
    try {
      const res = await fetch('/api/db-explorer');
      const data = await res.json();
      setDbData(data);
    } catch (error) {
      console.error("DB Explorer error:", error);
    } finally {
      setIsDbLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [statsRes, invRes, ordersRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/inventory'),
        fetch('/api/orders')
      ]);
      
      const statsData = await statsRes.json();
      const invData = await invRes.json();
      const ordersData = await ordersRes.json();

      setStats(statsData);
      setInventory(invData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (e) {
      setLoginError('Connection error');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setActiveTab('dashboard');
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();

      // WebSocket for real-time updates
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'INVENTORY_REFRESH' || data.type === 'ORDER_CREATED' || data.type === 'INVENTORY_UPDATE') {
          fetchData();
        }
      };

      return () => ws.close();
    }
  }, [user, fetchData]);

  const generateAiInsights = async () => {
    setIsAiLoading(true);
    try {
      const insights = await getInventoryInsights(inventory);
      setAiInsights(insights.insights || []);
    } catch (error) {
      console.error("AI Insight error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState<OrderTracking[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', category: 'Smartphones', quantity: 0, min_threshold: 10, max_threshold: 100, unit_price: 0, location: '', rack_number: ''
  });
  const [adjustment, setAdjustment] = useState({
    quantity: 0, type: 'incoming' as 'incoming' | 'outgoing' | 'adjustment', reference_id: ''
  });
  const [newOrder, setNewOrder] = useState({
    customer_name: '', items: [] as { product_id: number, quantity: number }[]
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      // Prepare context
      const context = {
        inventory: inventory.map(p => ({ name: p.name, sku: p.sku, qty: p.quantity, loc: p.location, rack: p.rack_number, price: p.unit_price })),
        orders: orders.map(o => ({ num: o.order_number, status: o.status, total: o.total_amount, items: o.items })),
        stats: { total: stats?.totalProducts, low: stats?.lowStock, pending: stats?.pendingOrders }
      };

      const { chatWithInventory } = await import('./services/geminiService');
      const aiResponse = await chatWithInventory(userMsg, context);
      setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        setIsAddProductOpen(false);
        setNewProduct({ sku: '', name: '', category: 'Smartphones', quantity: 0, min_threshold: 10, max_threshold: 100, unit_price: 0, location: '', rack_number: '' });
        fetchData();
      }
    } catch (error) {
      console.error("Add product error:", error);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await fetch(`/api/inventory/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedProduct)
      });
      if (res.ok) {
        setIsEditProductOpen(false);
        setSelectedProduct(null);
        fetchData();
      }
    } catch (error) {
      console.error("Update product error:", error);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await fetch(`/api/inventory/${selectedProduct.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustment)
      });
      if (res.ok) {
        setIsAdjustStockOpen(false);
        setSelectedProduct(null);
        setAdjustment({ quantity: 0, type: 'incoming', reference_id: '' });
        fetchData();
      }
    } catch (error) {
      console.error("Adjust stock error:", error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
        if (isTrackingOpen && selectedOrder?.id === orderId) {
          handleTrackOrder(selectedOrder);
        }
      }
    } catch (error) {
      console.error("Update order status error:", error);
    }
  };

  const handleTrackOrder = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const res = await fetch(`/api/orders/${order.id}/tracking`);
      if (res.ok) {
        const data = await res.json();
        setTrackingHistory(data);
        setIsTrackingOpen(true);
      }
    } catch (error) {
      console.error("Track order error:", error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        setIsCreateOrderOpen(false);
        setNewOrder({ customer_name: '', items: [] });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create order");
      }
    } catch (error) {
      console.error("Create order error:", error);
    }
  };

  const filteredInventory = inventory.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading ElectroFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white">ElectroFlow</h1>
            <p className="text-slate-400 text-sm mt-2">Inventory Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
              <input 
                required
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Enter username"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <input 
                required
                type="password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Enter password"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
                {loginError}
              </div>
            )}

            <button 
              disabled={isLoginLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoginLoading ? <RefreshCw className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-xs">
              Manager: admin / admin123<br/>
              Staff: staff / staff123
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-bottom border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Package size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">ElectroFlow</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<Package size={20} />} 
            label="Inventory" 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
          />
          <SidebarItem 
            icon={<ShoppingCart size={20} />} 
            label="Orders" 
            active={activeTab === 'orders'} 
            onClick={() => setActiveTab('orders')} 
          />
          <SidebarItem 
            icon={<MapIcon size={20} />} 
            label="Warehouse Map" 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
          />
          {user.role === 'manager' && (
            <SidebarItem 
              icon={<DatabaseIcon size={20} />} 
              label="Database" 
              active={activeTab === 'database'} 
              onClick={() => {
                setActiveTab('database');
                fetchDbData();
              }} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors group"
          >
            <ArrowUpRight className="rotate-180" size={20} />
            <span className="font-medium">Sign Out</span>
          </button>

          <button 
            onClick={generateAiInsights}
            disabled={isAiLoading}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors group"
          >
            <BrainCircuit size={20} className={cn(isAiLoading && "animate-pulse")} />
            <span className="font-medium">AI Insights</span>
            {isAiLoading && <RefreshCw size={14} className="ml-auto animate-spin" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab}</h1>
            <p className="text-slate-500">Welcome back, Electronics Inventory Manager</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search products, orders..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
              />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Filter size={20} className="text-slate-600" />
            </button>
            {((activeTab === 'inventory' && user.role === 'manager') || activeTab === 'orders') && (
              <button 
                onClick={() => activeTab === 'inventory' ? setIsAddProductOpen(true) : setIsCreateOrderOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                <Plus size={20} />
                <span className="font-medium">{activeTab === 'inventory' ? 'Add Product' : 'Create Order'}</span>
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Alerts Section */}
              {stats && (stats.lowStock > 0 || stats.outOfStock > 0) && (
                <div className="space-y-3">
                  {inventory.filter(p => p.quantity <= p.min_threshold).map(p => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={p.id} 
                      className={cn(
                        "p-4 rounded-2xl border flex items-center justify-between shadow-sm",
                        p.quantity === 0 
                          ? "bg-red-50 border-red-100 text-red-800" 
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          p.quantity === 0 ? "bg-red-200 text-red-700" : "bg-amber-200 text-amber-700"
                        )}>
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Stock Alert: {p.name} is going to run out</p>
                          <p className="text-xs opacity-80">Current Stock: {p.quantity} | Minimum Threshold: {p.min_threshold} | Rack: {p.rack_number}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsAdjustStockOpen(true);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          p.quantity === 0 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        )}
                      >
                        Restock Now
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total Products" 
                  value={stats?.totalProducts || 0} 
                  icon={<Package className="text-blue-600" />} 
                  trend="+12% from last month"
                />
                <StatCard 
                  title="Low Stock Alerts" 
                  value={stats?.lowStock || 0} 
                  icon={<AlertTriangle className="text-amber-600" />} 
                  color="amber"
                  trend="Immediate action required"
                />
                <StatCard 
                  title="Pending Orders" 
                  value={stats?.pendingOrders || 0} 
                  icon={<ShoppingCart className="text-indigo-600" />} 
                  trend="5 orders ready to ship"
                />
                <StatCard 
                  title="Out of Stock" 
                  value={stats?.outOfStock || 0} 
                  icon={<AlertTriangle className="text-red-600" />} 
                  color="red"
                  trend="Critical impact on sales"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 glass-panel p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Inventory Movement</h3>
                    <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventory.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Insights Panel */}
                <div className="glass-panel p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <BrainCircuit className="text-indigo-600" size={20} />
                    <h3 className="font-bold text-slate-800">Smart Insights</h3>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {aiInsights.length > 0 ? (
                      aiInsights.map((insight, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 text-sm">{insight.title}</span>
                              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">{insight.type}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                              insight.priority === 'High' ? "bg-red-100 text-red-700" : 
                              insight.priority === 'Medium' ? "bg-amber-100 text-amber-700" : 
                              "bg-blue-100 text-blue-700"
                            )}>
                              {insight.priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mt-1">{insight.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <BrainCircuit className="text-slate-400" size={24} />
                        </div>
                        <p className="text-sm text-slate-400">No insights yet. Click "AI Insights" to generate optimization tips.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="glass-panel overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                  <button className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Product</th>
                        <th className="px-6 py-3 font-semibold">Type</th>
                        <th className="px-6 py-3 font-semibold">Quantity</th>
                        <th className="px-6 py-3 font-semibold">Reference</th>
                        <th className="px-6 py-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats?.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{tx.product_name}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                              tx.type === 'incoming' ? "bg-emerald-100 text-emerald-700" : 
                              tx.type === 'outgoing' ? "bg-rose-100 text-rose-700" : 
                              "bg-slate-100 text-slate-700"
                            )}>
                              {tx.type === 'incoming' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{tx.quantity} units</td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{tx.reference_id}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{format(new Date(tx.created_at), 'MMM d, HH:mm')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Product Info</th>
                        <th className="px-6 py-4 font-semibold">Category</th>
                        <th className="px-6 py-4 font-semibold">Stock Level</th>
                        <th className="px-6 py-4 font-semibold">Location</th>
                        <th className="px-6 py-4 font-semibold">Rack</th>
                        <th className="px-6 py-4 font-semibold">Unit Price (₹)</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInventory.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{product.name}</span>
                              <span className="text-xs text-slate-400 font-mono">{product.sku}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-xs">
                                <span className={cn(
                                  "font-bold",
                                  product.quantity <= product.min_threshold ? "text-red-600" : "text-slate-700"
                                )}>
                                  {product.quantity} units
                                </span>
                                <span className="text-slate-400">Max: {product.max_threshold}</span>
                              </div>
                              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    product.quantity <= product.min_threshold ? "bg-red-500" : "bg-indigo-500"
                                  )}
                                  style={{ width: `${Math.min(100, (product.quantity / product.max_threshold) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-slate-300" />
                              {product.location}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                            {product.rack_number}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800">
                            ₹{product.unit_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setIsAdjustStockOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Adjust Stock"
                              >
                                <RefreshCw size={18} />
                              </button>
                              {user.role === 'manager' && (
                                <button 
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setIsEditProductOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Edit Product"
                                >
                                  <Code size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 border-l-4 border-l-indigo-500">
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Pending Fulfillment</h4>
                  <p className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'pending').length}</p>
                </div>
                <div className="glass-panel p-6 border-l-4 border-l-amber-500">
                  <h4 className="text-sm font-medium text-slate-500 mb-1">In Processing</h4>
                  <p className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'processing').length}</p>
                </div>
                <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Out for Delivery</h4>
                  <p className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'out_for_delivery').length}</p>
                </div>
              </div>

              {/* Order Lifecycle Diagram */}
              <div className="glass-panel p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <RefreshCw size={20} className="text-indigo-600" />
                  Standard Order Lifecycle
                </h3>
                <div className="relative flex justify-between items-center max-w-4xl mx-auto">
                  {/* Background Line */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                  
                  {[
                    { label: 'Pending', icon: <Package size={18} />, color: 'bg-slate-500' },
                    { label: 'Processing', icon: <RefreshCw size={18} />, color: 'bg-amber-500' },
                    { label: 'Shipped', icon: <Truck size={18} />, color: 'bg-blue-500' },
                    { label: 'Out for Delivery', icon: <MapPin size={18} />, color: 'bg-indigo-500' },
                    { label: 'Delivered', icon: <CheckCircle size={18} />, color: 'bg-emerald-500' }
                  ].map((step, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg",
                        step.color
                      )}>
                        {step.icon}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-900 whitespace-nowrap">{step.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Step 0{idx + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Order #</th>
                        <th className="px-6 py-4 font-semibold">Customer</th>
                        <th className="px-6 py-4 font-semibold">Items</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Total</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">{order.order_number}</td>
                          <td className="px-6 py-4 text-slate-800 font-medium">{order.customer_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{order.items}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider outline-none cursor-pointer border-none",
                                order.status === 'pending' ? "bg-slate-100 text-slate-600" : 
                                order.status === 'processing' ? "bg-amber-100 text-amber-700" : 
                                order.status === 'shipped' ? "bg-blue-100 text-blue-700" : 
                                order.status === 'out_for_delivery' ? "bg-indigo-100 text-indigo-700" :
                                order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                                "bg-rose-100 text-rose-700"
                              )}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">₹{order.total_amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleTrackOrder(order)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
                              >
                                Track <MapPin size={14} />
                              </button>
                              <button className="text-slate-400 hover:text-slate-600 font-medium text-sm flex items-center gap-1">
                                Details <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">3D Digital Twin Map</h2>
                  <p className="text-sm text-slate-500">Immersive spatial visualization of your electronics warehouse</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    3D ENGINE ACTIVE
                  </div>
                </div>
              </div>

              <WarehouseMap3D inventory={inventory} />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Zone A</h4>
                  <p className="text-sm font-bold text-slate-800">Computing & Mobile</p>
                  <p className="text-xs text-slate-500 mt-1">Laptops, Smartphones</p>
                </div>
                <div className="glass-panel p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Zone B</h4>
                  <p className="text-sm font-bold text-slate-800">Audio & Gaming</p>
                  <p className="text-xs text-slate-500 mt-1">Headphones, Consoles</p>
                </div>
                <div className="glass-panel p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Zone C</h4>
                  <p className="text-sm font-bold text-slate-800">Visual & Media</p>
                  <p className="text-xs text-slate-500 mt-1">Monitors, Cameras</p>
                </div>
                <div className="glass-panel p-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Zone D</h4>
                  <p className="text-sm font-bold text-slate-800">Infrastructure</p>
                  <p className="text-xs text-slate-500 mt-1">Networking, Wearables</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div 
              key="database"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <DatabaseIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Raw Database Explorer</h2>
                    <p className="text-sm text-slate-500">Direct view of SQLite tables and records</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={loadVisualPreviews}
                    disabled={isVisualLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    <LayoutDashboard size={18} className={cn(isVisualLoading && "animate-pulse")} />
                    <span>{isVisualLoading ? 'Generating Concepts...' : 'View Visual Concepts'}</span>
                  </button>
                  <button 
                    onClick={fetchDbData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw size={18} className={cn(isDbLoading && "animate-spin")} />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {visualPreviews.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {visualPreviews.map(v => (
                    <div key={v.id} className="glass-panel overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">
                          {v.id === '2d' ? '2D Blueprint Concept' : '3D Digital Twin Concept'}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">AI Generated</span>
                      </div>
                      <div className="aspect-video bg-slate-100 relative">
                        <img src={v.url} alt={v.id} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="p-4 bg-white text-xs text-slate-500 italic">
                        {v.id === '2d' 
                          ? "Top-down interactive map using Konva.js. Real-time stock levels reflected via color-coded zones." 
                          : "Immersive 3D environment using Three.js. Floating data tags provide instant SKU intelligence."}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="glass-panel p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <Package size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Analyze Warehouse Blueprint</h3>
                <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">
                  Upload a JPEG or PDF of your floor plan. ElectroFlow AI will identify zones, aisles, and racks to map your physical layout.
                </p>
                
                <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2">
                  <Plus size={20} />
                  <span>{isBlueprintLoading ? 'Analyzing...' : 'Upload Blueprint'}</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleBlueprintUpload}
                    disabled={isBlueprintLoading}
                  />
                </label>

                {isBlueprintLoading && (
                  <div className="mt-6 flex items-center gap-2 text-indigo-600 font-medium">
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Gemini is scanning your layout...</span>
                  </div>
                )}

                {blueprintAnalysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 w-full max-w-2xl text-left bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <BrainCircuit size={18} className="text-indigo-600" />
                      AI Layout Analysis
                    </h4>
                    <div className="markdown-body text-sm text-slate-600">
                      <Markdown>{blueprintAnalysis}</Markdown>
                    </div>
                    <button 
                      onClick={() => setBlueprintAnalysis(null)}
                      className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                    >
                      Clear Analysis
                    </button>
                  </motion.div>
                )}
              </div>

              {isDbLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : dbData ? (
                <div className="grid grid-cols-1 gap-8">
                  {Object.entries(dbData).map(([tableName, rows]: [string, any]) => (
                    <div key={tableName} className="glass-panel overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <Code size={16} className="text-slate-400" />
                        <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Table: {tableName}</h3>
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                          {rows.length} Records
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-white text-slate-400 border-b border-slate-100">
                            <tr>
                              {rows.length > 0 && Object.keys(rows[0]).map(col => (
                                <th key={col} className="px-4 py-3 font-semibold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {rows.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                {Object.values(row).map((val: any, j: number) => (
                                  <td key={j} className="px-4 py-2 text-slate-600 whitespace-nowrap">
                                    {val === null ? <span className="text-slate-300 italic">null</span> : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isTrackingOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Order Tracking</h3>
                  <p className="text-xs text-slate-500 mt-1">Order #{selectedOrder.order_number} • {selectedOrder.customer_name}</p>
                </div>
                <button onClick={() => setIsTrackingOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="relative space-y-8">
                  {/* Vertical Line */}
                  <div className="absolute top-2 bottom-2 left-4 w-0.5 bg-slate-100 z-0" />
                  
                  {trackingHistory.length > 0 ? (
                    trackingHistory.map((event, idx) => (
                      <div key={event.id} className="relative z-10 flex gap-6">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-4 border-white",
                          idx === 0 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          {event.status === 'delivered' ? <CheckCircle size={14} /> : 
                           event.status === 'shipped' ? <Truck size={14} /> : 
                           event.status === 'out_for_delivery' ? <MapPin size={14} /> :
                           <RefreshCw size={14} className={idx === 0 ? "animate-spin-slow" : ""} />}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex justify-between items-start">
                            <p className={cn(
                              "font-bold text-sm uppercase tracking-wider",
                              idx === 0 ? "text-indigo-600" : "text-slate-600"
                            )}>
                              {event.status.replace(/_/g, ' ')}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {event.notes}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-400 italic">No tracking history available yet.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsTrackingOpen(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isEditProductOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Edit Product</h3>
                <button onClick={() => setIsEditProductOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                    <input disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400" value={selectedProduct.sku} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                    <input required className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.name} onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.category} onChange={e => setSelectedProduct({...selectedProduct, category: e.target.value})}>
                      <option>Smartphones</option>
                      <option>Laptops</option>
                      <option>Audio</option>
                      <option>Monitors</option>
                      <option>Gaming</option>
                      <option>Wearables</option>
                      <option>Cameras</option>
                      <option>Networking</option>
                      <option>Accessories</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.location} onChange={e => setSelectedProduct({...selectedProduct, location: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Rack Number</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.rack_number} onChange={e => setSelectedProduct({...selectedProduct, rack_number: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Min Threshold</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.min_threshold} onChange={e => setSelectedProduct({...selectedProduct, min_threshold: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Max Threshold</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.max_threshold} onChange={e => setSelectedProduct({...selectedProduct, max_threshold: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit Price (₹)</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedProduct.unit_price} onChange={e => setSelectedProduct({...selectedProduct, unit_price: parseFloat(e.target.value)})} />
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Update Product</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAdjustStockOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Adjust Stock</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedProduct.name} ({selectedProduct.sku})</p>
                </div>
                <button onClick={() => setIsAdjustStockOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Adjustment Type</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    value={adjustment.type} 
                    onChange={e => setAdjustment({...adjustment, type: e.target.value as any})}
                  >
                    <option value="incoming">Stock In (+)</option>
                    <option value="outgoing">Stock Out (-)</option>
                    <option value="adjustment">Set Absolute (=)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    value={adjustment.quantity} 
                    onChange={e => setAdjustment({...adjustment, quantity: parseInt(e.target.value)})} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Current Stock: {selectedProduct.quantity}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Reason / Reference</label>
                  <input 
                    placeholder="e.g. Restock, Damage, Return"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    value={adjustment.reference_id} 
                    onChange={e => setAdjustment({...adjustment, reference_id: e.target.value})} 
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors">Apply Adjustment</button>
              </form>
            </motion.div>
          </div>
        )}
        {isAddProductOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Add New Product</h3>
                <button onClick={() => setIsAddProductOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                    <input required className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                    <input required className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                      <option>Smartphones</option>
                      <option>Laptops</option>
                      <option>Audio</option>
                      <option>Monitors</option>
                      <option>Gaming</option>
                      <option>Wearables</option>
                      <option>Cameras</option>
                      <option>Networking</option>
                      <option>Accessories</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.location} onChange={e => setNewProduct({...newProduct, location: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Rack Number</label>
                    <input className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.rack_number} onChange={e => setNewProduct({...newProduct, rack_number: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Qty</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Min</label>
                    <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.min_threshold} onChange={e => setNewProduct({...newProduct, min_threshold: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newProduct.unit_price} onChange={e => setNewProduct({...newProduct, unit_price: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Add Product</button>
              </form>
            </motion.div>
          </div>
        )}

        {isCreateOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Create New Order</h3>
                <button onClick={() => setIsCreateOrderOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label>
                  <input required className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" value={newOrder.customer_name} onChange={e => setNewOrder({...newOrder, customer_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Select Products</label>
                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-2">
                    {inventory.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium">{p.name} (Stock: {p.quantity})</span>
                        <input 
                          type="number" 
                          min="0" 
                          max={p.quantity}
                          placeholder="Qty"
                          className="w-16 px-2 py-1 border border-slate-200 rounded text-xs"
                          onChange={e => {
                            const qty = parseInt(e.target.value);
                            const items = [...newOrder.items];
                            const idx = items.findIndex(i => i.product_id === p.id);
                            if (qty > 0) {
                              if (idx > -1) items[idx].quantity = qty;
                              else items.push({ product_id: p.id, quantity: qty });
                            } else if (idx > -1) {
                              items.splice(idx, 1);
                            }
                            setNewOrder({...newOrder, items});
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Create Order</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="mb-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <BrainCircuit size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">ElectroFlow AI Assistant</h3>
                    <p className="text-[10px] text-indigo-100">Powered by Gemini</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!hasApiKey && (
                    <button 
                      onClick={handleOpenKeyDialog}
                      className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                    >
                      Connect Key
                    </button>
                  )}
                  <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageSquare size={24} />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">How can I help you today?</p>
                    <p className="text-xs text-slate-400 mt-1">Ask about stock levels, orders, or logistics advice.</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                    )}>
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-xs font-medium">AI is thinking...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
            isChatOpen ? "bg-slate-800 text-white" : "bg-indigo-600 text-white"
          )}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
        />
      )}
    </button>
  );
}

function StatCard({ title, value, icon, trend, color = 'indigo' }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, color?: 'indigo' | 'amber' | 'red' | 'blue' }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600"
  };

  return (
    <div className="stat-card">
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-xl", colors[color])}>
          {icon}
        </div>
        <button className="text-slate-300 hover:text-slate-500 transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="mt-4">
        <h4 className="text-slate-500 text-sm font-medium">{title}</h4>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-xs text-slate-400 font-medium">{trend}</span>
        </div>
      )}
    </div>
  );
}
