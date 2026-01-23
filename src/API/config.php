<?php
// ==========================
// Database Configuration
// ==========================
// define('DB_HOST', '10.0.0.11');
// define('DB_USER', 'admintoy');
// define('DB_PASS', 'Gotoyt@y1@y2522');
// define('DB_NAME', 'hrd_salary');

define('DB_HOST', '127.0.0.1');
define('DB_USER', 'root');
define('DB_PASS', "1234");
define('DB_NAME', 'salary_db');

// ==========================
// Upload Configuration
// ==========================
define('UPLOAD_FOLDER', dirname(__FILE__) . '/uploads');

if (!is_dir(UPLOAD_FOLDER)) {
    mkdir(UPLOAD_FOLDER, 0777, true);
}

// ==========================
// Month mappings
// ==========================
$GLOBALS['MONTH_MAP'] = array(
    'มกราคม' => 1, 'กุมภาพันธ์' => 2, 'มีนาคม' => 3, 'เมษายน' => 4,
    'พฤษภาคม' => 5, 'มิถุนายน' => 6, 'กรกฎาคม' => 7, 'สิงหาคม' => 8,
    'กันยายน' => 9, 'ตุลาคม' => 10, 'พฤศจิกายน' => 11, 'ธันวาคม' => 12,

    'ม.ค.' => 1, 'ก.พ.' => 2, 'มี.ค.' => 3, 'เม.ย.' => 4,
    'พ.ค.' => 5, 'มิ.ย.' => 6, 'ก.ค.' => 7, 'ส.ค.' => 8,
    'ก.ย.' => 9, 'ต.ค.' => 10, 'พ.ย.' => 11, 'ธ.ค.' => 12
);

$GLOBALS['MONTH_NAMES'] = array(
    1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
    5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
    9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
);

// ==========================
// Column mappings
// ==========================
$GLOBALS['COLUMN_MAP'] = array(
    // ===== ข้อมูลบุคคล =====
    'cid' => 'cid',
    'เลขบัตรประชาชน' => 'cid',
    'เลขประจำตัวประชาชน' => 'cid',
    'รหัสบัตรประชาชน' => 'cid',

    'ชื่อ' => 'name',
    'ชื่อ-สกุล' => 'name',
    'ชื่อ-นามสกุล' => 'name',
    'ชื่อนามสกุล' => 'name',

    'เลขที่บัญชี' => 'bank_account',
    'บัญชีธนาคาร' => 'bank_account',

    // ===== รายรับ =====
    'เงินเดือน' => 'salary',
    'เงินเดือนสุทธิ' => 'salary_deductions',
    'รวมรับ' => 'total_income',

    'ค่าครองชีพ' => 'cola_allowance',
    'ค่าครองชีพ(ตกเบิก)' => 'retroactive_cola_allowance',

    'ง/ด(ตกเบิก)' => 'retroactive_salary_emp',
    'ง/ด ตกเบิก' => 'retroactive_salary_emp',

    'พตส.' => 'special_public_health_allowance',
    'ปจต.' => 'position_allowance',
    'รายเดือน' => 'monthly_allowance',
    'P4P' => 'pay_for_performance',

    'โควิด-19' => 'covid_risk_pay',
    'เพิ่มโควิด-19' => 'covid_risk_pay',

    'เงินกู้สวัสดิการ' => 'welfare_loan_received',
    'โอที' => 'overtime_pay',
    'บ่าย-ดึก' => 'evening_night_shift_pay',

    'OT/OPD' => 'ot_outpatient_dept',
    'OT/พบ.' => 'ot_professional',
    'OT/ผช.' => 'ot_assistant',

    'บ-ด/พบ.' => 'shift_professional',
    'บ-ด/ผช.' => 'shift_assistant',

    'อื่นๆ (จ่าย)' => 'shift_assistant',
    'อื่นๆ (รับ)' => 'other_income',
    'อื่นๆ จ่าย' => 'shift_assistant',
    'อื่นๆ รับ' => 'other_income',
    'อื่นๆจ่าย' => 'shift_assistant',
    'อื่นๆรับ' => 'other_income',

    // ===== รายจ่าย =====
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

    'กยศ.' => 'student_loan_deduction_emp',
    'กยศ' => 'student_loan_deduction_emp',

    'ค่าน้ำ' => 'water_bill_deduction',
    'ค่าไฟ' => 'electricity_bill_deduction',

    'net' => 'internet_deduction_emp',
    'ค่าNet' => 'internet_deduction_emp',

    'AIA' => 'aia_insurance_deduction_emp',
    'ค่าAIA' => 'aia_insurance_deduction_emp',

    'ออมสิน' => 'gsb_loan_deduction_emp',
    'ออมสินนาอาน' => 'gsb_loan_naan',
    'ธนาคารออมสินเลย' => 'gsb_loan_loei',

    'ธอส' => 'ghb_loan_deduction',
    'กรุงไทย' => 'ktb_loan_deduction_emp',
    'ธนาคารกรุงไทย' => 'ktb_loan_deduction_emp',

    'เงินกู้ รพ.' => 'hospital_loan_deduction',
    'เงินกู้ รพ/ประกันงาน' => 'hospital_loan_employment',

    'การศึกษาบุตร' => 'child_education_deduction',
    'ค่ารักษาพยาบาล' => 'medical_expense_deduction',
    'ไม่ปฏิบัติเวช' => 'no_private_practice_deduction',

    // ===== สรุป =====
    'รวมจ่าย' => 'total_expense',
    'คงเหลือ' => 'net_balance',
);


// ==========================
// Numeric Columns
// ==========================
$GLOBALS['NUMERIC_COLUMNS'] = array(
    // ===== รายรับ =====
    'salary',
    'salary_deductions',
    'total_income',
    'cola_allowance',
    'retroactive_cola_allowance',
    'retroactive_salary_emp',
    'special_public_health_allowance',
    'position_allowance',
    'monthly_allowance',
    'pay_for_performance',
    'covid_risk_pay',
    'welfare_loan_received',
    'overtime_pay',
    'evening_night_shift_pay',
    'ot_outpatient_dept',
    'ot_professional',
    'ot_assistant',
    'shift_professional',
    'shift_assistant',
    'other_income',

    // ===== รายจ่าย =====
    'leave_day_deduction',
    'tax_deduction',
    'retroactive_tax_deduction',
    'gpf_contribution',
    'retroactive_gpf_deduction',
    'gpf_extra_contribution',
    'social_security_deduction_gov',
    'social_security_deduction_emp',
    'phks_provident_fund',
    'funeral_welfare_deduction',
    'coop_deduction_dept',
    'coop_deduction_phso',
    'student_loan_deduction_emp',
    'water_bill_deduction',
    'electricity_bill_deduction',
    'internet_deduction_emp',
    'aia_insurance_deduction_emp',
    'gsb_loan_deduction_emp',
    'gsb_loan_naan',
    'gsb_loan_loei',
    'ghb_loan_deduction',
    'ktb_loan_deduction_emp',
    'hospital_loan_deduction',
    'hospital_loan_employment',
    'child_education_deduction',
    'medical_expense_deduction',
    'no_private_practice_deduction',

    // ===== สรุป =====
    'total_expense',
    'net_balance',
);

?>
