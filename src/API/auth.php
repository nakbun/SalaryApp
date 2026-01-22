<?php
// auth.php - Full Version with get-user-info and CID Card Login + CORS Fix

// เปิดการแสดง error
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ============================================
// CORS Headers - เปิดให้ทุก origin เข้าถึงได้
// ============================================
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';

// ถ้ามี origin ส่งมา ให้ใช้ origin นั้น (รองรับ credentials)
if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400"); // Cache preflight เป็นเวลา 24 ชั่วโมง

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ตรวจสอบว่าไฟล์มีอยู่หรือไม่
if (!file_exists(__DIR__ . '/config.php')) {
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'ไม่พบไฟล์ config.php',
        'path' => __DIR__ . '/config.php'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!file_exists(__DIR__ . '/db.php')) {
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'ไม่พบไฟล์ db.php',
        'path' => __DIR__ . '/db.php'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// รับข้อมูล
$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);

// Debug: บันทึก input
error_log("Auth Input: " . $rawInput);

$action = isset($input['action']) ? $input['action'] : '';

// ถ้าไม่มี action ใน body ให้ลองหาใน GET
if (empty($action) && isset($_GET['action'])) {
    $action = $_GET['action'];
}

// ============================================
// ตรวจสอบ CID Card จาก GET Parameter
// ============================================
if ((isset($_GET['cidcard']) && !empty($_GET['cidcard'])) || 
    (isset($_GET['cid']) && !empty($_GET['cid']))) {
    
    // ใช้ ternary operator แทน ?? สำหรับ PHP 5.6
    $cidcard_input = !empty($_GET['cidcard']) 
                     ? trim($_GET['cidcard']) 
                     : trim($_GET['cid']);
    
    error_log("=== CID Card Login Attempt ===");
    error_log("Received CID (raw): " . $cidcard_input);
    error_log("CID Length: " . strlen($cidcard_input));
    error_log("Is MD5 format (32 chars): " . (strlen($cidcard_input) === 32 ? 'Yes' : 'No'));
    
    try {
        $mysqli = getDbConnection();
        
        if (!$mysqli) {
            jsonResponse(array(
                "success" => false,
                "status" => "error",
                "message" => "ไม่สามารถเชื่อมต่อฐานข้อมูลได้"
            ), 500);
        }
        
        // ตรวจสอบว่าเป็น MD5 หรือไม่ (MD5 มี 32 ตัวอักษร hex)
        $is_md5_format = (strlen($cidcard_input) === 32 && ctype_xdigit($cidcard_input));
        
        if ($is_md5_format) {
            // ถ้าเป็น MD5 แล้ว ใช้เลย
            $cidcard_md5 = strtolower($cidcard_input);
            error_log("Using as MD5 directly: " . $cidcard_md5);
        } else {
            // ถ้าไม่ใช่ MD5 ให้เข้ารหัสก่อน
            $cidcard_md5 = md5($cidcard_input);
            error_log("Converting to MD5: " . $cidcard_input . " => " . $cidcard_md5);
        }
        
        $cidcard_md5 = $mysqli->real_escape_string($cidcard_md5);
        
        // Query หา user จาก idcard ที่เข้ารหัสเป็น MD5
        $sql = "SELECT 
                    m.UserID,
                    m.Username,
                    m.user_name,
                    m.Name as empno,
                    m.Status,
                    e.idcard,
                    e.firstname,
                    e.lastname,
                    CONCAT(e.firstname, ' ', e.lastname) AS fullname,
                    e.depid,
                    COALESCE(h.posid, e.posid) AS current_posid,
                    p.posname,
                    MD5(e.idcard) as idcard_md5_check
                FROM emppersonal e
                INNER JOIN member m ON m.Name = e.empno
                LEFT JOIN work_history h 
                    ON h.empno = e.empno 
                    AND (h.dateEnd_w = '0000-00-00' OR h.dateEnd_w IS NULL)
                LEFT JOIN posid p 
                    ON p.posid = COALESCE(h.posid, e.posid)
                WHERE MD5(e.idcard) = '$cidcard_md5'
                LIMIT 1";

        error_log("CID Login SQL: " . $sql);

        $result = $mysqli->query($sql);

        if (!$result) {
            closeDbConnection($mysqli);
            error_log("SQL Error: " . $mysqli->error);
            jsonResponse(array(
                "success" => false,
                "status" => "error",
                "message" => "SQL Error: " . $mysqli->error
            ), 500);
        }

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            error_log("User found by CID: " . json_encode($user, JSON_UNESCAPED_UNICODE));
            error_log("Matched CID (MD5): " . $user['idcard_md5_check']);

            // สร้าง Token
            if (function_exists('openssl_random_pseudo_bytes')) {
                $tokenBytes = openssl_random_pseudo_bytes(32);
                $token = bin2hex($tokenBytes);
            } else {
                $token = bin2hex(substr(str_shuffle(str_repeat("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)), 0, 32));
            }

            // บันทึก login time
            $updateSql = "UPDATE member 
                          SET date_login = CURDATE(), 
                              time_login = CURTIME() 
                          WHERE UserID = " . intval($user['UserID']);
            $mysqli->query($updateSql);

            // บันทึก session
            $_SESSION['user_id'] = $user['UserID'];
            $_SESSION['username'] = $user['Username'];
            $_SESSION['token'] = $token;
            $_SESSION['login_method'] = 'cidcard';

            closeDbConnection($mysqli);

            // ส่งข้อมูลกลับ (ใช้ array() แทน [] สำหรับ PHP 5.6)
            $responseData = array(
                "success" => true,
                "status" => "success",
                "message" => "เข้าสู่ระบบด้วย CID Card สำเร็จ",
                "login_method" => "cidcard",
                "token" => $token,
                "user" => array(
                    "id" => $user['UserID'],
                    "username" => $user['Username'],
                    "fullname" => $user['fullname'],
                    "user_name" => $user['user_name'],
                    "empno" => $user['empno'],
                    "cid" => $user['idcard'],
                    "firstname" => $user['firstname'],
                    "lastname" => $user['lastname'],
                    "status" => $user['Status'],
                    "ref_l_id" => $user['empno'],
                    "depid" => $user['depid'],
                    "posid" => $user['current_posid'],
                    "posname" => $user['posname'],
                    "mem_img" => ""
                ),
                "debug" => array(
                    "received_cid" => $cidcard_input,
                    "cid_length" => strlen($cidcard_input),
                    "is_md5_format" => $is_md5_format,
                    "used_md5" => $cidcard_md5
                )
            );
            
            error_log("CID Login Response: " . json_encode($responseData, JSON_UNESCAPED_UNICODE));
            jsonResponse($responseData);

        } else {
            closeDbConnection($mysqli);
            error_log("No user found with CID MD5: " . $cidcard_md5);
            jsonResponse(array(
                "success" => false,
                "status" => "error",
                "message" => "ไม่พบข้อมูลผู้ใช้งานจาก CID Card ที่ระบุ",
                "debug" => array(
                    "received_cid" => $cidcard_input,
                    "cid_length" => strlen($cidcard_input),
                    "is_md5_format" => $is_md5_format,
                    "used_md5" => $cidcard_md5
                )
            ), 401);
        }

    } catch (Exception $e) {
        if (isset($mysqli)) closeDbConnection($mysqli);
        error_log("CID Login Exception: " . $e->getMessage());
        jsonResponse(array(
            "success" => false,
            "status" => "error",
            "message" => "เกิดข้อผิดพลาด: " . $e->getMessage(),
            "line" => $e->getLine(),
            "file" => $e->getFile()
        ), 500);
    }
}

// ============================================
// ACTION: LOGIN
// ============================================
if ($action === 'login') {
    $username = isset($input['username']) ? trim($input['username']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    if (empty($username) || empty($password)) {
        jsonResponse([
            "success" => false,
            "status" => "error",
            "message" => "กรุณากรอก Username และรหัสผ่าน"
        ], 400);
    }

    try {
        $mysqli = getDbConnection();
        
        if (!$mysqli) {
            jsonResponse([
                "success" => false,
                "status" => "error",
                "message" => "ไม่สามารถเชื่อมต่อฐานข้อมูลได้"
            ], 500);
        }
        
        // แปลง username และ password เป็น MD5
        $username_md5 = md5($username);
        $password_md5 = md5($password);
        
        $username_md5 = $mysqli->real_escape_string($username_md5);

        // Query ที่ JOIN ครบถ้วน
        $sql = "SELECT 
                    m.UserID,
                    m.Username,
                    m.Password,
                    m.user_name,
                    m.Name as empno,
                    m.Status,
                    e.idcard,
                    e.firstname,
                    e.lastname,
                    CONCAT(e.firstname, ' ', e.lastname) AS fullname,
                    e.depid,
                    COALESCE(h.posid, e.posid) AS current_posid,
                    p.posname
                FROM member m
                INNER JOIN emppersonal e ON e.empno = m.Name
                LEFT JOIN work_history h 
                    ON h.empno = e.empno 
                    AND (h.dateEnd_w = '0000-00-00' OR h.dateEnd_w IS NULL)
                LEFT JOIN posid p 
                    ON p.posid = COALESCE(h.posid, e.posid)
                WHERE m.Username = '$username_md5'
                LIMIT 1";

        error_log("SQL: " . $sql);

        $result = $mysqli->query($sql);

        if (!$result) {
            closeDbConnection($mysqli);
            jsonResponse([
                "success" => false,
                "status" => "error",
                "message" => "SQL Error: " . $mysqli->error
            ], 500);
        }

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            error_log("User found: " . json_encode($user));

            // ตรวจสอบรหัสผ่าน (MD5)
            if ($password_md5 === $user['Password']) {

                // สร้าง Token
                if (function_exists('openssl_random_pseudo_bytes')) {
                    $tokenBytes = openssl_random_pseudo_bytes(32);
                    $token = bin2hex($tokenBytes);
                } else {
                    $token = bin2hex(substr(str_shuffle(str_repeat("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)), 0, 32));
                }

                // บันทึก login time
                $updateSql = "UPDATE member 
                              SET date_login = CURDATE(), 
                                  time_login = CURTIME() 
                              WHERE UserID = " . intval($user['UserID']);
                $mysqli->query($updateSql);

                // บันทึก session
                $_SESSION['user_id'] = $user['UserID'];
                $_SESSION['username'] = $username;
                $_SESSION['token'] = $token;
                $_SESSION['login_method'] = 'username_password';

                closeDbConnection($mysqli);

                // ส่งข้อมูลกลับ
                $responseData = [
                    "success" => true,
                    "status" => "success",
                    "message" => "เข้าสู่ระบบสำเร็จ",
                    "login_method" => "username_password",
                    "token" => $token,
                    "user" => [
                        "id" => $user['UserID'],
                        "username" => $username,
                        "fullname" => $user['fullname'],
                        "user_name" => $user['user_name'],
                        "empno" => $user['empno'],
                        "cid" => $user['idcard'],
                        "firstname" => $user['firstname'],
                        "lastname" => $user['lastname'],
                        "status" => $user['Status'],
                        "ref_l_id" => $user['empno'],
                        "depid" => $user['depid'],
                        "posid" => $user['current_posid'],
                        "posname" => $user['posname'],
                        "mem_img" => ""
                    ]
                ];
                
                error_log("Response: " . json_encode($responseData));
                jsonResponse($responseData);

            } else {
                closeDbConnection($mysqli);
                jsonResponse([
                    "success" => false,
                    "status" => "error",
                    "message" => "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
                ], 401);
            }

        } else {
            closeDbConnection($mysqli);
            jsonResponse([
                "success" => false,
                "status" => "error",
                "message" => "ไม่พบข้อมูลผู้ใช้งานในระบบ"
            ], 401);
        }

    } catch (Exception $e) {
        if (isset($mysqli)) closeDbConnection($mysqli);
        jsonResponse([
            "success" => false,
            "status" => "error",
            "message" => "เกิดข้อผิดพลาด: " . $e->getMessage(),
            "line" => $e->getLine(),
            "file" => $e->getFile()
        ], 500);
    }
}

// ============================================
// ACTION: GET USER INFO
// ============================================
if ($action === 'get-user-info' || $action === 'user-info' || $action === 'refresh-user') {
    // ตรวจสอบ session
    if (!isset($_SESSION['user_id'])) {
        jsonResponse([
            "success" => false,
            "status" => "error",
            "message" => "ไม่พบข้อมูล session กรุณาเข้าสู่ระบบใหม่"
        ], 401);
    }

    try {
        $mysqli = getDbConnection();
        
        if (!$mysqli) {
            jsonResponse([
                "success" => false,
                "status" => "error",
                "message" => "ไม่สามารถเชื่อมต่อฐานข้อมูลได้"
            ], 500);
        }
        
        $userId = intval($_SESSION['user_id']);
        
        // ดึงข้อมูล user แบบเดียวกับตอน login
        $sql = "SELECT 
                    m.UserID,
                    m.Username,
                    m.user_name,
                    m.Name as empno,
                    m.Status,
                    e.idcard,
                    e.firstname,
                    e.lastname,
                    CONCAT(e.firstname, ' ', e.lastname) AS fullname,
                    e.depid,
                    COALESCE(h.posid, e.posid) AS current_posid,
                    p.posname
                FROM member m
                INNER JOIN emppersonal e ON e.empno = m.Name
                LEFT JOIN work_history h 
                    ON h.empno = e.empno 
                    AND (h.dateEnd_w = '0000-00-00' OR h.dateEnd_w IS NULL)
                LEFT JOIN posid p 
                    ON p.posid = COALESCE(h.posid, e.posid)
                WHERE m.UserID = $userId
                LIMIT 1";

        error_log("Get User Info SQL: " . $sql);

        $result = $mysqli->query($sql);

        if (!$result) {
            closeDbConnection($mysqli);
            jsonResponse([
                "success" => false,
                "status" => "error",
                "message" => "SQL Error: " . $mysqli->error
            ], 500);
        }

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            closeDbConnection($mysqli);
            
            jsonResponse([
                "success" => true,
                "status" => "success",
                "user" => [
                    "id" => $user['UserID'],
                    "username" => isset($_SESSION['username']) ? $_SESSION['username'] : '',
                    "fullname" => $user['fullname'],
                    "user_name" => $user['user_name'],
                    "empno" => $user['empno'],
                    "cid" => $user['idcard'],
                    "firstname" => $user['firstname'],
                    "lastname" => $user['lastname'],
                    "status" => $user['Status'],
                    "ref_l_id" => $user['empno'],
                    "depid" => $user['depid'],
                    "posid" => $user['current_posid'],
                    "posname" => $user['posname'],
                    "mem_img" => ""
                ]
            ]);
        } else {
            closeDbConnection($mysqli);
            jsonResponse([
                "success" => false,
                "status" => "error",
                "message" => "ไม่พบข้อมูลผู้ใช้งาน"
            ], 404);
        }

    } catch (Exception $e) {
        if (isset($mysqli)) closeDbConnection($mysqli);
        jsonResponse([
            "success" => false,
            "status" => "error",
            "message" => "เกิดข้อผิดพลาด: " . $e->getMessage()
        ], 500);
    }
}

// ============================================
// ACTION: LOGOUT
// ============================================
if ($action === 'logout') {
    session_destroy();
    jsonResponse([
        "success" => true,
        "status" => "success",
        "message" => "ออกจากระบบสำเร็จ"
    ]);
}

// ============================================
// ACTION: INFO (สำหรับทดสอบ)
// ============================================
if ($action === 'info' || empty($action)) {
    jsonResponse([
        "success" => true,
        "status" => "success",
        "message" => "Auth API Ready",
        "version" => "1.1 - CORS Fixed",
        "php_version" => phpversion(),
        "session_active" => session_status() === PHP_SESSION_ACTIVE,
        "has_session" => isset($_SESSION['user_id']),
        "features" => [
            "username_password_login" => true,
            "cidcard_login" => true,
            "get_user_info" => true,
            "logout" => true,
            "cors_enabled" => true
        ]
    ]);
}

// ============================================
// Default
// ============================================
jsonResponse([
    "success" => false,
    "status" => "error",
    "message" => "Invalid action: " . $action,
    "received_action" => $action,
    "input" => $input,
    "get_params" => $_GET
], 400);
?>