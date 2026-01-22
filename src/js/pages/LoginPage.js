// login.js - Enhanced Login Page with CID Card Support

window.renderLoginPage = function () {
    // ✅ ตรวจสอบ CID Card จาก URL ก่อนอื่นหมด
    const urlParams = new URLSearchParams(window.location.search);
    const cidcard = urlParams.get('cidcard') || urlParams.get('cid');

    if (cidcard) {
        handleCIDLogin(cidcard);
        return;
    }

    // ✅ เช็ค authentication ปกติ
    if (Auth.isAuthenticated()) {
        showLoginRedirectOverlay();
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
                            <p class="help-text">หากมีปัญหาในการเข้าสู่ระบบ กรุณาติดต่อแอดมิน</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="login-redirect-overlay" class="login-redirect-overlay" style="display: none;">
            <div class="login-redirect-spinner"></div>
            <p class="login-redirect-text">กำลังเข้าสู่ระบบ...</p>
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

        Utils.hideError(errorMessage);

        if (!username || !password) {
            Utils.showError(errorMessage, '⚠️ กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="login-spinner"></span>
            <span class="button-text">กำลังตรวจสอบ...</span>
        `;

        try {
            const result = await Auth.login(username, password);

            if (result.success) {
                submitButton.innerHTML = `
                    <span class="button-text">✓ เข้าสู่ระบบสำเร็จ</span>
                `;

                showLoginRedirectOverlay();
                await new Promise(resolve => setTimeout(resolve, 800));
                router.navigate('/home', true);

            } else {
                console.error('❌ Login failed:', result.message);
                Utils.showError(errorMessage, `⚠️ ${result.message}`);

                submitButton.disabled = false;
                submitButton.innerHTML = `
                    <span class="button-text">เข้าสู่ระบบ</span>
                    <span class="button-arrow">→</span>
                `;

                usernameInput.focus();
                usernameInput.select();
            }
        } catch (error) {
            console.error('❌ Submit error:', error);

            let errorText = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

            if (error.message) {
                if (error.message.includes('API endpoint')) {
                    errorText = 'ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาติดต่อผู้ดูแล';
                } else if (error.message.includes('Network')) {
                    errorText = 'เกิดปัญหาการเชื่อมต่อเครือข่าย';
                } else {
                    errorText = error.message;
                }
            }

            Utils.showError(errorMessage, `⚠️ ${errorText}`);

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
    submitButton.addEventListener('click', handleSubmit);

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitButton.disabled) {
            e.preventDefault();
            handleSubmit();
        }
    });

    setTimeout(() => {
        usernameInput.focus();
    }, 100);
};

// ==========================================
// Helper: CID Login Handler (ใหม่)
// ==========================================
async function handleCIDLogin(cidcard) {

    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="login-page">
            <div class="login-redirect-overlay" style="display: flex;">
                <div class="login-redirect-spinner"></div>
                <p class="login-redirect-text">กำลังตรวจสอบ CID Card...</p>
                <p style="margin-top: 10px; font-size: 14px; opacity: 0.7;">
                    CID: ${cidcard.substring(0, 8)}...
                </p>
            </div>
        </div>
    `;

    try {
        const result = await Auth.loginWithCID(cidcard);

        if (result.success) {

            const textElement = document.querySelector('.login-redirect-text');
            if (textElement) {
                textElement.textContent = '✓ เข้าสู่ระบบสำเร็จ';
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            // ลบ cidcard parameter ออกจาก URL
            const url = new URL(window.location);
            url.searchParams.delete('cidcard');
            window.history.replaceState({}, '', url);

            // Navigate ไป home
            router.navigate('/home', true);

        } else {
            console.error('❌ CID Login failed:', result.message);

            root.innerHTML = `
                <div class="login-page">
                    <div style="text-align: center; padding: 40px;">
                        <h2 style="color: #e74c3c; margin-bottom: 20px;">
                            ❌ ไม่สามารถเข้าสู่ระบบได้
                        </h2>
                        <p style="margin-bottom: 30px;">${result.message}</p>
                        <button 
                            onclick="window.location.href='/SalaryApp/'" 
                            style="
                                padding: 12px 30px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 16px;
                            "
                        >
                            กลับไปหน้า Login
                        </button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                window.location.href = '/SalaryApp/';
            }, 3000);
        }
    } catch (error) {
        console.error('❌ CID Login error:', error);

        root.innerHTML = `
            <div class="login-page">
                <div style="text-align: center; padding: 40px;">
                    <h2 style="color: #e74c3c; margin-bottom: 20px;">
                        ❌ เกิดข้อผิดพลาด
                    </h2>
                    <p style="margin-bottom: 30px;">${error.message}</p>
                    <button 
                        onclick="window.location.href='/SalaryApp/'" 
                        style="
                            padding: 12px 30px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                        "
                    >
                        กลับไปหน้า Login
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => {
            window.location.href = '/SalaryApp/';
        }, 3000);
    }
}

// ==========================================
// Helper Function: Show Login Redirect Overlay
// ==========================================
function showLoginRedirectOverlay() {
    const overlay = document.getElementById('login-redirect-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    } else {
        const newOverlay = document.createElement('div');
        newOverlay.id = 'login-redirect-overlay';
        newOverlay.className = 'login-redirect-overlay';
        newOverlay.innerHTML = `
            <div class="login-redirect-spinner"></div>
            <p class="login-redirect-text">กำลังเข้าสู่ระบบ...</p>
        `;
        newOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        document.body.appendChild(newOverlay);
    }
}