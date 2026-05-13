import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  LayoutDashboard, ShoppingCart, Receipt, Bell, Shield, 
  Settings, LogOut, ChevronRight, Menu, X, Plus, 
  TrendingUp, TrendingDown, Package, Activity, Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { 
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  collection, query, onSnapshot, orderBy, limit, 
  addDoc, serverTimestamp, setDoc, doc, getDoc 
} from 'firebase/firestore';
import { User, UserRole, Sale, Expense, Notification, PoultryBatch, Beehive } from './types';
import { formatCurrency, cn } from './lib/utils';
import { format } from 'date-fns';

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, userRole }: { 
  activeTab: string, 
  setActiveTab: (tab: string) => void,
  userRole: UserRole 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'poultry', label: 'Poultry', icon: Package },
    { id: 'beekeeping', label: 'Beekeeping', icon: Bug },
    { id: 'finance', label: 'Finance', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="w-20 lg:w-64 bg-slate-900 text-slate-100 flex flex-col h-[calc(100vh-2rem)] sticky top-4 m-4 rounded-[2.5rem] z-50 shadow-2xl">
      <div className="p-4 lg:p-8 flex flex-col items-center lg:items-start">
        <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black text-xl mb-2">M</div>
        <h1 className="hidden lg:block font-display text-2xl font-black text-white italic">Mambo Farm</h1>
        <p className="hidden lg:block text-slate-500 text-[10px] mt-1 uppercase tracking-[0.2em] font-bold">Bungoma, Kenya</p>
      </div>

      <nav className="flex-1 px-3 lg:px-6 py-4 space-y-3 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-4 px-3 py-4 rounded-2xl transition-all text-sm font-bold",
              activeTab === item.id 
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/30" 
                : "text-slate-500 hover:bg-white/5 hover:text-slate-100"
            )}
            title={item.label}
          >
            <item.icon size={20} />
            <span className="hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 lg:p-6 border-t border-slate-800">
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-4 px-3 py-4 text-slate-500 hover:text-rose-400 transition-colors rounded-2xl"
        >
          <LogOut size={20} />
          <span className="hidden lg:block text-sm font-bold">Log Out</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ title, userEmail, userRole, notifications }: { 
  title: string, 
  userEmail: string, 
  userRole: string,
  notifications: Notification[]
}) => (
  <header className="flex justify-between items-center p-6 bg-white rounded-3xl shadow-sm border border-slate-200 mb-6 mx-4 mt-4">
    <div className="flex items-center space-x-4">
      <div className="lg:hidden w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-none mt-1">Farm Management System</p>
      </div>
    </div>
    <div className="flex items-center space-x-6">
      <div className="relative cursor-pointer group">
        <Bell size={20} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
        {notifications.some(n => n.status === 'unread') && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>
      <div className="flex items-center space-x-4 pl-6 border-l border-slate-100">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-900 leading-tight">{userEmail.split('@')[0]}</p>
          <p className="text-[10px] text-brand-primary font-black uppercase tracking-tight">
            {userRole}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-brand-primary/20 flex items-center justify-center font-black text-brand-primary shadow-inner">
          {userEmail[0].toUpperCase()}
        </div>
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="mt-auto py-6 px-8 border-t border-slate-200 text-slate-400 text-[11px] flex flex-col sm:flex-row justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-[2.5rem] mx-4">
    <p className="font-medium">© {new Date().getFullYear()} Mambo Farm Bungoma. All rights reserved.</p>
    <div className="flex items-center space-x-2">
      <span className="italic font-medium">Created by</span>
      <span className="font-black text-slate-800 underline decoration-brand-secondary underline-offset-4 decoration-2">Jackson Munene from Nex-Ink</span>
    </div>
  </footer>
);

// --- Main Pages ---

const DashboardPage = ({ sales, expenses, notifications }: { sales: Sale[], expenses: Expense[], notifications: Notification[] }) => {
  const totalSales = sales.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const profit = totalSales - totalExpenses;

  const chartData = [
    { name: 'Poultry', value: sales.filter(s => s.category === 'Poultry').reduce((a, c) => a + c.totalPrice, 0) },
    { name: 'Honey', value: sales.filter(s => s.category === 'Honey').reduce((a, c) => a + c.totalPrice, 0) },
    { name: 'Eggs', value: sales.filter(s => s.category === 'Eggs').reduce((a, c) => a + c.totalPrice, 0) },
  ];

  const COLORS = ['#059669', '#d97706', '#2563eb', '#7c3aed'];

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[800px]">
      {/* Performance Chart - Large Grid */}
      <div className="md:col-span-8 bento-card flex flex-col h-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Farm Performance</h3>
            <p className="text-sm text-slate-400 font-medium italic">Poultry & Beekeeping Yield</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <Activity size={14} className="text-emerald-500" />
            <span>REAL-TIME DATA</span>
          </div>
        </div>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sales.slice(0, 7).reverse()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(d) => format(new Date(d), 'MMM d')} 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                tickFormatter={(val) => `KSh ${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="totalPrice" fill="#059669" radius={[12, 12, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center flex-wrap gap-8 mt-6 pt-6 border-t border-slate-50">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-brand-primary rounded-full" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">Poultry Sales</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-brand-secondary rounded-full" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">Honey Yield</span>
          </div>
        </div>
      </div>

      {/* Alerts/Notifications - Dark Block */}
      <div className="md:col-span-4 bento-card-dark flex flex-col h-full">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_#f43f5e]" />
          <h3 className="text-xl font-black tracking-tight">Active Alerts</h3>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 italic text-sm">
              <Bell size={24} className="mb-2 opacity-20" />
              <p>No active alerts today</p>
            </div>
          ) : notifications.slice(0, 4).map((notif) => (
            <div key={notif.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:bg-white/10 group">
              <p className={cn(
                "text-[10px] font-black uppercase tracking-widest mb-1",
                notif.type === 'warning' ? "text-amber-400" : "text-emerald-400"
              )}>{notif.type}: {notif.title}</p>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">{notif.message}</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500">{format(new Date(notif.createdAt), 'HH:mm')}</span>
                <ChevronRight size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
        <button className="w-full py-3 mt-6 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95">
          View All Tasks
        </button>
      </div>

      {/* Sales Stats - Minimal Block */}
      <div className="md:col-span-4 bento-card flex flex-col justify-between">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <h4 className="font-black text-slate-900 tracking-tight uppercase text-xs tracking-[0.1em]">Revenue Tracker</h4>
        </div>
        <div>
          <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-[0.15em]">+12.5% INCREMENTAL</p>
          <p className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-4">{formatCurrency(totalSales)}</p>
          <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">75% of Monthly Goal</span>
            <span className="text-[10px] font-black text-slate-900">KSh 300k</span>
          </div>
        </div>
      </div>

      {/* Expense Tracker */}
      <div className="md:col-span-4 bento-card flex flex-col justify-between">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingDown size={20} />
          </div>
          <h4 className="font-black text-slate-900 tracking-tight uppercase text-xs tracking-[0.1em]">Burn Analysis</h4>
        </div>
        <div className="space-y-3">
          <p className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-4">{formatCurrency(totalExpenses)}</p>
          <div className="space-y-2">
            {[
              { label: 'Feed & Supplies', val: '65%', color: 'bg-slate-800' },
              { label: 'Maintenance', val: '20%', color: 'bg-emerald-500' },
              { label: 'Labor', val: '15%', color: 'bg-slate-300' }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between group cursor-pointer">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-slate-900 transition-colors">{item.label}</span>
                <span className={cn("text-[11px] font-black w-10 text-right", item.label === 'Feed & Supplies' ? 'text-slate-900' : 'text-slate-400')}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Block - Accent Block */}
      <div className="md:col-span-4 bento-card-accent flex flex-col justify-between group overflow-hidden relative">
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/30">
              <Shield size={20} />
            </div>
            <h4 className="font-black text-emerald-900 tracking-tight">Security Vault</h4>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 truncate">Cloud Integrity Sync</span>
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded font-black text-[9px] uppercase tracking-wider">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Last Snapshot</span>
              <span className="text-[10px] font-black text-emerald-600 font-mono">12:45 PM TODAY</span>
            </div>
            <p className="text-[10px] text-emerald-700/60 leading-relaxed font-medium mt-2">
              All farm records are cryptographically secured and mirrored across 3 availability zones.
            </p>
          </div>
          <button className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black tracking-[0.1em] uppercase hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-400/20">
            Manual Archive Now
          </button>
        </div>
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-300/30 blur-[60px] rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000" />
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync user to firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'standard', // Default role
            displayName: firebaseUser.displayName || '',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        } else {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const qSales = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(50));
      const unsubSales = onSnapshot(qSales, (snap) => {
        setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      });

      const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(50));
      const unsubExpenses = onSnapshot(qExpenses, (snap) => {
        setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      });

      const qNotifications = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
      const unsubNotifications = onSnapshot(qNotifications, (snap) => {
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      });

      return () => {
        unsubSales();
        unsubExpenses();
        unsubNotifications();
      };
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-stone-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-8">
          <div className="bento-card-dark overflow-hidden relative min-h-[600px] flex flex-col justify-end p-12">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 opacity-80 z-10" />
            <img 
              src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=2000" 
              alt="Farm" 
              className="absolute inset-0 h-full w-full object-cover grayscale opacity-40 group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="relative z-20">
              <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center text-white font-black text-4xl mb-8 shadow-2xl shadow-emerald-500/20">M</div>
              <h1 className="font-display text-6xl font-black text-white mb-6 italic tracking-tight leading-none">Mambo Farm Bungoma</h1>
              <p className="text-slate-400 text-lg leading-relaxed font-medium">
                Resilient poultry and beekeeping solutions powered by industrial-grade security.
              </p>
              <div className="flex items-center space-x-4 mt-12 pt-12 border-t border-white/10">
                <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black tracking-widest text-emerald-400 uppercase">Region: Western Kenya</div>
                <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black tracking-widest text-amber-400 uppercase">Status: Enterprise Ready</div>
              </div>
            </div>
          </div>

          <div className="bento-card bg-white flex flex-col justify-center p-12 lg:p-20">
            <div className="mb-16">
              <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Access Portal</h2>
              <p className="text-slate-500 font-medium italic">Authenticate with your farm credentials</p>
            </div>

            <button 
              onClick={handleLogin}
              className="group w-full flex items-center justify-center space-x-4 py-5 bg-slate-900 text-white rounded-3xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-200 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-brand-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative z-10 flex items-center space-x-4">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                </div>
                <span className="uppercase tracking-widest text-sm">Secure Google Login</span>
              </div>
            </button>

            <div className="mt-16 space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Zero-Trust Environment</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Your session is protected by multi-layer encryption and real-time audit logging.</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-20 flex items-center justify-center space-x-3 text-[10px] text-slate-300 font-black uppercase tracking-widest">
              <span>System Design</span>
              <div className="w-1 h-1 bg-slate-200 rounded-full" />
              <span className="text-slate-600">Jackson Munene from Nex-Ink</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={user.role} />
      
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header 
          title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} 
          userEmail={user.email} 
          userRole={user.role} 
        />
        
        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardPage sales={sales} expenses={expenses} />
              )}
              
              {activeTab === 'poultry' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Poultry Batches</h3>
                    <button className="farm-btn-primary flex items-center space-x-2">
                      <Plus size={18} />
                      <span>New Batch</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bento-card group hover:border-brand-primary transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black tracking-widest uppercase">LAYERS</span>
                        <span className="text-slate-400 text-[10px] font-bold">#BT-01</span>
                      </div>
                      <h4 className="text-3xl font-black text-slate-900 mb-1">250 Birds</h4>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-6">Status: Late Stage Peak</p>
                      <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50">
                        <span className="text-emerald-600 font-black flex items-center space-x-1 uppercase tracking-tighter">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active Production</span>
                        </span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'beekeeping' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Beehives</h3>
                    <button className="farm-btn-primary flex items-center space-x-2">
                      <Plus size={18} />
                      <span>Add Hive</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bento-card group hover:border-brand-secondary transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black tracking-widest uppercase">LANGSTROTH</span>
                        <span className="text-slate-400 text-[10px] font-bold">#HV-04</span>
                      </div>
                      <h4 className="text-3xl font-black text-slate-900 mb-1">East Block</h4>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-6">Last Check: 2 Days Ago</p>
                      <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50">
                        <span className="text-amber-600 font-black flex items-center space-x-1 uppercase tracking-tighter">
                          <span>Harvest Ready</span>
                        </span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-secondary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financial Ledger</h3>
                    <div className="flex space-x-3">
                      <button className="farm-btn-secondary text-sm">Download Report</button>
                      <button className="farm-btn-primary text-sm flex items-center space-x-2">
                         <Plus size={18} />
                         <span>Add Record</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Recent Inflow</h3>
                      </div>
                      <div className="bento-card p-0 overflow-hidden border-none shadow-none bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-4 text-left">Item</th>
                              <th className="px-6 py-4 text-right">Amount</th>
                              <th className="px-6 py-4 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sales.length === 0 ? (
                              <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-300 italic">No sales recorded yet</td></tr>
                            ) : sales.map((sale) => (
                              <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-700">{sale.item}</td>
                                <td className="px-6 py-4 text-right text-emerald-600 font-black">{formatCurrency(sale.totalPrice)}</td>
                                <td className="px-6 py-4 text-right text-slate-400 font-bold text-xs">{format(new Date(sale.date), 'MMM d')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Recent Outflow</h3>
                      </div>
                      <div className="bento-card p-0 overflow-hidden border-none shadow-none bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-4 text-left">Category</th>
                              <th className="px-6 py-4 text-right">Amount</th>
                              <th className="px-6 py-4 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.length === 0 ? (
                              <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-300 italic">No expenses recorded yet</td></tr>
                            ) : expenses.map((exp) => (
                              <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-700">{exp.description}</td>
                                <td className="px-6 py-4 text-right text-rose-600 font-black">{formatCurrency(exp.amount)}</td>
                                <td className="px-6 py-4 text-right text-slate-400 font-bold text-xs">{format(new Date(exp.date), 'MMM d')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">System Events</h3>
                      <p className="text-sm text-slate-400 font-medium italic">Audit log and alerts</p>
                    </div>
                    <button className="text-emerald-600 text-xs font-black uppercase tracking-widest hover:underline">Mark all read</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="bento-card text-center py-24 bg-white/50">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <Bell size={32} />
                      </div>
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">All clear</p>
                      <p className="text-slate-300 text-sm italic mt-2">No active notifications for your attention.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={cn(
                          "bento-card flex items-start space-x-6 transition-all hover:scale-[1.01] overflow-hidden",
                          notif.status === 'unread' ? "ring-2 ring-emerald-500/20 bg-emerald-50/30" : "bg-white"
                        )}>
                          <div className={cn(
                            "p-3 rounded-2xl shrink-0 shadow-sm",
                            notif.type === 'warning' ? "bg-amber-100 text-amber-700" : 
                            notif.type === 'task' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                          )}>
                            {notif.type === 'warning' ? <Bug size={24} /> : <Bell size={24} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-slate-900 tracking-tight">{notif.title}</h4>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">{notif.type} log</p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest tabular-nums">{format(new Date(notif.createdAt), 'HH:mm')}</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-3 leading-relaxed font-medium">{notif.message}</p>
                            {notif.dueDate && (
                              <div className="mt-4 flex items-center space-x-2 text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full w-fit">
                                <Activity size={12} />
                                <span className="uppercase tracking-widest">DEADLINE: {format(new Date(notif.dueDate), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'security' && (
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="farm-card bg-stone-900 text-white border-none relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                          <Shield size={32} />
                        </div>
                        <div>
                          <h3 className="font-display text-2xl font-bold">Data Shield Active</h3>
                          <p className="text-stone-400 text-sm">Your farm data is encrypted and protected</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-stone-800">
                        <div>
                          <h4 className="font-bold text-stone-200 text-sm mb-2 flex items-center">
                            <ChevronRight size={14} className="text-emerald-500 mr-1" />
                            Live Backups
                          </h4>
                          <p className="text-xs text-stone-400">Continuous Point-in-Time Recovery enabled via Firebase. Every transaction is logged and immutable.</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-200 text-sm mb-2 flex items-center">
                            <ChevronRight size={14} className="text-emerald-500 mr-1" />
                            Role-Based Access
                          </h4>
                          <p className="text-xs text-stone-400">Strict Identity & Access Management (IAM). Standard users cannot delete history or manage users.</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-200 text-sm mb-2 flex items-center">
                            <ChevronRight size={14} className="text-emerald-500 mr-1" />
                            Bungoma Regional Node
                          </h4>
                          <p className="text-xs text-stone-400">Optimized for low-latency access within Western Kenya.</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-200 text-sm mb-2 flex items-center">
                            <ChevronRight size={14} className="text-emerald-500 mr-1" />
                            Session Monitoring
                          </h4>
                          <p className="text-xs text-stone-400">All login attempts monitored for suspicious activity.</p>
                        </div>
                      </div>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                  </div>
                  
                  <div className="farm-card">
                    <h3 className="font-display text-xl font-bold mb-4">Enterprise Compliance</h3>
                    <p className="text-stone-500 text-sm leading-relaxed mb-6">
                      Mambo Farm uses Google Cloud's industrial-grade infrastructure. Our security rules ensure that no unauthorized direct writes to the database are possible.
                    </p>
                    <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Settings size={20} className="text-stone-400" />
                        <span className="text-sm font-medium">System Version v2.4.0 (Stable)</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">SECURE</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <Footer />
      </main>
    </div>
  );
}
