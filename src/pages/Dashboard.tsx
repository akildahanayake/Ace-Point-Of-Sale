import React, { useState, useEffect } from 'react';
import { Sale, Product } from '../types';
import { posService } from '../services/posService';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSales = posService.subscribeToSales(setSales);
    const unsubProducts = posService.subscribeToProducts((prods) => {
      setProducts(prods);
      setLoading(false);
    });
    return () => {
      unsubSales();
      unsubProducts();
    };
  }, []);

  // Calculate stats
  const totalRevenue = sales.reduce((sum, sale) => {
    const val = parseFloat(sale.total as any);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const totalSales = sales.length;
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  const lowStockCount = products.filter(p => p.stock < 10).length;

  // Prepare chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const daySales = sales.filter(sale => {
      if (!sale.timestamp) return false;
      try {
        const saleDate = typeof sale.timestamp.toDate === 'function' 
          ? sale.timestamp.toDate() 
          : new Date(sale.timestamp as any);
        
        if (isNaN(saleDate.getTime())) return false;
        
        return isSameDay(saleDate, date);
      } catch (e) {
        return false;
      }
    });
    
    const revenue = daySales.reduce((sum, s) => {
      const val = parseFloat(s.total as any);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    return {
      name: format(date, 'MMM dd'),
      revenue: revenue,
      count: daySales.length
    };
  }).reverse();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
        <p className="text-slate-500">Here's what's happening with your store today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(totalRevenue)} 
          icon={DollarSign} 
          trend="+12.5%" 
          trendUp={true}
          color="indigo"
        />
        <StatCard 
          title="Total Sales" 
          value={totalSales.toString()} 
          icon={ShoppingBag} 
          trend="+5.2%" 
          trendUp={true}
          color="emerald"
        />
        <StatCard 
          title="Avg. Order Value" 
          value={formatCurrency(averageOrderValue)} 
          icon={TrendingUp} 
          trend="-2.1%" 
          trendUp={false}
          color="amber"
        />
        <StatCard 
          title="Low Stock Items" 
          value={lowStockCount.toString()} 
          icon={Users} 
          trend="Action needed" 
          trendUp={false}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Transactions</h3>
          <div className="space-y-4">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Order #{sale.id.slice(-4)}</p>
                    <p className="text-xs text-slate-500">
                      {(() => {
                        if (!sale.timestamp) return 'Just now';
                        try {
                          const date = typeof sale.timestamp.toDate === 'function' 
                            ? sale.timestamp.toDate() 
                            : new Date(sale.timestamp as any);
                          return format(date, 'HH:mm a');
                        } catch (e) {
                          return 'Just now';
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-slate-800">{formatCurrency(sale.total)}</p>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="py-10 text-center text-slate-400">
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp: boolean;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", colors[color])}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
};

import { cn } from '../lib/utils';
export default Dashboard;
