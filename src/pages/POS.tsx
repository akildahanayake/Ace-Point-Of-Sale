import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, CartItem, Category, OrderTag, Customer, Sale, CryptoWallet } from '../types';
import { posService } from '../services/posService';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Receipt, 
  User, 
  LogOut, 
  Building2,
  ChevronDown,
  CreditCard,
  Banknote,
  Wallet,
  UserPlus,
  X,
  Layers,
  Printer,
  QrCode,
  Scan,
  RefreshCw,
  History,
  Eye
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { DEFAULT_RECEIPT_TEMPLATE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import EntryGate from '../components/EntryGate';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Settings } from '../types';

const POS: React.FC = () => {
  const { currentBranch, branches, switchBranch, user, logout, activeWorkPeriod, startWorkPeriod, endWorkPeriod } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await posService.getSettings();
      setSettings(data);
    };
    loadSettings();
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital_wallet'>('cash');
  const [selectedProductForTags, setSelectedProductForTags] = useState<Product | null>(null);
  const [isPosVisible, setIsPosVisible] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pastSales, setPastSales] = useState<any[]>([]);

  useEffect(() => {
    const unsubProducts = posService.subscribeToProducts(setProducts);
    const unsubCategories = posService.subscribeToCategories(setCategories);
    const unsubCustomers = posService.subscribeToCustomers(setCustomers);
    const unsubWallets = posService.subscribeToCryptoWallets((data) => {
      setWallets(data);
      if (data.length > 0 && !selectedWallet) {
        setSelectedWallet(data[0]);
      }
    });
    
    const loadSettings = async () => {
      try {
        const data = await posService.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubWallets();
    };
  }, [selectedWallet]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Find product by SKU
          const product = products.find(p => p.sku === decodedText && p.branchId === currentBranch?.id);
          if (product) {
            handleProductClick(product);
            toast.success(`Added ${product.name} to cart`);
            setShowScanner(false);
            scanner.clear();
          } else {
            toast.error(`Product with SKU ${decodedText} not found in this branch`);
          }
        },
        (error) => {
          // console.warn(error);
        }
      );

      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [showScanner, products, currentBranch]);

  const availableBranches = user?.role === 'admin' 
    ? branches 
    : branches.filter(b => user?.branchIds.includes(b.id));

  if (!activeWorkPeriod || activeWorkPeriod.status === 'closed' || !isPosVisible) {
    return <EntryGate onEnter={() => setIsPosVisible(true)} />;
  }

  const filteredProducts = products.filter(p => {
    const matchesBranch = p.branchId === currentBranch?.id;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const isNotPaused = !p.isPaused;
    const isNotExpired = !p.expiryDate || new Date(p.expiryDate) > new Date();
    return matchesBranch && matchesSearch && matchesCategory && isNotPaused && isNotExpired;
  });

  const addToCart = (product: Product, tags: OrderTag[] = []) => {
    setCart(prev => {
      // For items with tags, we treat them as unique entries if tags differ
      const existing = prev.find(item => 
        item.id === product.id && 
        JSON.stringify(item.appliedTags) === JSON.stringify(tags)
      );
      
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && JSON.stringify(item.appliedTags) === JSON.stringify(tags))
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, appliedTags: tags, status: 'new' }];
    });
    setSelectedProductForTags(null);
  };

  const handleProductClick = (product: Product) => {
    if (product.tags && product.tags.length > 0) {
      setSelectedProductForTags(product);
    } else {
      addToCart(product);
    }
  };

  const updateQuantity = (id: string, delta: number, tags: OrderTag[]) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && JSON.stringify(item.appliedTags) === JSON.stringify(tags)) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string, tags: OrderTag[]) => {
    setCart(prev => prev.filter(item => 
      !(item.id === id && JSON.stringify(item.appliedTags) === JSON.stringify(tags))
    ));
  };

  const calculateItemPrice = (item: CartItem) => {
    const tagsPrice = item.appliedTags.reduce((sum, tag) => sum + tag.price, 0);
    return (item.price + tagsPrice) * item.quantity;
  };

  const subtotal = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  const taxRate = settings?.tax_percentage || 0;
  const serviceChargeRate = settings?.service_charge || 0;
  
  const tax = subtotal * (taxRate / 100);
  const serviceCharge = subtotal * (serviceChargeRate / 100);
  const total = subtotal + tax + serviceCharge;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    try {
      const saleItems = cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price + item.appliedTags.reduce((s, t) => s + t.price, 0),
        quantity: item.quantity,
        tags: item.appliedTags
      }));

      const result = await posService.processCheckout(
        saleItems, 
        total, 
        paymentMethod, 
        currentBranch?.id || '1', 
        user?.id || '1',
        selectedCustomer?.id
      );

      if (result.success) {
        toast.success(`Payment of ${formatCurrency(total)} received via ${paymentMethod}`);
        if (selectedCustomer) {
          toast.info(`Awarded ${Math.floor(total)} points to ${selectedCustomer.name}`);
        }
        
        // Print Receipt
        handlePrintReceipt({
          id: result.orderId,
          orderNumber: result.orderId,
          items: cart,
          total,
          subtotal,
          tax: tax + serviceCharge,
          paymentMethod,
          timestamp: { toDate: () => new Date() }
        } as any);

        setCart([]);
        setSelectedCustomer(null);
        setShowPaymentModal(false);
      }
    } catch (error) {
      toast.error('Failed to process payment');
    }
  };

  const handlePrintReceipt = (saleData: Sale) => {
    toast.info('Printing receipt...');
    
    const template = currentBranch?.receiptTemplate || DEFAULT_RECEIPT_TEMPLATE;
    const dateStr = saleData.timestamp?.toDate 
      ? saleData.timestamp.toDate().toLocaleString() 
      : (typeof saleData.timestamp === 'string' ? new Date(saleData.timestamp).toLocaleString() : new Date().toLocaleString());

    const itemsHtml = saleData.items.map((item: any) => `
      <tr>
        <td style="padding: 2px 0;">
          <div style="font-weight: bold;">${item.name}</div>
          ${(item.tags || item.appliedTags || []).length > 0 ? `<div style="font-size: 0.7rem; color: #666;">${(item.tags || item.appliedTags || []).map((t: any) => t.name).join(', ')}</div>` : ''}
        </td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency((item.price + (item.tags || item.appliedTags || []).reduce((s: number, t: any) => s + t.price, 0)) * item.quantity)}</td>
      </tr>
    `).join('');

    const receiptHtml = template
      .replace('{{companyName}}', settings?.company_name || 'POS RECEIPT')
      .replace('{{branchName}}', currentBranch?.name || '')
      .replace('{{branchAddress}}', currentBranch?.address || '')
      .replace('{{branchPhone}}', currentBranch?.phone || '')
      .replace('{{orderNumber}}', saleData.orderNumber || saleData.id)
      .replace('{{date}}', dateStr)
      .replace('{{cashierName}}', user?.name || 'Staff')
      .replace('{{items}}', itemsHtml)
      .replace('{{subtotal}}', formatCurrency(saleData.subtotal))
      .replace('{{tax}}', formatCurrency(saleData.tax))
      .replace('{{taxPercentage}}', (settings?.tax_percentage || 0).toString())
      .replace('{{serviceCharge}}', formatCurrency(saleData.serviceCharge || (saleData.total - saleData.subtotal - saleData.tax)))
      .replace('{{serviceChargePercentage}}', (settings?.service_charge || 0).toString())
      .replace('{{total}}', formatCurrency(saleData.total))
      .replace('{{paymentMethod}}', saleData.paymentMethod.toUpperCase());

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${saleData.orderNumber || saleData.id}</title>
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <Receipt className="text-white" size={18} />
            </div>
            <span className="font-bold text-sm md:text-lg tracking-tight text-slate-800 hidden xs:block">Ace POS</span>
          </div>

          {/* Current Branch Indicator */}
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2"
              title="Scan Barcode/QR Code"
            >
              <Search size={18} />
              <span className="text-xs font-bold hidden md:inline">Scan</span>
            </button>
            <button 
              onClick={async () => {
                const sales = await posService.getSales();
                // Filter by current branch
                setPastSales(sales.filter((s: Sale) => s.branch_id?.toString() === currentBranch?.id));
                setShowHistoryModal(true);
              }}
              className="p-2 bg-slate-50 text-slate-600 rounded-lg md:rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2"
              title="Past Transactions"
            >
              <History size={18} />
              <span className="text-xs font-bold hidden md:inline">History</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 rounded-lg md:rounded-xl text-slate-700 font-medium text-xs md:text-sm">
              <Building2 size={16} className="text-indigo-600" />
              <span className="truncate max-w-[80px] md:max-w-none">{currentBranch?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={endWorkPeriod}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-rose-50 text-rose-600 rounded-lg md:rounded-xl font-bold text-xs md:text-sm hover:bg-rose-100 transition-colors flex items-center gap-2"
          >
            <span className="hidden xs:inline">End Shift</span>
            <LogOut size={16} className="xs:hidden" />
          </button>
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors hidden sm:block"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Categories (Desktop only) */}
        <aside className="hidden lg:flex w-56 bg-white border-r border-slate-200 flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Layers size={16} className="text-indigo-600" />
              Categories
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg font-bold transition-all text-xs",
                !selectedCategory ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg font-bold transition-all text-xs",
                  selectedCategory === cat.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content: Search + Product Grid */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Mobile Categories (Hidden on lg) */}
          <div className="lg:hidden p-4 bg-white border-b border-slate-100">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all text-sm",
                  !selectedCategory ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all text-sm",
                    selectedCategory === cat.id ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 md:p-4 space-y-3 md:space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5 pb-20">
                {filteredProducts.map(product => (
                  <motion.div
                    key={product.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleProductClick(product)}
                    className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="aspect-square rounded-lg bg-slate-50 mb-1.5 overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h3 className="font-bold text-slate-800 truncate text-[11px] md:text-xs leading-tight">{product.name}</h3>
                    <p className="text-indigo-600 font-black mt-0.5 text-[11px] md:text-xs">{formatCurrency(product.price)}</p>
                    <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm px-1 py-0.5 rounded text-[8px] font-bold text-slate-500 shadow-sm">
                      {product.stock}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Right Side: Cart (Desktop) / Drawer (Mobile) */}
        <aside className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-30",
          isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          {/* Cart Header */}
          <div className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-indigo-600" />
              Order
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCustomerModal(true)}
                className={cn(
                  "p-2 rounded-xl transition-all flex items-center gap-2 text-xs md:text-sm font-bold",
                  selectedCustomer ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <User size={18} />
                <span className="hidden sm:inline">{selectedCustomer ? selectedCustomer.name : 'Add Customer'}</span>
              </button>
              <button 
                onClick={() => setCart([])}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <ShoppingCart size={24} />
                  </div>
                  <p className="font-medium text-xs">No items in order</p>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={`${item.id}-${JSON.stringify(item.appliedTags)}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 py-1.5 border-b border-slate-100 group"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate text-[11px]">{item.name}</h4>
                      {item.appliedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.appliedTags.map(tag => (
                            <span key={tag.id} className="text-[7px] bg-indigo-50 text-indigo-600 px-1 rounded-sm font-bold">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right px-1">
                      <p className="text-slate-600 font-bold text-[10px]">{formatCurrency(item.price + item.appliedTags.reduce((s, t) => s + t.price, 0))}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                      <button 
                        onClick={() => updateQuantity(item.id, -1, item.appliedTags)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-3 text-center font-bold text-slate-800 text-[10px]">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1, item.appliedTags)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id, item.appliedTags)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="space-y-0.5">
              <div className="flex justify-between text-slate-500 font-medium text-[10px]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-slate-500 font-medium text-[10px]">
                  <span>Service Charge ({serviceChargeRate}%)</span>
                  <span>{formatCurrency(serviceCharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 font-medium text-[10px]">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-black text-sm pt-1 border-t border-slate-200 mt-1">
                <span>Total</span>
                <span className="text-indigo-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-xs"
            >
              <Receipt size={16} />
              Process Payment
            </button>
          </div>
        </aside>

        {/* Mobile Cart Toggle */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 font-bold active:scale-95 transition-transform"
          >
            <ShoppingCart size={24} />
            <span className="relative">
              View Order
              {cart.length > 0 && (
                <span className="absolute -top-6 -right-4 w-6 h-6 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                  {cart.length}
                </span>
              )}
            </span>
            <span className="ml-2 border-l border-indigo-400 pl-2">
              {formatCurrency(total)}
            </span>
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Past Transactions</h2>
                  <p className="text-sm text-slate-500">Recent sales for {currentBranch?.name}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-8 py-4 font-semibold">Order #</th>
                      <th className="px-8 py-4 font-semibold">Time</th>
                      <th className="px-8 py-4 font-semibold">Total</th>
                      <th className="px-8 py-4 font-semibold">Status</th>
                      <th className="px-8 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastSales.map((sale: Sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4 font-mono text-xs text-slate-500">#{sale.orderNumber || sale.id.slice(0, 8)}</td>
                        <td className="px-8 py-4 text-sm text-slate-600">
                          {sale.timestamp?.toDate ? format(sale.timestamp.toDate(), 'HH:mm:ss') : 'N/A'}
                        </td>
                        <td className="px-8 py-4 font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                            sale.status === 'void' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {sale.status || 'completed'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handlePrintReceipt(sale)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Print Receipt"
                            >
                              <Printer size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pastSales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                          <p>No transactions found for today</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-800">Finalize Payment</h2>
                <p className="text-slate-500 mt-2">Select a payment method to complete the order</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-10">
                <PaymentMethodButton 
                  active={paymentMethod === 'cash'} 
                  onClick={() => setPaymentMethod('cash')}
                  icon={Banknote}
                  label="Cash"
                  color="emerald"
                />
                <PaymentMethodButton 
                  active={paymentMethod === 'card'} 
                  onClick={() => setPaymentMethod('card')}
                  icon={CreditCard}
                  label="Card"
                  color="indigo"
                />
                <PaymentMethodButton 
                  active={paymentMethod === 'digital_wallet'} 
                  onClick={() => setPaymentMethod('digital_wallet')}
                  icon={Wallet}
                  label="Wallet"
                  color="amber"
                />
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 mb-8 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Amount to Pay</span>
                <span className="text-3xl font-black text-indigo-600">{formatCurrency(total)}</span>
              </div>

              {paymentMethod === 'digital_wallet' && (
                <div className="mb-8 p-6 bg-amber-50 rounded-[32px] border border-amber-100 space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {wallets.map((wallet) => (
                      <button 
                        key={wallet.id}
                        onClick={() => setSelectedWallet(wallet)}
                        className={cn(
                          "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                          selectedWallet?.id === wallet.id ? "bg-amber-500 text-white shadow-md" : "text-amber-600 hover:bg-amber-50"
                        )}
                      >
                        {wallet.name} ({wallet.network})
                      </button>
                    ))}
                  </div>

                  {selectedWallet ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-3xl shadow-sm border border-amber-100">
                        {selectedWallet.qrCodeUrl ? (
                          <img src={selectedWallet.qrCodeUrl} alt="QR" className="w-[150px] h-[150px] object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <QRCodeCanvas 
                            value={selectedWallet.address} 
                            size={150}
                            level="H"
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                          {selectedWallet.name} Address ({selectedWallet.network})
                        </p>
                        <p className="text-[10px] font-mono text-amber-600 break-all max-w-[200px]">
                          {selectedWallet.address}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center text-amber-600/50 italic text-sm">
                      No crypto wallets configured
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmPayment}
                  className="flex-[2] py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Tags Modal */}
      <AnimatePresence>
        {selectedProductForTags && (
          <TagSelectionModal 
            product={selectedProductForTags} 
            onClose={() => setSelectedProductForTags(null)}
            onConfirm={(tags) => addToCart(selectedProductForTags, tags)}
          />
        )}
      </AnimatePresence>

      {/* Customer Selection Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-10 w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black text-slate-800">Select Customer</h2>
                <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, phone or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {customers
                  .filter(c => 
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                    c.phone?.includes(customerSearch) ||
                    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                  )
                  .map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerModal(false);
                        toast.success(`Customer ${customer.name} selected`);
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between group",
                        selectedCustomer?.id === customer.id ? "bg-indigo-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-800"
                      )}
                    >
                      <div>
                        <p className="font-bold">{customer.name}</p>
                        <p className={cn("text-xs", selectedCustomer?.id === customer.id ? "text-indigo-100" : "text-slate-500")}>
                          {customer.phone || customer.email || 'No contact info'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-60">Points</p>
                        <p className="font-black">{customer.loyaltyPoints || 0}</p>
                      </div>
                    </button>
                  ))}
              </div>

              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerModal(false);
                    toast.info('Customer removed from order');
                  }}
                  className="mt-6 w-full py-4 rounded-2xl font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  Remove Selected Customer
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowScanner(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">Scan Product Code</h2>
                <p className="text-slate-500 text-sm mt-1">Place the Barcode or QR code within the frame</p>
              </div>

              <div id="reader" className="overflow-hidden rounded-3xl border-4 border-slate-100 bg-slate-50"></div>
              
              <div className="mt-6 p-4 bg-indigo-50 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                  <Search size={18} />
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  The scanner will automatically detect the code and add the matching product to your current order.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TagSelectionModal: React.FC<{
  product: Product;
  onClose: () => void;
  onConfirm: (tags: OrderTag[]) => void;
}> = ({ product, onClose, onConfirm }) => {
  const [selectedTags, setSelectedTags] = useState<OrderTag[]>([]);

  const toggleTag = (tag: OrderTag) => {
    setSelectedTags(prev => 
      prev.some(t => t.id === tag.id) 
        ? prev.filter(t => t.id !== tag.id) 
        : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-800">{product.name}</h2>
          <p className="text-slate-500 mt-2">Select modifiers for this item</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {product.tags?.map(tag => {
            const isSelected = selectedTags.some(t => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "p-6 rounded-3xl border-2 transition-all text-left",
                  isSelected ? "border-indigo-600 bg-indigo-50" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <p className="font-bold text-slate-800">{tag.name}</p>
                <p className="text-indigo-600 font-bold">+{formatCurrency(tag.price)}</p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(selectedTags)}
            className="flex-[2] py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
          >
            Add to Order
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PaymentMethodButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string;
  color: string;
}> = ({ active, onClick, icon: Icon, label, color }) => {
  const colorClasses = {
    emerald: active ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-emerald-50 text-emerald-600",
    indigo: active ? "bg-indigo-500 text-white shadow-indigo-200" : "bg-indigo-50 text-indigo-600",
    amber: active ? "bg-amber-500 text-white shadow-amber-200" : "bg-amber-50 text-amber-600",
  }[color as 'emerald' | 'indigo' | 'amber'];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 p-6 rounded-3xl transition-all border-2",
        active ? "border-transparent shadow-xl scale-105" : "border-slate-100 hover:border-slate-200",
        colorClasses
      )}
    >
      <Icon size={32} />
      <span className="font-bold">{label}</span>
    </button>
  );
};

export default POS;
