<?php
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
    return $GLOBALS['MONTH_MAP'][$monthStr] ?? null;
}

function handleGetSalaryData() {
    $conn = null;
    try {
        $cid = $_GET['cid'] ?? '';
        $name = $_GET['name'] ?? '';
        $month = $_GET['month'] ?? '';
        $year = $_GET['year'] ?? '';
        $employee = $_GET['employee'] ?? '';
        
        $monthNumber = null;
        if (!empty($month)) {
            $monthNumber = convertMonthToNumber($month);
        }
        
        $conn = getDbConnection();
        $query = "SELECT * FROM salary_data WHERE 1=1";
        $params = [];
        $types = '';
        
        if (!empty($cid)) {
            $query .= " AND cid LIKE ?";
            $params[] = "%{$cid}%";
            $types .= 's';
        }
        
        if (!empty($name)) {
            $query .= " AND name LIKE ?";
            $params[] = "%{$name}%";
            $types .= 's';
        }
        
        if ($monthNumber !== null) {
            $query .= " AND month = ?";
            $params[] = $monthNumber;
            $types .= 'i';
        }
        
        if (!empty($year)) {
            $query .= " AND year = ?";
            $params[] = $year;
            $types .= 's';
        }
        
        if (!empty($employee)) {
            $query .= " AND employee = ?";
            $params[] = $employee;
            $types .= 's';
        }
        
        $query .= " ORDER BY 
            CASE 
                WHEN employee = 'ข้าราชการ' THEN 0 
                WHEN employee = 'ลูกจ้างเงินเดือน' THEN 1 
                ELSE 2 
            END,
            id ASC";
        
        $stmt = $conn->prepare($query);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            // Convert BIGINT to string
            if (isset($row['cid'])) {
                $row['cid'] = (string)$row['cid'];
            }
            if (isset($row['bank_account'])) {
                $row['bank_account'] = (string)$row['bank_account'];
            }
            $data[] = $row;
        }
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'data' => $data,
            'count' => count($data)
        ]);
        
    } catch (Exception $e) {
        error_log("Get salary data error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    } finally {
        closeDbConnection($conn);
    }
}

function handleGetAvailableFilters() {
    $conn = null;
    try {
        $conn = getDbConnection();
        
        // Get months
        $result = $conn->query(
            "SELECT DISTINCT month FROM salary_data WHERE month IS NOT NULL ORDER BY month"
        );
        
        $availableMonths = [];
        while ($row = $result->fetch_assoc()) {
            $monthNum = $row['month'];
            if (isset($GLOBALS['MONTH_NAMES'][$monthNum])) {
                $availableMonths[] = [
                    'value' => $GLOBALS['MONTH_NAMES'][$monthNum],
                    'label' => $GLOBALS['MONTH_NAMES'][$monthNum],
                    'number' => $monthNum
                ];
            }
        }
        
        // Get years
        $result = $conn->query(
            "SELECT DISTINCT year FROM salary_data WHERE year IS NOT NULL ORDER BY year DESC"
        );
        
        $availableYears = [];
        while ($row = $result->fetch_assoc()) {
            $availableYears[] = (string)$row['year'];
        }
        
        echo json_encode([
            'status' => 'success',
            'months' => $availableMonths,
            'years' => $availableYears
        ]);
        
    } catch (Exception $e) {
        error_log("Get filters error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    } finally {
        closeDbConnection($conn);
    }
}

function handleResetTable() {
    $conn = null;
    try {
        $conn = getDbConnection();
        $conn->query("TRUNCATE TABLE salary_data");
        
        echo json_encode([
            'status' => 'success',
            'message' => 'ลบข้อมูลและ reset ID เรียบร้อยแล้ว'
        ]);
        
    } catch (Exception $e) {
        error_log("Reset table error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    } finally {
        closeDbConnection($conn);
    }
}
?>


