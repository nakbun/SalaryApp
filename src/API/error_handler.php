<?php
// index.php - Debug Version for SalaryApp

// ========== 1. ERROR HANDLING ==========
ini_set('display_errors', 0); 
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// ตั้งค่า Header ให้เป็น JSON เสมอ
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Custom Error Handler เพื่อส่ง JSON กลับ
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) return false;
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'error' => "PHP Error: $errstr",
        'detail' => "File: $errfile, Line: $errline"
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (ob_get_length()) ob_clean();
        http_response_code(500);
        echo json_encode([
            'status' => 'error', 
            'error' => "PHP Fatal Error: " . $error['message'],
            'detail' => "File: " . $error['file'] . ", Line: " . $error['line']
        ], JSON_UNESCAPED_UNICODE);
    }
});

ob_start();

// ========== CONFIG & DB ==========
// 🔴 FIX: ใช้ชื่อตาราง 'salary_data'
$GLOBALS['SALARY_TABLE'] = 'salary_data'; 

try {
    if (!file_exists(__DIR__ . '/vendor/autoload.php')) throw new Exception("ไม่พบไฟล์ vendor/autoload.php");
    require_once __DIR__ . '/vendor/autoload.php'; 
} catch (Throwable $e) { echo json_encode(['status'=>'error', 'error'=>$e->getMessage()]); exit; }

use PhpOffice\PhpSpreadsheet\IOFactory;

if (!file_exists(__DIR__ . '/config.php')) { echo json_encode(['status'=>'error', 'error'=>'ไม่พบไฟล์ config.php']); exit; }
require_once __DIR__ . '/config.php'; 
if (file_exists(__DIR__ . '/db.php')) require_once __DIR__ . '/db.php';

// HELPER FUNCTIONS
function json_ok($data = []) {
    ob_clean();
    echo json_encode(array_merge(['status' => 'success'], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_err($message = 'Unknown error', $code = 500, $extra = []) {
    ob_clean();
    http_response_code($code);
    $out = array_merge(['status' => 'error', 'error' => $message], $extra);
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

// MONTH MAPPING
$MONTH_MAP = [
    'มกราคม'=>1, 'กุมภาพันธ์'=>2, 'มีนาคม'=>3, 'เมษายน'=>4, 'พฤษภาคม'=>5, 'มิถุนายน'=>6,
    'กรกฎาคม'=>7, 'สิงหาคม'=>8, 'กันยายน'=>9, 'ตุลาคม'=>10, 'พฤศจิกายน'=>11, 'ธันวาคม'=>12,
    'january'=>1, 'february'=>2, 'march'=>3, 'april'=>4, 'may'=>5, 'june'=>6,
    'july'=>7, 'august'=>8, 'september'=>9, 'october'=>10, 'november'=>11, 'december'=>12,
];
$NUM_TO_THAI_MONTH = [
    1=>'มกราคม', 2=>'กุมภาพันธ์', 3=>'มีนาคม', 4=>'เมษายน', 5=>'พฤษภาคม', 6=>'มิถุนายน',
    7=>'กรกฎาคม', 8=>'สิงหาคม', 9=>'กันยายน', 10=>'ตุลาคม', 11=>'พฤศจิกายน', 12=>'ธันวาคม'
];

// CONNECT DB
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    json_err('DB Connection Error', 500, ['detail' => $e->getMessage()]);
}

// READ REQUEST
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
$action = $_POST['action'] ?? $_GET['action'] ?? ($payload['action'] ?? 'info');

// ================= ACTION: LOGIN =================
if ($action === 'login') {
    try {
        $data = $payload ?? $_POST ?? [];
        $username = trim($data['username'] ?? '');
        $password = trim($data['password'] ?? '');

        if (!$username || !$password) json_err('กรุณากรอก CID และรหัสผ่าน', 400);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE cid = :cid LIMIT 1");
        $stmt->execute([':cid' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            json_err('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง', 401);
        }

        $token = bin2hex(random_bytes(32));
        json_ok(['user' => ['id'=>$user['id'], 'cid'=>$user['cid'], 'name'=>$user['name']], 'token'=>$token]);
    } catch (Throwable $e) {
        json_err('Login Error', 500, ['detail' => $e->getMessage()]);
    }
}

// ================= ACTION: AVAILABLE FILTERS =================
if ($action === 'available-filters') {
    try {
        $table = $GLOBALS['SALARY_TABLE'];
        // ตรวจสอบว่ามีตารางจริงไหม
        try {
            $pdo->query("SELECT 1 FROM {$table} LIMIT 1");
        } catch (Exception $e) {
            json_err("ไม่พบตาราง '$table' ในฐานข้อมูล กรุณาสร้างตารางก่อน", 500);
        }

        $stmt = $pdo->query("SELECT DISTINCT `month`, `year` FROM `{$table}` ORDER BY `year` DESC, `month` DESC");
        $rows = $stmt->fetchAll();

        $months = []; $years = [];
        foreach ($rows as $r) {
            $mNum = $r['month'];
            if ($mNum) {
                $label = $NUM_TO_THAI_MONTH[$mNum] ?? $mNum;
                $months[] = ['value' => $label, 'label' => $label]; 
            }
            if ($r['year']) $years[] = $r['year'];
        }

        // Unique
        $months = array_values(array_reduce($months, function($acc, $item){ $acc[$item['value']] = $item; return $acc; }, []));
        $years = array_values(array_unique($years));

        json_ok(['months' => $months, 'years' => $years]);
    } catch (Throwable $e) {
        json_err('Filter Error', 500, ['detail' => $e->getMessage()]);
    }
}

// ================= ACTION: SALARY DATA =================
if ($action === 'salary-data' || $action === 'get_data') {
    try {
        $params = array_merge($_GET, $_POST, is_array($payload) ? $payload : []);
        $table = $GLOBALS['SALARY_TABLE'];

        $sql = "SELECT * FROM `{$table}` WHERE 1=1";
        $bind = [];

        if (!empty($params['cid'])) { $sql .= " AND cid LIKE :cid"; $bind[':cid'] = "%{$params['cid']}%"; }
        if (!empty($params['name'])) { $sql .= " AND `name` LIKE :name"; $bind[':name'] = "%{$params['name']}%"; }
        if (!empty($params['month'])) {
            $mStr = mb_strtolower(trim($params['month']));
            $mNum = $MONTH_MAP[$mStr] ?? null;
            if ($mNum) { $sql .= " AND `month` = :month"; $bind[':month'] = $mNum; }
        }
        if (!empty($params['year'])) { $sql .= " AND `year` = :year"; $bind[':year'] = $params['year']; }
        if (!empty($params['employee'])) { $sql .= " AND `employee` = :employee"; $bind[':employee'] = $params['employee']; }

        $sql .= " ORDER BY `year` DESC, `month` DESC LIMIT 1000";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $data = $stmt->fetchAll();

        json_ok(['data' => $data]);
    } catch (Throwable $e) {
        json_err('Get Data Error', 500, ['detail' => $e->getMessage()]);
    }
}

// ================= ACTION: UPLOAD =================
if ($action === 'upload') {
    $debugErrors = []; // เก็บ Error แต่ละบรรทัด
    try {
        if (!isset($_FILES['file'])) json_err('ไม่พบไฟล์', 400);
        
        $monthRaw = $_POST['month'] ?? '';
        $yearRaw = $_POST['year'] ?? '';
        $mStr = mb_strtolower(trim($monthRaw));
        $monthNumber = $MONTH_MAP[$mStr] ?? null;

        if (!$monthNumber || !$yearRaw) json_err('ข้อมูลเดือน/ปี ไม่ถูกต้อง', 400);

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) json_err('Upload Failed', 400);

        $reader = IOFactory::createReaderForFile($file['tmp_name']);
        $spreadsheet = $reader->load($file['tmp_name']);
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        if (count($rows) <= 1) json_err('ไฟล์ว่างเปล่า', 400);

        $header = $rows[1];
        $map = [];
        
        // Match Header Function
        function match_header($text) {
            $t = mb_strtolower(trim((string)$text));
            $keywords = [
                'name' => ['ชื่อ','name','fullname'],
                'cid' => ['cid','เลขประจำตัว','เลขบัตร'],
                'bank_account' => ['บัญชี','account','bank'],
                'total_income' => ['รวมรับ','total income'],
                'total_expense' => ['รวมจ่าย','total expense','รวมหัก'],
                'net_balance' => ['สุทธิ','net','คงเหลือ'],
                'employee' => ['ข้าราชการ','ประเภท','ลูกจ้าง','type']
            ];
            foreach ($keywords as $dbCol => $searchArr) {
                foreach ($searchArr as $kw) {
                    if (mb_strpos($t, $kw) !== false) return $dbCol;
                }
            }
            return null;
        }

        foreach ($header as $col => $val) {
            $k = match_header($val);
            if ($k) $map[$col] = $k;
        }
        
        // Debug: ถ้า Map ไม่เจออะไรเลย
        if (empty($map)) {
             // Fallback A-G
             $map = ['A'=>'name','B'=>'cid','C'=>'bank_account','D'=>'total_income','E'=>'total_expense','F'=>'net_balance','G'=>'employee'];
        }

        $table = $GLOBALS['SALARY_TABLE'];
        $pdo->beginTransaction();

        // 1. ลบข้อมูลเก่า
        $stmtDel = $pdo->prepare("DELETE FROM `{$table}` WHERE `month` = :m AND `year` = :y");
        $stmtDel->execute([':m' => $monthNumber, ':y' => $yearRaw]);

        // 2. Insert
        $sql = "INSERT INTO `{$table}` 
                (name, cid, bank_account, total_income, total_expense, net_balance, employee, month, year, created_at)
                VALUES 
                (:name, :cid, :bank, :inc, :exp, :net, :emp, :month, :year, NOW())";
        $stmt = $pdo->prepare($sql);

        $saved = 0;
        foreach ($rows as $i => $row) {
            if ($i == 1) continue; 
            
            $d = [];
            foreach ($map as $col => $field) {
                $val = isset($row[$col]) ? trim((string)$row[$col]) : '';
                if (in_array($field, ['total_income','total_expense','net_balance'])) {
                    $val = str_replace([',','฿',' '], '', $val);
                    if (preg_match('/^\((.*)\)$/', $val, $m)) $val = '-' . $m[1];
                    $d[$field] = is_numeric($val) ? floatval($val) : 0;
                } else {
                    $d[$field] = $val;
                }
            }

            // Skip empty rows
            if (empty($d['name']) && empty($d['cid'])) continue;

            try {
                $stmt->execute([
                    ':name' => $d['name'] ?? null,
                    ':cid'  => $d['cid'] ?? null,
                    ':bank' => $d['bank_account'] ?? null,
                    ':inc'  => $d['total_income'] ?? 0,
                    ':exp'  => $d['total_expense'] ?? 0,
                    ':net'  => $d['net_balance'] ?? 0,
                    ':emp'  => $d['employee'] ?? 'ไม่ระบุ',
                    ':month'=> $monthNumber,
                    ':year' => $yearRaw
                ]);
                $saved++;
            } catch (Exception $e) { 
                // 🔴 เก็บ Error จริงๆ ไว้ส่งกลับ
                $debugErrors[] = "Row $i Error: " . $e->getMessage();
            }
        }

        $pdo->commit();
        
        // ถ้า Saved = 0 ให้ส่ง Error กลับไปดู
        if ($saved === 0 && count($debugErrors) > 0) {
            json_err("บันทึกไม่สำเร็จ (0 รายการ)", 500, ['debug_errors' => array_slice($debugErrors, 0, 5)]); // ส่งแค่ 5 อันแรกพอ
        }

        json_ok(['message'=>"บันทึกสำเร็จ $saved รายการ", 'saved'=>$saved]);

    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        json_err('Upload Error', 500, ['detail'=>$e->getMessage(), 'debug'=>$debugErrors]);
    }
}

if ($action === 'info') json_ok(['message' => 'API Ready']);
json_err('Action not found', 404);
?>