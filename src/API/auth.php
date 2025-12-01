const Auth = {
    async login(username, password) {
        try {
            const response = await API.post('', {
                action: 'login',
                username: username,
                password: password
            });
            
            if (response.status === 'success') {
                localStorage.setItem('user', JSON.stringify(response.user));
                localStorage.setItem('token', response.token);
                return response;
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            throw err;
        }
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
    }
};