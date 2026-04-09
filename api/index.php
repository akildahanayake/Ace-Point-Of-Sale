<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// Ensure receipt_template column exists in branches table
try {
    $pdo->exec("ALTER TABLE branches ADD COLUMN IF NOT EXISTS receipt_template TEXT");
} catch (Exception $e) {}

// Ensure crypto_wallets table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS crypto_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        network TEXT NOT NULL,
        address TEXT NOT NULL,
        qr_code_url TEXT,
        is_active INTEGER DEFAULT 1
    )");
} catch (Exception $e) {}

// Ensure orders and order_items have necessary columns
try {
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount FLOAT DEFAULT 0");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_charge_amount FLOAT DEFAULT 0");
    $pdo->exec("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT");
    $pdo->exec("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tags TEXT");
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'products':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM products WHERE is_active = 1 ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO products (branch_id, category_id, name, sku, price, cost, stock_quantity, image_url, expiry_date, is_paused, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['branch_id'], $data['category_id'], $data['name'], $data['sku'], 
                    $data['price'], $data['cost'], $data['stock_quantity'], $data['image_url'],
                    $data['expiry_date'] ?? null
                ]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_product':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE products SET name = ?, price = ?, category_id = ?, stock_quantity = ?, sku = ?, image_url = ?, expiry_date = ?, is_paused = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['name'], $data['price'], $data['category_id'], 
                    $data['stock_quantity'], $data['sku'], $data['image_url'],
                    $data['expiry_date'] ?? null, $data['is_paused'] ? 1 : 0, $id
                ]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_product':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $sql = "UPDATE products SET is_active = 0 WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'categories':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM categories ORDER BY name");
                echo json_encode($stmt->fetchAll());
            }
            break;

        case 'branches':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM branches ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO branches (name, address, phone, email, receipt_template, is_active) VALUES (?, ?, ?, ?, ?, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['name'], $data['address'], $data['phone'], 
                    $data['email'], $data['receiptTemplate'] ?? null
                ]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_branch':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE branches SET name = ?, address = ?, phone = ?, email = ?, receipt_template = ?, is_active = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['name'], $data['address'], $data['phone'], 
                    $data['email'], $data['receiptTemplate'] ?? null,
                    $data['isActive'] ? 1 : 0, $id
                ]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_branch':
            if ($method === 'DELETE') {
                $id = $_GET['id'] ?? 0;
                $sql = "UPDATE branches SET is_active = 0 WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'crypto_wallets':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM crypto_wallets WHERE is_active = 1 ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO crypto_wallets (name, network, address, qr_code_url) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['name'], $data['network'], $data['address'], $data['qr_code_url'] ?? null]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_crypto_wallet':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE crypto_wallets SET name = ?, network = ?, address = ?, qr_code_url = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['name'], $data['network'], $data['address'], $data['qr_code_url'] ?? null, $id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_crypto_wallet':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $sql = "UPDATE crypto_wallets SET is_active = 0 WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'upload_qr':
            if ($method === 'POST') {
                if (!isset($_FILES['qr_code'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No file uploaded']);
                    break;
                }
                $file = $_FILES['qr_code'];
                $uploadDir = '../uploads/qr/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }
                $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
                $fileName = uniqid() . '.' . $ext;
                $targetPath = $uploadDir . $fileName;
                if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                    echo json_encode(['url' => '/uploads/qr/' . $fileName]);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to move uploaded file']);
                }
            }
            break;

        case 'settings':
            // Ensure settings table exists
            $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY,
                company_name TEXT,
                company_trn TEXT,
                address TEXT,
                phone TEXT,
                email TEXT,
                whatsapp TEXT,
                facebook TEXT,
                instagram TEXT,
                currency_name TEXT,
                currency_sign TEXT,
                currency_prefix INT DEFAULT 1,
                tax_percentage FLOAT DEFAULT 0,
                service_charge FLOAT DEFAULT 0,
                btc_address TEXT,
                eth_address TEXT,
                usdt_erc20_address TEXT,
                usdt_trc20_address TEXT,
                default_bill_printer_id INT
            )");

            // Check if default settings exist
            $stmt = $pdo->query("SELECT COUNT(*) FROM settings");
            if ($stmt->fetchColumn() == 0) {
                $pdo->exec("INSERT INTO settings (id, company_name, currency_name, currency_sign, tax_percentage) VALUES (1, 'Ace Point Of Sale', 'US Dollar', '$', 10)");
            }

            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1");
                echo json_encode($stmt->fetch() ?: (object)[]);
            } elseif ($method === 'POST' || $method === 'PUT') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE settings SET 
                    company_name = ?, company_trn = ?, address = ?, phone = ?, 
                    email = ?, whatsapp = ?, facebook = ?, instagram = ?, 
                    currency_name = ?, currency_sign = ?, currency_prefix = ?, 
                    tax_percentage = ?, service_charge = ?,
                    btc_address = ?, eth_address = ?, usdt_erc20_address = ?, 
                    usdt_trc20_address = ?, default_bill_printer_id = ?
                    WHERE id = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['company_name'], $data['company_trn'], $data['address'], $data['phone'], 
                    $data['email'], $data['whatsapp'], $data['facebook'], $data['instagram'], 
                    $data['currency_name'], $data['currency_sign'], $data['currency_prefix'] ? 1 : 0, 
                    $data['tax_percentage'], $data['service_charge'],
                    $data['btc_address'] ?? null, $data['eth_address'] ?? null, 
                    $data['usdt_erc20_address'] ?? null, $data['usdt_trc20_address'] ?? null,
                    $data['default_bill_printer_id'] ?? null
                ]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'customers':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM customers ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO customers (branch_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['branch_id'], $data['name'], $data['email'], $data['phone'], $data['address']]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'checkout':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                
                // Get tax rate from settings
                $stmtSettings = $pdo->query("SELECT tax_percentage FROM settings WHERE id = 1");
                $taxRate = $stmtSettings->fetchColumn() ?: 10;
                $taxFactor = 1 + ($taxRate / 100);

                $pdo->beginTransaction();
                try {
                    $orderNumber = 'ORD-' . time();
                    $taxAmount = $data['total'] - ($data['total'] / $taxFactor);
                    $serviceChargeAmount = ($data['total'] / $taxFactor) * ($serviceChargeRate / 100);
                    
                    $sqlOrder = "INSERT INTO orders (branch_id, user_id, customer_id, order_number, subtotal, grand_total, tax_amount, service_charge_amount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')";
                    $stmtOrder = $pdo->prepare($sqlOrder);
                    $stmtOrder->execute([
                        $data['branch_id'], $data['user_id'], $data['customer_id'] ?? null, $orderNumber, 
                        $data['total'] / $taxFactor, $data['total'], $taxAmount, $serviceChargeAmount, $data['payment_method']
                    ]);
                    $orderId = $pdo->lastInsertId();

                    foreach ($data['items'] as $item) {
                        $sqlItem = "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, tags) VALUES (?, ?, ?, ?, ?, ?, ?)";
                        $stmtItem = $pdo->prepare($sqlItem);
                        $stmtItem->execute([
                            $orderId, $item['productId'], $item['name'], $item['quantity'], 
                            $item['price'], $item['price'] * $item['quantity'],
                            isset($item['tags']) ? json_encode($item['tags']) : null
                        ]);

                        $sqlStock = "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?";
                        $stmtStock = $pdo->prepare($sqlStock);
                        $stmtStock->execute([$item['quantity'], $item['productId']]);
                    }

                    // Update customer points (1 point per $1)
                    if (isset($data['customer_id']) && $data['customer_id']) {
                        $points = floor($data['total']);
                        $sqlPoints = "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?";
                        $stmtPoints = $pdo->prepare($sqlPoints);
                        $stmtPoints->execute([$points, $data['customer_id']]);
                    }

                    // Update Branch Accounts
                    $paymentMethod = $data['payment_method'];
                    $accountName = ucfirst($paymentMethod);
                    if ($paymentMethod === 'digital_wallet') $accountName = 'Wallet';
                    
                    // Find or create account
                    $stmtAcc = $pdo->prepare("SELECT id FROM accounts WHERE branch_id = ? AND (name = ? OR type = ?)");
                    $stmtAcc->execute([$data['branch_id'], $accountName, $paymentMethod]);
                    $account = $stmtAcc->fetch();
                    
                    if (!$account) {
                        $stmtNewAcc = $pdo->prepare("INSERT INTO accounts (branch_id, name, type, balance) VALUES (?, ?, ?, 0)");
                        $stmtNewAcc->execute([$data['branch_id'], $accountName, $paymentMethod]);
                        $accountId = $pdo->lastInsertId();
                    } else {
                        $accountId = $account['id'];
                    }

                    // Record Transaction
                    $stmtTx = $pdo->prepare("INSERT INTO account_transactions (account_id, credit, description) VALUES (?, ?, ?)");
                    $stmtTx->execute([$accountId, $data['total'], "Sale #$orderNumber"]);

                    // Update Balance
                    $stmtBal = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
                    $stmtBal->execute([$data['total'], $accountId]);

                    $pdo->commit();
                    echo json_encode(['success' => true, 'orderId' => $orderId]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
            }
            break;

        case 'void_sale':
            if ($method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $pdo->beginTransaction();
                try {
                    // Get sale details
                    $stmtSale = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
                    $stmtSale->execute([$id]);
                    $sale = $stmtSale->fetch();
                    
                    if (!$sale || $sale['status'] === 'void') {
                        throw new Exception("Sale not found or already voided");
                    }

                    // 1. Update sale status
                    $stmtVoid = $pdo->prepare("UPDATE orders SET status = 'void' WHERE id = ?");
                    $stmtVoid->execute([$id]);

                    // 2. Restore stock
                    $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
                    $stmtItems->execute([$id]);
                    $items = $stmtItems->fetchAll();
                    
                    foreach ($items as $item) {
                        $stmtStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
                        $stmtStock->execute([$item['quantity'], $item['product_id']]);
                    }

                    // 3. Reverse account transaction
                    $paymentMethod = $sale['payment_method'];
                    $accountName = ucfirst($paymentMethod);
                    if ($paymentMethod === 'digital_wallet') $accountName = 'Wallet';

                    $stmtAcc = $pdo->prepare("SELECT id FROM accounts WHERE branch_id = ? AND (name = ? OR type = ?)");
                    $stmtAcc->execute([$sale['branch_id'], $accountName, $paymentMethod]);
                    $account = $stmtAcc->fetch();

                    if ($account) {
                        $accountId = $account['id'];
                        // Record Reversal Transaction
                        $stmtTx = $pdo->prepare("INSERT INTO account_transactions (account_id, debit, description) VALUES (?, ?, ?)");
                        $stmtTx->execute([$accountId, $sale['grand_total'], "Void Sale #{$sale['order_number']}"]);

                        // Update Balance
                        $stmtBal = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
                        $stmtBal->execute([$sale['grand_total'], $accountId]);
                    }

                    $pdo->commit();
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
            }
            break;

        case 'delete_sale':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $pdo->beginTransaction();
                try {
                    // Delete order items first
                    $stmtItems = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
                    $stmtItems->execute([$id]);
                    
                    // Delete order
                    $stmtOrder = $pdo->prepare("DELETE FROM orders WHERE id = ?");
                    $stmtOrder->execute([$id]);
                    
                    $pdo->commit();
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
            }
            break;

        case 'inventory_items':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM inventory_items WHERE is_active = 1 ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO inventory_items (branch_id, name, base_unit, cost, stock, is_active) VALUES (?, ?, ?, ?, ?, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['branch_id'], $data['name'], $data['base_unit'], $data['cost'], $data['stock'] ?? 0]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_inventory_item':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE inventory_items SET name = ?, base_unit = ?, cost = ?, stock = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['name'], $data['base_unit'], $data['cost'], $data['stock'], $id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_inventory_item':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $sql = "UPDATE inventory_items SET is_active = 0 WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'recipes':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM recipes WHERE is_active = 1");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO recipes (product_id, inventory_item_id, quantity, is_active) VALUES (?, ?, ?, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['product_id'], $data['inventory_item_id'], $data['quantity']]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_recipe':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE recipes SET product_id = ?, inventory_item_id = ?, quantity = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['product_id'], $data['inventory_item_id'], $data['quantity'], $id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_recipe':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $sql = "UPDATE recipes SET is_active = 0 WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'accounts':
            if ($method === 'GET') {
                $branchId = $_GET['branchId'] ?? null;
                if ($branchId) {
                    $stmt = $pdo->prepare("SELECT * FROM accounts WHERE branch_id = ? ORDER BY name");
                    $stmt->execute([$branchId]);
                } else {
                    $stmt = $pdo->query("SELECT * FROM accounts ORDER BY name");
                }
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO accounts (branch_id, name, type, balance) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['branch_id'], $data['name'], $data['type'], $data['balance']]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_account_balance':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE accounts SET balance = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['balance'], $id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_account':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $pdo->beginTransaction();
                try {
                    // Delete transactions first
                    $stmtTx = $pdo->prepare("DELETE FROM account_transactions WHERE account_id = ?");
                    $stmtTx->execute([$id]);
                    
                    // Delete account
                    $stmtAcc = $pdo->prepare("DELETE FROM accounts WHERE id = ?");
                    $stmtAcc->execute([$id]);
                    
                    $pdo->commit();
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
            }
            break;

        case 'transactions':
            if ($method === 'GET') {
                $accountId = $_GET['accountId'] ?? 0;
                $stmt = $pdo->prepare("SELECT * FROM account_transactions WHERE account_id = ? ORDER BY created_at DESC");
                $stmt->execute([$accountId]);
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO account_transactions (account_id, debit, credit, description) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['account_id'], $data['debit'], $data['credit'], $data['description']]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'work_periods':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                if (isset($data['action']) && $data['action'] === 'start') {
                    $sql = "INSERT INTO work_periods (branch_id, user_id_start, status) VALUES (?, ?, 'open')";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['branch_id'], $data['user_id']]);
                    echo json_encode(['id' => $pdo->lastInsertId()]);
                } elseif (isset($data['action']) && $data['action'] === 'end') {
                    $sql = "UPDATE work_periods SET user_id_end = ?, end_time = CURRENT_TIMESTAMP, status = 'closed' WHERE id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$data['user_id'], $data['id']]);
                    echo json_encode(['success' => true]);
                }
            }
            break;

        case 'sales':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
                $sales = $stmt->fetchAll();
                
                foreach ($sales as &$sale) {
                    $stmtItems = $pdo->prepare("SELECT oi.*, COALESCE(p.name, oi.product_name, 'Unknown Product') as name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
                    $stmtItems->execute([$sale['id']]);
                    $sale['items'] = $stmtItems->fetchAll();
                }
                
                echo json_encode($sales);
            }
            break;

        case 'warehouses':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM warehouses WHERE is_active = 1 ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO warehouses (branch_id, name, location, is_active) VALUES (?, ?, ?, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['branch_id'], $data['name'], $data['location'] ?? '']);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_warehouse':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE warehouses SET name = ?, location = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['name'], $data['location'], $id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_warehouse':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $sql = "UPDATE warehouses SET is_active = 0 WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'stock_adjustments':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM stock_adjustments ORDER BY created_at DESC");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $pdo->beginTransaction();
                try {
                    $sql = "INSERT INTO stock_adjustments (item_id, item_type, quantity, reason, user_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $data['item_id'], $data['item_type'], $data['quantity'], 
                        $data['reason'], $data['user_id'], $data['branch_id']
                    ]);
                    
                    $table = $data['item_type'] === 'product' ? 'products' : 'inventory_items';
                    $column = $data['item_type'] === 'product' ? 'stock_quantity' : 'stock';
                    
                    $sqlUpdate = "UPDATE $table SET $column = $column + ? WHERE id = ?";
                    $stmtUpdate = $pdo->prepare($sqlUpdate);
                    $stmtUpdate->execute([$data['quantity'], $data['item_id']]);
                    
                    $pdo->commit();
                    echo json_encode(['id' => $pdo->lastInsertId()]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
            }
            break;

        case 'stock_transfers':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM stock_transfers ORDER BY created_at DESC");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $pdo->beginTransaction();
                try {
                    $table = $data['item_type'] === 'product' ? 'products' : 'inventory_items';
                    $column = $data['item_type'] === 'product' ? 'stock_quantity' : 'stock';
                    
                    // 1. Get source item details
                    $stmtSource = $pdo->prepare("SELECT * FROM $table WHERE id = ? AND branch_id = ?");
                    $stmtSource->execute([$data['item_id'], $data['from_branch_id']]);
                    $sourceItem = $stmtSource->fetch();
                    
                    if (!$sourceItem) {
                        throw new Exception("Source item not found in specified branch");
                    }

                    // 2. Find or create destination item
                    $destItemId = null;
                    if ($data['item_type'] === 'product') {
                        $stmtDest = $pdo->prepare("SELECT id FROM products WHERE branch_id = ? AND (sku = ? OR name = ?)");
                        $stmtDest->execute([$data['to_branch_id'], $sourceItem['sku'], $sourceItem['name']]);
                    } else {
                        $stmtDest = $pdo->prepare("SELECT id FROM inventory_items WHERE branch_id = ? AND name = ?");
                        $stmtDest->execute([$data['to_branch_id'], $sourceItem['name']]);
                    }
                    $destItem = $stmtDest->fetch();

                    if ($destItem) {
                        $destItemId = $destItem['id'];
                        // Update existing
                        $stmtUpdateDest = $pdo->prepare("UPDATE $table SET $column = $column + ? WHERE id = ?");
                        $stmtUpdateDest->execute([$data['quantity'], $destItemId]);
                    } else {
                        // Create new in destination branch
                        if ($data['item_type'] === 'product') {
                            $stmtInsertDest = $pdo->prepare("INSERT INTO products (branch_id, name, price, category_id, stock_quantity, sku, image_url, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                            $stmtInsertDest->execute([
                                $data['to_branch_id'], $sourceItem['name'], $sourceItem['price'], 
                                $sourceItem['category_id'], $data['quantity'], $sourceItem['sku'], 
                                $sourceItem['image_url'], $sourceItem['expiry_date']
                            ]);
                        } else {
                            $stmtInsertDest = $pdo->prepare("INSERT INTO inventory_items (branch_id, name, base_unit, cost, stock) VALUES (?, ?, ?, ?, ?)");
                            $stmtInsertDest->execute([
                                $data['to_branch_id'], $sourceItem['name'], $sourceItem['base_unit'], 
                                $sourceItem['cost'], $data['quantity']
                            ]);
                        }
                        $destItemId = $pdo->lastInsertId();
                    }

                    // 3. Deduct from source
                    $stmtDeduct = $pdo->prepare("UPDATE $table SET $column = $column - ? WHERE id = ?");
                    $stmtDeduct->execute([$data['quantity'], $data['item_id']]);

                    // 4. Record transfer
                    $sql = "INSERT INTO stock_transfers (item_id, item_type, from_branch_id, to_branch_id, quantity, user_id) VALUES (?, ?, ?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $data['item_id'], $data['item_type'], $data['from_branch_id'], 
                        $data['to_branch_id'], $data['quantity'], $data['user_id']
                    ]);
                    
                    $pdo->commit();
                    echo json_encode(['id' => $pdo->lastInsertId()]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(['error' => $e->getMessage()]);
                }
            }
            break;

        case 'users':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM users ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                
                // Check for duplicate emp_no
                if (isset($data['emp_no']) && $data['emp_no']) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE emp_no = ?");
                    $stmtCheck->execute([$data['emp_no']]);
                    if ($stmtCheck->fetch()) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Employee number already exists']);
                        break;
                    }
                }

                // Check for duplicate username
                if (isset($data['username']) && $data['username']) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE username = ?");
                    $stmtCheck->execute([$data['username']]);
                    if ($stmtCheck->fetch()) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Username already exists']);
                        break;
                    }
                }

                $sql = "INSERT INTO users (name, email, role, phone, address, emp_no, id_number, username, password, joined_date, branch_ids, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['name'], $data['email'], $data['role'], $data['phone'] ?? null,
                    $data['address'] ?? null, $data['emp_no'] ?? null, $data['id_number'] ?? null,
                    $data['username'] ?? null, $data['password'] ?? null,
                    $data['joined_date'] ?? null, $data['branch_ids'] ?? '[]', $data['is_active'] ?? 1
                ]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_user':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                
                // Check for duplicate emp_no
                if (isset($data['emp_no']) && $data['emp_no']) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE emp_no = ? AND id != ?");
                    $stmtCheck->execute([$data['emp_no'], $id]);
                    if ($stmtCheck->fetch()) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Employee number already exists']);
                        break;
                    }
                }

                // Check for duplicate username
                if (isset($data['username']) && $data['username']) {
                    $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                    $stmtCheck->execute([$data['username'], $id]);
                    if ($stmtCheck->fetch()) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Username already exists']);
                        break;
                    }
                }

                // Get current user for partial updates
                $stmtCurrent = $pdo->prepare("SELECT * FROM users WHERE id = ?");
                $stmtCurrent->execute([$id]);
                $currentUser = $stmtCurrent->fetch();
                
                if (!$currentUser) {
                    http_response_code(404);
                    echo json_encode(['error' => 'User not found']);
                    break;
                }

                $sql = "UPDATE users SET name = ?, email = ?, role = ?, phone = ?, address = ?, emp_no = ?, id_number = ?, username = ?, password = ?, joined_date = ?, branch_ids = ?, is_active = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['name'] ?? $currentUser['name'],
                    $data['email'] ?? $currentUser['email'],
                    $data['role'] ?? $currentUser['role'],
                    $data['phone'] ?? $currentUser['phone'],
                    $data['address'] ?? $currentUser['address'],
                    $data['emp_no'] ?? $currentUser['emp_no'],
                    $data['id_number'] ?? $currentUser['id_number'],
                    $data['username'] ?? $currentUser['username'],
                    $data['password'] ?? $currentUser['password'],
                    $data['joined_date'] ?? $currentUser['joined_date'],
                    $data['branch_ids'] ?? $currentUser['branch_ids'],
                    isset($data['is_active']) ? $data['is_active'] : $currentUser['is_active'],
                    $id
                ]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'delete_user':
            if ($method === 'DELETE' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $sql = "DELETE FROM users WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id]);
                echo json_encode(['success' => true]);
            }
            break;

        case 'login':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND password = ? AND is_active = 1");
                $stmt->execute([$data['email'], $data['password']]);
                $u = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($u) {
                    echo json_encode([
                        'id' => $u['id'],
                        'name' => $u['name'],
                        'email' => $u['email'],
                        'role' => $u['role'],
                        'branchIds' => $u['branch_ids'] ? json_decode($u['branch_ids']) : [],
                        'isActive' => $u['is_active'] == 1,
                        'empNo' => $u['emp_no'],
                        'joinedDate' => $u['joined_date']
                    ]);
                } else {
                    http_response_code(401);
                    echo json_encode(['error' => 'Invalid credentials']);
                }
            }
            break;

        case 'export_sql':
            if ($method === 'GET') {
                try {
                    $stmt = $pdo->query("SHOW TABLES");
                    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    
                    $sqlDump = "SET FOREIGN_KEY_CHECKS = 0;\n";
                    foreach ($tables as $table) {
                        $sqlDump .= "\n-- Table: $table\n";
                        $sqlDump .= "DELETE FROM `$table`;\n";
                        
                        $stmt = $pdo->query("SELECT * FROM `$table` ");
                        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        if (count($rows) > 0) {
                            $keys = array_keys($rows[0]);
                            $columns = implode(', ', array_map(function($c) { return "`$c`"; }, $keys));
                            
                            foreach ($rows as $row) {
                                $values = array_map(function($val) {
                                    if ($val === null) return 'NULL';
                                    return "'" . str_replace("'", "''", $val) . "'";
                                }, array_values($row));
                                $sqlDump .= "INSERT INTO `$table` ($columns) VALUES (" . implode(', ', $values) . ");\n";
                            }
                        }
                    }
                    $sqlDump .= "\nSET FOREIGN_KEY_CHECKS = 1;";
                    $sqlDump .= "\n-- END OF BACKUP --";
                    header('Content-Type: text/plain');
                    echo $sqlDump;
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['error' => 'SQL Export failed: ' . $e->getMessage()]);
                }
            }
            break;

        case 'import_sql':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = $data['sql'] ?? '';
                if (!$sql) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No SQL provided']);
                    break;
                }
                
                if (strpos($sql, "-- END OF BACKUP --") === false) {
                    http_response_code(400);
                    echo json_encode(['error' => 'The backup file appears to be incomplete or truncated. Please try generating a new backup.']);
                    break;
                }
                
                try {
                    $pdo->exec($sql);
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['error' => 'SQL Import failed: ' . $e->getMessage()]);
                }
            }
            break;

        case 'export_data':
            if ($method === 'GET') {
                try {
                    $stmt = $pdo->query("SHOW TABLES");
                    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    
                    $backup = [];
                    foreach ($tables as $table) {
                        $stmt = $pdo->query("SELECT * FROM `$table`");
                        $backup[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                    $backup['_metadata'] = [
                        'timestamp' => date('c'),
                        'isComplete' => true
                    ];
                    echo json_encode($backup);
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Export failed: ' . $e->getMessage()]);
                }
            }
            break;

        case 'import_data':
            if ($method === 'POST') {
                $backup = json_decode(file_get_contents("php://input"), true);
                if (!$backup || !is_array($backup)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid JSON data']);
                    break;
                }

                if (!isset($backup['_metadata']) || !$backup['_metadata']['isComplete']) {
                    http_response_code(400);
                    echo json_encode(['error' => 'The backup file appears to be incomplete or corrupted. Please try generating a new backup.']);
                    break;
                }
                
                try {
                    // Get all current tables
                    $stmt = $pdo->query("SHOW TABLES");
                    $currentTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

                    $pdo->beginTransaction();
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
                    
                    // 1. Clear all current tables
                    foreach ($currentTables as $table) {
                        $pdo->exec("DELETE FROM `$table` ");
                    }

                    // 2. Restore from backup
                    foreach ($backup as $table => $rows) {
                        if (is_array($rows) && count($rows) > 0) {
                            // Check if table exists in current database
                            if (in_array($table, $currentTables)) {
                                // Get columns for this table
                                $stmtCols = $pdo->query("DESCRIBE `$table` ");
                                $tableColumns = $stmtCols->fetchAll(PDO::FETCH_COLUMN);

                                $keys = array_intersect(array_keys($rows[0]), $tableColumns);
                                if (empty($keys)) continue;

                                $columns = implode(', ', array_map(function($c) { return "`$c`"; }, $keys));
                                $placeholders = implode(', ', array_fill(0, count($keys), '?'));
                                $stmt = $pdo->prepare("INSERT INTO `$table` ($columns) VALUES ($placeholders)");
                                foreach ($rows as $row) {
                                    $values = array_map(function($k) use ($row) { return $row[$k] ?? null; }, $keys);
                                    $stmt->execute($values);
                                }
                            }
                        }
                    }
                    
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
                    $pdo->commit();
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
                    http_response_code(500);
                    echo json_encode(['error' => 'Import failed: ' . $e->getMessage()]);
                }
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Action not found']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
