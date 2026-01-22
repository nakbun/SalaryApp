// auth.js - Enhanced Authentication Manager with Signer Support

const Auth = {
    // ==========================================
    // LOGIN WITH CID CARD (เข้าสู่ระบบด้วยบัตรประชาชน)
    // ==========================================
    async loginWithCID(cidcard) {
        try {
            const API_BASE_PATH = "/SalaryApp/src/API";
            const endpoint = `${API_BASE_PATH}/auth.php?cidcard=${encodeURIComponent(cidcard)}`;
            
            const response = await fetch(endpoint, {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: 'include'
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ JSON parse error:', e);
                return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ CID Card' };
            }

            if (data.success && data.token && data.user) {
                // บันทึก session ผู้ใช้งาน
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                sessionStorage.setItem('login_method', 'cidcard');

                // ⭐ บันทึกข้อมูลลายเซ็นผู้มีอำนาจ (จาก Query SUSER depid 15)
                if (data.signer) {
                    sessionStorage.setItem('signerData', JSON.stringify(data.signer));
                }
                
                return {
                    success: true,
                    message: 'เข้าสู่ระบบด้วย CID Card สำเร็จ',
                    user: data.user
                };
            } else {
                return { success: false, message: data.message || 'ไม่พบข้อมูล CID Card ในระบบ' };
            }
        } catch (error) {
            console.error('❌ CID Login error:', error);
            return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย CID Card' };
        }
    },

    // ==========================================
    // LOGIN (เข้าสู่ระบบด้วย Username/Password)
    // ==========================================
    async login(username, password) {
        try {
            const response = await API.post('login', {
                username: username,
                password: password
            });

            if (response.success && response.token && response.user) {
                sessionStorage.setItem('token', response.token);
                sessionStorage.setItem('user', JSON.stringify(response.user));
                sessionStorage.setItem('login_method', 'username_password');

                // ⭐ บันทึกข้อมูลลายเซ็นผู้มีอำนาจที่ได้จาก Query SUSER
                if (response.signer) {
                    sessionStorage.setItem('signerData', JSON.stringify(response.signer));
                }
                
                return { success: true, message: 'เข้าสู่ระบบสำเร็จ', user: response.user };
            } else {
                return { success: false, message: response.message || 'เข้าสู่ระบบไม่สำเร็จ' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
        }
    },

    // ==========================================
    // GET CURRENT USER / CHECK AUTH
    // ==========================================
    getCurrentUser() {
        try {
            const userStr = sessionStorage.getItem('user');
            const token = sessionStorage.getItem('token');
            if (!userStr || !token) return null;
            return JSON.parse(userStr);
        } catch (error) { return null; }
    },

    isAuthenticated() {
        const user = this.getCurrentUser();
        const token = sessionStorage.getItem('token');
        return !!(user && token);
    },

    // ==========================================
    // LOGOUT (ออกจากระบบ)
    // ==========================================
    async logout() {
        try {
            try { await API.post('logout'); } catch (e) {}
            
            // ล้างข้อมูลทั้งหมดรวมถึงลายเซ็น
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('signerData'); 
            sessionStorage.removeItem('login_method');
            sessionStorage.clear();
            
            if (typeof router !== 'undefined') {
                router.navigate('/', true);
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            sessionStorage.clear();
            window.location.href = '/';
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}