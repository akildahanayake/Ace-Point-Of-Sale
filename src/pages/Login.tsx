import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Mail, Store, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { posService } from '../services/posService';
import { User } from '../types';

const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('admin@vibepos.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showTester, setShowTester] = useState(false);

  React.useEffect(() => {
    // Fetch users for the testing selector
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/index.php?action=users');
        if (response.ok) {
          const data = await response.json();
          setAvailableUsers(data.map((u: any) => ({
            id: u.id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            password: u.password // We need this for the quick login
          })));
        }
      } catch (e) {
        console.error('Failed to fetch users for tester', e);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userData = await posService.login(email, password);
      login(userData);
      toast.success(`Welcome back, ${userData.name}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: User & { password?: string }) => {
    setEmail(user.email);
    setPassword(user.password || 'password');
    // Trigger login automatically
    setTimeout(() => {
      const form = document.querySelector('form');
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 mx-auto mb-6">
            <Store className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Ace Point Of Sale</h1>
          <p className="text-slate-400 mt-2">Sign in to manage your business</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                placeholder="admin@vibepos.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                Sign In
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            Demo Credentials: <span className="text-indigo-400">admin@vibepos.com / password</span>
          </p>

          {/* Testing Only: User Selector */}
          <div className="pt-6 border-t border-white/5">
            <button 
              onClick={() => setShowTester(!showTester)}
              className="text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
            >
              {showTester ? 'Hide Test Accounts' : 'Show Test Accounts (Testing Only)'}
            </button>
            
            <AnimatePresence>
              {showTester && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {availableUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickLogin(u)}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-all group"
                      >
                        <p className="text-xs font-bold text-white truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter group-hover:text-indigo-400">{u.role}</p>
                      </button>
                    ))}
                  </div>
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No users found in database</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
