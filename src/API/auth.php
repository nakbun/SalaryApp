<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

// เชื่อมต่อฐานข้อมูล mysqli (รองรับ PHP 5.6)
$mysqli = new mysqli("localhost", "root", "", "salary_db");

if ($mysqli->connect_errno) {
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed"
    ]);
    exit;
}

// รับข้อมูล JSON
$input = json_decode(file_get_contents("php://input"), true);
$action = isset($input['action']) ? $input['action'] : '';

if ($action === 'login') {

    $username = $mysqli->real_escape_string($input['username']);
    $password = $mysqli->real_escape_string($input['password']);

    // หา user
    $sql = "SELECT id, username, password, role, fullname 
            FROM users 
            WHERE username = '$username' LIMIT 1";
    $result = $mysqli->query($sql);

    if ($result && $result->num_rows > 0) {

        $user = $result->fetch_assoc();

        // *** เปรียบเทียบรหัสผ่านแบบ text ธรรมดา (PHP 5.6) ***
        if ($user['password'] === $password) {

            // === สร้าง Token รองรับ PHP 5.6 ===
            if (function_exists('openssl_random_pseudo_bytes')) {
                $token = bin2hex(openssl_random_pseudo_bytes(16));
            } else {
                // fallback หากเซิร์ฟเวอร์ไม่มี OpenSSL
                $token = bin2hex(substr(str_shuffle("0123456789abcdef"), 0, 16));
            }

            echo json_encode([
                "status" => "success",
                "user" => [
                    "id" => $user['id'],
                    "username" => $user['username'],
                    "fullname" => $user['fullname'],
                    "role" => $user['role']
                ],
                "token" => $token
            ]);
            exit;

        } else {
            echo json_encode([
                "status" => "error",
                "message" => "Invalid password"
            ]);
            exit;
        }

    } else {
        echo json_encode([
            "status" => "error",
            "message" => "User not found"
        ]);
        exit;
    }
}

// action ไม่ถูกต้อง
echo json_encode([
    "status" => "error",
    "message" => "Invalid action"
]);
exit;
