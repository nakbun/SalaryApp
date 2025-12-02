<?php
// index.php - Full API for SalaryApp
// รองรับ actions: login, upload, available-filters, salary-data, get_data

// ========== BASIC SETTINGS ==========
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ========== REQUIREMENTS ==========
require_once __DIR__ . '/vendor/autoload.php'; // PhpSpreadsheet (composer)
use PhpOffice\PhpSpreadsheet\IOFactory;

require_once __DIR__ . '/config.php'; // ควรมี DB_HOST, DB_NAME, DB_USER, DB_PASS
require_once __DIR__ . '/db.php';     // ถ้าไฟล์นี้สร้าง PDO หรือ consts (เราจะสร้าง PDO เองด้านล่างถ้า needed)
// require_once __DIR__ . '/error_handler.php'; // ถ้ามี

// ========== HELPER: JSON RESP ==========
function json_ok($data = []) {
    echo json_encode(array_merge(['status' => 'success'], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_err($message = 'Unknown error', $code = 500, $extra = []) {
    http_response_code($code);
    $out = array_merge(['status' => 'error', 'error' => $message], $extra);
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

// ========== CREATE PDO ==========
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    error_log("DB connect error: " . $e->getMessage());
    json_err('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล', 500, ['detail' => $e->getMessage()]);
}

// ========== READ ACTION ==========
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    // rawInput อาจเป็นว่าง (เช่น form-data) -> ไม่ถือเป็น error
    $payload = null;
}

// action priority: $_POST['action'] > $_GET['action'] > json payload
$action = $_POST['action'] ?? $_GET['action'] ?? ($payload['action'] ?? null);

// log
error_log("API index.php - action={$action} method={$_SERVER['REQUEST_METHOD']} POST=" . print_r($_POST, true) . " GET=" . print_r($_GET, true) . " payload=" . print_r($payload, true));

// validate action
if (!$action) {
    json_err('Invalid action: empty', 400);
}

// --------------------------
// Helper: normalize month names (Thai) to number (1-12)
// You can extend this map in config.php using $MONTH_MAP if you want
// --------------------------
$MONTH_MAP_DEFAULT = [
    'มกราคม' => 1,'กุมภาพันธ์' => 2,'มีนาคม' => 3,'เมษายน' => 4,'พฤษภาคม' => 5,'มิถุนายน' => 6,
    'กรกฎาคม' => 7,'สิงหาคม' => 8,'กันยายน' => 9,'ตุลาคม' => 10,'พฤศจิกายน' => 11,'ธันวาคม' => 12,
    // English
    'January'=>1,'February'=>2,'March'=>3,'April'=>4,'May'=>5,'June'=>6,'July'=>7,'August'=>8,'September'=>9,'October'=>10,'November'=>11,'December'=>12,
];
$MONTH_MAP = $GLOBALS['MONTH_MAP'] ?? $MONTH_MAP_DEFAULT;

// ======================================================
// ACTION: login
// expects JSON payload: { action: 'login', username: '...', password: '...' }
// ======================================================
if ($action === 'login') {
    try {
        $data = $payload ?? $_POST ?? [];
        $username = trim($data['username'] ?? '');
        $password = trim($data['password'] ?? '');

        if (!$username || !$password) json_err('กรุณากรอก CID และรหัสผ่าน', 400);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE cid = :cid LIMIT 1");
        $stmt->execute([':cid' => $username]);
        $user = $stmt->fetch();

        if (!$user) json_err('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง', 401);

        if (!password_verify($password, $user['password'])) {
            json_err('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง', 401);
        }

        // สร้าง token แบบง่าย (คุณอาจใช้ JWT ในโปรดักชัน)
        $token = bin2hex(random_bytes(32));

        // ตัวอย่าง: update last_login (ไม่บังคับ)
        $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
        $stmt->execute([':id' => $user['id']]);

        json_ok([
            'user' => [
                'id' => $user['id'],
                'cid' => $user['cid'],
                'name' => $user['name'],
            ],
            'token' => $token
        ]);
    } catch (Throwable $e) {
        error_log("Login error: ".$e->getMessage());
        json_err('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 500, ['detail' => $e->getMessage()]);
    }
}

// ======================================================
// ACTION: available-filters
// returns months and years available in payroll table
// ======================================================
if ($action === 'available-filters') {
    try {
        // ปรับชื่อตารางตาม DB ของคุณ
        $table = $GLOBALS['SALARY_TABLE'] ?? 'payroll';

        $stmt = $pdo->query("SELECT DISTINCT `month`, `year` FROM `{$table}` ORDER BY `year` DESC, `month` DESC");
        $rows = $stmt->fetchAll();

        $months = [];
        $years = [];
        foreach ($rows as $r) {
            if ($r['month'] !== null) {
                $months[] = ['value' => $r['month'], 'label' => $r['month']];
            }
            if ($r['year'] !== null) $years[] = $r['year'];
        }

        // unique preserve order
        $months = array_values(array_reduce($months, function($acc, $item){
            $key = $item['value'];
            if (!isset($acc[$key])) $acc[$key] = $item;
            return $acc;
        }, []));
        $years = array_values(array_unique($years));

        json_ok(['months' => $months, 'years' => $years]);
    } catch (Throwable $e) {
        error_log("available-filters error: ".$e->getMessage());
        json_err('เกิดข้อผิดพลาดในการดึงตัวกรอง', 500, ['detail' => $e->getMessage()]);
    }
}

// ======================================================
// ACTION: salary-data
// Accepts GET/POST params: cid, name, month, year, employee
// Returns list of rows
// ======================================================
if ($action === 'salary-data' || $action === 'get_data') {
    try {
        // Accept from GET, POST, or JSON payload
        $params = array_merge($_GET, $_POST, is_array($payload) ? $payload : []);
        $cid = trim($params['cid'] ?? '');
        $name = trim($params['name'] ?? '');
        $month = trim($params['month'] ?? '');
        $year = trim($params['year'] ?? '');
        $employee = trim($params['employee'] ?? '');

        $table = $GLOBALS['SALARY_TABLE'] ?? 'payroll';

        $sql = "SELECT * FROM `{$table}` WHERE 1=1";
        $bind = [];

        if ($cid !== '') {
            $sql .= " AND cid LIKE :cid";
            $bind[':cid'] = "%{$cid}%";
        }
        if ($name !== '') {
            $sql .= " AND `name` LIKE :name";
            $bind[':name'] = "%{$name}%";
        }
        if ($month !== '') {
            $sql .= " AND `month` = :month";
            $bind[':month'] = $month;
        }
        if ($year !== '') {
            $sql .= " AND `year` = :year";
            $bind[':year'] = $year;
        }
        if ($employee !== '') {
            $sql .= " AND `employee` = :employee";
            $bind[':employee'] = $employee;
        }

        $sql .= " ORDER BY `year` DESC, `month` DESC LIMIT 10000"; // limit safety

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $data = $stmt->fetchAll();

        json_ok(['data' => $data]);
    } catch (Throwable $e) {
        error_log("salary-data error: ".$e->getMessage());
        json_err('เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือน', 500, ['detail' => $e->getMessage()]);
    }
}

// ======================================================
// ACTION: upload
// Expects multipart/form-data POST with:
// - file (uploaded excel)
// - month (text, e.g., "ตุลาคม")
// - year (text/number, e.g., "2568")
// - optional: action=upload
// ======================================================
if ($action === 'upload') {
    try {
        // Validate presence
        if (!isset($_FILES['file'])) json_err('ไม่พบไฟล์ที่อัปโหลด', 400);
        $file = $_FILES['file'];
        $monthRaw = $_POST['month'] ?? null;
        $yearRaw = $_POST['year'] ?? null;

        if (!$monthRaw || !$yearRaw) {
            json_err('กรุณากรอก เดือน และ ปี ให้ครบ', 400);
        }

        // Normalize month (support Thai names or numeric)
        $monthNormalized = null;
        if (is_numeric($monthRaw)) {
            $monthNormalized = intval($monthRaw);
        } else {
            $m = trim($monthRaw);
            $monthNormalized = $MONTH_MAP[$m] ?? $MONTH_MAP[strtolower($m)] ?? null;
        }
        // If couldn't parse to number, keep raw month text in DB (some projects keep 'ตุลาคม')
        // We'll store both month_label and month_number (if available)
        $monthNumber = $monthNormalized ? intval($monthNormalized) : null;
        $monthLabel = $monthRaw;

        $year = trim($yearRaw);

        // safe file check
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error_log("Upload file error code: " . $file['error']);
            json_err('ไฟล์อัปโหลดผิดพลาด', 400, ['file_error' => $file['error']]);
        }

        // Move to temp location (optional) - we will load from tmp_name directly
        $tmpPath = $file['tmp_name'];

        // Load spreadsheet
        $reader = IOFactory::createReaderForFile($tmpPath);
        $spreadsheet = $reader->load($tmpPath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true); // associative by column letter

        if (count($rows) <= 1) {
            json_err('ไฟล์ Excel ไม่มีข้อมูล', 400);
        }

        // Map header -> keys (flexible)
        // เราคาดว่าบรรทัดแรกคือ header
        $header = $rows[1];
        $map = []; // column letter => field name (name, cid, bank_account, total_income, total_expense, net_balance, employee)
        $header_lower = array_map(function($v){ return mb_strtolower(trim((string)$v)); }, $header);

        // helper to detect header keywords
        function match_header($text) {
            $t = mb_strtolower(trim((string)$text));
            $keywords = [
                'name' => ['ชื่อ','name','full name','fullname'],
                'cid' => ['cid','เลขประจำตัวประชาชน','เลขบัตรประชาชน','เลขประจำตัว'],
                'bank_account' => ['บัญชี','เลขที่บัญชี','bank account','account'],
                'total_income' => ['รวมรับ','รวมเงินได้','total income','income'],
                'total_expense' => ['รวมจ่าย','หัก','total expense','expense'],
                'net_balance' => ['สุทธิ','เงินได้สุทธิ','net','net balance','net_income'],
                'employee' => ['ข้าราชการ','ลูกจ้างเงินเดือน','ประเภท','type','position']
            ];
            foreach ($keywords as $k => $arr) {
                foreach ($arr as $kw) {
                    if (mb_strpos($t, $kw) !== false) return $k;
                }
            }
            return null;
        }

        // Build map
        foreach ($header as $col => $val) {
            $key = match_header($val);
            if ($key) $map[$col] = $key;
        }

        // If map empty, fallback to column order mapping (A..G)
        if (empty($map)) {
            // assume columns: A: name, B: cid, C: bank, D: total_income, E: total_expense, F: net, G: type
            $fallback = ['A'=>'name','B'=>'cid','C'=>'bank_account','D'=>'total_income','E'=>'total_expense','F'=>'net_balance','G'=>'employee'];
            $map = $fallback;
        }

        // Table name
        $table = $GLOBALS['SALARY_TABLE'] ?? 'payroll';

        // Begin transaction
        $pdo->beginTransaction();

        $insert_sql = "
            INSERT INTO `{$table}` 
                (`name`,`cid`,`bank_account`,`total_income`,`total_expense`,`net_balance`,`employee`,`month`,`month_number`,`year`,`created_at`)
            VALUES
                (:name,:cid,:bank_account,:total_income,:total_expense,:net_balance,:employee,:month_label,:month_number,:year,NOW())
        ";
        $stmtInsert = $pdo->prepare($insert_sql);

        $saved = 0;
        $total = 0;

        // iterate rows starting from row 2
        foreach ($rows as $rIndex => $row) {
            if ($rIndex == 1) continue; // header
            // detect empty row (all null/empty)
            $allEmpty = true;
            foreach ($row as $cell) {
                if (trim((string)$cell) !== '') { $allEmpty = false; break; }
            }
            if ($allEmpty) continue;

            $total++;

            // read fields using map
            $name = '';
            $cid = '';
            $bank = '';
            $total_income = 0;
            $total_expense = 0;
            $net_balance = 0;
            $employeeType = '';

            foreach ($map as $col => $field) {
                $val = isset($row[$col]) ? trim((string)$row[$col]) : '';
                // normalize numeric values (remove commas, parentheses, ฿)
                if (in_array($field, ['total_income','total_expense','net_balance'])) {
                    $norm = str_replace([',','฿',' '], '', $val);
                    // handle negative in parentheses "(1,000)"
                    if (preg_match('/^\((.*)\)$/', $norm, $m)) {
                        $norm = '-' . $m[1];
                    }
                    $num = is_numeric($norm) ? floatval($norm) : 0;
                    if ($field === 'total_income') $total_income = $num;
                    if ($field === 'total_expense') $total_expense = $num;
                    if ($field === 'net_balance') $net_balance = $num;
                } else {
                    // non-numeric
                    if ($field === 'name') $name = $val;
                    if ($field === 'cid') $cid = $val;
                    if ($field === 'bank_account') $bank = $val;
                    if ($field === 'employee') $employeeType = $val;
                }
            }

            // If CID empty skip (optional) - here we still insert but you can change logic
            // Execute insert
            try {
                $stmtInsert->execute([
                    ':name' => $name ?: null,
                    ':cid' => $cid ?: null,
                    ':bank_account' => $bank ?: null,
                    ':total_income' => $total_income,
                    ':total_expense' => $total_expense,
                    ':net_balance' => $net_balance,
                    ':employee' => $employeeType ?: null,
                    ':month_label' => $monthLabel,
                    ':month_number' => $monthNumber,
                    ':year' => $year
                ]);
                $saved++;
            } catch (Throwable $e) {
                // Log and continue (don't rollback whole transaction because one row may be bad)
                error_log("Insert row {$rIndex} error: " . $e->getMessage());
            }
        }

        // commit
        $pdo->commit();

        json_ok([
            'message' => "บันทึกข้อมูลเรียบร้อย",
            'rows' => $total,
            'saved' => $saved
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("Upload error: " . $e->getMessage());
        json_err('เกิดข้อผิดพลาดในการอัปโหลดไฟล์', 500, ['detail' => $e->getMessage()]);
    }
}

// If action not handled (should never reach here because of earlier checks)
json_err('Action not implemented: ' . $action, 400);

?>
