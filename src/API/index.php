<?php
// ===============================
// SalaryApp API - PHP 5.6 Version
// ===============================

// 1. เปลี่ยนการเรียก Library เป็น PHPExcel
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
ini_set('memory_limit', '512M');

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
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

ob_start();

// -------------------------------
// CONFIG
// -------------------------------
$GLOBALS['SALARY_TABLE'] = 'salary_data';

if (!file_exists(__DIR__ . '/config.php')) {
    echo json_encode(['status' => 'error', 'error' => 'ไม่พบไฟล์ config.php'], JSON_UNESCAPED_UNICODE);
    exit;
}
require_once __DIR__ . '/config.php';

// -------------------------------
// HELPERS
// -------------------------------
function json_ok($data = []) {
    if (ob_get_length()) ob_clean();
    echo json_encode(array_merge(['status' => 'success'], $data), JSON_UNESCAPED_UNICODE);
    ob_end_flush();
    exit;
}

function json_err($message, $code = 500, $extra = []) {
    if (ob_get_length()) ob_clean();
    http_response_code($code);
    echo json_encode(array_merge(['status' => 'error', 'error' => $message], $extra), JSON_UNESCAPED_UNICODE);
    ob_end_flush();
    exit;
}

// -------------------------------
// MAPPINGS
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
// CONNECT DB (PDO)
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
// READ INPUT
// -------------------------------
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

$action = 'info';
if (isset($_POST['action'])) {
    $action = $_POST['action'];
} elseif (isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif (isset($payload['action'])) {
    $action = $payload['action'];
}

// ==================================================================
// ACTION: GET SALARY DATA (JOIN emppersonal โดยเทียบ idcard = cid)
// ==================================================================
if ($action === 'salary-data') {
    try {
        // รับ parameters จาก GET/POST/payload
        $input = array_merge($_GET, $_POST, $payload ? $payload : []);
        
        $cid = isset($input['cid']) ? trim($input['cid']) : '';
        $name = isset($input['name']) ? trim($input['name']) : '';
        $month = isset($input['month']) ? intval($input['month']) : 0;
        $year = isset($input['year']) ? intval($input['year']) : 0;
        $user_cid = isset($input['user_cid']) ? trim($input['user_cid']) : '';

        // ตาราง
        $table = $GLOBALS['SALARY_TABLE'];
        $params = [];

        // ============================================
        // SQL พร้อม JOIN emppersonal โดยเทียบ cid = idcard
        // ============================================
        $sql = "SELECT 
                    s.*,
                    e.firstname,
                    e.lastname,
                    e.idcard,
                    CONCAT(e.firstname, ' ', e.lastname) AS emp_fullname
                FROM {$table} s
                LEFT JOIN emppersonal e ON s.cid = e.idcard
                WHERE 1=1";

        // ============================================
        // ⚠️ SECURITY: กรองตาม USER CID (ลำดับความสำคัญสูงสุด)
        // ============================================
        if (!empty($user_cid)) {
            // ถ้ามี user_cid แสดงว่าเป็น USER ธรรมดา
            // บังคับให้ดูเฉพาะ CID ของตัวเอง (ไม่สนใจ parameter อื่น)
            $sql .= " AND s.cid = :user_cid";
            $params[':user_cid'] = $user_cid;
            
            // ลบการค้นหาชื่อและ CID อื่น (ป้องกันการ bypass)
            $cid = '';
            $name = '';
            
        } else {
            // ============================================
            // ADMIN MODE - ค้นหาได้ทั้ง CID และชื่อ
            // ============================================
            if (!empty($cid)) {
                $sql .= " AND s.cid LIKE :cid";
                $params[':cid'] = "%{$cid}%";
            }
            
            if (!empty($name)) {
                $sql .= " AND (
                    e.firstname LIKE :name1 
                    OR e.lastname LIKE :name2 
                    OR CONCAT(e.firstname, ' ', e.lastname) LIKE :name3
                    OR s.name LIKE :name4
                )";
                $params[':name1'] = "%{$name}%";
                $params[':name2'] = "%{$name}%";
                $params[':name3'] = "%{$name}%";
                $params[':name4'] = "%{$name}%";
            }
        }

        // ============================================
        // กรองเดือนและปี
        // ============================================
        if ($month > 0) {
            $sql .= " AND s.month = :month";
            $params[':month'] = $month;
        }

        if ($year > 0) {
            $sql .= " AND s.year = :year";
            $params[':year'] = $year;
        }

        $sql .= " ORDER BY s.year DESC, s.month DESC, e.lastname ASC, e.firstname ASC";

        // ============================================
        // Execute Query
        // ============================================
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // ============================================
        // จัดการข้อมูลก่อนส่งกลับ
        // ============================================
        $data = [];
        foreach ($rows as $row) {
            // ใช้ชื่อจาก emppersonal ถ้ามี ไม่งั้นใช้จาก salary_data
            $displayName = !empty($row['emp_fullname']) 
                ? $row['emp_fullname'] 
                : $row['name'];
            
            // เก็บข้อมูลทั้งหมดจาก salary_data
            $item = [
                'id' => $row['id'],
                'cid' => $row['cid'],
                'name' => $displayName,  // ← ชื่อที่แสดง (จาก emppersonal)
                'firstname' => $row['firstname'],  // ← เพิ่มใหม่
                'lastname' => $row['lastname'],    // ← เพิ่มใหม่
                'bank_account' => $row['bank_account'],
                'month' => $row['month'],
                'year' => $row['year'],
                'salary' => $row['salary'],
                'salary_deductions' => $row['salary_deductions'],
                'total_income' => $row['total_income'],
                'total_expense' => $row['total_expense'],
                'net_balance' => $row['net_balance'],
                'cola_allowance' => $row['cola_allowance'],
                'retroactive_cola_allowance' => $row['retroactive_cola_allowance'],
                'retroactive_salary_emp' => $row['retroactive_salary_emp'],
                'special_public_health_allowance' => $row['special_public_health_allowance'],
                'position_allowance' => $row['position_allowance'],
                'monthly_allowance' => $row['monthly_allowance'],
                'pay_for_performance' => $row['pay_for_performance'],
                'overtime_pay' => $row['overtime_pay'],
                'ot_outpatient_dept' => $row['ot_outpatient_dept'],
                'ot_professional' => $row['ot_professional'],
                'ot_assistant' => $row['ot_assistant'],
                'evening_night_shift_pay' => $row['evening_night_shift_pay'],
                'shift_professional' => $row['shift_professional'],
                'shift_assistant' => $row['shift_assistant'],
                'leave_day_deduction' => $row['leave_day_deduction'],
                'tax_deduction' => $row['tax_deduction'],
                'retroactive_tax_deduction' => $row['retroactive_tax_deduction'],
                'gpf_contribution' => $row['gpf_contribution'],
                'retroactive_gpf_deduction' => $row['retroactive_gpf_deduction'],
                'gpf_extra_contribution' => $row['gpf_extra_contribution'],
                'social_security_deduction_gov' => $row['social_security_deduction_gov'],
                'social_security_deduction_emp' => $row['social_security_deduction_emp'],
                'phks_provident_fund' => $row['phks_provident_fund'],
                'funeral_welfare_deduction' => $row['funeral_welfare_deduction'],
                'coop_deduction_dept' => $row['coop_deduction_dept'],
                'coop_deduction_phso' => $row['coop_deduction_phso'],
                'student_loan_deduction_emp' => $row['student_loan_deduction_emp'],
                'water_bill_deduction' => $row['water_bill_deduction'],
                'electricity_bill_deduction' => $row['electricity_bill_deduction'],
                'internet_deduction_emp' => $row['internet_deduction_emp'],
                'aia_insurance_deduction_emp' => $row['aia_insurance_deduction_emp'],
                'gsb_loan_deduction_emp' => $row['gsb_loan_deduction_emp'],
                'gsb_loan_naan' => $row['gsb_loan_naan'],
                'gsb_loan_loei' => $row['gsb_loan_loei'],
                'ghb_loan_deduction' => $row['ghb_loan_deduction'],
                'ktb_loan_deduction_emp' => $row['ktb_loan_deduction_emp'],
                'hospital_loan_deduction' => $row['hospital_loan_deduction'],
                'welfare_loan_received' => $row['welfare_loan_received'],
                'child_education_deduction' => $row['child_education_deduction'],
                'medical_expense_deduction' => $row['medical_expense_deduction'],
                'no_private_practice_deduction' => $row['no_private_practice_deduction'],
                'covid_risk_pay' => $row['covid_risk_pay'],
                'other_income' => $row['other_income'],
                'created_at' => $row['created_at']
            ];
            
            $data[] = $item;
        }

        json_ok([
            'data' => $data,
            'count' => count($data),
            'filtered_by_user' => !empty($user_cid)
        ]);

    } catch (Exception $e) {
        json_err('เกิดข้อผิดพลาดในการดึงข้อมูล', 500, ['detail' => $e->getMessage()]);
    }
}

// ==================================================================
// ACTION: GET AVAILABLE FILTERS (เดือน/ปี)
// ==================================================================
if ($action === 'available-filters') {
    try {
        $table = $GLOBALS['SALARY_TABLE'];
        
        // รับ parameter user_cid จาก request
        $input = array_merge($_GET, $_POST, $payload ? $payload : []);
        $user_cid = isset($input['user_cid']) ? trim($input['user_cid']) : '';
        
        // ============================================
        // ดึงรายการเดือนที่มีข้อมูลจริงในฐานข้อมูล
        // ============================================
        $monthQuery = "SELECT DISTINCT month FROM {$table} WHERE month IS NOT NULL";
        $monthParams = [];
        
        // ถ้าไม่ใช่ Admin ให้กรองตาม user_cid
        if (!empty($user_cid)) {
            $monthQuery .= " AND cid = :user_cid";
            $monthParams[':user_cid'] = $user_cid;
        }
        
        $monthQuery .= " ORDER BY month ASC";
        
        $monthStmt = $pdo->prepare($monthQuery);
        $monthStmt->execute($monthParams);
        
        // แปลงเป็น array ของ objects
        $months = [];
        $thaiMonthNames = [
            1 => 'มกราคม',
            2 => 'กุมภาพันธ์',
            3 => 'มีนาคม',
            4 => 'เมษายน',
            5 => 'พฤษภาคม',
            6 => 'มิถุนายน',
            7 => 'กรกฎาคม',
            8 => 'สิงหาคม',
            9 => 'กันยายน',
            10 => 'ตุลาคม',
            11 => 'พฤศจิกายน',
            12 => 'ธันวาคม'
        ];
        
        while ($row = $monthStmt->fetch()) {
            $monthNum = intval($row['month']);
            if ($monthNum >= 1 && $monthNum <= 12) {
                $months[] = [
                    'value' => strval($monthNum),
                    'label' => $thaiMonthNames[$monthNum]
                ];
            }
        }
        
        // ============================================
        // ดึงรายการปีที่มีข้อมูล
        // ============================================
        $yearQuery = "SELECT DISTINCT year FROM {$table} WHERE year IS NOT NULL";
        $yearParams = [];
        
        // ถ้าไม่ใช่ Admin ให้กรองตาม user_cid
        if (!empty($user_cid)) {
            $yearQuery .= " AND cid = :user_cid";
            $yearParams[':user_cid'] = $user_cid;
        }
        
        $yearQuery .= " ORDER BY year DESC";
        
        $yearStmt = $pdo->prepare($yearQuery);
        $yearStmt->execute($yearParams);
        
        $years = [];
        while ($row = $yearStmt->fetch()) {
            $years[] = intval($row['year']);
        }

        json_ok([
            'months' => $months,
            'years' => $years,
            'filtered_by_user' => !empty($user_cid)
        ]);

    } catch (Exception $e) {
        json_err('เกิดข้อผิดพลาด', 500, ['detail' => $e->getMessage()]);
    }
}

// ==================================================================
// ACTION: UPLOAD EXCEL
// ==================================================================
if ($action === 'upload') {
    date_default_timezone_set("Asia/Bangkok");

    try {
        if (!isset($_FILES['file'])) json_err('ไม่พบไฟล์อัปโหลด', 400);

        $monthRaw = isset($_POST['month']) ? $_POST['month'] : '';
        $yearRaw  = isset($_POST['year']) ? $_POST['year'] : '';

        $mLower = mb_strtolower(trim($monthRaw));
        $monthNumber = isset($MONTH_MAP[$mLower]) ? $MONTH_MAP[$mLower] : null;
        
        if ($monthNumber) {
            $monthNumber = (int)$monthNumber;
        }
        
        if (!$monthNumber || !$yearRaw) {
            json_err('เดือนหรือปีไม่ถูกต้อง', 400);
        }
        
        $yearNumber = (int)$yearRaw;

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_err('อัปโหลดไฟล์ไม่สำเร็จ', 400);
        }

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

        // ลบข้อมูลเดิม
        $del = $pdo->prepare("DELETE FROM {$table} WHERE month = :m AND year = :y");
        $del->execute([':m' => $monthNumber, ':y' => $yearNumber]);

        $totalSaved = 0;
        $debugInfo = [];
        $errorLogs = [];

        // วนลูปทุก sheet
        foreach ($excel->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            
            $isValidSheet = false;
            if (mb_stripos($sheetName, 'ข้าราชการ') !== false) {
                $isValidSheet = true;
            } elseif (mb_stripos($sheetName, 'ลูกจ้าง') !== false) {
                $isValidSheet = true;
            }
            
            if (!$isValidSheet) {
                continue;
            }

            $rows = $sheet->toArray(null, true, true, true);
            
            if (count($rows) <= 1) continue;

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
                    'year' => $yearNumber
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
                'columns_mapped' => count($columnMapping),
                'total_rows' => count($rows) - 1,
                'saved' => $sheetSaved,
                'headers' => array_slice($headerDebug, 0, 10),
                'mapped_fields' => array_values(array_unique($columnMapping))
            ];
        }

        $pdo->commit();

        $response = [
            'message' => "บันทึกสำเร็จ {$totalSaved} รายการ (เดือน {$monthNumber} ปี {$yearNumber})",
            'saved' => $totalSaved,
            'month' => $monthNumber,
            'year' => $yearNumber,
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