// Main App
document.addEventListener('DOMContentLoaded', () => {
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


