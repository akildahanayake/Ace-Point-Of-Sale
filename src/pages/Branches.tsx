import React, { useState, useEffect } from 'react';
import { Branch } from '../types';
import { posService } from '../services/posService';
import { 
  Plus, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle,
  Loader2,
  X,
  Edit2,
  Trash2,
  Power
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

const Branches: React.FC = () => {
  const { user, switchBranch, currentBranch } = useApp();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newBranch, setNewBranch] = useState({ 
    name: '', 
    address: '', 
    phone: '', 
    email: '', 
    isActive: true 
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const unsub = posService.subscribeToBranches((data) => {
      // Map is_active from DB to isActive for the UI
      const mapped = data.map((b: any) => ({
        ...b,
        isActive: b.is_active === 1 || b.is_active === true || b.isActive === true
      }));
      setBranches(mapped);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
      toast.error('Failed to load branches');
    });
    return () => unsub();
  }, []);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only admins can add branches');
      return;
    }
    try {
      await posService.addBranch(newBranch);
      setIsAddingBranch(false);
      setNewBranch({ name: '', address: '', phone: '', email: '', isActive: true });
      toast.success('Branch added successfully');
    } catch (error) {
      toast.error('Failed to add branch');
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    if (!isAdmin) {
      toast.error('Only admins can edit branches');
      return;
    }
    try {
      await posService.updateBranch(editingBranch.id, editingBranch);
      setEditingBranch(null);
      toast.success('Branch updated successfully');
    } catch (error) {
      toast.error('Failed to update branch');
    }
  };

  const toggleBranchStatus = async (branch: Branch) => {
    if (!isAdmin) {
      toast.error('Only admins can change branch status');
      return;
    }
    try {
      await posService.updateBranch(branch.id, { ...branch, isActive: !branch.isActive });
      toast.success(`Branch ${branch.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete branches');
      return;
    }
    if (!window.confirm('Are you sure you want to deactivate this branch?')) return;
    try {
      await posService.deleteBranch(id);
      toast.success('Branch deactivated');
    } catch (error) {
      toast.error('Failed to delete branch');
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Branches</h1>
          <p className="text-slate-500">Manage your business locations</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddingBranch(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Add Branch
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <motion.div 
            key={branch.id}
            whileHover={{ y: -4 }}
            className={cn(
              "bg-white p-6 rounded-3xl shadow-sm border transition-all space-y-4",
              currentBranch?.id === branch.id ? "border-indigo-600 ring-2 ring-indigo-50" : "border-slate-100"
            )}
          >
            <div className="flex justify-between items-start">
              <div className={cn(
                "p-3 rounded-2xl",
                branch.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
              )}>
                <Building2 size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                branch.isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {branch.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {branch.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-800">{branch.name}</h3>
              <div className="mt-4 space-y-2">
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-500">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone size={16} className="shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail size={16} className="shrink-0" />
                    <span>{branch.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex gap-2">
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setEditingBranch(branch)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Edit Branch"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => toggleBranchStatus(branch)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      branch.isActive ? "text-rose-400 hover:text-rose-600 hover:bg-rose-50" : "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                    )}
                    title={branch.isActive ? "Deactivate" : "Activate"}
                  >
                    <Power size={18} />
                  </button>
                </>
              )}
              <button 
                onClick={() => switchBranch(branch)}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-xl transition-colors",
                  currentBranch?.id === branch.id 
                    ? "bg-indigo-600 text-white" 
                    : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                )}
              >
                {currentBranch?.id === branch.id ? 'Current' : 'Select'}
              </button>
            </div>
          </motion.div>
        ))}
        {branches.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400">
            No branches found. Add your first location to get started.
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isAddingBranch || editingBranch) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h2>
                <button 
                  onClick={() => {
                    setIsAddingBranch(false);
                    setEditingBranch(null);
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={editingBranch ? handleUpdateBranch : handleAddBranch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                  <input 
                    required 
                    type="text" 
                    value={editingBranch ? editingBranch.name : newBranch.name} 
                    onChange={e => editingBranch 
                      ? setEditingBranch({...editingBranch, name: e.target.value})
                      : setNewBranch({...newBranch, name: e.target.value})
                    } 
                    className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea 
                    value={editingBranch ? editingBranch.address : newBranch.address} 
                    onChange={e => editingBranch
                      ? setEditingBranch({...editingBranch, address: e.target.value})
                      : setNewBranch({...newBranch, address: e.target.value})
                    } 
                    className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" 
                    rows={2} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input 
                      type="text" 
                      value={editingBranch ? editingBranch.phone : newBranch.phone} 
                      onChange={e => editingBranch
                        ? setEditingBranch({...editingBranch, phone: e.target.value})
                        : setNewBranch({...newBranch, phone: e.target.value})
                      } 
                      className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editingBranch ? editingBranch.email : newBranch.email} 
                      onChange={e => editingBranch
                        ? setEditingBranch({...editingBranch, email: e.target.value})
                        : setNewBranch({...newBranch, email: e.target.value})
                      } 
                      className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>
                {editingBranch && (
                  <div className="flex items-center gap-2 py-2">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={editingBranch.isActive}
                      onChange={e => setEditingBranch({...editingBranch, isActive: e.target.checked})}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active Branch</label>
                  </div>
                )}
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4">
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Branches;
