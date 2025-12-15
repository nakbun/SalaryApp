// app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // ล้างข้อมูล LocalStorage
    if (localStorage.getItem('token') || localStorage.getItem('user')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('printEmployees');
    }

    // Load CSS files
    const cssFiles = [
        '/SalaryApp/src/components/LoginPage.css',
        '/SalaryApp/src/components/SalarySystem.css',
        '/SalaryApp/src/components/SalarySlip.css',
        '/SalaryApp/src/components/AddSalary.css',
        '/SalaryApp/src/index.css',
        '/SalaryApp/src/components/dashboard.css'  // ← ตรวจสอบว่าไฟล์มีจริง
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
    router.route('/salaryslip', window.renderSalarySlip, true);
    router.route('/addsalary', renderAddSalary, true);
    
    // 🔴 แก้ตรงนี้ - เพิ่ม handler ให้ dashboard
    router.route('/dashboard', window.renderDashboard, true);
    
    router.route('*', () => {
        router.navigate('/', true);
    });
    
    // Initialize router
    router.handleRoute();
});