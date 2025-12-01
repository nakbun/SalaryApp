# ระบบสลิปเงินเดือนบุคลากร

โปรเจกต์นี้เป็นระบบจัดการสลิปเงินเดือนที่ใช้ **Vanilla JavaScript** (Frontend) และ **PHP** (Backend)

## โครงสร้างโปรเจกต์

```
SalaryApp/
├── src/
│   ├── API/              # PHP Backend
│   │   ├── index.php     # Main API router
│   │   ├── config.php     # Configuration
│   │   ├── db.php        # Database connection
│   │   ├── auth.php      # Authentication
│   │   ├── salary.php    # Salary data handling
│   │   └── upload.php    # File upload handling
│   ├── js/               # JavaScript Frontend
│   │   ├── router.js     # Routing system
│   │   ├── auth.js       # Authentication manager
│   │   ├── api.js        # API helper
│   │   ├── utils.js      # Utility functions
│   │   ├── app.js        # Main app
│   │   └── pages/        # Page components
│   │       ├── LoginPage.js
│   │       ├── SalarySystem.js
│   │       ├── SalarySlip.js
│   │       └── AddSalary.js
│   └── components/       # CSS files
│       ├── LoginPage.css
│       ├── SalarySystem.css
│       ├── SalarySlip.css
│       └── AddSalary.css
├── index.html            # Main HTML file
├── .htaccess            # Apache rewrite rules
└── package.json
```

## ความต้องการของระบบ

### Backend (PHP)
- PHP 7.4 หรือสูงกว่า
- MySQL/MariaDB
- Apache with mod_rewrite enabled
- PhpSpreadsheet library (สำหรับอ่านไฟล์ Excel)

### Frontend
- Modern browser (Chrome, Firefox, Safari, Edge)
- ไม่ต้องใช้ Node.js หรือ build tools

## การติดตั้ง

### 1. ติดตั้ง PhpSpreadsheet

```bash
cd src/API
composer require phpoffice/phpspreadsheet
```

### 2. ตั้งค่า Database

แก้ไขไฟล์ `src/API/config.php`:

```php
define('DB_HOST', 'your_host');
define('DB_USER', 'your_user');
define('DB_PASS', 'your_password');
define('DB_NAME', 'your_database');
```

### 3. ตั้งค่า Apache

ตรวจสอบว่า `.htaccess` ทำงานได้ และ `mod_rewrite` เปิดใช้งาน

### 4. ตั้งค่า Base URL

แก้ไขไฟล์ `src/js/api.js` และ `src/js/auth.js` เปลี่ยน URL จาก:
```javascript
'http://localhost/SalaryApp/src/API/index.php'
```
เป็น URL ของคุณ

## การใช้งาน

### Development

```bash
# ใช้ PHP built-in server
php -S localhost:8000 -t .
```

หรือใช้ Apache/XAMPP/WAMP และเปิดที่ `http://localhost/SalaryApp/`

### Production

1. อัปโหลดไฟล์ทั้งหมดไปยัง web server
2. ตั้งค่า `.htaccess` ให้ทำงาน
3. ติดตั้ง PhpSpreadsheet ผ่าน Composer
4. ตั้งค่า database connection

## API Endpoints

- `POST /api/login` - เข้าสู่ระบบ
- `POST /api/register` - ลงทะเบียน
- `GET /api/users` - ดึงรายชื่อผู้ใช้
- `GET /api/salary-data` - ดึงข้อมูลเงินเดือน
- `GET /api/available-filters` - ดึงตัวกรองที่ใช้ได้
- `POST /api/reset-table` - Reset ตารางข้อมูล
- `POST /upload` - อัปโหลดไฟล์ Excel

## หมายเหตุ

- ระบบใช้ `sessionStorage` สำหรับเก็บข้อมูลผู้ใช้
- ต้องมี PhpSpreadsheet library สำหรับอ่านไฟล์ Excel
- ตรวจสอบ CORS settings ถ้า frontend และ backend อยู่คนละ domain
