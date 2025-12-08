// ==============================
// auth.js (Clean Version)
// ==============================

const Auth = {
    // ฟังก์ชัน Login
    async login(cid, password) {
        try {
            const response = await API.post('', {
                action: 'login',
                username: cid,
                password: password
            });

            if (response.status === 'success') {
                // เก็บลง SessionStorage
                sessionStorage.setItem('user', JSON.stringify(response.user));
                sessionStorage.setItem('token', response.token);

                // ล้าง LocalStorage เก่า
                localStorage.removeItem('user');
                localStorage.removeItem('token');

                return { success: true, user: response.user };
            } else {
                return { success: false, message: response.error || 'เข้าสู่ระบบไม่สำเร็จ' };
            }
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
        }
    },

    // ตรวจสอบสถานะ
    isAuthenticated() {
        const user = this.getCurrentUser();
        const token = this.getToken();
        return !!(user && token);
    },

    getCurrentUser() {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    getToken() {
        return sessionStorage.getItem('token');
    },

    // ฟังก์ชันออกจากระบบ
    logout() {
        sessionStorage.clear();
        localStorage.clear();

        // Force reload
        setTimeout(() => {
            window.location.href = '/';
            window.location.reload();
        }, 100);
    }
};
