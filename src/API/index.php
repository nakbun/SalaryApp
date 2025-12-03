<?php
// index.php - Final Fixed Version (Deduplicate Filters)

// ========== 1. CONFIG & ERROR HANDLING ==========
ini_set('display_errors', 0); 
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) return false;
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    echo json_encode(['status'=>'error', 'error'=>"PHP: $errstr", 'detail'=>"$errfile:$errline"], JSON_UNESCAPED_UNICODE);
    exit;
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR])) {
        if (ob_get_length()) ob_clean();
        http_response_code(500);
        echo json_encode(['status'=>'error', 'error'=>"Fatal: ".$error['message']], JSON_UNESCAPED_UNICODE);
    }
});

ob_start();

$GLOBALS['SALARY_TABLE'] = 'salary_data'; 

try {
    require_once __DIR__ . '/vendor/autoload.php'; 
    require_once __DIR__ . '/config.php'; 
    if (file_exists(__DIR__ . '/db.php')) require_once __DIR__ . '/db.php';

    $dsn = "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (Throwable $e) {
    echo json_encode(['status'=>'error', 'error'=>$e->getMessage()]); exit;
}

use PhpOffice\PhpSpreadsheet\IOFactory;

function json_ok($data = []) { ob_clean(); echo json_encode(array_merge(['status'=>'success'], $data), JSON_UNESCAPED_UNICODE); exit; }
function json_err($msg, $code=500, $extra=[]) { ob_clean(); http_response_code($code); echo json_encode(array_merge(['status'=>'error', 'error'=>$msg], $extra), JSON_UNESCAPED_UNICODE); exit; }

$MONTH_MAP = [
    'มกราคม'=>1, 'กุมภาพันธ์'=>2, 'มีนาคม'=>3, 'เมษายน'=>4, 'พฤษภาคม'=>5, 'มิถุนายน'=>6,
    'กรกฎาคม'=>7, 'สิงหาคม'=>8, 'กันยายน'=>9, 'ตุลาคม'=>10, 'พฤศจิกายน'=>11, 'ธันวาคม'=>12,
    'january'=>1, 'february'=>2, 'march'=>3, 'april'=>4, 'may'=>5, 'june'=>6,
    'july'=>7, 'august'=>8, 'september'=>9, 'october'=>10, 'november'=>11, 'december'=>12
];
$NUM_TO_THAI_MONTH = [1=>'มกราคม', 2=>'กุมภาพันธ์', 3=>'มีนาคม', 4=>'เมษายน', 5=>'พฤษภาคม', 6=>'มิถุนายน', 7=>'กรกฎาคม', 8=>'สิงหาคม', 9=>'กันยายน', 10=>'ตุลาคม', 11=>'พฤศจิกายน', 12=>'ธันวาคม'];

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
$action = $_POST['action'] ?? $_GET['action'] ?? ($payload['action'] ?? 'info');

// 1. LOGIN
if ($action === 'login') {
    $data = $payload ?? $_POST ?? [];
    $u = trim($data['username']??''); $p = trim($data['password']??'');
    $stmt = $pdo->prepare("SELECT * FROM users WHERE cid = ? LIMIT 1");
    $stmt->execute([$u]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($p, $user['password'])) json_err('รหัสผ่านไม่ถูกต้อง', 401);
    json_ok(['user'=>['id'=>$user['id'],'cid'=>$user['cid'],'name'=>$user['name']], 'token'=>bin2hex(random_bytes(32))]);
}

// 2. FILTERS (แก้ปัญหาเดือนซ้ำที่นี่)
if ($action === 'available-filters') {
    try {
        $table = $GLOBALS['SALARY_TABLE'];
        try { $pdo->query("SELECT 1 FROM {$table} LIMIT 1"); } catch(Exception $e) { json_err("ไม่พบตาราง $table", 500); }
        
        // ดึงข้อมูลทั้งหมดมาก่อน
        $stmt = $pdo->query("SELECT DISTINCT `month`, `year` FROM `{$table}` ORDER BY `year` DESC, `month` DESC");
        $rows = $stmt->fetchAll();

        $uniqueMonths = []; // ใช้ Array Key เพื่อป้องกันค่าซ้ำ
        $years = [];

        foreach($rows as $r) {
            $mNum = $r['month'];
            if($mNum) { 
                $label = $NUM_TO_THAI_MONTH[$mNum] ?? $mNum;
                // ถ้ายังไม่มีเดือนนี้ใน list ให้เพิ่มเข้าไป
                if (!isset($uniqueMonths[$label])) {
                    $uniqueMonths[$label] = ['value'=>$label, 'label'=>$label]; 
                }
            }
            if($r['year']) $years[] = $r['year'];
        }
        
        // ส่งกลับเฉพาะค่าที่ไม่ซ้ำ (array_values เพื่อ reset index)
        json_ok([
            'months' => array_values($uniqueMonths), 
            'years' => array_values(array_unique($years))
        ]);
    } catch (Exception $e) { json_err($e->getMessage()); }
}

// 3. GET DATA
if ($action === 'salary-data' || $action === 'get_data') {
    $p = array_merge($_GET, $_POST, is_array($payload)?$payload:[]);
    $sql = "SELECT * FROM `{$GLOBALS['SALARY_TABLE']}` WHERE 1=1";
    $bind = [];
    if (!empty($p['cid'])) { $sql.=" AND cid LIKE ?"; $bind[]="%{$p['cid']}%"; }
    if (!empty($p['name'])) { $sql.=" AND name LIKE ?"; $bind[]="%{$p['name']}%"; }
    if (!empty($p['month'])) { 
        $m = $MONTH_MAP[mb_strtolower(trim($p['month']))] ?? null;
        if($m) { $sql.=" AND month = ?"; $bind[]=$m; }
    }
    if (!empty($p['year'])) { $sql.=" AND year = ?"; $bind[]=$p['year']; }
    if (!empty($p['employee'])) { $sql.=" AND employee = ?"; $bind[]=$p['employee']; }
    
    $sql .= " ORDER BY year DESC, month DESC LIMIT 2000";
    $stmt = $pdo->prepare($sql); $stmt->execute($bind);
    json_ok(['data'=>$stmt->fetchAll()]);
}

// 4. UPLOAD (Smart Header)
if ($action === 'upload') {
    $debugErrors = []; $debugSheets = [];
    try {
        if (!isset($_FILES['file'])) json_err('ไม่พบไฟล์', 400);
        $monthRaw = $_POST['month'] ?? ''; $yearRaw = $_POST['year'] ?? '';
        $monthNumber = $MONTH_MAP[mb_strtolower(trim($monthRaw))] ?? null;
        if (!$monthNumber || !$yearRaw) json_err('ระบุเดือน/ปี ไม่ถูกต้อง', 400);

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) json_err('Upload error: '.$file['error'], 400);

        $reader = IOFactory::createReaderForFile($file['tmp_name']);
        $spreadsheet = $reader->load($file['tmp_name']);
        $table = $GLOBALS['SALARY_TABLE'];
        $pdo->beginTransaction();

        $stmtDel = $pdo->prepare("DELETE FROM `{$table}` WHERE `month` = ? AND `year` = ?");
        $stmtDel->execute([$monthNumber, $yearRaw]);

        $sql = "INSERT INTO `{$table}` (name, cid, bank_account, total_income, total_expense, net_balance, employee, month, year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        $stmt = $pdo->prepare($sql);
        $totalSaved = 0;

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $sheetName = trim($sheet->getTitle());
            $rows = $sheet->toArray(null, true, true, true);
            if (count($rows) <= 0) continue;
            $debugSheets[] = $sheetName;

            $headerRowIndex = 1; $foundHeader = false;
            foreach ($rows as $idx => $row) {
                if ($idx > 15) break; 
                $txt = mb_strtolower(implode('', $row));
                if (mb_strpos($txt, 'ชื่อ') !== false || mb_strpos($txt, 'name') !== false) { $headerRowIndex = $idx; $foundHeader = true; break; }
            }
            if (!$foundHeader) { $r1 = implode('', $rows[1]??[]); $headerRowIndex = empty(trim($r1)) ? 2 : 1; }

            $header = $rows[$headerRowIndex];
            $map = [];
            $keywords = [
                'name' => ['ชื่อ','name','fullname','สกุล'], 'cid' => ['cid','เลขประจำตัว','เลขบัตร'],
                'bank_account' => ['บัญชี','account','bank'], 'total_income' => ['รวมรับ','total income','รับสุทธิ'],
                'total_expense' => ['รวมจ่าย','total expense','รวมหัก'], 'net_balance' => ['คงเหลือ','รับจริง','สุทธิ']
            ];
            foreach ($header as $col => $val) {
                $t = mb_strtolower(trim((string)$val));
                foreach ($keywords as $key => $arr) { foreach ($arr as $kw) { if (mb_strpos($t, $kw) !== false) { $map[$col] = $key; break 2; } } }
            }
            if (empty($map)) $map = ['A'=>'name','B'=>'cid','C'=>'bank_account','D'=>'total_income','E'=>'total_expense','F'=>'net_balance'];

            foreach ($rows as $i => $row) {
                if ($i <= $headerRowIndex) continue;
                $d = [];
                foreach ($map as $col => $field) {
                    $val = isset($row[$col]) ? trim((string)$row[$col]) : '';
                    if (in_array($field, ['total_income','total_expense','net_balance'])) {
                        $val = str_replace([',','฿',' '], '', $val);
                        if (preg_match('/^\((.*)\)$/', $val, $m)) $val = '-' . $m[1];
                        $d[$field] = is_numeric($val) ? floatval($val) : 0;
                    } else { $d[$field] = $val; }
                }
                if (empty($d['name']) && empty($d['cid'])) continue;
                try {
                    $stmt->execute([$d['name']??null, $d['cid']??null, $d['bank_account']??null, $d['total_income']??0, $d['total_expense']??0, $d['net_balance']??0, $sheetName, $monthNumber, $yearRaw]);
                    $totalSaved++;
                } catch (Exception $e) { $debugErrors[] = "Sheet [$sheetName] Row $i: " . $e->getMessage(); }
            }
        }
        $pdo->commit();
        if ($totalSaved === 0) json_err("บันทึกไม่สำเร็จ (0 รายการ)", 400, ['sheets'=>$debugSheets, 'errors'=>array_slice($debugErrors,0,5)]);
        json_ok(['message'=>"บันทึกสำเร็จ $totalSaved รายการ", 'saved'=>$totalSaved]);
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); json_err('Upload Error', 500, ['detail'=>$e->getMessage()]); }
}

if ($action === 'info') json_ok(['message' => 'API Ready']);
json_err('Action not found', 404);
?>