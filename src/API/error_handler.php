<?php
// index.php - PHP 5.6 compatible full API for SalaryApp

// =========================
// Basic headers & error reporting
// =========================
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// always respond JSON
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// =========================
// Output helpers with fallback for older JSON libs
// =========================
function json_out_raw($data) {
    // Try to encode with JSON_UNESCAPED_UNICODE, fallback to basic encode
    $json = null;
    if (defined('JSON_UNESCAPED_UNICODE')) {
        $json = @json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    if (!$json) {
        $json = @json_encode($data);
    }
    if ($json === false || $json === null) {
        // Last resort: simple printable fallback
        echo '{"status":"error","error":"JSON encode failed"}';
    } else {
        echo $json;
    }
    exit;
}

function json_ok($data = array()) {
    if (ob_get_length()) ob_clean();
    $out = array_merge(array('status' => 'success'), $data);
    json_out_raw($out);
}

function json_err($message = 'Unknown error', $code = 500, $extra = array()) {
    if (ob_get_length()) ob_clean();
    http_response_code($code);
    $out = array_merge(array('status' => 'error', 'error' => $message), $extra);
    json_out_raw($out);
}

// =========================
// Secure token generator (PHP 5.6 compatible)
// =========================
function secure_token($len_bytes = 32) {
    if (function_exists('openssl_random_pseudo_bytes')) {
        $bytes = openssl_random_pseudo_bytes($len_bytes);
        if ($bytes !== false) return bin2hex($bytes);
    }
    // fallback: pseudo-random by shuffling hex chars (not cryptographically ideal but works as fallback)
    $pool = str_repeat('0123456789abcdef', 10);
    $shuffled = str_shuffle($pool);
    return substr($shuffled, 0, $len_bytes * 2);
}

// =========================
// Error handling (PHP 5.6 compatible)
// =========================
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) return false;
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    $out = array(
        'status' => 'error',
        'error' => "PHP Error: $errstr",
        'detail' => "File: $errfile, Line: $errline"
    );
    json_out_raw($out);
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR))) {
        if (ob_get_length()) ob_clean();
        http_response_code(500);
        $out = array(
            'status' => 'error',
            'error' => "PHP Fatal Error: " . $error['message'],
            'detail' => "File: " . $error['file'] . ", Line: " . $error['line']
        );
        json_out_raw($out);
    }
});

ob_start();

// =========================
// Load dependencies & config
// =========================
if (!file_exists(__DIR__ . '/config.php')) {
    json_err('ไม่พบไฟล์ config.php', 500);
}
require_once __DIR__ . '/config.php';

if (file_exists(__DIR__ . '/db.php')) {
    require_once __DIR__ . '/db.php';
}

// Require composer autoload (PhpSpreadsheet)
if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    json_err('ไม่พบไฟล์ vendor/autoload.php — กรุณาติดตั้ง dependencies (composer install)', 500);
}
require_once __DIR__ . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

// =========================
// Month mapping (lowercase keys for comparison)
// =========================
$MONTH_MAP = array(
    'มกราคม'=>1, 'กุมภาพันธ์'=>2, 'มีนาคม'=>3, 'เมษายน'=>4, 'พฤษภาคม'=>5, 'มิถุนายน'=>6,
    'กรกฎาคม'=>7, 'สิงหาคม'=>8, 'กันยายน'=>9, 'ตุลาคม'=>10, 'พฤศจิกายน'=>11, 'ธันวาคม'=>12,
    'ม.ค.'=>1, 'ก.พ.'=>2, 'มี.ค.'=>3, 'เม.ย.'=>4, 'พ.ค.'=>5, 'มิ.ย.'=>6, 'ก.ค.'=>7, 'ส.ค.'=>8,
    'ก.ย.'=>9, 'ต.ค.'=>10, 'พ.ย.'=>11, 'ธ.ค.'=>12,
    'january'=>1, 'february'=>2, 'march'=>3, 'april'=>4, 'may'=>5, 'june'=>6,
    'july'=>7, 'august'=>8, 'september'=>9, 'october'=>10, 'november'=>11, 'december'=>12
);

$NUM_TO_THAI_MONTH = array(
    1=>'มกราคม',2=>'กุมภาพันธ์',3=>'มีนาคม',4=>'เมษายน',5=>'พฤษภาคม',6=>'มิถุนายน',
    7=>'กรกฎาคม',8=>'สิงหาคม',9=>'กันยายน',10=>'ตุลาคม',11=>'พฤศจิกายน',12=>'ธันวาคม'
);

// SALARY TABLE global (adjust as needed)
$GLOBALS['SALARY_TABLE'] = isset($GLOBALS['SALARY_TABLE']) ? $GLOBALS['SALARY_TABLE'] : 'salary_data';

// =========================
// Connect to DB via PDO (with try/catch using Exception)
// =========================
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ));
} catch (Exception $e) {
    json_err('DB Connection Error', 500, array('detail' => $e->getMessage()));
}

// =========================
// Read request payload & determine action
// =========================
$rawInput = file_get_contents('php://input');
$payload = @json_decode($rawInput, true);
if (!is_array($payload)) $payload = array();

$action = isset($_POST['action']) ? $_POST['action'] : (isset($_GET['action']) ? $_GET['action'] : (isset($payload['action']) ? $payload['action'] : 'info'));

// Helper: safe lowercase trim
function safe_lc($s) {
    if ($s === null) return '';
    return mb_strtolower(trim((string)$s));
}

// =========================
// ACTION: login
// =========================
if ($action === 'login') {
    try {
        $data = count($payload) ? $payload : $_POST;
        $username = trim(isset($data['username']) ? $data['username'] : (isset($data['cid']) ? $data['cid'] : ''));
        $password = trim(isset($data['password']) ? $data['password'] : '');

        if (!$username || !$password) json_err('กรุณากรอก CID และรหัสผ่าน', 400);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE cid = :cid LIMIT 1");
        $stmt->execute(array(':cid' => $username));
        $user = $stmt->fetch();

        if (!$user) {
            json_err('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง', 401);
        }

        // password stored with password_hash (bcrypt) expected — fallback to plain-text check too
        $stored = isset($user['password']) ? $user['password'] : '';
        $ok = false;
        if ($stored !== '' && function_exists('password_verify')) {
            $ok = password_verify($password, $stored);
        }
        if (!$ok) {
            // fallback plain compare (legacy)
            if ($stored === $password) $ok = true;
        }

        if (!$ok) json_err('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง', 401);

        $token = secure_token(32);
        json_ok(array('user' => array('id' => $user['id'], 'cid' => $user['cid'], 'name' => isset($user['name']) ? $user['name'] : ''), 'token' => $token));
    } catch (Exception $e) {
        json_err('Login Error', 500, array('detail' => $e->getMessage()));
    }
    // end login
}

// =========================
// ACTION: available-filters
// =========================
if ($action === 'available-filters') {
    try {
        $table = $GLOBALS['SALARY_TABLE'];
        // check table exists
        try {
            $pdo->query("SELECT 1 FROM `{$table}` LIMIT 1");
        } catch (Exception $e) {
            json_err("ไม่พบตาราง '{$table}' ในฐานข้อมูล กรุณาสร้างตารางก่อน", 500);
        }

        $stmt = $pdo->query("SELECT DISTINCT `month`, `year` FROM `{$table}` ORDER BY `year` DESC, `month` DESC");
        $rows = $stmt->fetchAll();

        $months = array();
        $years = array();
        foreach ($rows as $r) {
            $mNum = isset($r['month']) ? intval($r['month']) : 0;
            if ($mNum > 0) {
                $label = isset($NUM_TO_THAI_MONTH[$mNum]) ? $NUM_TO_THAI_MONTH[$mNum] : $mNum;
                $months[] = array('value' => $label, 'label' => $label);
            }
            if (!empty($r['year'])) $years[] = $r['year'];
        }

        // unique
        $uniqueMonths = array();
        foreach ($months as $m) { $uniqueMonths[$m['value']] = $m; }
        $months = array_values($uniqueMonths);
        $years = array_values(array_unique($years));

        json_ok(array('months' => $months, 'years' => $years));
    } catch (Exception $e) {
        json_err('Filter Error', 500, array('detail' => $e->getMessage()));
    }
}

// =========================
// ACTION: salary-data / get_data
// =========================
if ($action === 'salary-data' || $action === 'get_data') {
    try {
        $params = array_merge($_GET, $_POST, $payload);
        $table = $GLOBALS['SALARY_TABLE'];

        $sql = "SELECT * FROM `{$table}` WHERE 1=1";
        $bind = array();

        if (!empty($params['cid'])) { $sql .= " AND cid LIKE :cid"; $bind[':cid'] = "%{$params['cid']}%"; }
        if (!empty($params['name'])) { $sql .= " AND `name` LIKE :name"; $bind[':name'] = "%{$params['name']}%"; }
        if (!empty($params['month'])) {
            $mStr = safe_lc($params['month']);
            $mNum = isset($MONTH_MAP[$mStr]) ? $MONTH_MAP[$mStr] : null;
            if ($mNum) { $sql .= " AND `month` = :month"; $bind[':month'] = $mNum; }
        }
        if (!empty($params['year'])) { $sql .= " AND `year` = :year"; $bind[':year'] = $params['year']; }
        if (!empty($params['employee'])) { $sql .= " AND `employee` = :employee"; $bind[':employee'] = $params['employee']; }

        $sql .= " ORDER BY `year` DESC, `month` DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $data = $stmt->fetchAll();

        json_ok(array('data' => $data));
    } catch (Exception $e) {
        json_err('Get Data Error', 500, array('detail' => $e->getMessage()));
    }
}

// =========================
// ACTION: upload (Excel import)
// =========================
if ($action === 'upload') {
    $debugErrors = array();
    try {
        if (!isset($_FILES['file'])) json_err('ไม่พบไฟล์', 400);

        // month & year from POST
        $monthRaw = isset($_POST['month']) ? $_POST['month'] : '';
        $yearRaw  = isset($_POST['year']) ? $_POST['year'] : '';
        $mStr = safe_lc($monthRaw);
        $monthNumber = isset($MONTH_MAP[$mStr]) ? $MONTH_MAP[$mStr] : null;

        if (!$monthNumber || !$yearRaw) json_err('ข้อมูลเดือน/ปี ไม่ถูกต้อง', 400);

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) json_err('Upload Failed (error code: ' . intval($file['error']) . ')', 400);

        // read spreadsheet
        $tmp = $file['tmp_name'];
        $reader = IOFactory::createReaderForFile($tmp);
        $spreadsheet = $reader->load($tmp);
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        if (!is_array($rows) || count($rows) <= 1) json_err('ไฟล์ว่างเปล่า', 400);

        $header = $rows[1];
        $map = array();

        // helper: match header text to known DB fields
        function match_header($text) {
            $t = mb_strtolower(trim((string)$text));
            $keywords = array(
                'name' => array('ชื่อ','name','fullname','ชื่อ-สกุล','ชื่อ นามสกุล'),
                'cid' => array('cid','เลขประจำตัว','เลขบัตร','เลขบัตรประชาชน','citizen'),
                'bank_account' => array('บัญชี','account','bank','เลขที่บัญชี'),
                'total_income' => array('รวมรับ','total income','รวมรับ(บาท)'),
                'total_expense' => array('รวมจ่าย','total expense','รวมหัก','รวมจ่าย(บาท)'),
                'net_balance' => array('สุทธิ','net','คงเหลือ','net balance'),
                'employee' => array('ข้าราชการ','ประเภท','ลูกจ้าง','employee','type')
            );
            foreach ($keywords as $dbCol => $searchArr) {
                foreach ($searchArr as $kw) {
                    if ($kw === '') continue;
                    if (mb_strpos($t, $kw) !== false) return $dbCol;
                }
            }
            return null;
        }

        foreach ($header as $col => $val) {
            $k = match_header($val);
            if ($k) $map[$col] = $k;
        }

        // fallback mapping if none matched
        if (empty($map)) {
            $map = array('A'=>'name','B'=>'cid','C'=>'bank_account','D'=>'total_income','E'=>'total_expense','F'=>'net_balance','G'=>'employee');
        }

        $table = $GLOBALS['SALARY_TABLE'];
        $pdo->beginTransaction();

        // delete old rows for same month/year
        $stmtDel = $pdo->prepare("DELETE FROM `{$table}` WHERE `month` = :m AND `year` = :y");
        $stmtDel->execute(array(':m' => $monthNumber, ':y' => $yearRaw));

        // prepare insert (adjust columns to your table schema)
        $sql = "INSERT INTO `{$table}` 
                (name, cid, bank_account, total_income, total_expense, net_balance, employee, month, year, created_at)
                VALUES 
                (:name, :cid, :bank, :inc, :exp, :net, :emp, :month, :year, NOW())";
        $stmt = $pdo->prepare($sql);

        $saved = 0;
        foreach ($rows as $i => $row) {
            if ($i == 1) continue; // skip header row

            $d = array();
            foreach ($map as $col => $field) {
                $val = isset($row[$col]) ? trim((string)$row[$col]) : '';
                if (in_array($field, array('total_income','total_expense','net_balance'))) {
                    // normalize numeric: remove commas, currency signs, spaces, parentheses
                    $v = str_replace(array(',', '฿', ' '), '', $val);
                    if (preg_match('/^\((.*)\)$/', $v, $m)) $v = '-' . $m[1];
                    $d[$field] = is_numeric($v) ? floatval($v) : 0;
                } else {
                    $d[$field] = $val;
                }
            }

            // skip if empty row
            $isEmptyRow = true;
            foreach (array('name','cid') as $k) {
                if (!empty($d[$k])) { $isEmptyRow = false; break; }
            }
            if ($isEmptyRow) continue;

            try {
                $stmt->execute(array(
                    ':name' => isset($d['name']) ? $d['name'] : null,
                    ':cid'  => isset($d['cid']) ? $d['cid'] : null,
                    ':bank' => isset($d['bank_account']) ? $d['bank_account'] : null,
                    ':inc'  => isset($d['total_income']) ? $d['total_income'] : 0,
                    ':exp'  => isset($d['total_expense']) ? $d['total_expense'] : 0,
                    ':net'  => isset($d['net_balance']) ? $d['net_balance'] : 0,
                    ':emp'  => isset($d['employee']) ? $d['employee'] : 'ไม่ระบุ',
                    ':month'=> $monthNumber,
                    ':year' => $yearRaw
                ));
                $saved++;
            } catch (Exception $e) {
                $debugErrors[] = "Row $i Error: " . $e->getMessage();
            }
        }

        $pdo->commit();

        if ($saved === 0 && count($debugErrors) > 0) {
            json_err("บันทึกไม่สำเร็จ (0 รายการ)", 500, array('debug_errors' => array_slice($debugErrors, 0, 10)));
        }

        json_ok(array('message' => "บันทึกสำเร็จ $saved รายการ", 'saved' => $saved));

    } catch (Exception $e) {
        if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
        json_err('Upload Error', 500, array('detail' => $e->getMessage(), 'debug' => $debugErrors));
    }
}

// =========================
// Default info action
// =========================
if ($action === 'info') {
    json_ok(array('message' => 'API Ready'));
}

json_err('Action not found', 404);
