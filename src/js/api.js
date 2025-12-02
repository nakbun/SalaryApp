const API_BASE_URL = "/SalaryApp/src/API/index.php";

const API = {
    baseURL: API_BASE_URL,

    async post(url, data = {}) {
        try {
            const apiUrl = `${this.baseURL}${url || ''}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('API Response:', text);

            let body = null;
            try {
                body = text ? JSON.parse(text) : null;
            } catch (e) {
                console.warn('Response not JSON:', text);
            }

            if (!response.ok) {
                const message = (body && (body.error || body.message))
                    ? (body.error || body.message)
                    : `HTTP error! status: ${response.status}`;
                
                const err = new Error(message);
                err.status = response.status;
                err.body = body;
                console.error('Server response error:', err);
                throw err;
            }

            if (body === null) {
                throw new Error('Invalid JSON response from server');
            }

            return body;
        } catch (err) {
            console.error('API POST error:', err);
            throw err;
        }
    },

    async upload(url, formData) {
        try {
            console.log('Uploading to:', url);

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const text = await response.text();
            console.log('Upload response:', text);

            let body = null;
            try {
                body = text ? JSON.parse(text) : null;
            } catch (e) {
                console.warn('Upload response not JSON:', text);
            }

            if (!response.ok) {
                const message = (body && (body.error || body.message))
                    ? (body.error || body.message)
                    : `HTTP error! status: ${response.status}`;
                
                const err = new Error(message);
                err.status = response.status;
                err.body = body;
                throw err;
            }

            if (body === null) {
                throw new Error('Invalid JSON response from server');
            }

            return body;
        } catch (err) {
            console.error('API Upload error:', err);
            throw err;
        }
    },

    async get(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}?${queryString}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API GET error:", error);
            throw error;
        }
    }
};
