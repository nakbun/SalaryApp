// Main App
document.addEventListener('DOMContentLoaded', () => {
    
    // 🔴 ส่วนที่เพิ่ม: ล้างข้อมูล LocalStorage (ของระบบเก่าหรือที่ค้างอยู่) ทิ้งทันที
    // เพื่อให้แน่ใจว่าการ Login จะพึ่งพาแค่ SessionStorage (ที่หายเมื่อปิดแท็บ) เท่านั้น
    if (localStorage.getItem('token') || localStorage.getItem('user')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('printEmployees'); // ล้างข้อมูลพิมพ์สลิปด้วย (ถ้ามี)
        console.log('Old session data cleared from LocalStorage.');
    }

    // Load CSS files
    const cssFiles = [
        '/SalaryApp/src/components/LoginPage.css',
        '/SalaryApp/src/components/SalarySystem.css',
        '/SalaryApp/src/components/SalarySlip.css',
        '/SalaryApp/src/components/AddSalary.css',
        '/SalaryApp/src/index.css'
    ];
    
    cssFiles.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    });
    
    // Setup routes
    router.route('/', renderLoginPage, false);
    router.route('/home', renderSalarySystem, true);
    router.route('/salaryslip', renderSalarySlip, true);
    router.route('/addsalary', renderAddSalary, true);
    router.route('*', () => {
        router.navigate('/', true);
    });
    
    // Initialize router
    router.handleRoute();
});