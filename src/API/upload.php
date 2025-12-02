<?php
// Prevent any output before JSON
ob_start();

function convertMonthToNumber($month) {
    return $GLOBALS['MONTH_MAP'][$month] ?? null;
}

function handleUpload() {
    // Clean previous output
    if (ob_get_level()) {
        ob_clean();
    }

    try {
        error_log("=== Upload Handler Started ===");

        // --- Validate request ---
        if (!isset($_FILES['file'])) {
            throw new Exception('ไม่พบไฟล์ที่อัปโหลด');
        }

        if (!isset($_POST['month']) || !isset($_POST['year'])) {
            throw new Exception('กรุณาเลือกเดือนและปี');
        }

        $file = $_FILES['file'];
        $selectedMonth = trim($_POST['month']);
        $selectedYear  = trim($_POST['year']);

        error_log("File: " . $file['name']);
        error_log("Month: " . $selectedMonth);
        error_log("Year: " . $selectedYear);

        // --- Validate file upload ---
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'ไฟล์มีขนาดใหญ่เกินกว่าที่กำหนดในเซิร์ฟเวอร์',
                UPLOAD_ERR_FORM_SIZE => 'ไฟล์มีขนาดใหญ่เกินไป',
                UPLOAD_ERR_PARTIAL => 'ไฟล์อัปโหลดไม่สมบูรณ์',
                UPLOAD_ERR_NO_FILE => 'ไม่มีไฟล์ถูกอัปโหลด',
                UPLOAD_ERR_NO_TMP_DIR => 'ไม่พบโฟลเดอร์ชั่วคราว',
                UPLOAD_ERR_CANT_WRITE => 'ไม่สามารถเขียนไฟล์ลงดิสก์',
                UPLOAD_ERR_EXTENSION => 'การอัปโหลดถูกหยุดโดย extension'
            ];
            throw new Exception($errorMessages[$file['error']] ?? 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
        }

        if ($file['size'] > 10 * 1024 * 1024) { // 10 MB
            throw new Exception('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)');
        }

        // --- Convert Month ---
        $monthNumber = convertMonthToNumber($selectedMonth);
        if ($monthNumber === null) {
            throw new Exception("รูปแบบเดือนไม่ถูกต้อง: " . $selectedMonth);
        }

        // --- Check PhpSpreadsheet ---
        $autoloadPath = __DIR__ . '/../../vendor/autoload.php';
        error_log("Checking autoload at: " . realpath($autoloadPath));

        if (!file_exists($autoloadPath)) {
            throw new Exception("ไม่พบ PhpSpreadsheet library — กรุณาติดตั้งด้วยคำสั่ง: composer require phpoffice/phpspreadsheet");
        }

        require_once $autoloadPath;

        if (!class_exists('\PhpOffice\PhpSpreadsheet\Spreadsheet')) {
            throw new Exception("ไม่พบคลาส Spreadsheet ของ PhpSpreadsheet");
        }

        // --- Upload folder ---
        if (!file_exists(UPLOAD_FOLDER)) {
            mkdir(UPLOAD_FOLDER, 0755, true);
        }

        if (!is_writable(UPLOAD_FOLDER)) {
            throw new Exception("ไม่สามารถเขียนไฟล์ลงโฟลเดอร์ upload ได้");
        }

        // --- Save temp uploaded file ---
        $uploadPath = UPLOAD_FOLDER . '/' . uniqid('salary_', true) . '_' . basename($file['name']);
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            throw new Exception("ไม่สามารถย้ายไฟล์ที่อัปโหลดได้");
        }

        error_log("Uploaded to: " . $uploadPath);

        // --- Load Excel ---
        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($uploadPath);
        } catch (Exception $e) {
            @unlink($uploadPath);
            throw new Exception("อ่านไฟล์ Excel ไม่สำเร็จ: " . $e->getMessage());
        }

        // ======================================================================
        // === HIGH LEVEL PROCESSING (เหมือนเวอร์ชันก่อนหน้า — ไม่ตัดอะไรออก) ===
        // ======================================================================

        $allData = [];
        $processedSheets = [];
        $skippedSheets = [];

        foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
            $sheetName = $worksheet->getTitle();
            $rows = $worksheet->toArray();

            error_log("Processing sheet: {$sheetName} (" . count($rows) . " rows)");

            if (empty($rows) || count($rows) < 2) {
                $skippedSheets[] = $sheetName;
                continue;
            }

            // Header
            $header = [];
            foreach ($rows[0] as $col) {
                $colName = trim($col ?? '');
                if ($colName === '' || strtolower($colName) === 'nan') {
                    $colName = 'col_empty_' . count($header);
                }
                $header[] = $colName;
            }

            // Filter rows (remove empty + footer)
            $dataRows = array_slice($rows, 1);
            $filteredRows = [];

            foreach ($dataRows as $row) {
                $hasData = false;
                foreach ($row as $cell) {
                    if (!empty($cell) && trim($cell) !== '') {
                        $hasData = true;
                        break;
                    }
                }

                if (strpos(implode('', $row), 'รายละเอียดเพิ่มเติม') !== false) {
                    break;
                }

                if ($hasData) {
                    $filteredRows[] = $row;
                }
            }

            if (empty($filteredRows)) {
                $skippedSheets[] = $sheetName;
                continue;
            }

            // Map columns
            $mappedHeader = [];
            foreach ($header as $col) {
                $mappedHeader[] = $GLOBALS['COLUMN_MAP'][$col] ?? cleanColumnName($col);
            }

            // Build rows
            foreach ($filteredRows as $rowIndex => $rowData) {
                $processedRow = [];
                $processedRow['employee'] = $sheetName;
                $processedRow['month'] = $monthNumber;
                $processedRow['year']  = (int)$selectedYear;

                foreach ($mappedHeader as $idx => $colName) {
                    $value = $rowData[$idx] ?? null;

                    if ($colName === 'cid') {
                        $processedRow[$colName] = cleanCid($value);
                    } elseif ($colName === 'year') {
                        $processedRow[$colName] = cleanYear($value);
                    } elseif ($colName === 'month') {
                        $processedRow[$colName] = convertMonthToNumber($value);
                    } elseif ($colName === 'bank_account') {
                        $processedRow[$colName] = cleanBankAccount($value);
                    } elseif (in_array($colName, $GLOBALS['NUMERIC_COLUMNS'])) {
                        $processedRow[$colName] = convertToDecimal($value);
                    } else {
                        $processedRow[$colName] = cleanValue($value);
                    }
                }

                if (empty($processedRow['cid'])) {
                    $processedRow['cid'] = $sheetName . '_' . $rowIndex;
                }

                $allData[] = $processedRow;
            }

            $processedSheets[] = $sheetName;
        }

        if (empty($allData)) {
            @unlink($uploadPath);
            throw new Exception("ไม่พบข้อมูลที่สามารถประมวลผลได้");
        }

        // Save to MySQL
        $saved = saveToMySQL($allData);

        // Cleanup
        @unlink($uploadPath);

        // --- JSON Response ---
        echo json_encode([
            'status' => 'success',
            'processed_sheets' => $processedSheets,
            'skipped_sheets' => $skippedSheets,
            'rows' => count($allData),
            'saved' => $saved,
            'selected_month' => $monthNumber,
            'selected_year' => $selectedYear
        ], JSON_UNESCAPED_UNICODE);

    } catch (Exception $e) {

        error_log("Upload error: " . $e->getMessage());

        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

function cleanColumnName($col) {
    $col = trim($col ?? '');
    if (empty($col) || strtolower($col) === 'nan') {
        return 'col_empty';
    }
    
    $safe = str_replace(
        [' ', '/', '-', '.', '(', ')', '%', '#', '+', '*', '=', ':', ';', ','],
        ['_', '_', '_', '_', '', '', 'pct', 'no', '', '', '', '', '', ''],
        $col
    );
    
    $safe = preg_replace('/[^\x{0E00}-\x{0E7F}a-zA-Z0-9_]/u', '', $safe);
    return substr($safe, 0, 64);
}

function cleanValue($val) {
    if ($val === null || $val === '') {
        return null;
    }
    $s = trim((string)$val);
    if (strtolower($s) === 'nan' || strtolower($s) === 'none' || $s === '#ref!' || $s === '#N/A') {
        return null;
    }
    return $s;
}

function convertToDecimal($value) {
    if ($value === null || $value === '') {
        return null;
    }
    
    $s = str_replace(',', '', trim((string)$value));
    $s = preg_replace('/[^\d.-]/', '', $s);
    
    if (empty($s) || $s === '-' || $s === '.') {
        return null;
    }
    
    $num = filter_var($s, FILTER_VALIDATE_FLOAT);
    return $num !== false ? round($num, 2) : null;
}

function cleanCid($value) {
    if ($value === null || $value === '') {
        return null;
    }
    
    $cid = preg_replace('/\D/', '', (string)$value);
    return strlen($cid) === 13 ? $cid : null;
}

function cleanYear($value) {
    if ($value === null || $value === '') {
        return null;
    }
    
    $year = (int)preg_replace('/\D/', '', trim((string)$value));
    
    if ($year < 1000) {
        return null;
    }
    
    if ($year >= 1900 && $year < 2500) {
        $year += 543;
    }
    
    return $year;
}

function cleanBankAccount($value) {
    if ($value === null || $value === '') {
        return null;
    }
    
    $account = preg_replace('/\D/', '', str_replace([',', '-', ' '], '', (string)$value));
    return !empty($account) ? $account : null;
}

function saveToMySQL($data) {
    $conn = null;
    try {
        $conn = getDbConnection();
        
        if (empty($data)) {
            return 0;
        }
        
        error_log("Saving " . count($data) . " rows to database");
        
        $conn->begin_transaction();
        
        $columns = array_keys($data[0]);
        $columns = array_filter($columns, function($col) {
            return $col !== 'id' && $col !== 'created_at';
        });
        
        // Create table
        $colDefs = [];
        foreach ($columns as $col) {
            $cleanCol = cleanColumnName($col);
            
            if (in_array($cleanCol, ['name', 'employee', 'employee_type'])) {
                $colDefs[] = "`{$cleanCol}` VARCHAR(255) DEFAULT NULL";
            } elseif ($cleanCol === 'cid') {
                $colDefs[] = "`{$cleanCol}` VARCHAR(20) DEFAULT NULL";
            } elseif ($cleanCol === 'bank_account') {
                $colDefs[] = "`{$cleanCol}` VARCHAR(50) DEFAULT NULL";
            } elseif ($cleanCol === 'year') {
                $colDefs[] = "`{$cleanCol}` INT DEFAULT NULL";
            } elseif ($cleanCol === 'month') {
                $colDefs[] = "`{$cleanCol}` TINYINT DEFAULT NULL";
            } elseif (in_array($cleanCol, $GLOBALS['NUMERIC_COLUMNS'])) {
                $colDefs[] = "`{$cleanCol}` DECIMAL(15,2) DEFAULT NULL";
            } else {
                $colDefs[] = "`{$cleanCol}` TEXT DEFAULT NULL";
            }
        }
        
        $createTableSQL = "CREATE TABLE IF NOT EXISTS salary_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            " . implode(', ', $colDefs) . ",
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_cid (cid),
            KEY idx_month_year (month, year),
            UNIQUE KEY unique_entry (cid, month, year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$conn->query($createTableSQL)) {
            throw new Exception("Create table error: " . $conn->error);
        }
        
        $saved = 0;
        $updated = 0;
        
        foreach ($data as $row) {
            $cid = $row['cid'] ?? null;
            $month = $row['month'] ?? null;
            $year = $row['year'] ?? null;
            
            if (!$cid || $month === null || $year === null) {
                continue;
            }
            
            $values = [];
            $types = '';
            $updateParts = [];
            
            foreach ($columns as $col) {
                $val = $row[$col] ?? null;
                $values[] = $val;
                
                if (is_int($val)) {
                    $types .= 'i';
                } elseif (is_float($val)) {
                    $types .= 'd';
                } else {
                    $types .= 's';
                }
                
                $updateParts[] = "`{$col}` = VALUES(`{$col}`)";
            }
            
            $colsStr = '`' . implode('`, `', $columns) . '`';
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            
            $sql = "INSERT INTO salary_data ({$colsStr}) VALUES ({$placeholders})
                    ON DUPLICATE KEY UPDATE " . implode(', ', $updateParts);
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param($types, ...$values);
            
            if ($stmt->execute()) {
                if ($stmt->affected_rows === 1) {
                    $saved++;
                } elseif ($stmt->affected_rows === 2) {
                    $updated++;
                }
            }
            
            $stmt->close();
        }
        
        $conn->commit();
        
        error_log("Saved: $saved, Updated: $updated");
        
        return $saved + $updated;
        
    } catch (Exception $e) {
        if ($conn) {
            $conn->rollback();
        }
        error_log("Save to MySQL error: " . $e->getMessage());
        throw $e;
    } finally {
        closeDbConnection($conn);
    }
}
?>