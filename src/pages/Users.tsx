import React, { useState, useEffect } from 'react';
import { User, Branch } from '../types';
import { posService } from '../services/posService';
import { 
  Plus, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Building2, 
  Briefcase, 
  Hash,
  Edit2,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  Eye,
  EyeOff,
  User as UserIcon,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    name: '',
    email: '',
    role: 'cashier',
    phone: '',
    address: '',
    empNo: '',
    idNumber: '',
    username: '',
    password: '',
    joinedDate: new Date().toISOString().split('T')[0],
    branchIds: [],
    isActive: true
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const unsubUsers = posService.subscribeToUsers(setUsers);
    const unsubBranches = posService.subscribeToBranches(setBranches);
    setLoading(false);
    return () => {
      unsubUsers();
      unsubBranches();
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only admins can add users');
      return;
    }
    try {
      await posService.addUser(newUser);
      setIsAddingUser(false);
      setNewUser({
        name: '',
        email: '',
        role: 'cashier',
        phone: '',
        address: '',
        empNo: '',
        idNumber: '',
        username: '',
        password: '',
        joinedDate: new Date().toISOString().split('T')[0],
        branchIds: [],
        isActive: true
      });
      toast.success('User added successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!isAdmin) {
      toast.error('Only admins can edit users');
      return;
    }
    try {
      await posService.updateUser(editingUser.id, editingUser);
      setEditingUser(null);
      toast.success('User updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete users');
      return;
    }
    setDeletingUserId(id);
  };

  const confirmDelete = async () => {
    if (!deletingUserId) return;
    try {
      await posService.deleteUser(deletingUserId);
      setDeletingUserId(null);
      toast.success('User deleted');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const toggleBranch = (branchId: string, isEditing: boolean) => {
    if (isEditing && editingUser) {
      const branchIds = editingUser.branchIds.includes(branchId)
        ? editingUser.branchIds.filter(id => id !== branchId)
        : [...editingUser.branchIds, branchId];
      setEditingUser({ ...editingUser, branchIds });
    } else {
      const branchIds = newUser.branchIds.includes(branchId)
        ? newUser.branchIds.filter(id => id !== branchId)
        : [...newUser.branchIds, branchId];
      setNewUser({ ...newUser, branchIds });
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
          <h1 className="text-3xl font-bold text-slate-800">Users & Employees</h1>
          <p className="text-slate-500">Manage your team and their access</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddingUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <motion.div 
            key={u.id}
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm">
                  {u.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{u.name}</h3>
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    <Shield size={12} />
                    {u.role}
                  </div>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter",
                u.isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {u.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Hash size={16} className="shrink-0" />
                  <span className="font-medium">Emp No: {u.empNo || 'N/A'}</span>
                </div>
                {u.username && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <UserIcon size={16} className="shrink-0" />
                    <span>Username: {u.username}</span>
                  </div>
                )}
                {u.idNumber && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Shield size={16} className="shrink-0" />
                    <span>ID: {u.idNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={16} className="shrink-0" />
                  <span>Joined: {u.joinedDate || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail size={16} className="shrink-0" />
                  <span>{u.email}</span>
                </div>
              {u.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone size={16} className="shrink-0" />
                  <span>{u.phone}</span>
                </div>
              )}
              {u.address && (
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{u.address}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Assigned Branches</p>
              <div className="flex flex-wrap gap-1">
                {u.branchIds.map(bid => {
                  const branch = branches.find(b => b.id === bid);
                  return (
                    <span key={bid} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">
                      {branch?.name || 'Unknown'}
                    </span>
                  );
                })}
                {u.branchIds.length === 0 && <span className="text-xs text-slate-400 italic">No branches assigned</span>}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-slate-50 flex gap-2">
                <button 
                  onClick={() => setEditingUser(u)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteUser(u.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(isAddingUser || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button 
                  onClick={() => {
                    setIsAddingUser(false);
                    setEditingUser(null);
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormInput 
                      label="Full Name" 
                      value={editingUser ? editingUser.name : newUser.name} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, name: v}) : setNewUser({...newUser, name: v})} 
                    />
                    <FormInput 
                      label="Email Address" 
                      type="email"
                      value={editingUser ? editingUser.email : newUser.email} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, email: v}) : setNewUser({...newUser, email: v})} 
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select 
                        value={editingUser ? editingUser.role : newUser.role} 
                        onChange={e => {
                          const role = e.target.value as any;
                          editingUser ? setEditingUser({...editingUser, role}) : setNewUser({...newUser, role});
                        }}
                        className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                        <option value="waiter">Waiter</option>
                      </select>
                    </div>
                    <FormInput 
                      label="Employee Number" 
                      value={editingUser ? editingUser.empNo || '' : newUser.empNo || ''} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, empNo: v}) : setNewUser({...newUser, empNo: v})} 
                    />
                    <FormInput 
                      label="ID Number" 
                      value={editingUser ? editingUser.idNumber || '' : newUser.idNumber || ''} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, idNumber: v}) : setNewUser({...newUser, idNumber: v})} 
                    />
                    <FormInput 
                      label="User Name" 
                      value={editingUser ? editingUser.username || '' : newUser.username || ''} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, username: v}) : setNewUser({...newUser, username: v})} 
                    />
                    <div className="relative">
                      <FormInput 
                        label="Password" 
                        type={showPassword ? "text" : "password"}
                        value={editingUser ? editingUser.password || '' : newUser.password || ''} 
                        onChange={v => editingUser ? setEditingUser({...editingUser, password: v}) : setNewUser({...newUser, password: v})} 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[34px] text-slate-400 hover:text-indigo-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FormInput 
                      label="Joined Date" 
                      type="date"
                      value={editingUser ? editingUser.joinedDate || '' : newUser.joinedDate || ''} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, joinedDate: v}) : setNewUser({...newUser, joinedDate: v})} 
                    />
                  </div>
                  <div className="space-y-4">
                    <FormInput 
                      label="Phone Number" 
                      value={editingUser ? editingUser.phone || '' : newUser.phone || ''} 
                      onChange={v => editingUser ? setEditingUser({...editingUser, phone: v}) : setNewUser({...newUser, phone: v})} 
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                      <textarea 
                        value={editingUser ? editingUser.address || '' : newUser.address || ''} 
                        onChange={e => editingUser ? setEditingUser({...editingUser, address: e.target.value}) : setNewUser({...newUser, address: e.target.value})} 
                        className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Branches</label>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                        {branches.map(branch => (
                          <label key={branch.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={editingUser ? editingUser.branchIds.includes(branch.id) : newUser.branchIds.includes(branch.id)}
                              onChange={() => toggleBranch(branch.id, !!editingUser)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-slate-600">{branch.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <input 
                        type="checkbox" 
                        id="isActiveUser"
                        checked={editingUser ? editingUser.isActive : newUser.isActive}
                        onChange={e => editingUser ? setEditingUser({...editingUser, isActive: e.target.checked}) : setNewUser({...newUser, isActive: e.target.checked})}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="isActiveUser" className="text-sm font-medium text-slate-700">Active Employee</label>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4">
                  {editingUser ? 'Update User Details' : 'Create User Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingUserId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Delete User?</h2>
              <p className="text-slate-500 mb-8">
                Are you sure you want to delete this user? This action cannot be undone and will remove all their records.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingUserId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormInput: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input 
      required 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" 
    />
  </div>
);

export default UsersPage;
