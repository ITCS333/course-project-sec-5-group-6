<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../common/db.php';
$db = getDBConnection();

$method = $_SERVER['REQUEST_METHOD'];
$rawData = file_get_contents('php://input');
$data    = json_decode($rawData, true) ?? [];

$action       = $_GET['action']        ?? null;
$id           = $_GET['id']            ?? null;
$assignmentId = $_GET['assignment_id'] ?? null;
$commentId    = $_GET['comment_id']    ?? null;

function getAllAssignments(PDO $db): void {
    $search = $_GET['search'] ?? '';
    $params = [];
    $sql = 'SELECT id, title, description, due_date, files, created_at, updated_at FROM assignments';
    if (!empty($search)) {
        $sql .= ' WHERE title LIKE :search OR description LIKE :search';
        $params[':search'] = '%' . $search . '%';
    }
    $allowedSort  = ['title', 'due_date', 'created_at'];
    $allowedOrder = ['asc', 'desc'];
    $sort  = in_array($_GET['sort'] ?? '', $allowedSort) ? $_GET['sort'] : 'due_date';
    $order = in_array(strtolower($_GET['order'] ?? ''), $allowedOrder) ? strtolower($_GET['order']) : 'asc';
    $sql .= " ORDER BY {$sort} {$order}";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($assignments as &$row) {
        $row['files'] = json_decode($row['files'], true) ?? [];
    }
    sendResponse(['success' => true, 'data' => $assignments]);
}

function getAssignmentById(PDO $db, $id): void {
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false, 'message' => 'Invalid or missing id'], 400);
    }
    $stmt = $db->prepare('SELECT id, title, description, due_date, files, created_at, updated_at FROM assignments WHERE id = ?');
    $stmt->execute([(int)$id]);
    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$assignment) {
        sendResponse(['success' => false, 'message' => 'Assignment not found'], 404);
    }
    $assignment['files'] = json_decode($assignment['files'], true) ?? [];
    sendResponse(['success' => true, 'data' => $assignment]);
}

function createAssignment(PDO $db, array $data): void {
    $title       = trim($data['title']       ?? '');
    $description = trim($data['description'] ?? '');
    $due_date    = trim($data['due_date']    ?? '');
    if ($title === '' || $description === '' || $due_date === '') {
        sendResponse(['success' => false, 'message' => 'title, description, and due_date are required'], 400);
    }
    if (!validateDate($due_date)) {
        sendResponse(['success' => false, 'message' => 'Invalid due_date format. Use YYYY-MM-DD'], 400);
    }
    $files = (isset($data['files']) && is_array($data['files'])) ? json_encode($data['files']) : json_encode([]);
    $stmt = $db->prepare('INSERT INTO assignments (title, description, due_date, files) VALUES (?, ?, ?, ?)');
    $stmt->execute([$title, $description, $due_date, $files]);
    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Assignment created', 'id' => (int)$db->lastInsertId()], 201);
    } else {
        sendResponse(['success' => false, 'message' => 'Failed to create assignment'], 500);
    }
}

function updateAssignment(PDO $db, array $data): void {
    if (empty($data['id']) || !is_numeric($data['id'])) {
        sendResponse(['success' => false, 'message' => 'id is required'], 400);
    }
    $id = (int)$data['id'];
    $check = $db->prepare('SELECT id FROM assignments WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) {
        sendResponse(['success' => false, 'message' => 'Assignment not found'], 404);
    }
    $setClauses = [];
    $params     = [];
    if (isset($data['title']) && trim($data['title']) !== '') {
        $setClauses[] = 'title = ?';
        $params[]     = sanitizeInput($data['title']);
    }
    if (isset($data['description'])) {
        $setClauses[] = 'description = ?';
        $params[]     = sanitizeInput($data['description']);
    }
    if (isset($data['due_date'])) {
        if (!validateDate($data['due_date'])) {
            sendResponse(['success' => false, 'message' => 'Invalid due_date format. Use YYYY-MM-DD'], 400);
        }
        $setClauses[] = 'due_date = ?';
        $params[]     = $data['due_date'];
    }
    if (isset($data['files'])) {
        $setClauses[] = 'files = ?';
        $params[]     = json_encode(is_array($data['files']) ? $data['files'] : []);
    }
    if (empty($setClauses)) {
        sendResponse(['success' => false, 'message' => 'No updatable fields provided'], 400);
    }
    $params[] = $id;
    $sql = 'UPDATE assignments SET ' . implode(', ', $setClauses) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    sendResponse(['success' => true, 'message' => 'Assignment updated']);
}

function deleteAssignment(PDO $db, $id): void {
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false, 'message' => 'Invalid or missing id'], 400);
    }
    $id = (int)$id;
    $check = $db->prepare('SELECT id FROM assignments WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) {
        sendResponse(['success' => false, 'message' => 'Assignment not found'], 404);
    }
    $stmt = $db->prepare('DELETE FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Assignment deleted']);
    } else {
        sendResponse(['success' => false, 'message' => 'Failed to delete assignment'], 500);
    }
}

function getCommentsByAssignment(PDO $db, $assignmentId): void {
    if (!$assignmentId || !is_numeric($assignmentId)) {
        sendResponse(['success' => false, 'message' => 'Invalid or missing assignment_id'], 400);
    }
    $stmt = $db->prepare('SELECT id, assignment_id, author, text, created_at FROM comments_assignment WHERE assignment_id = ? ORDER BY created_at ASC');
    $stmt->execute([(int)$assignmentId]);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    sendResponse(['success' => true, 'data' => $comments]);
}

function createComment(PDO $db, array $data): void {
    $assignmentId = trim($data['assignment_id'] ?? '');
    $author       = trim($data['author']        ?? '');
    $text         = trim($data['text']          ?? '');
    if ($assignmentId === '' || $author === '' || $text === '') {
        sendResponse(['success' => false, 'message' => 'assignment_id, author, and text are required'], 400);
    }
    if (!is_numeric($assignmentId)) {
        sendResponse(['success' => false, 'message' => 'assignment_id must be numeric'], 400);
    }
    $assignmentId = (int)$assignmentId;
    $check = $db->prepare('SELECT id FROM assignments WHERE id = ?');
    $check->execute([$assignmentId]);
    if (!$check->fetch()) {
        sendResponse(['success' => false, 'message' => 'Assignment not found'], 404);
    }
    $stmt = $db->prepare('INSERT INTO comments_assignment (assignment_id, author, text) VALUES (?, ?, ?)');
    $stmt->execute([$assignmentId, sanitizeInput($author), sanitizeInput($text)]);
    if ($stmt->rowCount() > 0) {
        $newId = (int)$db->lastInsertId();
        sendResponse(['success' => true, 'message' => 'Comment created', 'id' => $newId, 'data' => ['id' => $newId, 'assignment_id' => $assignmentId, 'author' => $author, 'text' => $text]], 201);
    } else {
        sendResponse(['success' => false, 'message' => 'Failed to create comment'], 500);
    }
}

function deleteComment(PDO $db, $commentId): void {
    if (!$commentId || !is_numeric($commentId)) {
        sendResponse(['success' => false, 'message' => 'Invalid or missing comment_id'], 400);
    }
    $commentId = (int)$commentId;
    $check = $db->prepare('SELECT id FROM comments_assignment WHERE id = ?');
    $check->execute([$commentId]);
    if (!$check->fetch()) {
        sendResponse(['success' => false, 'message' => 'Comment not found'], 404);
    }
    $stmt = $db->prepare('DELETE FROM comments_assignment WHERE id = ?');
    $stmt->execute([$commentId]);
    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Comment deleted']);
    } else {
        sendResponse(['success' => false, 'message' => 'Failed to delete comment'], 500);
    }
}

try {
    if ($method === 'GET') {
        if ($action === 'comments') {
            getCommentsByAssignment($db, $assignmentId);
        } elseif ($id !== null) {
            getAssignmentById($db, $id);
        } else {
            getAllAssignments($db);
        }
    } elseif ($method === 'POST') {
        if ($action === 'comment') {
            createComment($db, $data);
        } else {
            createAssignment($db, $data);
        }
    } elseif ($method === 'PUT') {
        updateAssignment($db, $data);
    } elseif ($method === 'DELETE') {
        if ($action === 'delete_comment') {
            deleteComment($db, $commentId);
        } else {
            deleteAssignment($db, $id);
        }
    } else {
        sendResponse(['success' => false, 'message' => 'Method Not Allowed'], 405);
    }
} catch (PDOException $e) {
    error_log('PDOException: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Database error'], 500);
} catch (Exception $e) {
    error_log('Exception: ' . $e->getMessage());
    sendResponse(['success' => false, 'message' => 'Internal server error'], 500);
}

function sendResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function validateDate(string $date): bool {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function sanitizeInput(string $data): string {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}