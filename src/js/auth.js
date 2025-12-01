const Auth = {
    async login(cid, password) {
        try {
            const response = await API.post('', {
                action: 'login',
                username: cid,  // ใช้ CID เป็น username
                password: password
            });
            
            if (response.status === 'success') {
                localStorage.setItem('user', JSON.stringify(response.user));
                localStorage.setItem('token', response.token);
                return {
                    success: true,
                    user: response.user
                };
            } else {
                return {
                    success: false,
                    message: response.error || 'เข้าสู่ระบบไม่สำเร็จ'
                };
            }
        } catch (err) {
            console.error('Login error:', err);
            return {
                success: false,
                message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
            };
        }
    },
    
    // เพิ่มฟังก์ชันนี้
    isAuthenticated() {
        const user = this.getCurrentUser();
        const token = this.getToken();
        return !!(user && token);
    },
    
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    
    getToken() {
        return localStorage.getItem('token');
    },
    
    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.navigate('/', true);
    }
};