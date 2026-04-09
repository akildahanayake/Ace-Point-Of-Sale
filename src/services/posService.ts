import { Product, Category, Sale, SaleItem, InventoryItem, Recipe, Account, Branch, Customer, AccountTransaction, Warehouse } from '../types';

const API_URL = '/api';

async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
}

// Helper to simulate real-time updates with polling
function poll(path: string, callback: (data: any) => void, interval = 5000) {
  let active = true;
  const fetchData = async () => {
    if (!active) return;
    try {
      const data = await apiFetch(path);
      callback(data);
    } catch (error) {
      console.error(`Polling error for ${path}:`, error);
    }
    setTimeout(fetchData, interval);
  };
  fetchData();
  return () => { active = false; };
}

export const posService = {
  // Products
  subscribeToProducts: (callback: (products: Product[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=products', (data) => {
      const mapped = data.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        price: parseFloat(p.price),
        category: p.category_id.toString(),
        stock: parseInt(p.stock_quantity),
        sku: p.sku,
        image: p.image_url,
        createdAt: p.created_at,
        expiryDate: p.expiry_date,
        isPaused: p.is_paused === 1,
        branchId: p.branch_id.toString()
      }));
      callback(mapped);
    });
  },

  addProduct: async (product: Omit<Product, 'id' | 'createdAt'>) => {
    return apiFetch('/index.php?action=products', {
      method: 'POST',
      body: JSON.stringify({
        ...product,
        branch_id: product.branchId,
        category_id: product.category,
        stock_quantity: product.stock,
        image_url: product.image,
        expiry_date: product.expiryDate
      }),
    });
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    return apiFetch(`/index.php?action=update_product&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        category_id: data.category,
        stock_quantity: data.stock,
        image_url: data.image,
        expiry_date: data.expiryDate,
        is_paused: data.isPaused
      }),
    });
  },

  deleteProduct: async (id: string) => {
    return apiFetch(`/index.php?action=delete_product&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  subscribeToCategories: (callback: (categories: Category[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=categories', (data) => {
      const mapped = data.map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        color: c.color
      }));
      callback(mapped);
    });
  },

  addCategory: async (category: Omit<Category, 'id'>) => {
    return apiFetch('/index.php?action=categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  // Sales
  processCheckout: async (items: SaleItem[], total: number, paymentMethod: string, branchId: string, userId: string, customerId?: string) => {
    return apiFetch('/index.php?action=checkout', {
      method: 'POST',
      body: JSON.stringify({
        branch_id: branchId,
        user_id: userId,
        customer_id: customerId,
        items,
        total,
        payment_method: paymentMethod
      }),
    });
  },

  subscribeToSales: (callback: (sales: Sale[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=sales', (data) => {
      const mapped = data.map((s: any) => ({
        id: s.id.toString(),
        total: parseFloat(s.grand_total),
        subtotal: parseFloat(s.subtotal),
        tax: parseFloat(s.tax_amount || 0),
        paymentMethod: s.payment_method,
        timestamp: { toDate: () => new Date(s.created_at) },
        items: []
      }));
      callback(mapped);
    });
  },

  // Inventory Items
  subscribeToInventoryItems: (callback: (items: InventoryItem[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=inventory_items', (data) => {
      const mapped = data.map((i: any) => ({
        id: i.id.toString(),
        name: i.name,
        baseUnit: i.base_unit,
        cost: parseFloat(i.cost),
        stock: parseFloat(i.stock),
        branchId: i.branch_id?.toString()
      }));
      callback(mapped);
    });
  },

  addInventoryItem: async (item: Omit<InventoryItem, 'id'>) => {
    return apiFetch('/index.php?action=inventory_items', {
      method: 'POST',
      body: JSON.stringify({
        ...item,
        branch_id: item.branchId,
        base_unit: item.baseUnit
      }),
    });
  },

  updateInventoryItem: async (id: string, data: Partial<InventoryItem>) => {
    return apiFetch(`/index.php?action=update_inventory_item&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        base_unit: data.baseUnit
      }),
    });
  },

  deleteInventoryItem: async (id: string) => {
    return apiFetch(`/index.php?action=delete_inventory_item&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Recipes
  subscribeToRecipes: (callback: (recipes: Recipe[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=recipes', (data) => {
      const mapped = data.map((r: any) => ({
        id: r.id.toString(),
        productId: r.product_id.toString(),
        inventoryItemId: r.inventory_item_id.toString(),
        quantity: parseFloat(r.quantity)
      }));
      callback(mapped);
    });
  },

  addRecipe: async (recipe: Omit<Recipe, 'id'>) => {
    return apiFetch('/index.php?action=recipes', {
      method: 'POST',
      body: JSON.stringify({
        product_id: recipe.productId,
        inventory_item_id: recipe.inventoryItemId,
        quantity: recipe.quantity
      }),
    });
  },

  updateRecipe: async (id: string, data: Partial<Recipe>) => {
    return apiFetch(`/index.php?action=update_recipe&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        product_id: data.productId,
        inventory_item_id: data.inventoryItemId,
        quantity: data.quantity
      }),
    });
  },

  deleteRecipe: async (id: string) => {
    return apiFetch(`/index.php?action=delete_recipe&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Work Periods
  startWorkPeriod: async (userId: string) => {
    return apiFetch('/index.php?action=work_periods', {
      method: 'POST',
      body: JSON.stringify({ action: 'start', branch_id: 1, user_id: userId }),
    });
  },

  endWorkPeriod: async (id: string, userId: string) => {
    return apiFetch('/index.php?action=work_periods', {
      method: 'POST',
      body: JSON.stringify({ action: 'end', id, user_id: userId }),
    });
  },

  // Accounts
  subscribeToAccounts: (callback: (accounts: Account[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=accounts', (data) => {
      const mapped = data.map((a: any) => ({
        id: a.id.toString(),
        branch_id: a.branch_id.toString(),
        name: a.name,
        type: a.type,
        balance: parseFloat(a.balance)
      }));
      callback(mapped);
    });
  },

  addAccount: async (account: Omit<Account, 'id'>) => {
    return apiFetch('/index.php?action=accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  },

  // Branches
  subscribeToBranches: (callback: (branches: Branch[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=branches', (data) => {
      const mapped = data.map((b: any) => ({
        id: b.id.toString(),
        name: b.name,
        address: b.address,
        phone: b.phone,
        email: b.email,
        isActive: b.is_active === 1
      }));
      callback(mapped);
    });
  },

  addBranch: async (branch: Omit<Branch, 'id'>) => {
    return apiFetch('/index.php?action=branches', {
      method: 'POST',
      body: JSON.stringify(branch),
    });
  },

  updateBranch: async (id: string, data: Partial<Branch>) => {
    return apiFetch(`/index.php?action=update_branch&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteBranch: async (id: string) => {
    return apiFetch(`/index.php?action=delete_branch&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Customers
  subscribeToCustomers: (callback: (customers: Customer[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=customers', (data) => {
      const mapped = data.map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        loyaltyPoints: parseInt(c.loyalty_points)
      }));
      callback(mapped);
    });
  },

  addCustomer: async (customer: Omit<Customer, 'id'>) => {
    return apiFetch('/index.php?action=customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },

  // Transactions
  subscribeToTransactions: (accountId: string, callback: (transactions: AccountTransaction[]) => void, onError?: (error: any) => void) => {
    return poll(`/index.php?action=transactions&accountId=${accountId}`, (data) => {
      const mapped = data.map((tx: any) => ({
        ...tx,
        id: tx.id.toString(),
        debit: parseFloat(tx.debit),
        credit: parseFloat(tx.credit),
        createdAt: { toDate: () => new Date(tx.created_at) }
      }));
      callback(mapped);
    });
  },

  addTransaction: async (transaction: Omit<AccountTransaction, 'id' | 'createdAt'>) => {
    return apiFetch('/index.php?action=transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  // Warehouses
  subscribeToWarehouses: (callback: (warehouses: Warehouse[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=warehouses', (data) => {
      const mapped = data.map((w: any) => ({
        id: w.id.toString(),
        name: w.name,
        location: w.location,
        branchId: w.branch_id.toString()
      }));
      callback(mapped);
    });
  },

  addWarehouse: async (warehouse: Omit<Warehouse, 'id'>) => {
    return apiFetch('/index.php?action=warehouses', {
      method: 'POST',
      body: JSON.stringify({
        ...warehouse,
        branch_id: warehouse.branchId
      }),
    });
  },

  updateWarehouse: async (id: string, data: Partial<Warehouse>) => {
    return apiFetch(`/index.php?action=update_warehouse&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteWarehouse: async (id: string) => {
    return apiFetch(`/index.php?action=delete_warehouse&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Stock Adjustments
  subscribeToStockAdjustments: (callback: (adjustments: any[]) => void) => {
    return poll('/index.php?action=stock_adjustments', callback);
  },

  addStockAdjustment: async (adjustment: { item_id: string; item_type: 'product' | 'inventory_item'; quantity: number; reason: string; user_id: string; branch_id: string }) => {
    return apiFetch('/index.php?action=stock_adjustments', {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
  },

  // Stock Transfers
  subscribeToStockTransfers: (callback: (transfers: any[]) => void) => {
    return poll('/index.php?action=stock_transfers', callback);
  },

  addStockTransfer: async (transfer: { item_id: string; item_type: 'product' | 'inventory_item'; from_branch_id: string; to_branch_id: string; quantity: number; user_id: string }) => {
    return apiFetch('/index.php?action=stock_transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  }
};
