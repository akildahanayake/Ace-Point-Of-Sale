import React, { useState, useEffect } from 'react';
import { Sale, Account, AccountTransaction } from '../types';
import { posService } from '../services/posService';
import { 
  Download, 
  Calendar, 
  Filter, 
  ChevronRight,
  Receipt,
  CreditCard,
  Banknote,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  PieChart as PieChartIcon,
  Eye,
  Printer,
  Trash2,
  Ban,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { DEFAULT_RECEIPT_TEMPLATE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

const Reports: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'sales' | 'accounts'>('sales');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = posService.subscribeToBranches(setBranches);
    const loadSettings = async () => {
      const data = await posService.getSettings();
      setSettings(data);
    };
    loadSettings();
    return () => unsub();
  }, []);

  const handleVoid = async (id: string) => {
    try {
      await posService.voidSale(id);
      toast.success('Transaction voided successfully');
      setShowVoidConfirm(null);
    } catch (error) {
      toast.error('Failed to void transaction');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await posService.deleteSale(id);
      toast.success('Transaction deleted successfully');
      setShowDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handlePrint = (sale: Sale) => {
    toast.info('Printing receipt...');
    
    const branch = branches.find(b => b.id === sale.branch_id?.toString());
    const template = branch?.receiptTemplate || DEFAULT_RECEIPT_TEMPLATE;
    const dateStr = sale.timestamp?.toDate 
      ? format(sale.timestamp.toDate(), 'MMM dd, yyyy HH:mm')
      : (typeof sale.timestamp === 'string' ? format(new Date(sale.timestamp), 'MMM dd, yyyy HH:mm') : format(new Date(), 'MMM dd, yyyy HH:mm'));

    const itemsHtml = sale.items.map((item: any) => `
      <tr>
        <td style="padding: 2px 0;">
          <div style="font-weight: bold;">${item.name}</div>
          ${item.tags && item.tags.length > 0 ? `<div style="font-size: 0.7rem; color: #666;">${item.tags.map((t: any) => t.name).join(', ')}</div>` : ''}
        </td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency((item.price + (item.tags || []).reduce((s: number, t: any) => s + t.price, 0)) * item.quantity)}</td>
      </tr>
    `).join('');

    const receiptHtml = template
      .replace('{{companyName}}', settings?.company_name || 'POS RECEIPT')
      .replace('{{branchName}}', branch?.name || '')
      .replace('{{branchAddress}}', branch?.address || '')
      .replace('{{branchPhone}}', branch?.phone || '')
      .replace('{{orderNumber}}', sale.orderNumber || sale.id)
      .replace('{{date}}', dateStr)
      .replace('{{cashierName}}', 'Staff')
      .replace('{{items}}', itemsHtml)
      .replace('{{subtotal}}', formatCurrency(sale.subtotal || sale.total))
      .replace('{{tax}}', formatCurrency(sale.tax || 0))
      .replace('{{taxPercentage}}', (settings?.tax_percentage || 0).toString())
      .replace('{{serviceCharge}}', formatCurrency(sale.serviceCharge || (sale.total - (sale.subtotal || sale.total) - (sale.tax || 0))))
      .replace('{{serviceChargePercentage}}', (settings?.service_charge || 0).toString())
      .replace('{{total}}', formatCurrency(sale.total))
      .replace('{{paymentMethod}}', (sale.paymentMethod || 'CASH').toUpperCase());

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${sale.orderNumber || sale.id}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; width: 80mm; }
                @page { size: 80mm auto; margin: 0; }
              }
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${receiptHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (selectedAccount) {
      setLoadingTransactions(true);
      const unsub = posService.subscribeToTransactions(selectedAccount.id, (data) => {
        setTransactions(data);
        setLoadingTransactions(false);
      });
      return () => unsub();
    }
  }, [selectedAccount]);

  useEffect(() => {
    const unsubSales = posService.subscribeToSales((data) => {
      setSales(data);
      if (activeTab === 'sales') setLoading(false);
    });

    const unsubAccounts = posService.subscribeToAccounts((data) => {
      setAccounts(data);
      if (activeTab === 'accounts') setLoading(false);
    });

    return () => {
      unsubSales();
      unsubAccounts();
    };
  }, [activeTab]);

  if (loading && sales.length === 0 && accounts.length === 0) {
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
          <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500">Monitor your business performance and accounts</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex">
            <button 
              onClick={() => setActiveTab('sales')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'sales' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Sales
            </button>
            <button 
              onClick={() => setActiveTab('accounts')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'accounts' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Accounts
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'sales' ? (
          <motion.div
            key="sales"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(sales.reduce((sum, s) => sum + s.total, 0))}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-slate-800">{sales.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Average Ticket</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(sales.length > 0 ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length : 0)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-slate-600">
                    <Filter size={20} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Transaction ID</th>
                      <th className="px-6 py-4 font-semibold">Date & Time</th>
                      <th className="px-6 py-4 font-semibold">Items</th>
                      <th className="px-6 py-4 font-semibold">Payment</th>
                      <th className="px-6 py-4 font-semibold">Total</th>
                      <th className="px-6 py-4 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-slate-500">#{sale.id.slice(0, 8)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-medium text-slate-800">
                              {sale.timestamp ? format(sale.timestamp.toDate(), 'MMM dd, yyyy') : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {sale.timestamp ? format(sale.timestamp.toDate(), 'HH:mm a') : 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex -space-x-2">
                            {sale.items.slice(0, 3).map((item, i) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                {item.name[0]}
                              </div>
                            ))}
                            {sale.items.length > 3 && (
                              <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                +{sale.items.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {sale.paymentMethod === 'card' ? (
                              <CreditCard size={16} className="text-indigo-500" />
                            ) : (
                              <Banknote size={16} className="text-emerald-500" />
                            )}
                            <span className="text-sm capitalize text-slate-600">{sale.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">{formatCurrency(sale.total)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                              sale.status === 'void' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {sale.status || 'completed'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 transition-opacity">
                            <button 
                              onClick={() => setSelectedSale(sale)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => handlePrint(sale)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Print Receipt"
                            >
                              <Printer size={18} />
                            </button>
                            {sale.status !== 'void' && (user?.role === 'admin' || user?.role === 'manager') && (
                              <button 
                                onClick={() => setShowVoidConfirm(sale.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Void Transaction"
                              >
                                <Ban size={18} />
                              </button>
                            )}
                            {user?.role === 'admin' && (
                              <button 
                                onClick={() => setShowDeleteConfirm(sale.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Transaction"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Receipt size={40} className="opacity-20" />
                            <p>No transactions found in this period</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="accounts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Accounts Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Total Assets</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(accounts.filter(a => a.type === 'cash' || a.type === 'bank').reduce((sum, a) => sum + a.balance, 0))}
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ArrowUpRight size={20} />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Total Receivables</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(accounts.filter(a => a.type === 'receivable').reduce((sum, a) => sum + a.balance, 0))}
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <ArrowDownLeft size={20} />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Total Expenses</p>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Accounts List */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-slate-800 px-2">Accounts</h2>
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div 
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className={cn(
                        "bg-white p-4 rounded-2xl border transition-all cursor-pointer group",
                        selectedAccount?.id === account.id ? "border-indigo-600 shadow-md ring-1 ring-indigo-600" : "border-slate-100 shadow-sm hover:shadow-md"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-xl",
                            account.type === 'cash' ? "bg-emerald-50 text-emerald-600" :
                            account.type === 'bank' ? "bg-indigo-50 text-indigo-600" :
                            account.type === 'expense' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                          )}>
                            {account.type === 'cash' ? <Banknote size={18} /> : 
                             account.type === 'bank' ? <CreditCard size={18} /> : 
                             account.type === 'expense' ? <ArrowDownLeft size={18} /> : <Wallet size={18} />}
                          </div>
                          <span className="font-bold text-slate-800">{account.name}</span>
                        </div>
                        <ChevronRight size={18} className={cn(
                          "transition-colors",
                          selectedAccount?.id === account.id ? "text-indigo-600" : "text-slate-300 group-hover:text-indigo-600"
                        )} />
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{account.type}</span>
                        <span className={cn(
                          "font-bold",
                          account.balance >= 0 ? "text-slate-800" : "text-rose-600"
                        )}>
                          {formatCurrency(account.balance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedAccount ? `${selectedAccount.name} Activity` : 'Recent Activity'}
                  </h2>
                  {selectedAccount && (
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                  )}
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                  {!selectedAccount ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <History size={40} className="mb-3 opacity-20" />
                      <p>Select an account to view detailed transactions</p>
                    </div>
                  ) : loadingTransactions ? (
                    <div className="h-full flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Date</th>
                            <th className="px-6 py-4 font-semibold">Description</th>
                            <th className="px-6 py-4 font-semibold text-right">Debit</th>
                            <th className="px-6 py-4 font-semibold text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {format(tx.createdAt.toDate(), 'MMM dd, HH:mm')}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {tx.debit > 0 && (
                                  <span className="text-sm font-bold text-rose-600">
                                    -{formatCurrency(tx.debit)}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {tx.credit > 0 && (
                                  <span className="text-sm font-bold text-emerald-600">
                                    +{formatCurrency(tx.credit)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {transactions.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                                <p>No transactions found for this account</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Transaction Details</h3>
                  <p className="text-sm text-slate-500 font-mono">#{selectedSale.orderNumber}</p>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                    <p className="text-slate-700 font-medium">
                      {selectedSale.timestamp?.toDate ? format(selectedSale.timestamp.toDate(), 'MMMM dd, yyyy HH:mm:ss') : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      selectedSale.status === 'void' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {selectedSale.status || 'completed'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items</p>
                  <div className="space-y-2">
                    {selectedSale.items && selectedSale.items.length > 0 ? (
                      selectedSale.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(item.price)} x {item.quantity}</p>
                          </div>
                          <p className="font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl">
                        No items found for this transaction
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedSale.tax)}</span>
                  </div>
                  {selectedSale.serviceCharge !== undefined && selectedSale.serviceCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Service Charge</span>
                      <span className="font-medium text-slate-800">{formatCurrency(selectedSale.serviceCharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-slate-800">Total</span>
                    <span className="text-indigo-600">{formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => handlePrint(selectedSale)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Print Receipt
                </button>
                {selectedSale.status !== 'void' && (user?.role === 'admin' || user?.role === 'manager') && (
                  <button 
                    onClick={() => {
                      setShowVoidConfirm(selectedSale.id);
                      setSelectedSale(null);
                    }}
                    className="flex-1 bg-rose-50 text-rose-600 font-bold py-4 rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Ban size={20} />
                    Void Sale
                  </button>
                )}
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setShowDeleteConfirm(selectedSale.id);
                      setSelectedSale(null);
                    }}
                    className="flex-1 bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={20} />
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Void Confirmation Modal */}
      <AnimatePresence>
        {showVoidConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-sm p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Void Transaction?</h3>
              <p className="text-slate-500 mb-8">
                This will cancel the sale, restore stock levels, and reverse account balances. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowVoidConfirm(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleVoid(showVoidConfirm)}
                  className="flex-1 px-6 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                >
                  Void Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-sm p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Delete Transaction?</h3>
              <p className="text-slate-500 mb-8">
                Are you sure you want to permanently delete this transaction? This will remove it from all records.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 px-6 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                >
                  Delete Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
