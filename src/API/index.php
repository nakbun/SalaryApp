<?php
// ===============================
// SalaryApp API - PHP 5.6 Version
// ===============================

// 1. เปลี่ยนการเรียก Library เป็น PHPExcel
// ตรวจสอบ path ของ PHPExcel ให้ถูกต้อง (ปกติจะเป็น Classes/PHPExcel.php)
// ตรวจสอบและโหลด PHPExcel
$phpexcel_paths = [
    __DIR__ . '/PHPExcel/Classes/PHPExcel.php',
    __DIR__ . '/PHPExcel-1.8.2/Classes/PHPExcel.php',
    __DIR__ . '/vendor/phpoffice/phpexcel/Classes/PHPExcel.php',
];

$phpexcel_loaded = false;
foreach ($phpexcel_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $phpexcel_loaded = true;
        break;
    }
}

if (!$phpexcel_loaded) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'error' => 'ไม่พบ PHPExcel Library',
        'detail' => 'กรุณาดาวน์โหลด PHPExcel และวางในโฟลเดอร์ API/PHPExcel/Classes/',
        'paths_checked' => $phpexcel_paths
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('memory_limit', '512M'); // PHP 5.6 กินแรมเยอะเมื่ออ่าน Excel

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Polyfill สำหรับ random_bytes ใน PHP 5.6
if (!function_exists('random_bytes')) {
    function random_bytes($length) {
        if (function_exists('openssl_random_pseudo_bytes')) {
            return openssl_random_pseudo_bytes($length);
        }
        // Fallback แบบง่ายๆ ถ้าไม่มี openssl (ไม่แนะนำสำหรับ production จริงจังแต่พอแก้ขัดได้)
        return substr(str_shuffle(str_repeat('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length/62))), 1, $length);
    }
}

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => "PHP Error: $errstr",
        'detail' => "File: $errfile, Line: $errline"
    ]); // JSON_UNESCAPED_UNICODE มีใน 5.4+ ใช้ได้
    exit;
});

ob_start();

// -------------------------------
// CONFIG
// -------------------------------
$GLOBALS['SALARY_TABLE'] = 'salary_data';

if (!file_exists(__DIR__ . '/config.php')) {
    echo json_encode(['status' => 'error', 'error' => 'ไม่พบไฟล์ config.php']);
    exit;
}
require_once __DIR__ . '/config.php';

// -------------------------------
// HELPERS
// -------------------------------
function json_ok($data = []) {
    if (ob_get_length()) ob_clean();
    // array_merge ใช้ได้ปกติ
    echo json_encode(array_merge(['status' => 'success'], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_err($message, $code = 500, $extra = []) {
    if (ob_get_length()) ob_clean();
    http_response_code($code);
    echo json_encode(array_merge(['status' => 'error', 'error' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------
// MAPPINGS (เหมือนเดิม)
// -------------------------------
$MONTH_MAP = [
    'มกราคม'=>1, 'กุมภาพันธ์'=>2, 'มีนาคม'=>3, 'เมษายน'=>4, 'พฤษภาคม'=>5, 'มิถุนายน'=>6,
    'กรกฎาคม'=>7, 'สิงหาคม'=>8, 'กันยายน'=>9, 'ตุลาคม'=>10, 'พฤศจิกายน'=>11, 'ธันวาคม'=>12,
];

$NUM_TO_THAI_MONTH = [
    1=>'มกราคม', 2=>'กุมภาพันธ์', 3=>'มีนาคม', 4=>'เมษายน', 5=>'พฤษภาคม', 6=>'มิถุนายน',
    7=>'กรกฎาคม', 8=>'สิงหาคม', 9=>'กันยายน', 10=>'ตุลาคม', 11=>'พฤศจิกายน', 12=>'ธันวาคม'
];

$COLUMN_MAP = [
    'cid' => 'cid',
    'เลขบัตรประชาชน' => 'cid',
    'เลขประจำตัวประชาชน' => 'cid',
    'รหัสบัตรประชาชน' => 'cid',
    'บัตรประชาชน' => 'cid',
    'เลขปชช' => 'cid',
    'เลขปชช.' => 'cid',
    'ชื่อ' => 'name',
    'ชื่อ-สกุล' => 'name',
    'ชื่อ-นามสกุล' => 'name',
    'ชื่อนามสกุล' => 'name',
    'ชื่อสกุล' => 'name',
    'เลขที่บัญชี' => 'bank_account',
    'บัญชีธนาคาร' => 'bank_account',
    'เลขบัญชี' => 'bank_account',
    'บัญชี' => 'bank_account',
    'เงินเดือน' => 'salary',
    'เงินเดือนสุทธิ' => 'salary_deductions',
    'รวมรับ' => 'total_income',
    'รวมจ่าย' => 'total_expense',
    'คงเหลือ' => 'net_balance',
    'ค่าครองชีพ' => 'cola_allowance',
    'ค่าครองชีพ(ตกเบิก)' => 'retroactive_cola_allowance',
    'ง/ด(ตกเบิก)' => 'retroactive_salary_emp',
    'ง/ด ตกเบิก' => 'retroactive_salary_emp',
    'พตส.' => 'special_public_health_allowance',
    'ปจต.' => 'position_allowance',
    'รายเดือน' => 'monthly_allowance',
    'P4P' => 'pay_for_performance',
    'p4p' => 'pay_for_performance',
    'โอที' => 'overtime_pay',
    'OT/OPD' => 'ot_outpatient_dept',
    'OT/พบ.' => 'ot_professional',
    'OT/ผช.' => 'ot_assistant',
    'บ่าย-ดึก' => 'evening_night_shift_pay',
    'บ-ด/พบ.' => 'shift_professional',
    'บ-ด/ผช.' => 'shift_assistant',
    'หักวันลา' => 'leave_day_deduction',
    'ภาษี' => 'tax_deduction',
    'ภาษี ตกเบิก' => 'retroactive_tax_deduction',
    'กบข.' => 'gpf_contribution',
    'กบข.ตกเบิก' => 'retroactive_gpf_deduction',
    'กบข.เพิ่ม' => 'gpf_extra_contribution',
    'ปกสค.' => 'social_security_deduction_gov',
    'ประกันสังคม' => 'social_security_deduction_emp',
    'กองทุน พกส.' => 'phks_provident_fund',
    'ฌกส.' => 'funeral_welfare_deduction',
    'สอ.กรม' => 'coop_deduction_dept',
    'สอ.สสจ.เลย' => 'coop_deduction_phso',
    'สสจ.' => 'coop_deduction_phso',
    'กยศ.' => 'student_loan_deduction_emp',
    'กยศ' => 'student_loan_deduction_emp',
    'ค่าน้ำ' => 'water_bill_deduction',
    'ค่าไฟ' => 'electricity_bill_deduction',
    'net' => 'internet_deduction_emp',
    'ค่าNet' => 'internet_deduction_emp',
    'AIA' => 'aia_insurance_deduction_emp',
    'aia' => 'aia_insurance_deduction_emp',
    'ออมสิน' => 'gsb_loan_deduction_emp',
    'ออมสินนาอาน' => 'gsb_loan_naan',
    'ธนาคารออมสินเลย' => 'gsb_loan_loei',
    'ธอส' => 'ghb_loan_deduction',
    'กรุงไทย' => 'ktb_loan_deduction_emp',
    'ธนาคารกรุงไทย' => 'ktb_loan_deduction_emp',
    'เงินกู้ รพ.' => 'hospital_loan_deduction',
    'เงินกู้สวัสดิการ' => 'welfare_loan_received',
    'การศึกษาบุตร' => 'child_education_deduction',
    'ค่ารักษาพยาบาล' => 'medical_expense_deduction',
    'ไม่ปฏิบัติเวช' => 'no_private_practice_deduction',
    'โควิด-19' => 'covid_risk_pay',
    'เสี่ยงภัยโควิด' => 'covid_risk_pay',
    'อื่นๆ' => 'other_income',
];

$NUMERIC_FIELDS = [
    'salary', 'total_income', 'total_expense', 'net_balance',
    'cola_allowance', 'retroactive_cola_allowance', 'retroactive_salary_emp',
    'special_public_health_allowance', 'position_allowance', 'monthly_allowance',
    'pay_for_performance', 'covid_risk_pay', 'welfare_loan_received',
    'overtime_pay', 'evening_night_shift_pay', 'ot_outpatient_dept', 'ot_professional',
    'ot_assistant', 'shift_professional', 'shift_assistant', 'other_income',
    'leave_day_deduction', 'tax_deduction', 'retroactive_tax_deduction',
    'gpf_contribution', 'retroactive_gpf_deduction', 'gpf_extra_contribution',
    'social_security_deduction_gov', 'social_security_deduction_emp',
    'phks_provident_fund', 'funeral_welfare_deduction', 'coop_deduction_dept',
    'coop_deduction_phso', 'student_loan_deduction_emp',
    'water_bill_deduction', 'electricity_bill_deduction', 'internet_deduction_emp',
    'aia_insurance_deduction_emp', 'gsb_loan_deduction_emp', 'gsb_loan_naan',
    'gsb_loan_loei', 'ghb_loan_deduction', 'ktb_loan_deduction_emp',
    'hospital_loan_deduction', 'child_education_deduction', 'medical_expense_deduction',
    'no_private_practice_deduction', 'salary_deductions'
];

// -------------------------------
// CONNECT DB
// -------------------------------
try {
    $dsn = "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    json_err('DB Connection Error', 500, ['detail' => $e->getMessage()]);
}

// -------------------------------
// READ INPUT (Fix for PHP 5.6)
// -------------------------------
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

// Fix: เปลี่ยน ?? เป็น isset
$action = 'info';
if (isset($_POST['action'])) {
    $action = $_POST['action'];
} elseif (isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif (isset($payload['action'])) {
    $action = $payload['action'];
}

// ==================================================================
// ACTION: LOGIN
// ==================================================================
if ($action === 'login') {
    try {
        $data = $payload ? $payload : $_POST; // Fix shorthand ternary
        $username = isset($data['username']) ? trim($data['username']) : '';
        $password = isset($data['password']) ? trim($data['password']) : '';

        if (!$username || !$password) {
            json_err('กรุณากรอก CID และรหัสผ่าน', 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE cid = :cid LIMIT 1");
        $stmt->execute([':cid' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            json_err('เลขประจำตัวหรือรหัสผ่านไม่ถูกต้อง', 401);
        }

        $token = bin2hex(random_bytes(32));

        json_ok([
            'user' => [
                'id' => $user['id'],
                'cid' => $user['cid'],
                'name' => $user['name']
            ],
            'token' => $token
        ]);

    } catch (Exception $e) {
        json_err('Login Error', 500, ['detail' => $e->getMessage()]);
    }
}

// ==================================================================
// ACTION: AVAILABLE FILTERS
// ==================================================================
if ($action === 'available-filters') {
    try {
        $table = $GLOBALS['SALARY_TABLE'];

        $stmt = $pdo->query("SELECT DISTINCT month, year FROM {$table} WHERE month IS NOT NULL AND year IS NOT NULL ORDER BY year DESC, month DESC");
        $rows = $stmt->fetchAll();

        $months = [];
        $years = [];

        foreach ($rows as $r) {
            $m = $r['month'];
            if ($m) {
                $label = isset($NUM_TO_THAI_MONTH[$m]) ? $NUM_TO_THAI_MONTH[$m] : $m; // Fix ??
                $months[$label] = ['value'=>$label, 'label'=>$label];
            }
            if ($r['year']) $years[] = $r['year'];
        }

        json_ok([
            'months' => array_values($months),
            'years' => array_values(array_unique($years))
        ]);

    } catch (Exception $e) {
        json_err('Filter Error', 500, ['detail' => $e->getMessage()]);
    }
}

// ==================================================================
// ACTION: GET SALARY DATA
// ==================================================================
if ($action === 'salary-data' || $action === 'get_data') {
    try {
        // Fix: array_merge ใน 5.6 ต้องระวังถ้า parameter ไม่ใช่ array
        $p_payload = is_array($payload) ? $payload : [];
        $params = array_merge($_GET, $_POST, $p_payload);
        $table = $GLOBALS['SALARY_TABLE'];

        $sql = "SELECT * FROM {$table} WHERE 1=1";
        $bind = [];

        if (!empty($params['cid'])) {
            $sql .= " AND cid LIKE :cid";
            $bind[':cid'] = "%".$params['cid']."%";
        }

        if (!empty($params['name'])) {
            $sql .= " AND name LIKE :name";
            $bind[':name'] = "%".$params['name']."%";
        }

        if (!empty($params['month'])) {
            $m = mb_strtolower(trim($params['month']));
            if (isset($MONTH_MAP[$m])) {
                $sql .= " AND month = :month";
                $bind[':month'] = $MONTH_MAP[$m];
            }
        }

        if (!empty($params['year'])) {
            $sql .= " AND year = :year";
            $bind[':year'] = $params['year'];
        }

        if (!empty($params['employee'])) {
            $sql .= " AND employee = :emp";
            $bind[':emp'] = $params['employee'];
        }

        $sql .= " ORDER BY employee, id LIMIT 1000";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $data = $stmt->fetchAll();

        json_ok(['data' => $data]);

    } catch (Exception $e) {
        json_err('Get Data Error', 500, ['detail' => $e->getMessage()]);
    }
}

// ==================================================================
// ACTION: UPLOAD EXCEL (Refactored for PHPExcel)
// ==================================================================
if ($action === 'upload') {
    date_default_timezone_set("Asia/Bangkok");

    try {
        if (!isset($_FILES['file'])) json_err('ไม่พบไฟล์อัปโหลด', 400);

        // Fix ??
        $monthRaw = isset($_POST['month']) ? $_POST['month'] : '';
        $yearRaw  = isset($_POST['year']) ? $_POST['year'] : '';

        $mLower = mb_strtolower(trim($monthRaw));
        $monthNumber = isset($MONTH_MAP[$mLower]) ? $MONTH_MAP[$mLower] : null;

        if (!$monthNumber || !$yearRaw) {
            json_err('เดือนหรือปีไม่ถูกต้อง', 400);
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_err('อัปโหลดไฟล์ไม่สำเร็จ', 400);
        }

        // ==========================================
        // CHANGE: ใช้ PHPExcel แทน IOFactory ของใหม่
        // ==========================================
        // ตรวจสอบว่ามี Class PHPExcel_IOFactory หรือไม่
        if (!class_exists('PHPExcel_IOFactory')) {
             json_err('Server นี้ไม่มี Library PHPExcel (สำหรับ PHP 5.6)', 500);
        }

        try {
            $excel = PHPExcel_IOFactory::load($file['tmp_name']);
        } catch (Exception $e) {
            json_err('ไม่สามารถอ่านไฟล์ Excel ได้', 400, ['detail' => $e->getMessage()]);
        }
        
        $table = $GLOBALS['SALARY_TABLE'];
        $pdo->beginTransaction();

        $del = $pdo->prepare("DELETE FROM {$table} WHERE month=:m AND year=:y");
        $del->execute([':m' => $monthNumber, ':y' => $yearRaw]);

        $totalSaved = 0;
        $debugInfo = [];
        $errorLogs = [];

        // วนลูปทุก sheet (PHPExcel style)
        foreach ($excel->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            
            $employeeType = '';
            if (mb_stripos($sheetName, 'ข้าราชการ') !== false) {
                $employeeType = 'ข้าราชการ';
            } elseif (mb_stripos($sheetName, 'ลูกจ้าง') !== false) {
                $employeeType = 'ลูกจ้างเงินเดือน';
            } else {
                continue;
            }

            // PHPExcel: toArray
            $rows = $sheet->toArray(null, true, true, true);
            
            if (count($rows) <= 1) continue;

            // header is index 1
            $header = $rows[1];
            $columnMapping = [];
            $headerDebug = [];

            foreach ($header as $col => $headerText) {
                $headerClean = mb_strtolower(trim($headerText));
                $headerDebug[] = $headerText;
                
                foreach ($COLUMN_MAP as $thaiName => $dbField) {
                    if ($headerClean === mb_strtolower($thaiName)) {
                        $columnMapping[$col] = $dbField;
                        break;
                    }
                }
            }

            $sheetSaved = 0;
            
            foreach ($rows as $i => $row) {
                if ($i == 1) continue;

                $data = [
                    'month' => $monthNumber,
                    'year' => (int)$yearRaw,
                    'employee' => $employeeType
                ];

                $hasData = false;

                foreach ($columnMapping as $col => $field) {
                    $val = isset($row[$col]) ? $row[$col] : '';
                    
                    if (in_array($field, ['covid_exposure', 'prov_health_office'])) continue;
                    
                    if ($val === null || $val === '') {
                        continue;
                    }
                    
                    $val = trim($val);
                    if ($val === '') continue;
                    
                    if ($field === 'cid') {
                        $cleanCid = preg_replace('/\D/', '', $val);
                        if ($cleanCid !== '' && strlen($cleanCid) >= 1) {
                            $data[$field] = $cleanCid;
                            $hasData = true;
                        }
                    }
                    elseif ($field === 'bank_account') {
                        $cleanBank = preg_replace('/\D/', '', $val);
                        if ($cleanBank !== '') {
                            $data[$field] = $cleanBank;
                            $hasData = true;
                        }
                    }
                    elseif (in_array($field, $NUMERIC_FIELDS)) {
                        $val = str_replace([',', ' ', '฿', ' '], '', $val);
                        
                        if (preg_match('/^\((.*)\)$/', $val, $m)) {
                            $val = '-' . $m[1];
                        }
                        
                        if (is_numeric($val) && $val !== '') {
                            $data[$field] = floatval($val);
                            $hasData = true;
                        }
                    }
                    else {
                        if ($val !== '') {
                            $data[$field] = $val;
                            $hasData = true;
                        }
                    }
                }

                if ($hasData && (!empty($data['name']) || !empty($data['cid']))) {
                    try {
                        $fields = array_keys($data);
                        $placeholders = ':' . implode(', :', $fields);
                        $fieldList = implode(', ', $fields);
                        
                        $insert = $pdo->prepare("
                            INSERT INTO {$table} ({$fieldList}) 
                            VALUES ({$placeholders})
                        ");
                        
                        $insert->execute($data);
                        $sheetSaved++;
                        $totalSaved++;
                        
                    } catch (Exception $e) {
                        $errorLogs[] = "Sheet: {$sheetName}, Row {$i}: " . $e->getMessage();
                    }
                }
            }
            
            $debugInfo[] = [
                'sheet' => $sheetName,
                'employee_type' => $employeeType,
                'columns_mapped' => count($columnMapping),
                'total_rows' => count($rows) - 1,
                'saved' => $sheetSaved,
                'headers' => array_slice($headerDebug, 0, 10),
                'mapped_fields' => array_values(array_unique($columnMapping))
            ];
        }

        $pdo->commit();

        $response = [
            'message' => "บันทึกสำเร็จ {$totalSaved} รายการ",
            'saved' => $totalSaved,
            'sheets_processed' => $debugInfo
        ];
        
        if (!empty($errorLogs)) {
            $response['errors'] = array_slice($errorLogs, 0, 10);
        }

        json_ok($response);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        json_err('Upload Error', 500, [
            'detail' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ]);
    }
}

// ==================================================================
// DEFAULT
// ==================================================================
if ($action === 'info') {
    json_ok(['message' => 'API Ready (PHP 5.6)', 'php_version' => phpversion()]);
}

json_err('Action not found', 404);
?>