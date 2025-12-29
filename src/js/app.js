// app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // Load CSS files
    const cssFiles = [
        '/SalaryApp/src/components/LoginPage.css',
        '/SalaryApp/src/components/SalarySystem.css',
        '/SalaryApp/src/components/SalarySlip.css',
        '/SalaryApp/src/components/AddSalary.css',
        '/SalaryApp/src/index.css',
        '/SalaryApp/src/components/dashboard.css'
    ];
    
    cssFiles.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    });
    
    // ✅ Register routes ก่อนอื่นหมด
    router.route('/', renderLoginPage, false);
    router.route('/home', renderSalarySystem, true);
    router.route('/salaryslip', window.renderSalarySlip, true);
    router.route('/addsalary', renderAddSalary, true);
    router.route('/dashboard', window.renderDashboard, true);
    
    router.route('*', () => {
        router.navigate('/', true);
    });
    
    // ✅ Initialize router หลังจาก register routes แล้ว
    router.start(); // ← เปลี่ยนจาก handleRoute() เป็น start()
});