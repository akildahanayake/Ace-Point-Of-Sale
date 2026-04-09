import React, { useState, useEffect } from 'react';
import { Account, AccountTransaction } from '../types';
import { posService } from '../services/posService';
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  Search,
  Loader2,
  X,
  Calendar
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

const Accounts: React.FC = () => {
  const { currentBranch } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'cash' as const, balance: 0 });

  useEffect(() => {
    const unsub = posService.subscribeToAccounts((data) => {
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0]);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
      toast.error('Failed to load accounts');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      const unsub = posService.subscribeToTransactions(selectedAccount.id, setTransactions, (error) => {
        console.error(error);
        toast.error('Failed to load transactions');
      });
      return () => unsub();
    }
  }, [selectedAccount]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) {
      toast.error('Please select a branch first');
      return;
    }

    try {
      await posService.addAccount({
        ...newAccount,
        branch_id: currentBranch.id
      } as any);
      setIsAddingAccount(false);
      setNewAccount({ name: '', type: 'cash', balance: 0 });
      toast.success('Account created successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create account');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Accounts & Finance</h1>
          <p className="text-slate-500">Manage your cash, bank accounts and transactions</p>
        </div>
        <button 
          onClick={() => setIsAddingAccount(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          New Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map(account => (
          <motion.div 
            key={account.id}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedAccount(account)}
            className={cn(
              "bg-white p-8 rounded-[32px] shadow-sm border-2 relative overflow-hidden group cursor-pointer transition-all",
              selectedAccount?.id === account.id ? "border-indigo-600 shadow-indigo-100" : "border-slate-100 hover:border-slate-200"
            )}
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet size={80} />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "p-3 rounded-2xl",
                account.type === 'cash' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
              )}>
                <Wallet size={24} />
              </div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{account.type}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-1">{account.name}</h3>
            <p className="text-3xl font-black text-indigo-600">{formatCurrency(account.balance)}</p>

            <div className="mt-8 flex gap-2">
              <button className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                <History size={16} />
                History
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {selectedAccount ? `${selectedAccount.name} Transactions` : 'Recent Transactions'}
            </h2>
            <p className="text-sm text-slate-500">Transaction history for the selected account</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search transactions..." className="pl-10 pr-4 py-2 bg-slate-50 rounded-xl border-none text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-8 py-4 font-semibold">Date</th>
                <th className="px-8 py-4 font-semibold">Description</th>
                <th className="px-8 py-4 font-semibold text-right">Debit</th>
                <th className="px-8 py-4 font-semibold text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={14} />
                      {tx.createdAt?.toDate().toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="font-medium text-slate-800">{tx.description}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    {tx.debit > 0 && (
                      <span className="text-rose-600 font-bold">-{formatCurrency(tx.debit)}</span>
                    )}
                  </td>
                  <td className="px-8 py-4 text-right">
                    {tx.credit > 0 && (
                      <span className="text-emerald-600 font-bold">+{formatCurrency(tx.credit)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No transactions found for this account</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAddingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">New Account</h2>
                <button onClick={() => setIsAddingAccount(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddAccount} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Account Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Main Safe"
                    value={newAccount.name}
                    onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewAccount({...newAccount, type: 'cash'})}
                      className={cn(
                        "py-4 rounded-2xl font-bold border-2 transition-all",
                        newAccount.type === 'cash' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAccount({...newAccount, type: 'bank'})}
                      className={cn(
                        "py-4 rounded-2xl font-bold border-2 transition-all",
                        newAccount.type === 'bank' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      Bank
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Initial Balance</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={newAccount.balance}
                    onChange={e => setNewAccount({...newAccount, balance: parseFloat(e.target.value)})}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold text-indigo-600"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 mt-4 text-lg"
                >
                  Create Account
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accounts;
