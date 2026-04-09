import React, { useState, useEffect } from 'react';
import { posService } from '../services/posService';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Database, 
  Smartphone,
  Save,
  ChevronRight,
  ArrowLeft,
  Printer,
  Key,
  Download,
  Upload,
  RefreshCw,
  Mail,
  MessageSquare,
  AlertCircle,
  X,
  Monitor,
  Clock,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';

type SettingsTab = 'main' | 'general' | 'database' | 'security' | 'notifications' | 'devices';

const Settings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('main');

  const renderSubContent = () => {
    switch (activeSubTab) {
      case 'general': return <GeneralSettings onBack={() => setActiveSubTab('main')} />;
      case 'database': return <DatabaseSettings onBack={() => setActiveSubTab('main')} />;
      case 'security': return <SecuritySettings onBack={() => setActiveSubTab('main')} />;
      case 'notifications': return <NotificationSettings onBack={() => setActiveSubTab('main')} />;
      case 'devices': return <DeviceSettings onBack={() => setActiveSubTab('main')} />;
      default: return (
        <div className="grid grid-cols-1 gap-6">
          <SettingsSection 
            icon={Globe} 
            title="General Settings" 
            description="Company name, currency, and localization"
            onClick={() => setActiveSubTab('general')}
          />
          <SettingsSection 
            icon={Database} 
            title="Database & Backup" 
            description="Manage your data and export backups"
            onClick={() => setActiveSubTab('database')}
          />
          <SettingsSection 
            icon={Shield} 
            title="Security & Roles" 
            description="User permissions and access control"
            onClick={() => setActiveSubTab('security')}
          />
          <SettingsSection 
            icon={Bell} 
            title="Notifications" 
            description="Configure alerts and system messages"
            onClick={() => setActiveSubTab('notifications')}
          />
          <SettingsSection 
            icon={Smartphone} 
            title="Device Management" 
            description="Manage connected terminals and printers"
            onClick={() => setActiveSubTab('devices')}
          />
        </div>
      );
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'main' && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
              <p className="text-slate-500">Configure your POS system and preferences</p>
            </div>
          )}
          {renderSubContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const GeneralSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyTrn: '',
    address: '',
    phone: '',
    email: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    currencyName: 'US Dollar',
    currencySign: '$',
    currencyPrefix: true,
    taxPercentage: 10,
    serviceCharge: 0
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await posService.getSettings();
        if (data && data.id) {
          setFormData({
            companyName: data.company_name || '',
            companyTrn: data.company_trn || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            whatsapp: data.whatsapp || '',
            facebook: data.facebook || '',
            instagram: data.instagram || '',
            currencyName: data.currency_name || 'US Dollar',
            currencySign: data.currency_sign || '$',
            currencyPrefix: data.currency_prefix === 1,
            taxPercentage: data.tax_percentage || 0,
            serviceCharge: data.service_charge || 0
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await posService.updateSettings({
        company_name: formData.companyName,
        company_trn: formData.companyTrn,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        whatsapp: formData.whatsapp,
        facebook: formData.facebook,
        instagram: formData.instagram,
        currency_name: formData.currencyName,
        currency_sign: formData.currencySign,
        currency_prefix: formData.currencyPrefix ? 1 : 0,
        tax_percentage: formData.taxPercentage,
        service_charge: formData.serviceCharge
      });
      toast.success('General settings saved successfully');
      onBack();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">General Settings</h2>
      </div>

      <div className="space-y-8">
        {/* Company Information */}
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Company Name</label>
              <input 
                type="text" 
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Company TRN Number</label>
              <input 
                type="text" 
                placeholder="Tax Registration Number"
                value={formData.companyTrn}
                onChange={(e) => setFormData({...formData, companyTrn: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Physical Address</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Telephone</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">WhatsApp Number</label>
              <input 
                type="tel" 
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Social Media */}
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4">Social Media Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Facebook URL</label>
              <input 
                type="url" 
                placeholder="https://facebook.com/..."
                value={formData.facebook}
                onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Instagram URL</label>
              <input 
                type="url" 
                placeholder="https://instagram.com/..."
                value={formData.instagram}
                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Currency & Localization */}
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4">Currency Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Currency Name</label>
              <input 
                type="text" 
                placeholder="e.g. US Dollar"
                value={formData.currencyName}
                onChange={(e) => setFormData({...formData, currencyName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Currency Sign</label>
              <input 
                type="text" 
                placeholder="e.g. $"
                value={formData.currencySign}
                onChange={(e) => setFormData({...formData, currencySign: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Position</label>
              <select 
                value={formData.currencyPrefix ? 'prefix' : 'suffix'}
                onChange={(e) => setFormData({...formData, currencyPrefix: e.target.value === 'prefix'})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="prefix">Prefix ($ 100)</option>
                <option value="suffix">Suffix (100 $)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Tax & Charges */}
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4">Tax & Service Charges</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Tax Percentage (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={formData.taxPercentage}
                  onChange={(e) => setFormData({...formData, taxPercentage: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Service Charge (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={formData.serviceCharge}
                  onChange={(e) => setFormData({...formData, serviceCharge: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </section>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white font-bold py-5 rounded-3xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50"
        >
          {saving ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
          {saving ? 'Saving Settings...' : 'Save All General Settings'}
        </button>
      </div>
    </div>
  );
};

const DatabaseSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showRestoreWarning, setShowRestoreWarning] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [backupType, setBackupType] = useState<'json' | 'sql'>('json');

  const handleExport = async (type: 'json' | 'sql') => {
    setIsExporting(true);
    try {
      if (type === 'json') {
        const data = await posService.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pos_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const sql = await posService.exportSql();
        const blob = new Blob([sql], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pos_backup_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success(`${type.toUpperCase()} Backup generated and downloaded successfully`);
    } catch (error) {
      toast.error('Failed to generate backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSql = file.name.endsWith('.sql');
    setBackupType(isSql ? 'sql' : 'json');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (isSql) {
          setPendingBackupData(content);
        } else {
          setPendingBackupData(JSON.parse(content));
        }
        setShowRestoreWarning(true);
      } catch (error) {
        toast.error('Invalid backup file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!pendingBackupData) return;
    setIsImporting(true);
    setShowRestoreWarning(false);
    try {
      if (backupType === 'json') {
        await posService.importData(pendingBackupData);
      } else {
        await posService.importSql(pendingBackupData);
      }
      toast.success('System restored successfully. Refreshing...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast.error('Failed to restore system');
    } finally {
      setIsImporting(false);
      setPendingBackupData(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Database & Backup</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
            <Download size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Export Data</h3>
          <p className="text-slate-500 text-sm">Download a full backup of your system data.</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
              JSON
            </button>
            <button 
              onClick={() => handleExport('sql')}
              disabled={isExporting}
              className="py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
              SQL
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
            <Upload size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Import Data</h3>
          <p className="text-slate-500 text-sm">Restore your system from a JSON or SQL backup file.</p>
          <label className="w-full py-3 border-2 border-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
            {isImporting ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
            Upload Backup File
            <input type="file" accept=".json,.sql" onChange={handleFileSelect} className="hidden" disabled={isImporting} />
          </label>
        </div>
      </div>

      <AnimatePresence>
        {showRestoreWarning && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Restore System?</h2>
              <p className="text-slate-500 mb-8">
                <strong>Warning:</strong> This will overwrite ALL current data with the data from the backup file. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowRestoreWarning(false);
                    setPendingBackupData(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRestore}
                  className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200"
                >
                  Restore Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SecuritySettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Security & Roles</h2>
      </div>

      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Password Policy</h3>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Key size={20} className="text-slate-400" />
              <span className="font-medium text-slate-700">Require 2FA for Admins</span>
            </div>
            <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Active Sessions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl">
              <div>
                <p className="font-bold text-slate-800 text-sm">Chrome on MacOS</p>
                <p className="text-xs text-slate-400">Current Session • 192.168.1.1</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useApp();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    lowStock: true,
    dailyReport: true,
    newCustomer: false,
    systemUpdates: true,
    shiftReminders: true,
    orderConfirmations: true,
    loyaltyAlerts: true,
    voidAlerts: true,
    largeTransaction: true
  });

  const togglePreference = (key: string) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    toast.info('Notification preference updated');
  };

  const roleNotifications = {
    super_admin: [
      { key: 'lowStock', label: 'Low Stock Alerts', icon: AlertCircle, description: 'Get notified when products fall below minimum stock levels' },
      { key: 'dailyReport', label: 'Daily Sales Report', icon: Mail, description: 'Receive a summary of daily sales via email' },
      { key: 'newCustomer', label: 'New Customer Alerts', icon: MessageSquare, description: 'Notification for every new customer registration' },
      { key: 'systemUpdates', label: 'System Updates', icon: RefreshCw, description: 'Stay informed about new features and maintenance' },
      { key: 'voidAlerts', label: 'Voided Transaction Alerts', icon: AlertCircle, description: 'Immediate notification when a transaction is voided' },
      { key: 'largeTransaction', label: 'Large Transaction Alerts', icon: AlertCircle, description: 'Alerts for transactions above a certain threshold' }
    ],
    admin: [
      { key: 'lowStock', label: 'Low Stock Alerts', icon: AlertCircle, description: 'Get notified when products fall below minimum stock levels' },
      { key: 'dailyReport', label: 'Daily Sales Report', icon: Mail, description: 'Receive a summary of daily sales via email' },
      { key: 'voidAlerts', label: 'Voided Transaction Alerts', icon: AlertCircle, description: 'Immediate notification when a transaction is voided' }
    ],
    manager: [
      { key: 'lowStock', label: 'Low Stock Alerts', icon: AlertCircle, description: 'Get notified when products fall below minimum stock levels' },
      { key: 'shiftReminders', label: 'Shift Start/End Reminders', icon: RefreshCw, description: 'Reminders for staff to start and end work periods' }
    ],
    cashier: [
      { key: 'orderConfirmations', label: 'Order Confirmations', icon: MessageSquare, description: 'Visual confirmation for every successful order' },
      { key: 'loyaltyAlerts', label: 'Customer Loyalty Alerts', icon: AlertCircle, description: 'Alerts when customers are eligible for rewards' }
    ]
  };

  const currentRoleNotifications = roleNotifications[user?.role as keyof typeof roleNotifications] || roleNotifications.cashier;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
      </div>

      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Role-Based Alerts</h3>
          <p className="text-slate-500 text-sm mb-6">
            Showing notification preferences for your role: <span className="font-bold text-indigo-600 capitalize">{user?.role.replace('_', ' ')}</span>
          </p>
          
          <div className="space-y-4">
            {currentRoleNotifications.map((item) => (
              <div 
                key={item.key} 
                className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-400 rounded-2xl group-hover:text-indigo-600 transition-colors">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => togglePreference(item.key)}
                  className={cn(
                    "w-14 h-8 rounded-full relative transition-all duration-300",
                    preferences[item.key] ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300",
                    preferences[item.key] ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button 
            onClick={() => {
              toast.success('All notification settings saved');
              onBack();
            }}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

const DeviceSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useApp();
  const [printers, setPrinters] = useState<{ id: string; name: string; type: 'usb' | 'network'; status: 'connected' | 'offline'; ip?: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [networkIp, setNetworkIp] = useState('');
  const [printerName, setPrinterName] = useState('');

  // Mock session data
  const [sessions] = useState([
    { id: '1', user: 'Admin User', role: 'admin', device: 'Chrome on MacOS', loginTime: '2026-04-08 08:30', status: 'online', branch: 'Main Branch' },
    { id: '2', user: 'John Cashier', role: 'cashier', device: 'iPad POS Terminal', loginTime: '2026-04-08 09:15', status: 'online', branch: 'Main Branch' },
    { id: '3', user: 'Sarah Manager', role: 'manager', device: 'Windows Desktop', loginTime: '2026-04-08 07:45', status: 'offline', logoutTime: '2026-04-08 16:00', branch: 'Downtown Branch' },
    { id: '4', user: 'Mike Cashier', role: 'cashier', device: 'Android Tablet', loginTime: '2026-04-08 10:00', status: 'online', branch: 'Downtown Branch' },
  ]);

  const scanUSB = async () => {
    setIsScanning(true);
    try {
      if (!('usb' in navigator)) {
        toast.error('WebUSB is not supported in this browser');
        return;
      }

      // @ts-ignore - navigator.usb is experimental
      const device = await navigator.usb.requestDevice({ filters: [] });
      
      const newPrinter = {
        id: device.serialNumber || Math.random().toString(36).substr(2, 9),
        name: device.productName || 'Unknown USB Printer',
        type: 'usb' as const,
        status: 'connected' as const
      };

      setPrinters(prev => [...prev, newPrinter]);
      toast.success(`Connected to ${newPrinter.name}`);
    } catch (error) {
      console.error('USB Error:', error);
      toast.error('Failed to connect to USB device');
    } finally {
      setIsScanning(false);
    }
  };

  const addNetworkPrinter = () => {
    if (!networkIp || !printerName) {
      toast.error('Please enter both name and IP address');
      return;
    }

    const newPrinter = {
      id: Math.random().toString(36).substr(2, 9),
      name: printerName,
      type: 'network' as const,
      status: 'connected' as const,
      ip: networkIp
    };

    setPrinters(prev => [...prev, newPrinter]);
    setShowAddNetwork(false);
    setNetworkIp('');
    setPrinterName('');
    toast.success(`Network printer ${printerName} added`);
  };

  const removePrinter = (id: string) => {
    setPrinters(prev => prev.filter(p => p.id !== id));
    toast.info('Printer removed');
  };

  // Filter sessions based on role
  const filteredSessions = sessions.filter(s => {
    if (user?.role === 'super_admin' || user?.role === 'admin') return true;
    if (user?.role === 'manager') return s.branch === 'Main Branch'; // Assuming manager's branch
    return s.user === user?.name;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Device Management</h2>
      </div>

      <div className="space-y-8">
        {/* Printers Section */}
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Printers & Terminals</h3>
              <p className="text-sm text-slate-500">Manage your physical printing hardware</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAddNetwork(true)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm flex items-center gap-2"
              >
                <Globe size={16} />
                Add Network
              </button>
              <button 
                onClick={scanUSB}
                disabled={isScanning}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isScanning ? <RefreshCw size={16} className="animate-spin" /> : <Printer size={16} />}
                Scan USB
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAddNetwork && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 overflow-hidden"
              >
                <h4 className="font-bold text-slate-800">Add Network Printer</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Printer Name (e.g. Kitchen Printer)"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input 
                    type="text" 
                    placeholder="IP Address (e.g. 192.168.1.100)"
                    value={networkIp}
                    onChange={(e) => setNetworkIp(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowAddNetwork(false)}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addNetworkPrinter}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                  >
                    Add Device
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {printers.map((printer) => (
              <div 
                key={printer.id} 
                className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-100 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl transition-colors",
                    printer.type === 'usb' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    {printer.type === 'usb' ? <Smartphone size={20} /> : <Globe size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{printer.name}</p>
                    <p className="text-xs text-slate-500">
                      {printer.type === 'usb' ? 'USB Connection' : `Network: ${printer.ip}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    {printer.status}
                  </span>
                  <button 
                    onClick={() => removePrinter(printer.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}

            {printers.length === 0 && !showAddNetwork && (
              <div className="p-12 border-2 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="p-6 bg-slate-50 rounded-full">
                  <Printer size={48} className="text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">No devices connected</p>
                  <p className="text-sm">Scan for USB printers or add a network printer by IP.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Session Monitor Section */}
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Active Sessions</h3>
              <p className="text-sm text-slate-500">Monitor logged-in devices and staff activity</p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Monitor size={20} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Login Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <UserCheck size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{session.user}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{session.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{session.device}</p>
                      <p className="text-[10px] text-slate-400">{session.branch}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={14} />
                        <span className="text-xs">{session.loginTime}</span>
                      </div>
                      {session.logoutTime && (
                        <p className="text-[10px] text-rose-400 mt-1">Out: {session.logoutTime}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                        session.status === 'online' 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-slate-100 text-slate-400"
                      )}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="pt-8 border-t border-slate-100">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Note:</strong> USB printer detection requires a browser that supports the WebUSB API (Chrome, Edge). 
              Network printers must be on the same local network as this computer and support raw TCP/IP printing (Port 9100).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsSection: React.FC<{ 
  icon: any; 
  title: string; 
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group w-full"
  >
    <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
    <div className="text-slate-300 group-hover:text-indigo-600 transition-colors">
      <ChevronRight size={24} />
    </div>
  </button>
);

export default Settings;
