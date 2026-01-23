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
                await new Promise(resolve => setTimeout(resolve, 400));
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
// Helper: CID Login Handler
// ==========================================
async function handleCIDLogin(cidcard) {
    const root = document.getElementById('root');

    // สร้าง overlay แบบใหม่ - พื้นหลังโปร่งใส
    root.innerHTML = `
        <div class="login-redirect-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(8px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            z-index: 9999;
        ">
            <div class="login-redirect-spinner" style="
                width: 60px;
                height: 60px;
                border: 6px solid #f3f3f3;
                border-top: 6px solid #3b82f6;
                border-radius: 50%;
                animation: redirectSpinnerRotate 1s linear infinite;
            "></div>
            <p class="login-redirect-text" style="
                font-size: 20px;
                color: #374151;
                font-weight: 600;
            ">กำลังตรวจสอบ CID Card...</p>
            <p style="
                margin-top: 10px;
                font-size: 14px;
                color: #6b7280;
            ">CID: ${cidcard.substring(0, 8)}...</p>
        </div>
        
        <style>
            @keyframes redirectSpinnerRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
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
    let overlay = document.getElementById('login-redirect-overlay');

    if (overlay) {
        // ถ้ามี overlay อยู่แล้ว แค่แสดงมัน
        overlay.style.display = 'flex';
    } else {
        // ถ้ายังไม่มี สร้างใหม่
        overlay = document.createElement('div');
        overlay.id = 'login-redirect-overlay';
        overlay.className = 'login-redirect-overlay';

        overlay.innerHTML = `
            <div class="login-redirect-spinner"></div>
            <p class="login-redirect-text">กำลังเข้าสู่ระบบ...</p>
        `;

        // เพิ่ม inline CSS - พื้นหลังโปร่งใส
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(255, 255, 255, 0.3) !important;
            backdrop-filter: blur(8px) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 20px !important;
            z-index: 9999 !important;
        `;

        document.body.appendChild(overlay);
    }
}