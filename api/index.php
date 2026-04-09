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
                $sql = "INSERT INTO branches (name, address, phone, email, is_active) VALUES (?, ?, ?, ?, 1)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['name'], $data['address'], $data['phone'], $data['email']]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
            }
            break;

        case 'update_branch':
            if ($method === 'PUT' || $method === 'POST') {
                $id = $_GET['id'] ?? 0;
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "UPDATE branches SET name = ?, address = ?, phone = ?, email = ?, is_active = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['name'], $data['address'], $data['phone'], 
                    $data['email'], $data['isActive'] ? 1 : 0, $id
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
                $pdo->beginTransaction();
                try {
                    $orderNumber = 'ORD-' . time();
                    $sqlOrder = "INSERT INTO orders (branch_id, user_id, customer_id, order_number, subtotal, grand_total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')";
                    $stmtOrder = $pdo->prepare($sqlOrder);
                    $stmtOrder->execute([
                        $data['branch_id'], $data['user_id'], $data['customer_id'] ?? null, $orderNumber, 
                        $data['total'] / 1.10, $data['total'], $data['payment_method']
                    ]);
                    $orderId = $pdo->lastInsertId();

                    foreach ($data['items'] as $item) {
                        $sqlItem = "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)";
                        $stmtItem = $pdo->prepare($sqlItem);
                        $stmtItem->execute([
                            $orderId, $item['productId'], $item['quantity'], 
                            $item['price'], $item['price'] * $item['quantity']
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

                    $pdo->commit();
                    echo json_encode(['success' => true, 'orderId' => $orderId]);
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
                $stmt = $pdo->query("SELECT * FROM accounts ORDER BY name");
                echo json_encode($stmt->fetchAll());
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents("php://input"), true);
                $sql = "INSERT INTO accounts (branch_id, name, type, balance) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['branch_id'], $data['name'], $data['type'], $data['balance']]);
                echo json_encode(['id' => $pdo->lastInsertId()]);
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
                echo json_encode($stmt->fetchAll());
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
                    $sql = "INSERT INTO stock_transfers (item_id, item_type, from_branch_id, to_branch_id, quantity, user_id) VALUES (?, ?, ?, ?, ?, ?)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        $data['item_id'], $data['item_type'], $data['from_branch_id'], 
                        $data['to_branch_id'], $data['quantity'], $data['user_id']
                    ]);
                    
                    $table = $data['item_type'] === 'product' ? 'products' : 'inventory_items';
                    $column = $data['item_type'] === 'product' ? 'stock_quantity' : 'stock';
                    
                    // Deduct from source
                    $sqlDeduct = "UPDATE $table SET $column = $column - ? WHERE id = ? AND branch_id = ?";
                    $stmtDeduct = $pdo->prepare($sqlDeduct);
                    $stmtDeduct->execute([$data['quantity'], $data['item_id'], $data['from_branch_id']]);
                    
                    // Add to destination
                    $sqlAdd = "UPDATE $table SET $column = $column + ? WHERE id = ? AND branch_id = ?";
                    $stmtAdd = $pdo->prepare($sqlAdd);
                    $stmtAdd->execute([$data['quantity'], $data['item_id'], $data['to_branch_id']]);
                    
                    $pdo->commit();
                    echo json_encode(['id' => $pdo->lastInsertId()]);
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
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
