// auth.js - Enhanced Authentication Manager

const Auth = {
    // ==========================================
    // LOGIN
    // ==========================================
    async login(username, password) {
        try {
            
            const response = await API.post('login', {
                username: username,
                password: password
            });

            if (response.success && response.token && response.user) {
                // บันทึก session
                sessionStorage.setItem('token', response.token);
                sessionStorage.setItem('user', JSON.stringify(response.user));
                
                return {
                    success: true,
                    message: 'เข้าสู่ระบบสำเร็จ',
                    user: response.user
                };
            } else {
                return {
                    success: false,
                    message: response.message || 'เข้าสู่ระบบไม่สำเร็จ'
                };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            
            // แยก error message ตามประเภท
            let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
            
            if (error.message.includes('API endpoint returned HTML')) {
                errorMessage = 'ไม่สามารถเชื่อมต่อกับ API ได้ กรุณาตรวจสอบการตั้งค่า';
            } else if (error.message.includes('Network')) {
                errorMessage = 'เกิดปัญหาการเชื่อมต่อเครือข่าย';
            } else {
                errorMessage = error.message || errorMessage;
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    },

    // ==========================================
    // GET CURRENT USER
    // ==========================================
    getCurrentUser() {
        try {
            const userStr = sessionStorage.getItem('user');
            const token = sessionStorage.getItem('token');
            
            if (!userStr || !token) {
                return null;
            }
            
            const user = JSON.parse(userStr);
            
            // ตรวจสอบว่า user object มีข้อมูลครบถ้วน
            if (!user.id || !user.username) {
                console.error('❌ Invalid user object:', user);
                return null;
            }
            
            return user;
        } catch (error) {
            console.error('❌ Error getting current user:', error);
            return null;
        }
    },

    // ==========================================
    // CHECK AUTHENTICATION
    // ==========================================
    isAuthenticated() {
        const user = this.getCurrentUser();
        const token = sessionStorage.getItem('token');
        
        const isAuth = !!(user && token);
        
        return isAuth;
    },

    // ==========================================
    // REFRESH USER INFO
    // ==========================================
    async refreshUserInfo() {
        try {
            
            const response = await API.get('get-user-info');
            
            if (response.success && response.user) {
                sessionStorage.setItem('user', JSON.stringify(response.user));
                return response.user;
            } else {
                console.error('❌ Failed to refresh user info:', response.message);
                return null;
            }
        } catch (error) {
            console.error('❌ Error refreshing user info:', error);         
            return null;
        }
    },

    // ==========================================
    // LOGOUT
    // ==========================================
    async logout() {
        try {
            
            // เรียก API logout (optional - ไม่ต้อง await ก็ได้)
            try {
                await API.post('logout');
            } catch (e) {
                console.warn('⚠️ Logout API failed, continuing with local logout');
            }
            
            // ลบ session
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.clear();
            
            // Redirect to login
            if (typeof router !== 'undefined') {
                router.navigate('/', true);
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Force logout anyway
            sessionStorage.clear();
            window.location.href = '/';
        }
    },

    // ==========================================
    // CHECK ADMIN PRIVILEGES
    // ==========================================
    hasAdminPrivileges(user = null) {
        if (!user) {
            user = this.getCurrentUser();
        }
        
        if (!user) {
            return false;
        }

        // 1. ตรวจสอบ status = 'ADMIN'
        const status = String(user.status || '').toUpperCase();
        if (status === 'ADMIN') {
            return true;
        }

        // 2. ตรวจสอบตำแหน่ง = 'นักวิชาการเงินและบัญชี'
        const posname = String(user.posname || '');
        if (posname.includes('นักวิชาการเงินและบัญชี')) {
            return true;
        }

        return false;
    },

    // ==========================================
    // GET USER ROLE DISPLAY
    // ==========================================
    getUserRoleDisplay(user = null) {
        if (!user) {
            user = this.getCurrentUser();
        }
        
        if (!user) {
            return 'GUEST';
        }

        const isAdmin = this.hasAdminPrivileges(user);
        const actualStatus = user.status || 'USER';
        
        if (isAdmin && actualStatus !== 'ADMIN') {
            return 'ADMIN (จากตำแหน่ง)';
        }
        
        return actualStatus;
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}