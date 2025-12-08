<?php

function getDbConnection() {
    // ใช้ mysqli แบบเก่าเพื่อรองรับ PHP 5.6
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    // เช็ค error แบบ PHP 5.6
    if (mysqli_connect_errno()) {
        error_log("Database connection error: " . mysqli_connect_error());
        throw new Exception("Connection failed: " . mysqli_connect_error());
    }

    // ตั้ง charset — PHP 5.6 รองรับ utf8mb4 ปลอดภัย
    if (!$conn->set_charset("utf8mb4")) {
        // ถ้าเซิร์ฟเวอร์เก่าไม่รองรับ utf8mb4 จะ fallback เป็น utf8
        $conn->set_charset("utf8");
    }

    return $conn;
}

function closeDbConnection($conn) {
    if ($conn && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
