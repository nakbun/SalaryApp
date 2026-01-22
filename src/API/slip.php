<?php
// ==========================
// slip.php - Salary Slip API
// ==========================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Include config
require_once 'config.php';

// Database Connection
function getDBConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
            DB_USER,
            DB_PASS
        );
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $conn->exec("SET NAMES utf8");
        return $conn;
    } catch(PDOException $e) {
        die(json_encode(array('error' => 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' . $e->getMessage())));
    }
}

// Thai month names
$MONTH_NAMES = array(
    1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม',
    4 => 'เมษายน', 5 => 'พฤษภาคม', 6 => 'มิถุนายน',
    7 => 'กรกฎาคม', 8 => 'สิงหาคม', 9 => 'กันยายน',
    10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
);

// Get action
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Route actions
switch($action) {
    case 'get_employees':
        getEmployees();
        break;
    case 'get_employee':
        getEmployee();
        break;
    default:
        echo json_encode(array('error' => 'Invalid action'));
}

// ==========================
// Get all employees by month/year
// ==========================
function getEmployees() {
    $conn = getDBConnection();
    $month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
    $year = isset($_GET['year']) ? intval($_GET['year']) : (intval(date('Y')) + 543);
    
    try {
        $sql = "
            SELECT 
                sd.*,
                p.posname
            FROM salary_data sd
            INNER JOIN emppersonal e ON e.idcard = sd.cid
            LEFT JOIN work_history h 
                ON h.empno = e.empno 
                AND (h.dateEnd_w = '0000-00-00' OR h.dateEnd_w IS NULL)
            LEFT JOIN posid p 
                ON p.posid = COALESCE(h.posid, e.posid)  -- เพิ่มบรรทัดนี้
            WHERE sd.month = :month 
            AND sd.year = :year
            ORDER BY sd.name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute(array(':month' => $month, ':year' => $year));
        
        $employees = array();
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $employees[] = processEmployeeData($row);
        }
        
        echo json_encode(array(
            'success' => true,
            'data' => $employees,
            'count' => count($employees)
        ));
    } catch(PDOException $e) {
        echo json_encode(array('success' => false, 'error' => $e->getMessage()));
    }
}

// ==========================
// Get single employee
// ==========================
function getEmployee() {
    $conn = getDBConnection();
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if($id <= 0) {
        echo json_encode(array('error' => 'Invalid ID'));
        return;
    }
    
    try {
        $sql = "
            SELECT 
                sd.*,
                p.posname
            FROM salary_data sd
            INNER JOIN emppersonal e ON e.idcard = sd.cid
            LEFT JOIN work_history h 
                ON h.empno = e.empno 
                AND (h.dateEnd_w = '0000-00-00' OR h.dateEnd_w IS NULL)
            LEFT JOIN posid p 
                ON p.posid = COALESCE(h.posid, e.posid)
            WHERE sd.id = :id
            ";

        $stmt = $conn->prepare($sql);
        $stmt->execute(array(':id' => $id));
        
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if($employee) {
            echo json_encode(array(
                'success' => true,
                'data' => processEmployeeData($employee)
            ));
        } else {
            echo json_encode(array('error' => 'ไม่พบข้อมูลพนักงาน'));
        }
    } catch(PDOException $e) {
        echo json_encode(array('error' => $e->getMessage()));
    }
}

// ==========================
// Process employee data
// ==========================
function processEmployeeData($row) {
    // รายรับ (Income)
    $incomes = array(
        array('label' => 'เงินเดือน', 'value' => floatval($row['salary'])),
        array('label' => 'ค่าครองชีพ', 'value' => floatval($row['cola_allowance'])),
        array('label' => 'ค่าครองชีพ(ตกเบิก)', 'value' => floatval($row['retroactive_cola_allowance'])),
        array('label' => 'ง/ด(ตกเบิก)', 'value' => floatval($row['retroactive_salary_emp'])),
        array('label' => 'พตส.', 'value' => floatval($row['special_public_health_allowance'])),
        array('label' => 'ปจต.', 'value' => floatval($row['position_allowance'])),
        array('label' => 'รายเดือน', 'value' => floatval($row['monthly_allowance'])),
        array('label' => 'P4P', 'value' => floatval($row['pay_for_performance'])),
        array('label' => 'โอที', 'value' => floatval($row['overtime_pay'])),
        array('label' => 'OT/OPD', 'value' => floatval($row['ot_outpatient_dept'])),
        array('label' => 'OT/พบ.', 'value' => floatval($row['ot_professional'])),
        array('label' => 'OT/ผช.', 'value' => floatval($row['ot_assistant'])),
        array('label' => 'บ่าย-ดึก', 'value' => floatval($row['evening_night_shift_pay'])),
        array('label' => 'บ-ด/พบ.', 'value' => floatval($row['shift_professional'])),
        array('label' => 'บ-ด/ผช.', 'value' => floatval($row['shift_assistant'])),
        array('label' => 'โควิด-19', 'value' => floatval($row['covid_risk_pay'])),
        array('label' => 'เสี่ยงภัยโควิด', 'value' => floatval($row['covid_exposure'])),
        array('label' => 'เงินกู้สวัสดิการ', 'value' => floatval($row['welfare_loan_received'])),
        array('label' => 'อื่นๆ', 'value' => floatval($row['other_income']))
    );
    
    // รายจ่าย (Expenses)
    $expenses = array(
        array('label' => 'หักวันลา', 'value' => floatval($row['leave_day_deduction'])),
        array('label' => 'ภาษี', 'value' => floatval($row['tax_deduction'])),
        array('label' => 'ภาษี ตกเบิก', 'value' => floatval($row['retroactive_tax_deduction'])),
        array('label' => 'กบข.', 'value' => floatval($row['gpf_contribution'])),
        array('label' => 'กบข.ตกเบิก', 'value' => floatval($row['retroactive_gpf_deduction'])),
        array('label' => 'กบข.เพิ่ม', 'value' => floatval($row['gpf_extra_contribution'])),
        array('label' => 'ปกสค.', 'value' => floatval($row['social_security_deduction_gov'])),
        array('label' => 'ประกันสังคม', 'value' => floatval($row['social_security_deduction_emp'])),
        array('label' => 'กองทุน พกส.', 'value' => floatval($row['phks_provident_fund'])),
        array('label' => 'ฌกส.', 'value' => floatval($row['funeral_welfare_deduction'])),
        array('label' => 'สอ.กรม', 'value' => floatval($row['coop_deduction_dept'])),
        array('label' => 'สอ.สสจ.เลย', 'value' => floatval($row['coop_deduction_phso'])),
        array('label' => 'สสจ.', 'value' => floatval($row['prov_health_office'])),
        array('label' => 'กยศ.', 'value' => floatval($row['student_loan_deduction_emp'])),
        array('label' => 'ค่าน้ำ', 'value' => floatval($row['water_bill_deduction'])),
        array('label' => 'ค่าไฟ', 'value' => floatval($row['electricity_bill_deduction'])),
        array('label' => 'ค่าNet', 'value' => floatval($row['internet_deduction_emp'])),
        array('label' => 'AIA', 'value' => floatval($row['aia_insurance_deduction_emp'])),
        array('label' => 'ออมสิน', 'value' => floatval($row['gsb_loan_deduction_emp'])),
        array('label' => 'ออมสินนาอาน', 'value' => floatval($row['gsb_loan_naan'])),
        array('label' => 'ธนาคารออมสินเลย', 'value' => floatval($row['gsb_loan_loei'])),
        array('label' => 'ธอส', 'value' => floatval($row['ghb_loan_deduction'])),
        array('label' => 'กรุงไทย', 'value' => floatval($row['ktb_loan_deduction_emp'])),
        array('label' => 'เงินกู้ รพ.', 'value' => floatval($row['hospital_loan_deduction'])),
        array('label' => 'เงินกู้ รพ/ประกันงาน', 'value' => floatval($row['hospital_loan_employment'])),
        array('label' => 'การศึกษาบุตร', 'value' => floatval($row['child_education_deduction'])),
        array('label' => 'ค่ารักษาพยาบาล', 'value' => floatval($row['medical_expense_deduction'])),
        array('label' => 'ไม่ปฏิบัติเวช', 'value' => floatval($row['no_private_practice_deduction']))
    );
    
    // กรองเฉพาะรายการที่มีค่ามากกว่า 0
    $incomes = array_values(array_filter($incomes, function($item) { 
        return $item['value'] > 0; 
    }));
    $expenses = array_values(array_filter($expenses, function($item) { 
        return $item['value'] > 0; 
    }));
    
    // คำนวณยอดรวม
    $total_income = array_sum(array_column($incomes, 'value'));
    $total_expense = array_sum(array_column($expenses, 'value'));
    $net_balance = $total_income - $total_expense;
    
    return array(
        'id' => $row['id'],
        'cid' => $row['cid'],
        'name' => $row['name'],
        'posname' => $row['posname'],
        'employee_type' => isset($row['employee_type']) ? $row['employee_type'] : 'ข้าราชการ',
        'bank_account' => isset($row['bank_account']) ? $row['bank_account'] : '-',
        'month' => $row['month'],
        'year' => $row['year'],
        'incomes' => $incomes,
        'expenses' => $expenses,
        'total_income' => $total_income,
        'total_expense' => $total_expense,
        'net_balance' => $net_balance
    );
}
?>