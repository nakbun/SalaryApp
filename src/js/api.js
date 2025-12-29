// api.js - Enhanced API Manager with Better Error Handling

const API_BASE_PATH = "/SalaryApp/src/API";

// Endpoint mapping: กำหนดว่าแต่ละ action ควรไปที่ไฟล์ไหน
const API_ENDPOINTS = {
    // Auth actions → auth.php
    'login': 'auth.php',
    'logout': 'auth.php',
    'user-info': 'auth.php',
    'get-user-info': 'auth.php',
    'refresh-user': 'auth.php',
    'info': 'auth.php',
    
    // Salary data actions → index.php
    'salary-data': 'index.php',
    'available-filters': 'index.php',
    'upload': 'index.php'
};

const API = {
    /**
     * Get full URL for specific action
     */
    getEndpoint(action) {
        const file = API_ENDPOINTS[action] || 'index.php';
        const endpoint = `${API_BASE_PATH}/${file}`;
        return endpoint;
    },

    // ---------------------------
    //  POST Request
    // ---------------------------
    async post(action = "", data = {}) {
        const endpoint = this.getEndpoint(action);
        
        try {
            const payload = {
                action: action,
                ...data
            };
            
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload),
                credentials: 'include' // สำหรับ session cookies
            });

            return await this.handleResponse(response, action);
        } catch (err) {
            console.error(`❌ POST ${action} error:`, err);
            throw err;
        }
    },

    // ---------------------------
    //  Upload with FormData
    // ---------------------------
    async upload(action, formData) {
        const endpoint = this.getEndpoint(action);
        
        try {
            
            // เพิ่ม action ใน FormData
            formData.append('action', action);
            
            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
                credentials: 'include'
            });

            return await this.handleResponse(response, action);
        } catch (err) {
            console.error(`❌ UPLOAD ${action} error:`, err);
            throw err;
        }
    },

    // ---------------------------
    //  GET Request
    // ---------------------------
    async get(action, params = {}) {
        const endpoint = this.getEndpoint(action);
        const query = new URLSearchParams({ action, ...params });
        const url = `${endpoint}?${query}`;

        try {
            
            const response = await fetch(url, {
                method: "GET",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: 'include' // สำหรับ session cookies
            });

            return await this.handleResponse(response, action);
        } catch (err) {
            console.error(`❌ GET ${action} error:`, err);
            throw err;
        }
    },

    // ---------------------------
    //  Response Handler
    // ---------------------------
    async handleResponse(response, action = '') {
        const text = await response.text();

        // ตรวจสอบว่าเป็น HTML error page หรือไม่
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.error('❌ Received HTML instead of JSON:', text.substring(0, 200));
            throw new Error('API endpoint returned HTML. Check if file exists and PHP is working.');
        }

        // ตรวจสอบว่า response ว่างหรือไม่
        if (!text || text.trim() === '') {
            console.error('❌ Empty response from server');
            throw new Error('Empty response from server');
        }

        // พยายาม parse JSON
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('Response text:', text.substring(0, 500));
            throw new Error('Invalid JSON response: ' + text.substring(0, 100));
        }

        // ตรวจสอบว่า JSON มีค่าหรือไม่
        if (json === null) {
            throw new Error("Empty response from server");
        }

        // ตรวจสอบ status จาก JSON
        if (json.status === 'error' || json.success === false) {
            const message = json.error || json.message || 'Unknown error from server';
            console.error('❌ API returned error:', message);
            
            const err = new Error(message);
            err.status = response.status;
            err.body = json;
            err.detail = json.detail;
            throw err;
        }

        // ตรวจสอบ HTTP status code
        if (!response.ok) {
            const message = json?.message || json?.error || `HTTP error! status: ${response.status}`;
            console.error('❌ HTTP error:', message);
            
            const err = new Error(message);
            err.status = response.status;
            err.body = json;
            throw err;
        }

        return json;
    },

    // ---------------------------
    //  Test Connection
    // ---------------------------
    async testConnection() {
        try {
            
            // Test auth.php
            const authTest = await this.get('info');
            
            // Test index.php
            const indexTest = await fetch(`${API_BASE_PATH}/index.php?action=info`);
            const indexData = await indexTest.json();
            
            return {
                success: true,
                auth: authTest,
                index: indexData
            };
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

// Add to window for debugging
if (typeof window !== 'undefined') {
    window.API = API;
    
    // เพิ่ม helper สำหรับ debug
    window.testAPI = async () => {
        const result = await API.testConnection();
        return result;
    };
}   