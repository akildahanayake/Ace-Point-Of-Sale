import React from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Receipt, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface EntryGateProps {
  onEnter?: () => void;
}

const EntryGate: React.FC<EntryGateProps> = ({ onEnter }) => {
  const { currentBranch, branches, switchBranch, user, logout, activeWorkPeriod, startWorkPeriod } = useApp();

  const availableBranches = user?.role === 'admin' 
    ? branches 
    : branches.filter(b => user?.branchIds.includes(b.id));

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] p-12 w-full max-w-lg text-center shadow-2xl"
      >
        <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Receipt className="text-indigo-600" size={48} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 mb-4">
          {!activeWorkPeriod || activeWorkPeriod.status === 'closed' ? 'Work Period Required' : 'Ready to Sell'}
        </h1>
        
        <div className="mb-8 text-left">
          <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Select Branch</label>
          <div className="grid grid-cols-1 gap-2">
            {availableBranches.map(branch => (
              <button
                key={branch.id}
                onClick={() => switchBranch(branch)}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all",
                  currentBranch?.id === branch.id 
                    ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md" 
                    : "border-slate-100 hover:border-indigo-200 text-slate-600"
                )}
              >
                <div className="flex items-center gap-3">
                  <Building2 size={20} />
                  <span className="font-bold">{branch.name}</span>
                </div>
                {currentBranch?.id === branch.id && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        {!activeWorkPeriod || activeWorkPeriod.status === 'closed' ? (
          <button
            onClick={startWorkPeriod}
            disabled={!currentBranch}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-6 rounded-3xl shadow-xl shadow-indigo-200 transition-all text-xl"
          >
            Start Work Period
          </button>
        ) : (
          <button
            onClick={onEnter}
            disabled={!currentBranch}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-6 rounded-3xl shadow-xl shadow-emerald-200 transition-all text-xl flex items-center justify-center gap-3"
          >
            <ShoppingCart size={24} />
            {(user?.role === 'cashier' || user?.role === 'waiter') ? 'View POS' : 'Enter Dashboard'}
          </button>
        )}

        <button 
          onClick={logout}
          className="mt-6 text-slate-400 font-bold hover:text-rose-500 transition-colors"
        >
          Switch Account
        </button>
      </motion.div>
    </div>
  );
};

export default EntryGate;
