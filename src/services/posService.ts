import { Product, Category, Sale, SaleItem, InventoryItem, Recipe, Account, Branch, Customer, AccountTransaction, Warehouse, User, Settings, CryptoWallet } from '../types';

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
        price: parseFloat(p.price) || 0,
        category: p.category_id.toString(),
        stock: parseInt(p.stock_quantity) || 0,
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

  voidSale: async (id: string) => {
    return apiFetch(`/index.php?action=void_sale&id=${id}`, {
      method: 'POST',
    });
  },

  deleteSale: async (id: string) => {
    return apiFetch(`/index.php?action=delete_sale&id=${id}`, {
      method: 'DELETE',
    });
  },

  getSales: async (): Promise<Sale[]> => {
    const data = await apiFetch('/index.php?action=sales');
    return data.map((s: any) => ({
      id: s.id.toString(),
      orderNumber: s.order_number,
      total: parseFloat(s.grand_total) || 0,
      subtotal: parseFloat(s.subtotal) || 0,
      tax: parseFloat(s.tax_amount || 0) || 0,
      paymentMethod: s.payment_method,
      timestamp: { toDate: () => new Date(s.created_at) },
      status: s.status,
      branch_id: s.branch_id,
      items: s.items ? s.items.map((item: any) => ({
        productId: item.product_id.toString(),
        name: item.name,
        price: parseFloat(item.unit_price),
        quantity: parseInt(item.quantity),
        tags: item.tags ? JSON.parse(item.tags) : []
      })) : []
    }));
  },

  subscribeToSales: (callback: (sales: Sale[]) => void, onError?: (error: any) => void) => {
    return poll('/index.php?action=sales', (data) => {
      const mapped = data.map((s: any) => ({
        id: s.id.toString(),
        orderNumber: s.order_number,
        total: parseFloat(s.grand_total) || 0,
        subtotal: parseFloat(s.subtotal) || 0,
        tax: parseFloat(s.tax_amount || 0) || 0,
        paymentMethod: s.payment_method,
        timestamp: { toDate: () => new Date(s.created_at) },
        status: s.status,
        branch_id: s.branch_id,
        items: s.items ? s.items.map((item: any) => ({
          productId: item.product_id.toString(),
          name: item.name,
          price: parseFloat(item.unit_price),
          quantity: parseInt(item.quantity),
          tags: item.tags ? JSON.parse(item.tags) : []
        })) : []
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
        cost: parseFloat(i.cost) || 0,
        stock: parseFloat(i.stock) || 0,
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
  subscribeToAccounts: (callback: (accounts: Account[]) => void, branchId?: string, onError?: (error: any) => void) => {
    const url = branchId ? `/index.php?action=accounts&branchId=${branchId}` : '/index.php?action=accounts';
    return poll(url, (data) => {
      const mapped = data.map((a: any) => ({
        id: a.id.toString(),
        branch_id: a.branch_id.toString(),
        name: a.name,
        type: a.type,
        balance: parseFloat(a.balance) || 0
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

  deleteAccount: async (id: string) => {
    return apiFetch(`/index.php?action=delete_account&id=${id}`, {
      method: 'DELETE',
    });
  },

  updateAccountBalance: async (id: string, balance: number) => {
    return apiFetch(`/index.php?action=update_account_balance&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ balance }),
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
        isActive: b.is_active === 1,
        receiptTemplate: b.receipt_template
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
        debit: parseFloat(tx.debit) || 0,
        credit: parseFloat(tx.credit) || 0,
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
  },

  // Users
  login: async (email: string, password: string): Promise<User> => {
    return apiFetch('/index.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  subscribeToUsers: (callback: (users: User[]) => void) => {
    return poll('/index.php?action=users', (data) => {
      const mapped = data.map((u: any) => ({
        id: u.id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        address: u.address,
        empNo: u.emp_no,
        idNumber: u.id_number,
        username: u.username,
        password: u.password,
        joinedDate: u.joined_date,
        branchIds: u.branch_ids ? JSON.parse(u.branch_ids) : [],
        isActive: Boolean(parseInt(u.is_active))
      }));
      callback(mapped);
    });
  },

  addUser: async (user: Omit<User, 'id'>) => {
    return apiFetch('/index.php?action=users', {
      method: 'POST',
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        emp_no: user.empNo,
        id_number: user.idNumber,
        username: user.username,
        password: user.password,
        joined_date: user.joinedDate,
        branch_ids: JSON.stringify(user.branchIds),
        is_active: user.isActive ? 1 : 0
      }),
    });
  },

  updateUser: async (id: string, user: Partial<User>) => {
    const body: any = {};
    if (user.name !== undefined) body.name = user.name;
    if (user.email !== undefined) body.email = user.email;
    if (user.role !== undefined) body.role = user.role;
    if (user.phone !== undefined) body.phone = user.phone;
    if (user.address !== undefined) body.address = user.address;
    if (user.empNo !== undefined) body.emp_no = user.empNo;
    if (user.idNumber !== undefined) body.id_number = user.idNumber;
    if (user.username !== undefined) body.username = user.username;
    if (user.password !== undefined) body.password = user.password;
    if (user.joinedDate !== undefined) body.joined_date = user.joinedDate;
    if (user.branchIds !== undefined) body.branch_ids = JSON.stringify(user.branchIds);
    if (user.isActive !== undefined) body.is_active = user.isActive ? 1 : 0;
    
    return apiFetch(`/index.php?action=update_user&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  deleteUser: async (id: string) => {
    return apiFetch(`/index.php?action=delete_user&id=${id}`, {
      method: 'DELETE',
    });
  },

  exportData: async () => {
    return apiFetch('/index.php?action=export_data', {
      method: 'GET',
    });
  },

  importData: async (data: any) => {
    return apiFetch('/index.php?action=import_data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  exportSql: async () => {
    const response = await fetch('/api/index.php?action=export_sql');
    if (!response.ok) throw new Error('Failed to export SQL');
    return response.text();
  },

  importSql: async (sql: string) => {
    return apiFetch('/index.php?action=import_sql', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
  },

  getSettings: async () => {
    return apiFetch('/index.php?action=settings');
  },

  updateSettings: async (settings: any) => {
    return apiFetch('/index.php?action=settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Crypto Wallets
  subscribeToCryptoWallets: (callback: (wallets: CryptoWallet[]) => void) => {
    return poll('/index.php?action=crypto_wallets', (data) => {
      const mapped = data.map((w: any) => ({
        id: w.id.toString(),
        name: w.name,
        network: w.network,
        address: w.address,
        qrCodeUrl: w.qr_code_url
      }));
      callback(mapped);
    });
  },

  addCryptoWallet: async (wallet: Omit<CryptoWallet, 'id'>) => {
    return apiFetch('/index.php?action=crypto_wallets', {
      method: 'POST',
      body: JSON.stringify(wallet),
    });
  },

  updateCryptoWallet: async (id: string, data: Partial<CryptoWallet>) => {
    return apiFetch(`/index.php?action=update_crypto_wallet&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCryptoWallet: async (id: string) => {
    return apiFetch(`/index.php?action=delete_crypto_wallet&id=${id}`, {
      method: 'DELETE',
    });
  },

  uploadQrCode: async (file: File) => {
    const formData = new FormData();
    formData.append('qr_code', file);
    const response = await fetch(`${API_URL}/index.php?action=upload_qr`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload QR code');
    return response.json();
  }
};
