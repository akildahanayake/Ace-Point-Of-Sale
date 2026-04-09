import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Store,
  Users,
  Building2,
  Wallet
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'pos', icon: ShoppingCart, label: 'Point of Sale' },
    { id: 'branches', icon: Building2, label: 'Branches' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'accounts', icon: Wallet, label: 'Accounts' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 260 : 80,
          x: isOpen ? 0 : (window.innerWidth < 1024 ? -260 : 0)
        }}
        className={cn(
          "fixed left-0 top-0 h-full bg-slate-900 text-white z-40 transition-all duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none",
          !isOpen && "items-center"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <Store className="text-white" size={24} />
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-xl tracking-tight whitespace-nowrap"
              >
                Ace Point Of Sale
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                activeTab === item.id 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={22} className={cn(
                "shrink-0",
                activeTab === item.id ? "text-white" : "group-hover:text-indigo-400"
              )} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium"
                >
                  {item.label}
                </motion.span>
              )}
              {!isOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

      </motion.aside>
    </>
  );
};

export default Sidebar;
