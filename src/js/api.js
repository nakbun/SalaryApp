// api.js
const API_BASE_URL = "/SalaryApp/src/API/index.php";

const API = {
    baseURL: API_BASE_URL,

    // ---------------------------
    //  Generic POST Request
    // ---------------------------
    async post(url = "", data = {}) {
        try {
            const apiUrl = `${this.baseURL}${url}`;
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            return await this.handleResponse(response);
        } catch (err) {
            console.error("API POST error:", err);
            throw err;
        }
    },

    // ---------------------------
    //  Upload with FormData
    // ---------------------------
    async upload(url, formData) {
        try {
            const response = await fetch(url, {
                method: "POST",
                body: formData,
            });

            return await this.handleResponse(response);
        } catch (err) {
            console.error("API Upload error:", err);
            throw err;
        }
    },

    // ---------------------------
    //  Generic GET Request
    // ---------------------------
    async get(actionName, params = {}) {
        const query = new URLSearchParams({ ...params, action: actionName });
        const url = `${this.baseURL}?${query}`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            return await this.handleResponse(response);
        } catch (err) {
            console.error("API GET error:", err);
            throw err;
        }
    },

    // ---------------------------
    //  Universal response handler
    // ---------------------------
    async handleResponse(response) {
        const text = await response.text();

        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            console.warn("Response not JSON:", text);
        }

        if (!response.ok) {
            const message =
                json?.error ||
                json?.message ||
                `HTTP error! status: ${response.status}`;

            const err = new Error(message);
            err.status = response.status;
            err.body = json;
            throw err;
        }

        if (json === null) {
            throw new Error("Invalid JSON response from server");
        }

        return json;
    },
};
