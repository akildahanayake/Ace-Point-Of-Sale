import React, { useState, useEffect } from 'react';
import { Product, Category, InventoryItem, Recipe, Warehouse, Branch } from '../types';
import { posService } from '../services/posService';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Tag, 
  Image as ImageIcon,
  Loader2,
  X,
  ClipboardList,
  Layers,
  ArrowRightLeft,
  Settings2,
  Warehouse as WarehouseIcon,
  History,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

const Inventory: React.FC = () => {
  const { currentBranch, user, branches } = useApp();
  const [activeTab, setActiveTab] = useState<'products' | 'items' | 'recipes' | 'warehouses' | 'adjustments' | 'transfers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isAddingWarehouse, setIsAddingWarehouse] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [isEditingWarehouse, setIsEditingWarehouse] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [isTransferringStock, setIsTransferringStock] = useState(false);
  const [viewingCodesProduct, setViewingCodesProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [bulkPrintType, setBulkPrintType] = useState<'barcode' | 'qrcode'>('barcode');

  // Form states
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: '', stock: 0, sku: '', image: '', expiryDate: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });
  const [newItem, setNewItem] = useState({ name: '', baseUnit: '', cost: 0, stock: 0, multiplier: 1 });
  const [newRecipe, setNewRecipe] = useState({ productId: '', inventoryItemId: '', quantity: 0 });
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ item_id: '', item_type: 'product' as 'product' | 'inventory_item', quantity: 0, reason: '' });
  const [transferForm, setTransferForm] = useState({ item_id: '', item_type: 'product' as 'product' | 'inventory_item', from_branch_id: currentBranch?.id || '', to_branch_id: '', quantity: 0 });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (currentBranch && !transferForm.from_branch_id) {
      setTransferForm(prev => ({ ...prev, from_branch_id: currentBranch.id }));
    }
  }, [currentBranch]);

  useEffect(() => {
    const handleError = (error: any) => {
      console.error(error);
      setLoading(false);
      toast.error('Failed to load data. Please check permissions.');
    };

    const unsubProducts = posService.subscribeToProducts(setProducts, handleError);
    const unsubCategories = posService.subscribeToCategories(setCategories, handleError);
    const unsubItems = posService.subscribeToInventoryItems(setInventoryItems, handleError);
    const unsubRecipes = posService.subscribeToRecipes(setRecipes, handleError);
    const unsubWarehouses = posService.subscribeToWarehouses(setWarehouses, handleError);
    const unsubAdjustments = posService.subscribeToStockAdjustments(setAdjustments);
    const unsubTransfers = posService.subscribeToStockTransfers((data) => {
      setTransfers(data);
      setLoading(false);
    });
    
    return () => {
      unsubProducts();
      unsubCategories();
      unsubItems();
      unsubRecipes();
      unsubWarehouses();
      unsubAdjustments();
      unsubTransfers();
    };
  }, []);

  // Filtered data based on branch
  const branchProducts = products.filter(p => (p as any).branch_id === currentBranch?.id || (p as any).branchId === currentBranch?.id);
  const branchItems = inventoryItems.filter(i => (i as any).branch_id === currentBranch?.id || (i as any).branchId === currentBranch?.id);
  const branchWarehouses = warehouses.filter(w => w.branchId === currentBranch?.id || (w as any).branch_id === currentBranch?.id);
  const branchRecipes = recipes.filter(r => {
    const product = products.find(p => p.id === r.productId);
    return product?.branchId === currentBranch?.id;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;
    try {
      await posService.addProduct({ ...newProduct, branchId: currentBranch.id });
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, category: '', stock: 0, sku: '', image: '', expiryDate: '' });
      toast.success('Product added successfully');
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await posService.updateProduct(editingProduct.id, editingProduct);
      setIsEditingProduct(false);
      setEditingProduct(null);
      toast.success('Product updated successfully');
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await posService.deleteProduct(id);
      toast.success('Product deleted');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleTogglePause = async (product: Product) => {
    try {
      const updatedProduct = { ...product, isPaused: !product.isPaused };
      await posService.updateProduct(product.id, updatedProduct);
      toast.success(updatedProduct.isPaused ? 'Product paused' : 'Product unpaused');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllProducts = () => {
    if (selectedProductIds.length === branchProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(branchProducts.map(p => p.id));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;
    try {
      await posService.addInventoryItem({ ...newItem, branchId: currentBranch.id });
      setIsAddingItem(false);
      setNewItem({ name: '', baseUnit: '', cost: 0, stock: 0, multiplier: 1 });
      toast.success('Inventory item added');
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await posService.updateInventoryItem(editingItem.id, editingItem);
      setIsEditingItem(false);
      setEditingItem(null);
      toast.success('Item updated');
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await posService.deleteInventoryItem(id);
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await posService.addRecipe(newRecipe);
      setIsAddingRecipe(false);
      setNewRecipe({ productId: '', inventoryItemId: '', quantity: 0 });
      toast.success('Recipe linked');
    } catch (error) {
      toast.error('Failed to add recipe');
    }
  };

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;
    try {
      await posService.updateRecipe(editingRecipe.id, editingRecipe);
      setIsEditingRecipe(false);
      setEditingRecipe(null);
      toast.success('Recipe updated');
    } catch (error) {
      toast.error('Failed to update recipe');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm('Delete this recipe link?')) return;
    try {
      await posService.deleteRecipe(id);
      toast.success('Recipe deleted');
    } catch (error) {
      toast.error('Failed to delete recipe');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;
    try {
      await posService.addCategory({ ...newCategory, branch_id: currentBranch.id } as any);
      setIsAddingCategory(false);
      setNewCategory({ name: '', color: '#6366f1' });
      toast.success('Category added successfully');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;
    try {
      await posService.addWarehouse({ ...newWarehouse, branchId: currentBranch.id });
      setIsAddingWarehouse(false);
      setNewWarehouse({ name: '', location: '' });
      toast.success('Warehouse created');
    } catch (error) {
      toast.error('Failed to create warehouse');
    }
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    try {
      await posService.updateWarehouse(editingWarehouse.id, editingWarehouse);
      setIsEditingWarehouse(false);
      setEditingWarehouse(null);
      toast.success('Warehouse updated');
    } catch (error) {
      toast.error('Failed to update warehouse');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm('Delete this warehouse?')) return;
    try {
      await posService.deleteWarehouse(id);
      toast.success('Warehouse deleted');
    } catch (error) {
      toast.error('Failed to delete warehouse');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch || !user) return;
    try {
      await posService.addStockAdjustment({
        ...adjustmentForm,
        user_id: user.id,
        branch_id: currentBranch.id
      });
      setIsAdjustingStock(false);
      setAdjustmentForm({ item_id: '', item_type: 'product', quantity: 0, reason: '' });
      toast.success('Stock adjusted successfully');
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await posService.addStockTransfer({
        ...transferForm,
        user_id: user.id
      });
      setIsTransferringStock(false);
      setTransferForm({ item_id: '', item_type: 'product', from_branch_id: '', to_branch_id: '', quantity: 0 });
      toast.success('Stock transfer completed');
    } catch (error) {
      toast.error('Failed to transfer stock');
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
          <h1 className="text-3xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-slate-500">Manage products, ingredients, and stock across branches</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <>
              <button 
                onClick={() => setIsAdjustingStock(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all font-medium"
              >
                <Settings2 size={18} />
                Adjust Stock
              </button>
              <button 
                onClick={() => setIsTransferringStock(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all font-medium"
              >
                <ArrowRightLeft size={18} />
                Transfer Stock
              </button>
            </>
          )}
          {activeTab === 'products' && isAdmin && (
            <>
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all font-medium shadow-sm"
              >
                <Tag size={18} />
                New Category
              </button>
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200"
              >
                <Plus size={18} />
                Add Product
              </button>
            </>
          )}
          {activeTab === 'items' && isAdmin && (
            <button 
              onClick={() => setIsAddingItem(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
              Add Ingredient
            </button>
          )}
          {activeTab === 'recipes' && isAdmin && (
            <button 
              onClick={() => setIsAddingRecipe(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
              Link Recipe
            </button>
          )}
          {activeTab === 'warehouses' && isAdmin && (
            <button 
              onClick={() => setIsAddingWarehouse(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-200"
            >
              <Plus size={18} />
              Add Warehouse
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto scrollbar-hide">
        <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={Package} label="Products" />
        <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={ClipboardList} label="Ingredients" />
        <TabButton active={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} icon={Layers} label="Recipes" />
        <TabButton active={activeTab === 'warehouses'} onClick={() => setActiveTab('warehouses')} icon={WarehouseIcon} label="Warehouses" />
        <TabButton active={activeTab === 'adjustments'} onClick={() => setActiveTab('adjustments')} icon={History} label="Adjustments" />
        <TabButton active={activeTab === 'transfers'} onClick={() => setActiveTab('transfers')} icon={ArrowRightLeft} label="Transfers" />
      </div>

      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Branch Products ({currentBranch?.name})</h2>
            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4">
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {selectedProductIds.length} Selected
                </span>
                <button 
                  onClick={() => setIsBulkPrinting(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100"
                >
                  <Search size={18} />
                  Bulk Print Codes
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={branchProducts.length > 0 && selectedProductIds.length === branchProducts.length}
                      onChange={toggleAllProducts}
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">SKU</th>
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Stock</th>
                  <th className="px-6 py-4 font-semibold">Added Date</th>
                  <th className="px-6 py-4 font-semibold">Expiry Date</th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchProducts.map((product) => (
                  <tr key={product.id} className={cn("hover:bg-slate-50 transition-colors group", (product.isPaused || (product.expiryDate && new Date(product.expiryDate) < new Date())) && "opacity-60 grayscale")}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">{product.sku || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-400 font-bold">{product.name[0]}</span>}
                        </div>
                        <div>
                          <span className="font-medium text-slate-800 block">{product.name}</span>
                          {product.isPaused && <span className="text-[10px] uppercase font-bold text-amber-600 mr-2">Paused</span>}
                          {product.expiryDate && new Date(product.expiryDate) < new Date() && (
                            <span className="text-[10px] uppercase font-bold text-rose-600">Expired</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold",
                        product.stock > 10 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {branches.find(b => b.id === product.branchId)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleTogglePause(product)}
                            title={product.isPaused ? "Unpause" : "Pause"}
                            className={cn("p-2 transition-colors", product.isPaused ? "text-amber-600 hover:text-amber-700" : "text-slate-400 hover:text-amber-600")}
                          >
                            <AlertCircle size={18} />
                          </button>
                          <button 
                            onClick={() => setViewingCodesProduct(product)}
                            title="View Barcode/QR Code"
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Search size={18} />
                          </button>
                          <button 
                            onClick={() => { setEditingProduct(product); setIsEditingProduct(true); }}
                            title="Edit Product"
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Delete Product"
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Branch Ingredients ({currentBranch?.name})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Ingredient</th>
                  <th className="px-6 py-4 font-semibold">Cost</th>
                  <th className="px-6 py-4 font-semibold">In Stock</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{formatCurrency(item.cost)}</td>
                    <td className="px-6 py-4 text-slate-600">{item.stock} {item.baseUnit}</td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setEditingItem(item); setIsEditingItem(true); }}
                            title="Edit Ingredient"
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            title="Delete Ingredient"
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branchProducts.map(product => {
            const productRecipes = branchRecipes.filter(r => r.productId === product.id);
            if (productRecipes.length === 0) return null;
            return (
              <div key={product.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group relative">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  {product.name}
                </h3>
                <div className="space-y-3">
                  {productRecipes.map(recipe => {
                    const item = inventoryItems.find(i => i.id === recipe.inventoryItemId);
                    return (
                      <div key={recipe.id} className="flex justify-between items-center text-sm group/item">
                        <span className="text-slate-600">{item?.name || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{recipe.quantity} {item?.baseUnit}</span>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => { setEditingRecipe(recipe); setIsEditingRecipe(true); }}
                                title="Edit Recipe"
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRecipe(recipe.id)}
                                title="Delete Recipe"
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branchWarehouses.map(warehouse => (
            <div key={warehouse.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <WarehouseIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{warehouse.name}</h3>
                    <p className="text-xs text-slate-500">{warehouse.location || 'No location set'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingWarehouse(warehouse); setIsEditingWarehouse(true); }}
                      title="Edit Warehouse"
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteWarehouse(warehouse.id)}
                      title="Delete Warehouse"
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-50">
                <button className="w-full py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                  Manage Inventory
                </button>
              </div>
            </div>
          ))}
          {branchWarehouses.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              No warehouses found for this branch.
            </div>
          )}
        </div>
      )}

      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Stock Adjustment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Quantity</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(adj.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {adj.item_type === 'product' 
                        ? products.find(p => p.id == adj.item_id)?.name 
                        : inventoryItems.find(i => i.id == adj.item_id)?.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        adj.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{adj.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Stock Transfer History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">From</th>
                  <th className="px-6 py-4 font-semibold">To</th>
                  <th className="px-6 py-4 font-semibold">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(tr.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {tr.item_type === 'product' 
                        ? products.find(p => p.id == tr.item_id)?.name 
                        : inventoryItems.find(i => i.id == tr.item_id)?.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{branches.find(b => b.id == tr.from_branch_id)?.name}</td>
                    <td className="px-6 py-4 text-slate-500">{branches.find(b => b.id == tr.to_branch_id)?.name}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{tr.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isAddingProduct && (
          <Modal title="Add New Product" onClose={() => setIsAddingProduct(false)}>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="SKU Number" value={newProduct.sku} onChange={v => setNewProduct({...newProduct, sku: v})} />
                <FormInput label="Product Name" value={newProduct.name} onChange={v => setNewProduct({...newProduct, name: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Price" type="number" value={newProduct.price} onChange={v => setNewProduct({...newProduct, price: parseFloat(v)})} />
                <FormInput label="Stock" type="number" value={newProduct.stock} onChange={v => setNewProduct({...newProduct, stock: parseInt(v)})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <FormInput label="Expiry Date" type="date" value={newProduct.expiryDate} onChange={v => setNewProduct({...newProduct, expiryDate: v})} />
              </div>
              <FormInput label="Image URL" value={newProduct.image} onChange={v => setNewProduct({...newProduct, image: v})} />
              <SubmitButton label="Create Product" />
            </form>
          </Modal>
        )}

        {isEditingProduct && editingProduct && (
          <Modal title="Edit Product" onClose={() => { setIsEditingProduct(false); setEditingProduct(null); }}>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="SKU Number" value={editingProduct.sku} onChange={v => setEditingProduct({...editingProduct, sku: v})} />
                <FormInput label="Product Name" value={editingProduct.name} onChange={v => setEditingProduct({...editingProduct, name: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Price" type="number" value={editingProduct.price} onChange={v => setEditingProduct({...editingProduct, price: parseFloat(v)})} />
                <FormInput label="Stock" type="number" value={editingProduct.stock} onChange={v => setEditingProduct({...editingProduct, stock: parseInt(v)})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select required value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <FormInput label="Expiry Date" type="date" value={editingProduct.expiryDate || ''} onChange={v => setEditingProduct({...editingProduct, expiryDate: v})} />
              </div>
              <FormInput label="Image URL" value={editingProduct.image || ''} onChange={v => setEditingProduct({...editingProduct, image: v})} />
              <SubmitButton label="Update Product" />
            </form>
          </Modal>
        )}

        {isAddingItem && (
          <Modal title="Add Ingredient" onClose={() => setIsAddingItem(false)}>
            <form onSubmit={handleAddItem} className="space-y-4">
              <FormInput label="Ingredient Name" value={newItem.name} onChange={v => setNewItem({...newItem, name: v})} />
              <FormInput label="Base Unit (e.g. kg, L, unit)" value={newItem.baseUnit} onChange={v => setNewItem({...newItem, baseUnit: v})} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Cost per Unit" type="number" value={newItem.cost} onChange={v => setNewItem({...newItem, cost: parseFloat(v)})} />
                <FormInput label="Initial Stock" type="number" value={newItem.stock} onChange={v => setNewItem({...newItem, stock: parseFloat(v)})} />
              </div>
              <SubmitButton label="Add Ingredient" />
            </form>
          </Modal>
        )}

        {isEditingItem && editingItem && (
          <Modal title="Edit Ingredient" onClose={() => { setIsEditingItem(false); setEditingItem(null); }}>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <FormInput label="Ingredient Name" value={editingItem.name} onChange={v => setEditingItem({...editingItem, name: v})} />
              <FormInput label="Base Unit" value={editingItem.baseUnit} onChange={v => setEditingItem({...editingItem, baseUnit: v})} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Cost per Unit" type="number" value={editingItem.cost} onChange={v => setEditingItem({...editingItem, cost: parseFloat(v)})} />
                <FormInput label="Stock" type="number" value={editingItem.stock} onChange={v => setEditingItem({...editingItem, stock: parseFloat(v)})} />
              </div>
              <SubmitButton label="Update Ingredient" />
            </form>
          </Modal>
        )}

        {isAddingRecipe && (
          <Modal title="Link Recipe" onClose={() => setIsAddingRecipe(false)}>
            <form onSubmit={handleAddRecipe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Menu Product</label>
                <select required value={newRecipe.productId} onChange={e => setNewRecipe({...newRecipe, productId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ingredient</label>
                <select required value={newRecipe.inventoryItemId} onChange={e => setNewRecipe({...newRecipe, inventoryItemId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Ingredient</option>
                  {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <FormInput label="Quantity used per product" type="number" value={newRecipe.quantity} onChange={v => setNewRecipe({...newRecipe, quantity: parseFloat(v)})} />
              <SubmitButton label="Link Ingredient" />
            </form>
          </Modal>
        )}

        {isEditingRecipe && editingRecipe && (
          <Modal title="Edit Recipe Link" onClose={() => { setIsEditingRecipe(false); setEditingRecipe(null); }}>
            <form onSubmit={handleUpdateRecipe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Menu Product</label>
                <select required value={editingRecipe.productId} onChange={e => setEditingRecipe({...editingRecipe, productId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ingredient</label>
                <select required value={editingRecipe.inventoryItemId} onChange={e => setEditingRecipe({...editingRecipe, inventoryItemId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Ingredient</option>
                  {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <FormInput label="Quantity used per product" type="number" value={editingRecipe.quantity} onChange={v => setEditingRecipe({...editingRecipe, quantity: parseFloat(v)})} />
              <SubmitButton label="Update Link" />
            </form>
          </Modal>
        )}

        {isAddingCategory && (
          <Modal title="New Category" onClose={() => setIsAddingCategory(false)}>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <FormInput label="Category Name" value={newCategory.name} onChange={v => setNewCategory({...newCategory, name: v})} />
              <SubmitButton label="Create Category" />
            </form>
          </Modal>
        )}

        {isAddingWarehouse && (
          <Modal title="Add Warehouse" onClose={() => setIsAddingWarehouse(false)}>
            <form onSubmit={handleAddWarehouse} className="space-y-4">
              <FormInput label="Warehouse Name" value={newWarehouse.name} onChange={v => setNewWarehouse({...newWarehouse, name: v})} />
              <FormInput label="Location" value={newWarehouse.location} onChange={v => setNewWarehouse({...newWarehouse, location: v})} />
              <SubmitButton label="Create Warehouse" />
            </form>
          </Modal>
        )}

        {isEditingWarehouse && editingWarehouse && (
          <Modal title="Edit Warehouse" onClose={() => { setIsEditingWarehouse(false); setEditingWarehouse(null); }}>
            <form onSubmit={handleUpdateWarehouse} className="space-y-4">
              <FormInput label="Warehouse Name" value={editingWarehouse.name} onChange={v => setEditingWarehouse({...editingWarehouse, name: v})} />
              <FormInput label="Location" value={editingWarehouse.location || ''} onChange={v => setEditingWarehouse({...editingWarehouse, location: v})} />
              <SubmitButton label="Update Warehouse" />
            </form>
          </Modal>
        )}

        {isAdjustingStock && (
          <Modal title="Adjust Stock" onClose={() => setIsAdjustingStock(false)}>
            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Type</label>
                <select 
                  value={adjustmentForm.item_type} 
                  onChange={e => setAdjustmentForm({...adjustmentForm, item_type: e.target.value as any, item_id: ''})} 
                  className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="product">Menu Product</option>
                  <option value="inventory_item">Ingredient</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Item</label>
                <select 
                  required 
                  value={adjustmentForm.item_id} 
                  onChange={e => setAdjustmentForm({...adjustmentForm, item_id: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Item</option>
                  {adjustmentForm.item_type === 'product' 
                    ? branchProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                    : branchItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                  }
                </select>
              </div>
              <FormInput label="Quantity (use negative for deduction)" type="number" value={adjustmentForm.quantity} onChange={v => setAdjustmentForm({...adjustmentForm, quantity: parseFloat(v)})} />
              <FormInput label="Reason" value={adjustmentForm.reason} onChange={v => setAdjustmentForm({...adjustmentForm, reason: v})} />
              <SubmitButton label="Confirm Adjustment" />
            </form>
          </Modal>
        )}

        {isTransferringStock && (
          <Modal title="Transfer Stock" onClose={() => setIsTransferringStock(false)}>
            <form onSubmit={handleStockTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Type</label>
                <select 
                  value={transferForm.item_type} 
                  onChange={e => setTransferForm({...transferForm, item_type: e.target.value as any, item_id: ''})} 
                  className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="product">Menu Product</option>
                  <option value="inventory_item">Ingredient</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Item</label>
                <select 
                  required 
                  value={transferForm.item_id} 
                  onChange={e => setTransferForm({...transferForm, item_id: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Item</option>
                  {transferForm.item_type === 'product' 
                    ? products.filter(p => p.branchId === transferForm.from_branch_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                    : inventoryItems.filter(i => i.branchId === transferForm.from_branch_id).map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                  }
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Branch</label>
                  <select 
                    required 
                    value={transferForm.from_branch_id} 
                    onChange={e => setTransferForm({...transferForm, from_branch_id: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Branch</label>
                  <select 
                    required 
                    value={transferForm.to_branch_id} 
                    onChange={e => setTransferForm({...transferForm, to_branch_id: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <FormInput label="Quantity to Transfer" type="number" value={transferForm.quantity} onChange={v => setTransferForm({...transferForm, quantity: parseFloat(v)})} />
              <SubmitButton label="Execute Transfer" />
            </form>
          </Modal>
        )}

        {viewingCodesProduct && (
          <Modal title="Product Codes" onClose={() => setViewingCodesProduct(null)}>
            <div className="space-y-8 py-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{viewingCodesProduct.name}</h3>
                <p className="text-sm text-slate-500">SKU: {viewingCodesProduct.sku || 'No SKU assigned'}</p>
              </div>

              {viewingCodesProduct.sku ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Barcode (Code128)</p>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <Barcode 
                        value={viewingCodesProduct.sku} 
                        width={1.5} 
                        height={60} 
                        fontSize={12}
                        background="transparent"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">QR Code</p>
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <QRCodeSVG 
                        value={viewingCodesProduct.sku} 
                        size={120}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-100">
                  <AlertCircle className="mx-auto text-rose-500 mb-3" size={32} />
                  <p className="text-rose-600 font-bold">No SKU Assigned</p>
                  <p className="text-rose-500 text-sm mt-1">Please edit the product and add an SKU to generate codes.</p>
                </div>
              )}

              {viewingCodesProduct.sku && (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow || !viewingCodesProduct) return;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print Barcode - ${viewingCodesProduct.name}</title>
                            <style>
                              @page { size: auto; margin: 5mm; }
                              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                              .label { text-align: center; border: 1px solid #eee; padding: 10mm; border-radius: 5mm; }
                              .name { font-weight: bold; font-size: 14pt; margin-bottom: 4mm; }
                              .sku { font-size: 10pt; color: #666; margin-top: 4mm; }
                            </style>
                          </head>
                          <body>
                            <div class="label">
                              <div class="name">${viewingCodesProduct.name}</div>
                              <div id="barcode"></div>
                              <div class="sku">${viewingCodesProduct.sku}</div>
                            </div>
                            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                            <script>
                              window.onload = () => {
                                const canvas = document.createElement('canvas');
                                JsBarcode(canvas, "${viewingCodesProduct.sku}", { width: 2, height: 80, fontSize: 0 });
                                document.getElementById('barcode').appendChild(canvas);
                                setTimeout(() => { window.print(); window.close(); }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all"
                  >
                    <Search size={18} />
                    Print Barcode
                  </button>
                  <button 
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow || !viewingCodesProduct) return;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print QR Code - ${viewingCodesProduct.name}</title>
                            <style>
                              @page { size: auto; margin: 5mm; }
                              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                              .label { text-align: center; border: 1px solid #eee; padding: 10mm; border-radius: 5mm; }
                              .name { font-weight: bold; font-size: 14pt; margin-bottom: 4mm; }
                              .sku { font-size: 10pt; color: #666; margin-top: 4mm; }
                            </style>
                          </head>
                          <body>
                            <div class="label">
                              <div class="name">${viewingCodesProduct.name}</div>
                              <div id="qrcode"></div>
                              <div class="sku">${viewingCodesProduct.sku}</div>
                            </div>
                            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
                            <script>
                              window.onload = () => {
                                const canvas = document.createElement('canvas');
                                QRCode.toCanvas(canvas, "${viewingCodesProduct.sku}", { width: 200, margin: 0 }, (err) => {
                                  if (err) console.error(err);
                                  document.getElementById('qrcode').appendChild(canvas);
                                  setTimeout(() => { window.print(); window.close(); }, 500);
                                });
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                  >
                    <Search size={18} />
                    Print QR Code
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {isBulkPrinting && (
          <Modal title="Bulk Print Codes" onClose={() => setIsBulkPrinting(false)}>
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <p className="text-sm text-indigo-700 font-medium">
                  You have selected {selectedProductIds.length} products. Choose the code type to print on A4.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setBulkPrintType('barcode')}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                    bulkPrintType === 'barcode' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-500 hover:border-indigo-200"
                  )}
                >
                  <Search size={32} />
                  <span className="font-bold">Barcodes</span>
                </button>
                <button 
                  onClick={() => setBulkPrintType('qrcode')}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                    bulkPrintType === 'qrcode' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-500 hover:border-indigo-200"
                  )}
                >
                  <Search size={32} />
                  <span className="font-bold">QR Codes</span>
                </button>
              </div>

              <button 
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;

                  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
                  
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Print Labels</title>
                        <style>
                          @page { size: A4; margin: 10mm; }
                          body { font-family: sans-serif; margin: 0; padding: 0; }
                          .grid { 
                            display: grid; 
                            grid-template-columns: repeat(3, 1fr); 
                            gap: 10mm; 
                            padding: 5mm;
                          }
                          .label { 
                            border: 1px solid #eee; 
                            padding: 5mm; 
                            text-align: center; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center;
                            justify-content: center;
                            min-height: 40mm;
                          }
                          .name { font-weight: bold; font-size: 10pt; margin-bottom: 2mm; }
                          .sku { font-size: 8pt; color: #666; margin-top: 2mm; }
                          img { max-width: 100%; height: auto; }
                        </style>
                      </head>
                      <body>
                        <div class="grid">
                          ${selectedProducts.map(p => `
                            <div class="label">
                              <div class="name">${p.name}</div>
                              <div id="code-${p.id}"></div>
                              <div class="sku">${p.sku || 'No SKU'}</div>
                            </div>
                          `).join('')}
                        </div>
                        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
                        <script>
                          window.onload = () => {
                            const products = ${JSON.stringify(selectedProducts)};
                            const type = '${bulkPrintType}';
                            
                            products.forEach(p => {
                              const container = document.getElementById('code-' + p.id);
                              if (type === 'barcode' && p.sku) {
                                const canvas = document.createElement('canvas');
                                JsBarcode(canvas, p.sku, { width: 1.5, height: 40, fontSize: 0 });
                                container.appendChild(canvas);
                              } else if (type === 'qrcode' && p.sku) {
                                const canvas = document.createElement('canvas');
                                QRCode.toCanvas(canvas, p.sku, { width: 100, margin: 0 }, (err) => {
                                  if (err) console.error(err);
                                  container.appendChild(canvas);
                                });
                              }
                            });
                            
                            setTimeout(() => {
                              window.print();
                              window.close();
                            }, 500);
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-lg"
              >
                Generate A4 Print Sheet
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={cn("flex items-center gap-2 px-6 py-4 font-bold transition-all border-b-2 whitespace-nowrap", active ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600")}>
    <Icon size={18} />
    {label}
  </button>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
      </div>
      {children}
    </motion.div>
  </div>
);

const FormInput: React.FC<{ label: string; value: any; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input required type={type} step="any" value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500" />
  </div>
);

const SubmitButton: React.FC<{ label: string }> = ({ label }) => (
  <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4">
    {label}
  </button>
);

export default Inventory;
