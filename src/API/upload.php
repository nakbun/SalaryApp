<?php
// =======================================================
// HELPER: ฟังก์ชันทำความสะอาดข้อมูล (ปรับให้รองรับ 5.6)
// =======================================================
function cleanColumnName($col) { 
    // ลบอักขระพิเศษ แปลงเป็นตัวพิมพ์เล็ก
    $str = preg_replace('/[^\x{0E00}-\x{0E7Fa-z0-9]/u', '', str_replace([' ','/','-','(',')'], ['_','_','_','',''], $col));
    return mb_strtolower($str); 
}

function cleanValue($val) { 
    return ($val === null || $val === '') ? null : trim($val); 
}

function convertToDecimal($val) { 
    if ($val === null || $val === '') return 0;
    $v = str_replace([',', ' '], '', $val);
    if (!is_numeric($v)) return 0;
    return round((float)$v, 2);
}

function cleanCid($val) { 
    $v = preg_replace('/\D/', '', $val); 
    // เช็คความยาว 13 หลัก
    return strlen($v) === 13 ? $v : null; 
}

function cleanYear($val) { 
    $y = (int)preg_replace('/\D/', '', $val); 
    // แปลง พ.ศ. เป็น ค.ศ.
    return $y < 1000 ? null : ($y >= 2400 ? $y - 543 : $y); 
}

function cleanBankAccount($val) { 
    $v = preg_replace('/\D/', '', $val); 
    return $v === '' ? null : $v; 
}

// =======================================================
// FUNCTION: Save Data (เปลี่ยนเป็น PDO)
// =======================================================
function saveToMySQL($data) {
    global $pdo; // เรียกใช้ PDO จาก Global scope
    
    if (empty($data)) return 0;

    // ดึงชื่อคอลัมน์จากแถวแรก
    $columns = array_keys($data[0]);
    
    // กรอง column ที่ไม่ต้องการ (PHP 5.6 ไม่มี array_filter แบบ arrow function)
    $validColumns = array();
    foreach ($columns as $c) {
        if ($c !== 'id' && $c !== 'created_at' && $c !== 'updated_at') {
            $validColumns[] = $c;
        }
    }
    $columns = $validColumns;

    // สร้างตารางถ้ายังไม่มี (ปรับปรุง SQL ให้ปลอดภัยขึ้น)
    $colDefs = [];
    foreach ($columns as $col) {
        if ($col === 'cid') $colDefs[] = "`$col` VARCHAR(20) DEFAULT NULL";
        elseif ($col === 'bank_account') $colDefs[] = "`$col` VARCHAR(50) DEFAULT NULL";
        elseif ($col === 'year') $colDefs[] = "`$col` INT DEFAULT NULL";
        elseif ($col === 'month') $colDefs[] = "`$col` TINYINT DEFAULT NULL";
        // ใช้ in_array กับ Global numeric columns
        elseif (in_array($col, $GLOBALS['NUMERIC_COLUMNS'])) $colDefs[] = "`$col` DECIMAL(15,2) DEFAULT 0";
        else $colDefs[] = "`$col` VARCHAR(255) DEFAULT NULL";
    }

    $sqlCreate = "CREATE TABLE IF NOT EXISTS salary_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        " . implode(',', $colDefs) . ",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_entry (cid, month, year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    
    $pdo->exec($sqlCreate);

    $saved = 0;
    
    // Prepare SQL Statement ครั้งเดียวเพื่อความเร็ว
    $colsStr = '`' . implode('`,`', $columns) . '`';
    $placeholders = implode(',', array_fill(0, count($columns), '?'));
    
    // สร้างส่วน ON DUPLICATE KEY UPDATE (แก้จาก Arrow Function)
    $updateParts = array();
    foreach ($columns as $c) {
        $updateParts[] = "`$c`=VALUES(`$c`)";
    }
    $updateStr = implode(',', $updateParts);
    
    $sqlInsert = "INSERT INTO salary_data ($colsStr) VALUES ($placeholders) 
                  ON DUPLICATE KEY UPDATE $updateStr";
                  
    $stmt = $pdo->prepare($sqlInsert);

    foreach ($data as $row) {
        // เตรียมข้อมูลให้ตรงลำดับ Column
        $values = array();
        foreach ($columns as $c) {
            $values[] = isset($row[$c]) ? $row[$c] : null;
        }
        
        try {
            // PDO execute ส่ง array เข้าไปได้เลย
            if ($stmt->execute($values)) {
                $saved++;
            }
        } catch (Exception $e) {
            // ข้ามแถวที่ Error (หรือจะเก็บ Log ก็ได้)
            continue;
        }
    }

    return $saved;
}

// =======================================================
// FUNCTION: Handle Upload Main Logic
// =======================================================
function handleUpload() {
    // ตรวจสอบ Library SimpleXLSX
    if (!class_exists('SimpleXLSX')) {
        // ลอง include ถ้ามีไฟล์
        if (file_exists(__DIR__ . '/SimpleXLSX.php')) {
            require_once __DIR__ . '/SimpleXLSX.php';
        } else {
            json_err('Server นี้ไม่มี Library SimpleXLSX กรุณาติดตั้ง', 500);
        }
    }

    try {
        if (!isset($_FILES['file'])) throw new Exception("ไม่พบไฟล์");
        if (!isset($_POST['month']) || !isset($_POST['year'])) throw new Exception("กรุณาเลือกเดือน/ปี");

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) throw new Exception("Upload error code: " . $file['error']);
        
        $monthRaw = trim($_POST['month']);
        $year = (int)trim($_POST['year']);
        
        $monthNumber = convertMonthToNumber($monthRaw);
        if ($monthNumber === null) throw new Exception("รูปแบบเดือนไม่ถูกต้อง: $monthRaw");

        // ย้ายไฟล์
        $uploadFolder = __DIR__ . '/uploads';
        if (!file_exists($uploadFolder)) mkdir($uploadFolder, 0777, true);
        
        $uploadPath = $uploadFolder . '/' . uniqid('salary_', true) . '_' . basename($file['name']);
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) throw new Exception("ไม่สามารถย้ายไฟล์ไปยัง Server ได้");

        // อ่าน Excel
        if ($xlsx = SimpleXLSX::parse($uploadPath)) {
            $allData = array(); 
            $processedSheets = array(); 
            $skippedSheets = array();
            
            foreach ($xlsx->sheetNames() as $sheetIndex => $sheetName) {
                $rows = $xlsx->rows($sheetIndex);
                
                // ข้ามถ้าไม่มีข้อมูล
                if (count($rows) < 2) { 
                    $skippedSheets[] = $sheetName; 
                    continue; 
                }

                // อ่าน Header
                $header = $rows[0]; 
                $map = array();
                
                foreach ($header as $col => $name) {
                    $name = trim($name);
                    $nameClean = cleanColumnName($name);
                    
                    // Map Column
                    foreach ($GLOBALS['COLUMN_MAP'] as $k => $v) {
                        if (cleanColumnName($k) === $nameClean) {
                            $map[$col] = $v;
                            break;
                        }
                    }
                }

                // วนลูปข้อมูล (ข้าม Header)
                $dataRows = array_slice($rows, 1);
                foreach ($dataRows as $rIdx => $row) {
                    // ตรวจสอบประเภทบุคลากรจากชื่อ Sheet
                    $employeeType = 'ลูกจ้างทั่วไป'; // Default
                    if (mb_strpos($sheetName, 'ข้าราชการ') !== false) {
                        $employeeType = 'ข้าราชการ';
                    } elseif (mb_strpos($sheetName, 'ลูกจ้าง') !== false) {
                        $employeeType = 'ลูกจ้างเงินเดือน';
                    }

                    $processedRow = [
                        'employee' => $employeeType,
                        'month' => $monthNumber,
                        'year' => $year
                    ];
                    
                    $hasContent = false;

                    foreach ($map as $cIdx => $field) {
                        $val = isset($row[$cIdx]) ? $row[$cIdx] : null;
                        
                        // Clean Data
                        if ($field === 'cid') {
                            $processedRow[$field] = cleanCid($val);
                            if (!empty($processedRow[$field])) $hasContent = true;
                        } elseif ($field === 'year') {
                            // ปีใน Excel มักไม่ถูกใช้ เพราะเราใช้ปีที่เลือกจาก UI
                            // $processedRow[$field] = cleanYear($val); 
                        } elseif ($field === 'month') {
                            // เดือนใน Excel มักไม่ถูกใช้
                        } elseif ($field === 'bank_account') {
                            $processedRow[$field] = cleanBankAccount($val);
                        } else {
                            if (in_array($field, $GLOBALS['NUMERIC_COLUMNS'])) {
                                $processedRow[$field] = convertToDecimal($val);
                            } else {
                                $processedRow[$field] = cleanValue($val);
                            }
                            if (!empty($processedRow[$field])) $hasContent = true;
                        }
                    }

                    // Validation: ต้องมี CID หรือ ชื่อ และต้องมีข้อมูลอย่างอื่นด้วย
                    if (empty($processedRow['cid']) && empty($processedRow['name'])) {
                        continue; 
                    }
                    
                    // Fallback CID: ถ้าไม่มี CID ให้สร้าง Fake ID เพื่อไม่ให้ Insert ตาย
                    if (empty($processedRow['cid'])) {
                         // ระวัง: VARCHAR(20) อาจจะไม่พอถ้าชื่อ Sheet ยาว
                         $shortSheet = mb_substr(cleanColumnName($sheetName), 0, 10);
                         $processedRow['cid'] = 'NO_CID_' . $shortSheet . '_' . $rIdx;
                    }

                    $allData[] = $processedRow;
                }
                $processedSheets[] = $sheetName;
            }
            
            // ลบไฟล์ทิ้งหลังอ่านเสร็จ
            @unlink($uploadPath);
            
            if (empty($allData)) throw new Exception("ไม่พบข้อมูลที่สามารถจับคู่คอลัมน์ได้เลย");

            // บันทึกลงฐานข้อมูล
            $savedCount = saveToMySQL($allData);
            
            json_ok([
                'processed_sheets' => $processedSheets,
                'skipped_sheets' => $skippedSheets,
                'rows_read' => count($allData),
                'rows_saved' => $savedCount
            ]);

        } else {
            throw new Exception("SimpleXLSX Parse Error: " . SimpleXLSX::parseError());
        }

    } catch (Exception $e) {
        json_err($e->getMessage(), 400);
    }
}
?>