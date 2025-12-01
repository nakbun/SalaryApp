// Login Page
window.renderLoginPage = function() {
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
                    <p class="brand-subtitle">เข้าสู่ระบบเพื่อเริ่มต้นประสบการณ์ที่ยอดเยี่ยม</p>
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
                            <label for="cid" class="label">
                                <span class="label-icon">👤</span>
                                เลขประจำตัว (CID)
                            </label>
                            <input
                                type="text"
                                id="cid"
                                placeholder="กรอกเลขประจำตัว"
                                class="input"
                                maxlength="13"
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
                                />
                                <button type="button" id="toggle-password" class="toggle-button">
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
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Check if already authenticated
    if (Auth.isAuthenticated()) {
        router.navigate('/home', true);
        return;
    }
    
    // Event listeners
    const cidInput = document.getElementById('cid');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('submit-button');
    const togglePassword = document.getElementById('toggle-password');
    const eyeIcon = document.getElementById('eye-icon');
    const errorMessage = document.getElementById('error-message');
    
    let showPassword = false;
    
    togglePassword.addEventListener('click', () => {
        showPassword = !showPassword;
        passwordInput.type = showPassword ? 'text' : 'password';
        eyeIcon.src = showPassword 
            ? '/SalaryApp/public/img/openeye.png' 
            : '/SalaryApp/public/img/closeeye.png';
    });
    
    const handleSubmit = async () => {
        const cid = cidInput.value.trim();
        const password = passwordInput.value.trim();
        
        Utils.hideError(errorMessage);
        
        if (!cid || !password) {
            Utils.showError(errorMessage, '⚠️ กรุณากรอก CID และรหัสผ่าน !');
            return;
        }
        
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="login-spinner"></span>
            <span class="button-text">กำลังเข้าสู่ระบบ...</span>
        `;
        
        const result = await Auth.login(cid, password);
        
        if (result.success) {
            await new Promise(resolve => setTimeout(resolve, 500));
            router.navigate('/home', true);
        } else {
            Utils.showError(errorMessage, `⚠️ ${result.message} !`);
            submitButton.disabled = false;
            submitButton.innerHTML = `
                <span class="button-text">เข้าสู่ระบบ</span>
                <span class="button-arrow">→</span>
            `;
        }
    };
    
    submitButton.addEventListener('click', handleSubmit);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitButton.disabled) {
            handleSubmit();
        }
    });
}


