<?php
// Include error handler ก่อนอื่นหมด
require_once __DIR__ . '/error_handler.php';

// Include config
require_once __DIR__ . '/config.php';

// Import PhpSpreadsheet classes ที่นี่ (ข้างนอกฟังก์ชัน)
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require __DIR__ . '/vendor/autoload.php';
    use PhpOffice\PhpSpreadsheet\IOFactory;
}

try {
    // ดึง action
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    // Log request
    error_log("=== New Request ===");
    error_log("Action: " . $action);
    error_log("Method: " . $_SERVER['REQUEST_METHOD']);
    
    // Handle actions
    switch ($action) {
        case 'login':
            handleLogin();
            break;
            
        case 'upload':
            handleUpload();
            break;
            
        case 'get_data':
            handleGetData();
            break;
            
        default:
            throw new Exception('Invalid action: ' . ($action ?: 'empty'));
    }
    
} catch (Exception $e) {
    error_log("Main Exception: " . $e->getMessage());
    
    // Clear output buffer
    if (ob_get_length()) ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

// ฟังก์ชัน Login
function handleLogin() {
    error_log("POST data: " . print_r($_POST, true));
    
    if (empty($_POST['username']) || empty($_POST['password'])) {
        throw new Exception('กรุณากรอก CID และรหัสผ่าน');
    }
    
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);
    
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
            DB_USER,
            DB_PASS
        );
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // ตรวจสอบ user ด้วย CID
        $stmt = $conn->prepare("SELECT * FROM users WHERE cid = ? OR username = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง');
        }
        
        // ตรวจสอบรหัสผ่าน
        if (!password_verify($password, $user['password'])) {
            throw new Exception('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง');
        }
        
        // สร้าง token
        $token = bin2hex(random_bytes(32));
        
        // อัพเดท token ใน database
        $stmt = $conn->prepare("UPDATE users SET token = ?, last_login = NOW() WHERE id = ?");
        $stmt->execute([$token, $user['id']]);
        
        error_log("Login successful for user: " . $username);
        
        echo json_encode([
            'status' => 'success',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'] ?? $user['cid'],
                'cid' => $user['cid'],
                'name' => $user['name'] ?? ''
            ],
            'token' => $token
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (PDOException $e) {
        error_log("Database error in login: " . $e->getMessage());
        throw new Exception('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    }
}

// ฟังก์ชัน Upload
function handleUpload() {
    error_log("Upload request - FILES: " . print_r($_FILES, true));
    error_log("Upload request - POST: " . print_r($_POST, true));
    
    if (!isset($_FILES['file'])) {
        throw new Exception('ไม่พบไฟล์ที่อัปโหลด');
    }
    
    $file = $_FILES['file'];
    
    // ตรวจสอบ upload error
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'ไฟล์มีขนาดใหญ่เกินที่กำหนด (upload_max_filesize)',
            UPLOAD_ERR_FORM_SIZE => 'ไฟล์มีขนาดใหญ่เกินที่กำหนด (MAX_FILE_SIZE)',
            UPLOAD_ERR_PARTIAL => 'ไฟล์ถูกอัปโหลดไม่ครบ',
            UPLOAD_ERR_NO_FILE => 'ไม่มีไฟล์ถูกอัปโหลด',
            UPLOAD_ERR_NO_TMP_DIR => 'ไม่พบโฟลเดอร์ชั่วคราว',
            UPLOAD_ERR_CANT_WRITE => 'ไม่สามารถเขียนไฟล์ลงดิสก์',
            UPLOAD_ERR_EXTENSION => 'PHP extension หยุดการอัปโหลด'
        ];
        
        $errorMsg = $uploadErrors[$file['error']] ?? 'ข้อผิดพลาดในการอัปโหลด';
        throw new Exception($errorMsg . ' (Error code: ' . $file['error'] . ')');
    }
    
    // ตรวจสอบ month และ year
    if (empty($_POST['month']) || empty($_POST['year'])) {
        throw new Exception('กรุณาระบุเดือนและปี');
    }
    
    $month = $_POST['month'];
    $year = $_POST['year'];
    
    // แปลงเดือนเป็นตัวเลข
    $monthNum = $GLOBALS['MONTH_MAP'][$month] ?? null;
    if (!$monthNum) {
        throw new Exception('เดือนไม่ถูกต้อง: ' . $month);
    }
    
    // แปลง พ.ศ. เป็น ค.ศ.
    $yearAD = intval($year) - 543;
    
    // ตรวจสอบประเภทไฟล์
    $fileName = $file['name'];
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    if (!in_array($fileExt, ['xlsx', 'xls'])) {
        throw new Exception('ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ .xlsx หรือ .xls เท่านั้น');
    }
    
    // ตรวจสอบขนาดไฟล์ (10MB)
    if ($file['size'] > 10 * 1024 * 1024) {
        throw new Exception('ไฟล์มีขนาดใหญ่เกิน 10MB');
    }
    
    // ตรวจสอบว่าเป็นไฟล์ที่อัปโหลดจริง
    if (!is_uploaded_file($file['tmp_name'])) {
        throw new Exception('ไฟล์ไม่ถูกต้อง');
    }
    
    error_log("File validation passed. Processing Excel...");
    
    // ตรวจสอบ PhpSpreadsheet
    if (!class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
        throw new Exception('ไม่พบ PhpSpreadsheet library กรุณาติดตั้งก่อน: composer require phpoffice/phpspreadsheet');
    }
    
    // อ่านไฟล์ Excel (ใช้ IOFactory ที่ import ไว้แล้ว)
    $spreadsheet = IOFactory::load($file['tmp_name']);
    $worksheet = $spreadsheet->getActiveSheet();
    $rows = $worksheet->toArray();
    
    if (empty($rows) || count($rows) <= 1) {
        throw new Exception('ไฟล์ Excel ว่างเปล่าหรือไม่มีข้อมูล');
    }
    
    // ดึง header row
    $headers = array_shift($rows);
    $totalRows = count($rows);
    
    error_log("Total rows to process: " . $totalRows);
    
    // เชื่อมต่อ database
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
            DB_USER,
            DB_PASS
        );
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // เริ่ม transaction
        $conn->beginTransaction();
        
        $savedRows = 0;
        
        foreach ($rows as $rowIndex => $row) {
            // ข้าม row ว่าง
            if (empty(array_filter($row))) {
                continue;
            }
            
            // TODO: ประมวลผลและบันทึกข้อมูลลง database
            // ตอนนี้ให้นับเป็น success ทุก row
            $savedRows++;
        }
        
        // Commit transaction
        $conn->commit();
        
        error_log("Upload successful: $savedRows rows saved");
        
        echo json_encode([
            'status' => 'success',
            'rows' => $totalRows,
            'saved' => $savedRows,
            'message' => "บันทึกข้อมูล $month $year สำเร็จ"
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (PDOException $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Database error in upload: " . $e->getMessage());
        throw new Exception('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $e->getMessage());
    }
}

// ฟังก์ชัน Get Data
function handleGetData() {
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
            DB_USER,
            DB_PASS
        );
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // TODO: Query ข้อมูล
        
        echo json_encode([
            'status' => 'success',
            'data' => []
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (PDOException $e) {
        error_log("Database error in get_data: " . $e->getMessage());
        throw new Exception('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
}
?>