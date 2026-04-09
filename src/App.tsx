import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Accounts from './pages/Accounts';
import Customers from './pages/Customers';
import Branches from './pages/Branches';
import Settings from './pages/Settings';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';

const AppContent: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = React.useState('pos');

  if (!user) {
    return <Login />;
  }

  // If user is cashier, only show POS
  if (user.role === 'cashier') {
    return <POS />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'inventory': return <Inventory />;
      case 'accounts': return <Accounts />;
      case 'customers': return <Customers />;
      case 'branches': return <Branches />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  // For Admin/Manager, show sidebar + content
  // Except for POS which should be full screen
  if (activeTab === 'pos') {
    return (
      <div className="h-screen flex">
        <div className="fixed top-4 left-4 z-[60]">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-3 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all"
          >
            <SidebarIcon />
          </button>
        </div>
        <POS />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 lg:ml-[260px] transition-all duration-300 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const SidebarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
);

export default function App() {
  return (
    <AppProvider>
      <Toaster position="top-right" richColors />
      <AppContent />
    </AppProvider>
  );
}
