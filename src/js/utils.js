// Utility Functions
const Utils = {
    formatCurrency(value) {
        if (!value) return "0.00";
        const cleanValue = value.toString().replace(/,/g, "").trim();
        const num = parseFloat(cleanValue);
        return isNaN(num) ? "0.00" : num.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    getThaiMonthName(monthNumber) {
        if (!monthNumber) return '-';
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
            "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
            "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        const index = parseInt(monthNumber) - 1;
        return monthNames[index] || '-';
    },
    
    formatDate() {
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;
        const year = today.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    },
    
    createElement(tag, className = '', content = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content) el.innerHTML = content;
        return el;
    },
    
    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    },
    
    hideError(element) {
        if (element) {
            element.style.display = 'none';
        }
    }
};


