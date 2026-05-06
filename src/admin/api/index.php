<?php
/**
 * User Management API
 */

// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// IMPORTANT: correct file name for tests
require_once 'db.php';

// DB
$db = getDBConnection();

// Method
$method = $_SERVER['REQUEST_METHOD'];

// Body
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true) ?? [];

// Query params
$id     = isset($_GET['id'])     ? (int) $_GET['id'] : null;
$action = $_GET['action'] ?? null;
$search = $_GET['search'] ?? null;
$sort   = $_GET['sort'] ?? null;
$order  = strtolower($_GET['order'] ?? 'asc');

/* ========================= FUNCTIONS ========================= */

function getUsers($db) {
    global $search, $sort, $order;

    $sql = "SELECT id, name, email, is_admin, created_at FROM users";
    $params = [];

    if (!empty($search)) {
        $sql .= " WHERE name LIKE :search OR email LIKE :search";
        $params[':search'] = "%$search%";
    }

    $allowedSort = ['name', 'email', 'is_admin'];
    if (!empty($sort) && in_array($sort, $allowedSort)) {
        $dir = ($order === 'desc') ? 'DESC' : 'ASC';
        $sql .= " ORDER BY $sort $dir";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse($users, 200);
}

function getUserById($db, $id) {
    $stmt = $db->prepare("SELECT id, name, email, is_admin, created_at FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse('User not found', 404);
    }

    sendResponse($user, 200);
}

function createUser($db, $data) {
    if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        sendResponse('Name, email, and password are required', 400);
    }

    $name     = sanitizeInput($data['name']);
    $email    = sanitizeInput($data['email']);
    $password = trim($data['password']);

    if (!validateEmail($email)) {
        sendResponse('Invalid email', 400);
    }

    if (strlen($password) < 8) {
        sendResponse('Password must be at least 8 characters', 400);
    }

    // duplicate email
    $check = $db->prepare("SELECT id FROM users WHERE email = :email");
    $check->execute([':email' => $email]);
    if ($check->fetch()) {
        sendResponse('Email already exists', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $isAdmin = isset($data['is_admin']) && $data['is_admin'] == 1 ? 1 : 0;

    $stmt = $db->prepare("INSERT INTO users (name, email, password, is_admin) VALUES (:name, :email, :password, :is_admin)");
    $ok = $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password' => $hash,
        ':is_admin' => $isAdmin
    ]);

    if (!$ok) {
        sendResponse('Failed to create user', 500);
    }

    sendResponse(['id' => (int)$db->lastInsertId()], 201);
}

function updateUser($db, $data) {
    if (empty($data['id'])) {
        sendResponse('User ID is required', 400);
    }

    $id = (int)$data['id'];

    $check = $db->prepare("SELECT id FROM users WHERE id = :id");
    $check->execute([':id' => $id]);
    if (!$check->fetch()) {
        sendResponse('User not found', 404);
    }

    $fields = [];
    $params = [':id' => $id];

    if (!empty($data['name'])) {
        $fields[] = "name = :name";
        $params[':name'] = sanitizeInput($data['name']);
    }

    if (!empty($data['email'])) {
        $email = sanitizeInput($data['email']);

        if (!validateEmail($email)) {
            sendResponse('Invalid email', 400);
        }

        $dup = $db->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
        $dup->execute([':email' => $email, ':id' => $id]);

        if ($dup->fetch()) {
            sendResponse('Email already in use', 409);
        }

        $fields[] = "email = :email";
        $params[':email'] = $email;
    }

    if (isset($data['is_admin'])) {
        $fields[] = "is_admin = :is_admin";
        $params[':is_admin'] = ($data['is_admin'] == 1) ? 1 : 0;
    }

    if (empty($fields)) {
        sendResponse('No fields to update', 200);
    }

    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";

    $stmt = $db->prepare($sql);
    if (!$stmt->execute($params)) {
        sendResponse('Failed to update user', 500);
    }

    sendResponse('User updated successfully', 200);
}

function deleteUser($db, $id) {
    if (empty($id)) {
        sendResponse('User ID is required', 400);
    }

    $check = $db->prepare("SELECT id FROM users WHERE id = :id");
    $check->execute([':id' => $id]);

    if (!$check->fetch()) {
        sendResponse('User not found', 404);
    }

    $stmt = $db->prepare("DELETE FROM users WHERE id = :id");

    if (!$stmt->execute([':id' => $id])) {
        sendResponse('Failed to delete user', 500);
    }

    sendResponse('User deleted successfully', 200);
}

function changePassword($db, $data) {
    if (empty($data['id']) || empty($data['current_password']) || empty($data['new_password'])) {
        sendResponse('Missing fields', 400);
    }

    if (strlen($data['new_password']) < 8) {
        sendResponse('New password too short', 400);
    }

    $stmt = $db->prepare("SELECT password FROM users WHERE id = :id");
    $stmt->execute([':id' => $data['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse('User not found', 404);
    }

    if (!password_verify($data['current_password'], $user['password'])) {
        sendResponse('Wrong password', 401);
    }

    $hash = password_hash($data['new_password'], PASSWORD_DEFAULT);

    $update = $db->prepare("UPDATE users SET password = :p WHERE id = :id");

    if (!$update->execute([':p' => $hash, ':id' => $data['id']])) {
        sendResponse('Failed to change password', 500);
    }

    sendResponse('Password changed', 200);
}

/* ========================= ROUTER ========================= */

try {

    if ($method === 'GET') {
        if (!empty($id)) {
            getUserById($db, $id);
        } else {
            getUsers($db);
        }

    } elseif ($method === 'POST') {
        if ($action === 'change_password') {
            changePassword($db, $data);
        } else {
            createUser($db, $data);
        }

    } elseif ($method === 'PUT') {
        updateUser($db, $data);

    } elseif ($method === 'DELETE') {
        deleteUser($db, $id);

    } else {
        sendResponse('Method not allowed', 405);
    }

} catch (Exception $e) {
    error_log($e->getMessage());
    sendResponse('Server error', 500);
}

/* ========================= HELPERS ========================= */

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);

    if ($statusCode < 400) {
        echo json_encode(['success' => true, 'data' => $data]);
    } else {
        echo json_encode(['success' => false, 'message' => $data]);
    }

    exit;
}

function validateEmail($email) {
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

?>
