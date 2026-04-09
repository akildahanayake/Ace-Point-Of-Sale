import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, CartItem, Category, OrderTag, Customer } from '../types';
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
  X
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import EntryGate from '../components/EntryGate';
import { Html5QrcodeScanner } from 'html5-qrcode';

const POS: React.FC = () => {
  const { currentBranch, branches, switchBranch, user, logout, activeWorkPeriod, startWorkPeriod, endWorkPeriod } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital_wallet'>('cash');
  const [selectedProductForTags, setSelectedProductForTags] = useState<Product | null>(null);
  const [isPosVisible, setIsPosVisible] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const unsubProducts = posService.subscribeToProducts(setProducts);
    const unsubCategories = posService.subscribeToCategories(setCategories);
    const unsubCustomers = posService.subscribeToCustomers(setCustomers);
    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
    };
  }, []);

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
  const tax = subtotal * 0.10; // 10% Tax
  const total = subtotal + tax;

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

      await posService.processCheckout(
        saleItems, 
        total, 
        paymentMethod, 
        currentBranch?.id || '1', 
        user?.id || '1',
        selectedCustomer?.id
      );
      toast.success(`Payment of ${formatCurrency(total)} received via ${paymentMethod}`);
      if (selectedCustomer) {
        toast.info(`Awarded ${Math.floor(total)} points to ${selectedCustomer.name}`);
      }
      setCart([]);
      setSelectedCustomer(null);
      setShowPaymentModal(false);
    } catch (error) {
      toast.error('Failed to process payment');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Receipt className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">Ace Point Of Sale</span>
          </div>

          {/* Current Branch Indicator */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2"
              title="Scan Barcode/QR Code"
            >
              <Search size={20} />
              <span className="text-sm font-bold hidden sm:inline">Scan Code</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-medium">
              <Building2 size={18} className="text-indigo-600" />
              {currentBranch?.name}
            </div>
            {user && user.branchIds.length > 1 && (
              <button 
                onClick={() => setIsPosVisible(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
              >
                Switch Branch
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={endWorkPeriod}
            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors flex items-center gap-2"
          >
            End Shift
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products or scan SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-lg"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all",
                    !selectedCategory ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-slate-600 hover:bg-slate-100"
                  )}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all",
                      selectedCategory === cat.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto max-h-[calc(100vh-220px)] pb-10 pr-2">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="aspect-square rounded-2xl bg-slate-50 mb-4 overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
                  <p className="text-indigo-600 font-extrabold mt-1">{formatCurrency(product.price)}</p>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm">
                    {product.stock} left
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart size={24} className="text-indigo-600" />
              Current Order
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCustomerModal(true)}
                className={cn(
                  "p-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold",
                  selectedCustomer ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <User size={18} />
                {selectedCustomer ? selectedCustomer.name : 'Add Customer'}
              </button>
              <button 
                onClick={() => setCart([])}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                    <ShoppingCart size={40} />
                  </div>
                  <p className="font-medium">No items in order</p>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={`${item.id}-${JSON.stringify(item.appliedTags)}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl group"
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                      {item.appliedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.appliedTags.map(tag => (
                            <span key={tag.id} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold">
                              {tag.name} (+{formatCurrency(tag.price)})
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-indigo-600 font-bold text-sm mt-1">{formatCurrency(item.price + item.appliedTags.reduce((s, t) => s + t.price, 0))}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
                      <button 
                        onClick={() => updateQuantity(item.id, -1, item.appliedTags)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-4 text-center font-bold text-slate-800">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1, item.appliedTags)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-200 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Tax (10%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-black text-2xl pt-4 border-t border-slate-200">
                <span>Total</span>
                <span className="text-indigo-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-5 rounded-3xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 text-lg"
            >
              <Receipt size={24} />
              Process Payment
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
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
