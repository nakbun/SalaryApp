// login.js - Enhanced Login Page with Better Error Handling

window.renderLoginPage = function() {
    // ✅ เช็ค authentication ก่อนอื่นหมด
    if (Auth.isAuthenticated()) {
        router.navigate('/home', true);
        return;
    }
    
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="login-page">
            <div class="left-panel">
                <div class="decorative-circle-1"></div>
                <div class="decorative-circle-2"></div>
                <div class="decorative-circle-3"></div>
                <div class="left-content">
                    <div class="brand-logo">
                        <img src="/SalaryApp/public/img/image-Photoroom (1).png" alt="Hospital Logo" class="logo-login" />
                    </div>
                    <h1 class="brand-title">ระบบสลิปเงินเดือนบุคลากร</h1>
                    <p class="brand-subtitle">โรงพยาบาลจิตเวชเลยราชนครินทร์</p>
                    <div class="decorative-line"></div>
                </div>
            </div>
            <div class="right-panel">
                <div class="login-box">
                    <div class="login-header">
                        <h2 class="login-title">เข้าสู่ระบบ</h2>
                    </div>
                    <div id="error-message" class="error-message" style="display: none;"></div>
                    <div class="form-container">
                        <div class="input-group">
                            <label for="username" class="label">
                                <span class="label-icon">👤</span>
                                ชื่อผู้ใช้ (Username)
                            </label>
                            <input
                                type="text"
                                id="username"
                                placeholder="กรอกชื่อผู้ใช้"
                                class="input"
                                autocomplete="username"
                            />
                        </div>
                        <div class="input-group">
                            <label for="password" class="label">
                                <span class="label-icon">🔒</span>
                                รหัสผ่าน
                            </label>
                            <div class="password-wrapper">
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="กรอกรหัสผ่าน"
                                    class="input password-input"
                                    autocomplete="current-password"
                                />
                                <button type="button" id="toggle-password" class="toggle-button" tabindex="-1">
                                    <img
                                        id="eye-icon"
                                        src="/SalaryApp/public/img/closeeye.png"
                                        alt="toggle password visibility"
                                        class="eye-icon"
                                    />
                                </button>
                            </div>
                        </div>
                        <button id="submit-button" class="submit-button">
                            <span class="button-text">เข้าสู่ระบบ</span>
                            <span class="button-arrow">→</span>
                        </button>
                        <div class="login-footer">
                            <p class="help-text">หากมีปัญหาในการเข้าสู่ระบบ กรุณาติดต่อห้องคอม</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // ==========================================
    // Event Listeners Setup
    // ==========================================
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('submit-button');
    const togglePassword = document.getElementById('toggle-password');
    const eyeIcon = document.getElementById('eye-icon');
    const errorMessage = document.getElementById('error-message');
    
    let showPassword = false;
    
    // ==========================================
    // Toggle Password Visibility
    // ==========================================
    togglePassword.addEventListener('click', () => {
        showPassword = !showPassword;
        passwordInput.type = showPassword ? 'text' : 'password';
        eyeIcon.src = showPassword 
            ? '/SalaryApp/public/img/openeye.png' 
            : '/SalaryApp/public/img/closeeye.png';
    });
    
    // ==========================================
    // Handle Form Submission
    // ==========================================
    const handleSubmit = async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Hide previous errors
        Utils.hideError(errorMessage);
        
        // Validation
        if (!username || !password) {
            Utils.showError(errorMessage, '⚠️ กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }
        
        // Disable submit button and show loading
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="login-spinner"></span>
            <span class="button-text">กำลังเข้าสู่ระบบ...</span>
        `;
        
        try {
            
            // Call login API
            const result = await Auth.login(username, password);
            
            if (result.success) {
                
                // Show success state
                submitButton.innerHTML = `
                    <span class="button-text">✓ เข้าสู่ระบบสำเร็จ</span>
                `;
                
                // Wait a bit before navigating
                await new Promise(resolve => setTimeout(resolve, 500));
                
                router.navigate('/home', true);
                
            } else {
                console.error('❌ Login failed:', result.message);
                
                // Show error message
                Utils.showError(errorMessage, `⚠️ ${result.message}`);
                
                // Reset button
                submitButton.disabled = false;
                submitButton.innerHTML = `
                    <span class="button-text">เข้าสู่ระบบ</span>
                    <span class="button-arrow">→</span>
                `;
                
                // Focus back to username
                usernameInput.focus();
                usernameInput.select();
            }
        } catch (error) {
            console.error('❌ Submit error:', error);
            
            // Handle unexpected errors
            let errorText = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
            
            if (error.message) {
                // แสดง error message ที่เฉพาะเจาะจงกว่า
                if (error.message.includes('API endpoint')) {
                    errorText = 'ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาติดต่อผู้ดูแล';
                } else if (error.message.includes('Network')) {
                    errorText = 'เกิดปัญหาการเชื่อมต่อเครือข่าย';
                } else {
                    errorText = error.message;
                }
            }
            
            Utils.showError(errorMessage, `⚠️ ${errorText}`);
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <span class="button-text">เข้าสู่ระบบ</span>
                <span class="button-arrow">→</span>
            `;
        }
    };
    
    // ==========================================
    // Event Bindings
    // ==========================================
    
    // Click submit button
    submitButton.addEventListener('click', handleSubmit);
    
    // Press Enter on username field
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });
    
    // Press Enter on password field
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitButton.disabled) {
            e.preventDefault();
            handleSubmit();
        }
    });
    
    // Auto focus on username field
    setTimeout(() => {
        usernameInput.focus();
    }, 100);

};