<?php
// ===============================
// SalaryApp API - PHP 5.6 Version index.php
// WITH SIGNATURE SUPPORT
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

date_default_timezone_set("Asia/Bangkok");

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

function normalizeColumnName($name) {
    $name = trim($name);
    $name = preg_replace('/\s+/', ' ', $name);
    $name = mb_strtolower($name);
    return $name;
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
    // ===== ข้อมูลพื้นฐาน =====
    'cid' => 'cid',
    'ชื่อ' => 'name',
    'เลขที่บัญชี' => 'bank_account',
    
    // ===== รายรับ =====
    'เงินเดือน' => 'salary',
    'ค่าตอบแทนรายเดือน' => 'leave_day_deduction',
    'เงินเดือนสุทธิ' => 'salary_deductions',
    'เงินเดือน (ตกเบิก)' => 'retroactive_salary_emp',
    
    // ⭐ แก้ตรงนี้ - เพิ่มทั้ง 2 รูปแบบ
    'ค่าตอบแทนไม่ทำเวชปฏิบัติส่วนตัว' => 'cola_allowance',
    'ค่าตอบแทนไม่ปฏิบัติเวชส่วนตัว' => 'cola_allowance',
    
    'ค่าตอบแทน พตส.' => 'special_public_health_allowance',
    'ค่าตอบแทนการปฏิบัติงาน (โอที)' => 'ot_outpatient_dept',
    'เงินประจำตำแหน่ง' => 'ot_professional',
    'เงินช่วยเหลือค่าเล่าเรียนบุตร' => 'ot_assistant',
    'ค่าตอบแทนการปฏิบัติงาน (บ่าย-ดึก)' => 'evening_night_shift_pay',
    
    // ⭐ เพิ่มใหม่
    'อื่นๆ (จ่าย)' => 'shift_assistant',
    'อื่นๆ (รับ)' => 'other_income',
    'อื่นๆ จ่าย' => 'shift_assistant',
    'อื่นๆ รับ' => 'other_income',
    'อื่นๆจ่าย' => 'shift_assistant',
    'อื่นๆรับ' => 'other_income',
    
    'ค่าตอบแทน P4P' => 'pay_for_performance',
    
    // ⭐ เพิ่มใหม่
    'กบข.สะสมส่วนเพิ่ม' => 'gpf_extra_contribution',
    
    'เงินกู้สวัสดิการ รพ.' => 'welfare_loan_received',
    'รวมรับ' => 'total_income',

    // ===== รายจ่าย =====
    'กบข/ประกันสังคม' => 'social_security_deduction_emp',
    'กองทุน พกส.' => 'phks_provident_fund',
    'สอ.กรมสุขภาพจิต' => 'coop_deduction_dept',
    'สอ.สาธารณสุขเลย' => 'coop_deduction_phso',
    'ฌกส.' => 'funeral_welfare_deduction',
    'ธนาคารออมสิน' => 'gsb_loan_naan',
    'ธนาคารอาคารสงเคราะห์' => 'gsb_loan_loei',
    'ธนาคารกรุงไทย' => 'ktb_loan_deduction_emp',
    'ค่าน้ำ' => 'water_bill_deduction',
    'ค่าไฟ' => 'electricity_bill_deduction',
    'ค่าNet' => 'internet_deduction_emp',
    'ค่าประกันAIA' => 'aia_insurance_deduction_emp',
    'กยศ.' => 'student_loan_deduction_emp',
    'เงินกู้ รพ/ประกันงาน' => 'hospital_loan_deduction',
    'ภาษี' => 'tax_deduction',
    'รวมจ่าย' => 'total_expense',
    'คงเหลือ' => 'net_balance',
];

$NUMERIC_FIELDS = [
    // รายรับ
    'salary',
    'leave_day_deduction',
    'salary_deductions',
    'retroactive_salary_emp',
    'cola_allowance',
    'special_public_health_allowance',
    'ot_outpatient_dept',
    'ot_professional',
    'ot_assistant',
    'evening_night_shift_pay',
    'shift_assistant',
    'pay_for_performance',
    'gpf_extra_contribution',
    'welfare_loan_received',
    'other_income',
    'total_income',

    // รายจ่าย
    'social_security_deduction_emp',
    'phks_provident_fund',
    'coop_deduction_dept',
    'coop_deduction_phso',
    'funeral_welfare_deduction',
    'gsb_loan_naan',
    'gsb_loan_loei',
    'ktb_loan_deduction_emp',
    'water_bill_deduction',
    'electricity_bill_deduction',
    'internet_deduction_emp',
    'aia_insurance_deduction_emp',
    'student_loan_deduction_emp',
    'hospital_loan_deduction',
    'tax_deduction',
    'total_expense',

    // คงเหลือ
    'net_balance',
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
// ⭐ ACTION: GET SIGNATURE DATA
// ==================================================================
if ($action === 'get-signature') {
    try {
        $sql = "SELECT 
                    CONCAT(p.pname, e.firstname, ' ', e.lastname) AS fullname,
                    po.posname,
                    e.signature
                FROM emppersonal e
                INNER JOIN member m ON m.`Name` = e.empno
                INNER JOIN posid po ON po.posId = e.posid
                INNER JOIN pcode p ON p.pcode = e.pcode
                WHERE e.depid = 15
                  AND m.`Status` = 'SUSER'
                LIMIT 1";
        
        $stmt = $pdo->query($sql);
        $signer = $stmt->fetch();
        
        if ($signer && !empty($signer['signature'])) {
            // สร้าง URL เต็มสำหรับรูปลายเซ็น
            $signatureUrl = 'http://1.179.191.130/hrd2.0/signature/' . $signer['signature'];
            
            json_ok([
                'signer' => [
                    'fullname' => $signer['fullname'],
                    'posname' => $signer['posname'],
                    'signature' => $signatureUrl
                ]
            ]);
        } else {
            json_ok(['signer' => null]);
        }
        
    } catch (Exception $e) {
        json_err('Error fetching signature', 500, ['detail' => $e->getMessage()]);
    }
}

// ==================================================================
// ACTION: GET SALARY DATA (แก้ไข: เพิ่มข้อมูลค่าน้ำ-ไฟ)
// ==================================================================
if ($action === 'salary-data') {
    try {
        $input = array_merge($_GET, $_POST, $payload ? $payload : []);
        
        $cid = isset($input['cid']) ? trim($input['cid']) : '';
        $name = isset($input['name']) ? trim($input['name']) : '';
        $month = isset($input['month']) ? intval($input['month']) : 0;
        $year = isset($input['year']) ? intval($input['year']) : 0;
        $user_cid = isset($input['user_cid']) ? trim($input['user_cid']) : '';

        $table = $GLOBALS['SALARY_TABLE'];
        $params = [];

        // ⭐ Query พื้นฐานพร้อมข้อมูลค่าน้ำ-ไฟ
        $sql = "SELECT 
                    base.*,
                    GREATEST(COALESCE(base.now_eunit - base.old_eunit, 0) - base.right_e, 0) AS elec_excess_units,
                    GREATEST(COALESCE(base.now_wunit - base.old_wunit, 0) - base.right_w, 0) AS water_excess_units,
                    COALESCE(base.now_eunit - base.old_eunit, 0) AS elec_total_units,
                    COALESCE(base.now_wunit - base.old_wunit, 0) AS water_total_units
                FROM (
                    SELECT 
                        vars.now_month,
                        vars.now_year,
                        vars.old_month,
                        vars.old_year,
                        sd.*,
                        e.firstname,
                        e.lastname,
                        e.idcard,
                        e.empno,
                        CASE 
                            WHEN e.firstname IS NOT NULL THEN CONCAT(e.firstname, ' ', e.lastname)
                            ELSE sd.name
                        END AS emp_fullname,
                        COALESCE(wh.posid, e.posid) AS current_posid,
                        p2.posname,
                        IFNULL(ir0.right_e, 0) as right_e,
                        IFNULL(ir0.right_w, 0) as right_w,
                        ir0.room_id,
                        
                        -- ⭐ มิเตอร์ไฟเดือนก่อน
                        (SELECT e2.unit 
                         FROM sh_electric e2 
                         WHERE e2.in_id = ir0.in_id 
                           AND e2.month = vars.old_month 
                           AND e2.year = vars.old_year 
                         LIMIT 1) AS old_eunit,
                        
                        -- ⭐ มิเตอร์ไฟเดือนปัจจุบัน
                        (SELECT e2.unit 
                         FROM sh_electric e2 
                         WHERE e2.in_id = ir0.in_id 
                           AND e2.month = vars.now_month 
                           AND e2.year = vars.now_year 
                         LIMIT 1) AS now_eunit,
                        
                        -- ⭐ มิเตอร์น้ำเดือนก่อน
                        (SELECT w2.unit 
                         FROM sh_water w2 
                         WHERE w2.in_id = ir0.in_id 
                           AND w2.month = vars.old_month 
                           AND w2.year = vars.old_year 
                         LIMIT 1) AS old_wunit,
                        
                        -- ⭐ มิเตอร์น้ำเดือนปัจจุบัน
                        (SELECT w2.unit 
                         FROM sh_water w2 
                         WHERE w2.in_id = ir0.in_id 
                           AND w2.month = vars.now_month 
                           AND w2.year = vars.now_year 
                         LIMIT 1) AS now_wunit,
                        
                        -- ⭐ อัตราค่าไฟ (ใช้งานล่าสุด)
                        (SELECT eu.price_p_uint 
                         FROM sh_electric_unit eu 
                         WHERE eu.chk = 1 
                         ORDER BY eu.euupdate DESC 
                         LIMIT 1) AS elec_rate,
                        
                        -- ⭐ อัตราค่าน้ำ (ใช้งานล่าสุด)
                        (SELECT wu.price_p_uint 
                         FROM sh_water_unit wu 
                         WHERE wu.chk = 1 
                         ORDER BY wu.wuupdate DESC 
                         LIMIT 1) AS water_rate
                        
                    FROM {$table} sd 
                    CROSS JOIN (
                        SELECT 
                            :filter_month AS now_month, 
                            :filter_year AS now_year,
                            IF(:filter_month = 1, 12, :filter_month - 1) AS old_month,
                            IF(:filter_month = 1, :filter_year - 1, :filter_year) AS old_year,
                            DATE(CONCAT(:filter_year - 543, '-', :filter_month, '-01')) AS start_date,
                            LAST_DAY(DATE(CONCAT(:filter_year - 543, '-', :filter_month, '-01'))) AS end_date
                    ) vars
                    LEFT JOIN emppersonal e ON e.idcard = sd.cid
                    LEFT JOIN work_history wh 
                        ON wh.empno = e.empno
                        AND (wh.dateEnd_w = '0000-00-00' OR wh.dateEnd_w IS NULL)
                    LEFT JOIN posid p2 
                        ON p2.posId = COALESCE(wh.posid, e.posid)
                    LEFT OUTER JOIN sh_inroom ir0 
                        ON ir0.empno = e.empno 
                        AND ir0.indate <= vars.end_date 
                        AND (ir0.outdate IS NULL 
                             OR ir0.outdate = '0000-00-00 00:00:00' 
                             OR ir0.outdate >= vars.start_date)
                    WHERE 1=1";

        // กำหนดค่า filter
        $filter_month = $month > 0 ? $month : date('n');
        $filter_year = $year > 0 ? $year : (date('Y') + 543);
        
        $params[':filter_month'] = $filter_month;
        $params[':filter_year'] = $filter_year;

        if (!empty($user_cid)) {
            $sql .= " AND sd.cid = :user_cid";
            $params[':user_cid'] = $user_cid;
        } else {
            if (!empty($cid)) {
                $sql .= " AND sd.cid LIKE :cid";
                $params[':cid'] = "%{$cid}%";
            }
            
            if (!empty($name)) {
                $sql .= " AND (
                    e.firstname LIKE :name1 
                    OR e.lastname LIKE :name2 
                    OR CONCAT(e.firstname, ' ', e.lastname) LIKE :name3
                    OR sd.name LIKE :name4
                )";
                $params[':name1'] = "%{$name}%";
                $params[':name2'] = "%{$name}%";
                $params[':name3'] = "%{$name}%";
                $params[':name4'] = "%{$name}%";
            }
        }

        if ($month > 0) {
            $sql .= " AND sd.month = :month";
            $params[':month'] = $month;
        }

        if ($year > 0) {
            $sql .= " AND sd.year = :year";
            $params[':year'] = $year;
        }

        $sql .= "
                ) AS base
                ORDER BY base.year DESC, base.month DESC, base.lastname ASC, base.firstname ASC";

        // Execute
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // ⭐ Process data
        $data = [];
        foreach ($rows as $row) {
            $displayName = !empty($row['emp_fullname']) 
                ? $row['emp_fullname'] 
                : $row['name'];
            
            // ข้อมูลไฟฟ้า
            $elec_prev = floatval($row['old_eunit']);
            $elec_current = floatval($row['now_eunit']);
            $elec_total = floatval($row['elec_total_units']);
            $elec_excess = floatval($row['elec_excess_units']);
            $elec_rate = floatval($row['elec_rate']);
            
            // ข้อมูลน้ำ
            $water_prev = floatval($row['old_wunit']);
            $water_current = floatval($row['now_wunit']);
            $water_total = floatval($row['water_total_units']);
            $water_excess = floatval($row['water_excess_units']);
            $water_rate = floatval($row['water_rate']);

            $right_e = floatval($row['right_e']);
            $right_w = floatval($row['right_w']);

            $item = [
                'id' => $row['id'],
                'cid' => $row['cid'],
                'name' => $displayName,
                'firstname' => $row['firstname'],
                'lastname' => $row['lastname'],
                'posname' => isset($row['posname']) ? $row['posname'] : '-',
                'bank_account' => isset($row['bank_account']) ? $row['bank_account'] : null,
                'month' => $row['month'],
                'year' => $row['year'],
                
                // ⭐ ข้อมูลไฟฟ้า
                'elec_prev_reading' => $elec_prev,
                'elec_current_reading' => $elec_current,
                'elec_total_units' => $elec_total,
                'elec_excess_units' => $elec_excess,
                'elec_rate' => $elec_rate,
                
                // ⭐ ข้อมูลน้ำ
                'water_prev_reading' => $water_prev,
                'water_current_reading' => $water_current,
                'water_total_units' => $water_total,
                'water_excess_units' => $water_excess,
                'water_rate' => $water_rate,

                'right_e' => $right_e,
                'right_w' => $right_w,
                
                // ใน dashboard
                'shift_professional' => isset($row['shift_professional']) ? floatval($row['shift_professional']) : 0,
                'shiftProfessional' => isset($row['shift_professional']) ? floatval($row['shift_professional']) : 0,        
                'shiftAssistant' => isset($row['shift_assistant']) ? floatval($row['shift_assistant']) : 0,
                'p4p' => isset($row['pay_for_performance']) ? floatval($row['pay_for_performance']) : 0,
                'otOPD' => isset($row['ot_outpatient_dept']) ? floatval($row['ot_outpatient_dept']) : 0,
                'otProfessional' => isset($row['ot_professional']) ? floatval($row['ot_professional']) : 0,
                'otAssistant' => isset($row['ot_assistant']) ? floatval($row['ot_assistant']) : 0,
                
                // ข้อมูลในตารางรายรับ
                'salary' => isset($row['salary']) ? floatval($row['salary']) : 0, // เงินเดือน
                'retroactive_salary_emp' => isset($row['retroactive_salary_emp']) ? floatval($row['retroactive_salary_emp']) : 0, // เงินเดือน (ตกเบิก)
                'salary_deductions' => isset($row['salary_deductions']) ? floatval($row['salary_deductions']) : 0, // เงินเดือนสุทธิ
                'ot_professional' => isset($row['ot_professional']) ? floatval($row['ot_professional']) : 0, // เงินประจำตำแหน่ง
                'special_public_health_allowance' => isset($row['special_public_health_allowance']) ? floatval($row['special_public_health_allowance']) : 0, // ค่าตอบแทน พตส.
                'cola_allowance' => isset($row['cola_allowance']) ? floatval($row['cola_allowance']) : 0, // ค่าตอบแทนไม่ปฏิบัติเวชส่วนตัว
                'ot_outpatient_dept' => isset($row['ot_outpatient_dept']) ? floatval($row['ot_outpatient_dept']) : 0, // ค่าตอบแทนการปฏิบัติงาน (โอที)
                'evening_night_shift_pay' => isset($row['evening_night_shift_pay']) ? floatval($row['evening_night_shift_pay']) : 0, // ค่าตอบแทนการปฏิบัติงาน (บ่าย-ดึก)
                'pay_for_performance' => isset($row['pay_for_performance']) ? floatval($row['pay_for_performance']) : 0, // ค่าตอบแทน P4P
                'ot_assistant' => isset($row['ot_assistant']) ? floatval($row['ot_assistant']) : 0, // เงินช่วยเหลือค่าเล่าเรียนบุตร
                'leave_day_deduction' => isset($row['leave_day_deduction']) ? floatval($row['leave_day_deduction']) : 0, // ค่าตอบแทนรายเดือน
                'welfare_loan_received' => isset($row['welfare_loan_received']) ? floatval($row['welfare_loan_received']) : 0, // เงินกู้สวัสดิการ รพ.
                'other_income' => isset($row['other_income']) ? floatval($row['other_income']) : 0, // อื่นๆ (รับ)

                // ข้อมูลในตารางรายจ่าย
                'tax_deduction' => isset($row['tax_deduction']) ? floatval($row['tax_deduction']) : 0, // ภาษี
                'social_security_deduction_emp' => isset($row['social_security_deduction_emp']) ? floatval($row['social_security_deduction_emp']) : 0, // กบข./ประกันสังคม
                'gpf_extra_contribution' => isset($row['gpf_extra_contribution']) ? floatval($row['gpf_extra_contribution']) : 0, // กบข.สะสมส่วนเพิ่ม
                'coop_deduction_dept' => isset($row['coop_deduction_dept']) ? floatval($row['coop_deduction_dept']) : 0, // สอ.กรมสุขภาพจิต
                'coop_deduction_phso' => isset($row['coop_deduction_phso']) ? floatval($row['coop_deduction_phso']) : 0, // สอ.สาธารณสุขเลย
                'funeral_welfare_deduction' => isset($row['funeral_welfare_deduction']) ? floatval($row['funeral_welfare_deduction']) : 0, // ฌกส.กระทรวง
                'phks_provident_fund' => isset($row['phks_provident_fund']) ? floatval($row['phks_provident_fund']) : 0, // กองทุน พกส.
                'gsb_loan_naan' => isset($row['gsb_loan_naan']) ? floatval($row['gsb_loan_naan']) : 0, // ธนาคารออมสิน
                'ktb_loan_deduction_emp' => isset($row['ktb_loan_deduction_emp']) ? floatval($row['ktb_loan_deduction_emp']) : 0, // ธนาคารกรุงไทย
                'gsb_loan_loei' => isset($row['gsb_loan_loei']) ? floatval($row['gsb_loan_loei']) : 0, // ธนาคารอาคารสงเคราะห์
                'water_bill_deduction' => isset($row['water_bill_deduction']) ? floatval($row['water_bill_deduction']) : 0, // ค่าน้ำประปา
                'electricity_bill_deduction' => isset($row['electricity_bill_deduction']) ? floatval($row['electricity_bill_deduction']) : 0, // ค่าไฟฟ้า
                'internet_deduction_emp' => isset($row['internet_deduction_emp']) ? floatval($row['internet_deduction_emp']) : 0, // ค่าอินเตอร์เน็ต
                'student_loan_deduction_emp' => isset($row['student_loan_deduction_emp']) ? floatval($row['student_loan_deduction_emp']) : 0, //กยศ.
                'aia_insurance_deduction_emp' => isset($row['aia_insurance_deduction_emp']) ? floatval($row['aia_insurance_deduction_emp']) : 0,// ค่าประกัน AIA
                'hospital_loan_deduction' => isset($row['hospital_loan_deduction']) ? floatval($row['hospital_loan_deduction']) : 0, // เงินกู้ รพ/ประกันงาน
                'shift_assistant' => isset($row['shift_assistant']) ? floatval($row['shift_assistant']) : 0, // อื่นๆ (จ่าย)

                // รายได้-รายจ่าย
                'total_income' => isset($row['total_income']) ? floatval($row['total_income']) : 0,
                'total_expense' => isset($row['total_expense']) ? floatval($row['total_expense']) : 0,
                'net_balance' => isset($row['net_balance']) ? floatval($row['net_balance']) : 0,
                
                // ข้อมูลอื่นๆ
                'position_allowance' => isset($row['position_allowance']) ? floatval($row['position_allowance']) : 0,
                'retroactive_position_allowance' => isset($row['retroactive_position_allowance']) ? floatval($row['retroactive_position_allowance']) : 0,
                'no_private_practice_deduction' => isset($row['no_private_practice_deduction']) ? floatval($row['no_private_practice_deduction']) : 0,
                'retroactive_p4p' => isset($row['retroactive_p4p']) ? floatval($row['retroactive_p4p']) : 0,
                'covid_risk_pay' => isset($row['covid_risk_pay']) ? floatval($row['covid_risk_pay']) : 0,
                'covid_exposure' => isset($row['covid_exposure']) ? floatval($row['covid_exposure']) : 0,
                'overtime_pay' => isset($row['overtime_pay']) ? floatval($row['overtime_pay']) : 0,
                'child_education_deduction' => isset($row['child_education_deduction']) ? floatval($row['child_education_deduction']) : 0,
                'gpf_contribution' => isset($row['gpf_contribution']) ? floatval($row['gpf_contribution']) : 0,
                'moph_savings_deduction' => isset($row['moph_savings_deduction']) ? floatval($row['moph_savings_deduction']) : 0,      
                'internet_deduction_emp' => isset($row['internet_deduction_emp']) ? floatval($row['internet_deduction_emp']) : 0,
            ];

            $data[] = $item;
        }

        json_ok([
            'data' => $data,
            'count' => count($data),
            'filtered_by_user' => !empty($user_cid)
        ]);

    } catch (Exception $e) {
        json_err('เกิดข้อผิดพลาด', 500, ['detail' => $e->getMessage(), 'line' => $e->getLine()]);
    }
}

// ==================================================================
// ACTION: GET AVAILABLE FILTERS (เดือน/ปี)
// ==================================================================
if ($action === 'available-filters') {
    try {
        $table = $GLOBALS['SALARY_TABLE'];
        
        $input = array_merge($_GET, $_POST, $payload ? $payload : []);
        $user_cid = isset($input['user_cid']) ? trim($input['user_cid']) : '';
        
        $monthQuery = "SELECT DISTINCT month FROM {$table} WHERE month IS NOT NULL";
        $monthParams = [];
        
        if (!empty($user_cid)) {
            $monthQuery .= " AND cid = :user_cid";
            $monthParams[':user_cid'] = $user_cid;
        }
        
        $monthQuery .= " ORDER BY month ASC";
        
        $monthStmt = $pdo->prepare($monthQuery);
        $monthStmt->execute($monthParams);
        
        $months = [];
        $thaiMonthNames = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
            5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
            9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
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
        
        $yearQuery = "SELECT DISTINCT year FROM {$table} WHERE year IS NOT NULL";
        $yearParams = [];
        
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

        $del = $pdo->prepare("DELETE FROM {$table} WHERE month = :m AND year = :y");
        $del->execute([':m' => $monthNumber, ':y' => $yearNumber]);

        $totalSaved = 0;
        $debugInfo = [];
        $errorLogs = [];

        foreach ($excel->getAllSheets() as $sheet) {
            $sheetName = $sheet->getTitle();
            
            $isValidSheet = true; // ⭐ ยอมรับทุก Sheet
            
            if (!$isValidSheet) {
                continue;
            }

            $rows = $sheet->toArray(null, true, true, true);
            
            if (count($rows) <= 1) continue;

            $header = $rows[1];
            $columnMapping = [];
            $headerDebug = [];

            // ⭐ ใช้ฟังก์ชัน normalizeColumnName
            foreach ($header as $col => $headerText) {
                $headerClean = normalizeColumnName($headerText);
                $headerDebug[] = $headerText;
                
                foreach ($COLUMN_MAP as $thaiName => $dbField) {
                    $thaiNameClean = normalizeColumnName($thaiName);
                    if ($headerClean === $thaiNameClean) {
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
    json_ok(['message' => 'API Ready (PHP 5.6 + Signature Support)', 'php_version' => phpversion()]);
}

json_err('Action not found', 404);