<?php
// ปิด error แบบ HTML
ini_set('display_errors', 0);
ini_set('html_errors', 0);
error_reporting(E_ALL);

// บันทึก error ลงไฟล์
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// ตั้งค่า header ให้ส่ง JSON เสมอ
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Custom error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    
    // Clear any output
    if (ob_get_length()) ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $errstr,
        'type' => 'PHP Error',
        'file' => basename($errfile),
        'line' => $errline
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// Custom exception handler
set_exception_handler(function($e) {
    error_log("Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    
    // Clear any output
    if (ob_get_length()) ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'type' => 'Exception',
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// Shutdown handler - จับ fatal error
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        error_log("Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']);
        
        // Clear any output
        if (ob_get_length()) ob_clean();
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => $error['message'],
            'type' => 'Fatal Error',
            'file' => basename($error['file']),
            'line' => $error['line']
        ], JSON_UNESCAPED_UNICODE);
    }
});

// เริ่ม output buffering
ob_start();
?>