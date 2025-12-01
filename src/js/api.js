const API = {
    baseURL: '/SalaryApp/src/API/index.php',
    
    async post(url, data = {}) {
        try {
            const response = await fetch(`${this.baseURL}${url}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const text = await response.text();
            console.log('API Response:', text);
            
            if (!response.ok) {
                console.error('Server response:', text);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Response is not JSON:', text);
                throw new Error('Invalid JSON response from server');
            }
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
            
            if (!response.ok) {
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                } catch (e) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Response is not valid JSON:', text);
                throw new Error('Invalid JSON response from server');
            }
        } catch (err) {
            console.error('API Upload error:', err);
            throw err;
        }
    }
};