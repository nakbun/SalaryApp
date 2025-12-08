<?php
// ฟังก์ชันแปลงเดือน (ใช้ของเดิมได้แต่ปรับให้เรียก Global Variable ให้ถูก)
function convertMonthToNumber($monthValue) {
    if (empty($monthValue)) return null;
    
    // Try to convert to integer
    if (is_numeric($monthValue)) {
        $num = (int)$monthValue;
        if ($num >= 1 && $num <= 12) {
            return $num;
        }
    }
    
    // Try to match with month map
    $monthStr = trim($monthValue);
    
    // เรียกใช้ตัวแปร Global จากไฟล์ config/api หลัก
    global $MONTH_MAP; 
    if (isset($MONTH_MAP[$monthStr])) {
        return $MONTH_MAP[$monthStr];
    }
    return null;
}

function handleGetSalaryData() {
    // เรียกใช้ $pdo จาก Global scope
    global $pdo; 

    try {
        // รับค่า (PHP 5.6 style)
        $cid = isset($_GET['cid']) ? $_GET['cid'] : '';
        $name = isset($_GET['name']) ? $_GET['name'] : '';
        $month = isset($_GET['month']) ? $_GET['month'] : '';
        $year = isset($_GET['year']) ? $_GET['year'] : '';
        $employee = isset($_GET['employee']) ? $_GET['employee'] : '';
        
        $monthNumber = null;
        if (!empty($month)) {
            $monthNumber = convertMonthToNumber($month);
        }
        
        // เริ่มสร้าง Query PDO
        $sql = "SELECT * FROM salary_data WHERE 1=1";
        $params = [];

        if (!empty($cid)) {
            $sql .= " AND cid LIKE :cid";
            $params[':cid'] = "%{$cid}%";
        }
        
        if (!empty($name)) {
            $sql .= " AND name LIKE :name";
            $params[':name'] = "%{$name}%";
        }
        
        if ($monthNumber !== null) {
            $sql .= " AND month = :month";
            $params[':month'] = $monthNumber;
        }
        
        if (!empty($year)) {
            $sql .= " AND year = :year";
            $params[':year'] = $year;
        }
        
        if (!empty($employee)) {
            $sql .= " AND employee = :employee";
            $params[':employee'] = $employee;
        }
        
        // Sorting Logic
        $sql .= " ORDER BY 
            CASE 
                WHEN employee = 'ข้าราชการ' THEN 0 
                WHEN employee = 'ลูกจ้างเงินเดือน' THEN 1 
                ELSE 2 
            END,
            id ASC";
        
        // Prepare & Execute (PDO ง่ายกว่า MySQLi มากใน PHP 5.6)
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // แปลงข้อมูลบางตัวให้เป็น String (เพื่อความชัวร์เวลาส่ง JSON)
        foreach ($result as &$row) {
            if (isset($row['cid'])) {
                $row['cid'] = (string)$row['cid'];
            }
            if (isset($row['bank_account'])) {
                $row['bank_account'] = (string)$row['bank_account'];
            }
        }
        
        echo json_encode(array(
            'status' => 'success',
            'data' => $result,
            'count' => count($result)
        ));
        
    } catch (Exception $e) {
        // error_log("Get salary data error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => $e->getMessage()
        ));
    }
}

function handleGetAvailableFilters() {
    global $pdo; // ใช้ PDO
    global $NUM_TO_THAI_MONTH; // ใช้ตัวแปรชื่อนี้ตามไฟล์ก่อนหน้า

    try {
        // Get months
        $stmt = $pdo->query("SELECT DISTINCT month FROM salary_data WHERE month IS NOT NULL ORDER BY month");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $availableMonths = array();
        foreach ($rows as $row) {
            $monthNum = $row['month'];
            // ใช้ NUM_TO_THAI_MONTH ที่ประกาศไว้ในไฟล์หลัก
            if (isset($NUM_TO_THAI_MONTH[$monthNum])) {
                $availableMonths[] = array(
                    'value' => $NUM_TO_THAI_MONTH[$monthNum],
                    'label' => $NUM_TO_THAI_MONTH[$monthNum],
                    'number' => $monthNum
                );
            }
        }
        
        // Get years
        $stmt = $pdo->query("SELECT DISTINCT year FROM salary_data WHERE year IS NOT NULL ORDER BY year DESC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $availableYears = array();
        foreach ($rows as $row) {
            $availableYears[] = (string)$row['year'];
        }
        
        echo json_encode(array(
            'status' => 'success',
            'months' => $availableMonths,
            'years' => $availableYears
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => $e->getMessage()
        ));
    }
}

function handleResetTable() {
    global $pdo;

    try {
        // ใช้ TRUNCATE เพื่อล้างข้อมูลและ reset auto_increment
        $pdo->exec("TRUNCATE TABLE salary_data");
        
        echo json_encode(array(
            'status' => 'success',
            'message' => 'ลบข้อมูลและ reset ID เรียบร้อยแล้ว'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => $e->getMessage()
        ));
    }
}
?>