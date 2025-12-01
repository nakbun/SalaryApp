// Add Salary Page
let file = null;
let selectedMonth = '';
let selectedYear = '';
let loading = false;

const months = [
    { value: "มกราคม", label: "มกราคม" },
    { value: "กุมภาพันธ์", label: "กุมภาพันธ์" },
    { value: "มีนาคม", label: "มีนาคม" },
    { value: "เมษายน", label: "เมษายน" },
    { value: "พฤษภาคม", label: "พฤษภาคม" },
    { value: "มิถุนายน", label: "มิถุนายน" },
    { value: "กรกฎาคม", label: "กรกฎาคม" },
    { value: "สิงหาคม", label: "สิงหาคม" },
    { value: "กันยายน", label: "กันยายน" },
    { value: "ตุลาคม", label: "ตุลาคม" },
    { value: "พฤศจิกายน", label: "พฤศจิกายน" },
    { value: "ธันวาคม", label: "ธันวาคม" }
];

window.renderAddSalary = function() {
    const user = Auth.getCurrentUser();
    if (!user) {
        router.navigate('/', true);
        return;
    }
    
    const currentYear = new Date().getFullYear() + 543;
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
        years.push(i);
    }
    
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="salary-container">
            <div class="bg-blobs">
                <div class="bg-blob bg-blob-1"></div>
                <div class="bg-blob bg-blob-2"></div>
                <div class="bg-blob bg-blob-3"></div>
            </div>
            <div class="upload-section">
                <div class="content-wrapper">
                    <button class="back-home-button" onclick="router.navigate('/home', true)">HOME</button>
                    <div class="upload-header">
                        <div class="upload-header-content">
                            <span class="upload-icon-bounce">📤</span>
                            <h2 class="upload-title">อัปโหลดไฟล์ข้อมูล</h2>
                        </div>
                        <p class="upload-subtitle">
                            รองรับไฟล์ Excel (.xlsx, .xls) - บันทึกข้อมูลอัตโนมัติ
                        </p>
                    </div>
                    <div class="upload-body">
                        <div class="upload-form">
                            <div class="selection-grid">
                                <div class="form-group">
                                    <label class="form-label">
                                        <span class="label-icon indigo">📅</span>
                                        เลือกเดือน
                                    </label>
                                    <select id="month-select" class="form-select indigo">
                                        <option value="">-- เลือกเดือน --</option>
                                        ${months.map(month => `
                                            <option value="${month.value}">${month.label}</option>
                                        `).join('')}
                                    </select>
                                    <div id="month-indicator" class="selected-indicator" style="display: none;">
                                        <span>✓</span>
                                        <span class="selected-text"></span>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">
                                        <span class="label-icon purple">📅</span>
                                        เลือกปี พ.ศ.
                                    </label>
                                    <select id="year-select" class="form-select purple">
                                        <option value="">-- เลือกปี --</option>
                                        ${years.map(year => `
                                            <option value="${year}">${year}</option>
                                        `).join('')}
                                    </select>
                                    <div id="year-indicator" class="selected-indicator" style="display: none;">
                                        <span>✓</span>
                                        <span class="selected-text"></span>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="label-icon pink">📊</span>
                                    เลือกไฟล์ Excel
                                </label>
                                <input
                                    type="file"
                                    id="file-input"
                                    accept=".xlsx,.xls"
                                    class="form-file-input-add"
                                />
                                <div id="file-indicator" class="selected-indicator" style="display: none;">
                                    <span>✓</span>
                                    <span class="selected-text"></span>
                                </div>
                            </div>
                            <button id="upload-button" class="upload-button" disabled>
                                <span>📤</span>
                                <span>อัปโหลดและบันทึกข้อมูล</span>
                            </button>
                        </div>
                        <div id="upload-message" class="upload-message" style="display: none;"></div>
                    </div>
                </div>
            </div>
            <div id="modal-overlay" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header" id="modal-header">
                        <div class="modal-header-content">
                            <div class="modal-header-info">
                                <div class="modal-icon-wrapper">
                                    <span id="modal-icon">✓</span>
                                </div>
                                <h2 class="modal-title" id="modal-title">สำเร็จ!</h2>
                            </div>
                            <button class="modal-close-button" onclick="closeAddSalaryModal()">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div id="modal-body-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-footer-button" id="modal-footer-button" onclick="closeAddSalaryModal()">
                            ✓ เสร็จสิ้น
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const monthIndicator = document.getElementById('month-indicator');
    const yearIndicator = document.getElementById('year-indicator');
    const fileIndicator = document.getElementById('file-indicator');
    
    monthSelect.addEventListener('change', (e) => {
        selectedMonth = e.target.value;
        if (selectedMonth) {
            monthIndicator.style.display = 'flex';
            monthIndicator.querySelector('.selected-text').textContent = selectedMonth;
        } else {
            monthIndicator.style.display = 'none';
        }
        updateUploadButton();
    });
    
    yearSelect.addEventListener('change', (e) => {
        selectedYear = e.target.value;
        if (selectedYear) {
            yearIndicator.style.display = 'flex';
            yearIndicator.querySelector('.selected-text').textContent = `พ.ศ. ${selectedYear}`;
        } else {
            yearIndicator.style.display = 'none';
        }
        updateUploadButton();
    });
    
    fileInput.addEventListener('change', (e) => {
        file = e.target.files[0];
        if (file) {
            fileIndicator.style.display = 'flex';
            fileIndicator.querySelector('.selected-text').textContent = file.name;
        } else {
            fileIndicator.style.display = 'none';
        }
        updateUploadButton();
    });
    
    uploadButton.addEventListener('click', handleUpload);
    
    function updateUploadButton() {
        uploadButton.disabled = !file || !selectedMonth || !selectedYear || loading;
    }
}

async function handleUpload() {
    if (!file || !selectedMonth || !selectedYear) {
        alert('กรุณาเลือกไฟล์ เดือน และปีก่อนอัปโหลด!');
        return;
    }
    
    loading = true;
    const uploadButton = document.getElementById('upload-button');
    const uploadMessage = document.getElementById('upload-message');
    
    uploadButton.disabled = true;
    uploadButton.innerHTML = `
        <div class="spinner"></div>
        <span>กำลังประมวลผล...</span>
    `;
    uploadMessage.style.display = 'flex';
    uploadMessage.innerHTML = `
        <div class="message-spinner"></div>
        <span>⏳ กำลังอัปโหลดและบันทึกข้อมูล...</span>
    `;
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('month', selectedMonth);
        formData.append('year', selectedYear);
        formData.append('action', 'upload'); // เพิ่มตัวนี้
        
        console.log('Uploading file:', file.name);
        console.log('Month:', selectedMonth);
        console.log('Year:', selectedYear);
        
        // เปลี่ยน URL ตรงนี้ - ไม่ต้องมี /upload
        const data = await API.upload('/SalaryApp/src/API/index.php', formData);
        
        if (data.status === 'success') {
            showAddSalaryModal(true, {
                totalRows: data.rows,
                savedRows: data.saved || data.rows,
                message: `บันทึกข้อมูลเดือน ${selectedMonth} ${selectedYear} เรียบร้อย`
            });
            
            setTimeout(() => {
                router.navigate('/home', true);
            }, 3000);
        } else {
            showAddSalaryModal(false, {
                message: data.error || 'ไม่พบข้อมูลในไฟล์ Excel'
            });
        }
    } catch (err) {
        console.error('Upload error details:', err);
        showAddSalaryModal(false, {
            message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์'
        });
    } finally {
        loading = false;
        uploadMessage.style.display = 'none';
        uploadButton.disabled = false;
        uploadButton.innerHTML = `
            <span>📤</span>
            <span>อัปโหลดและบันทึกข้อมูล</span>
        `;
    }
}

function showAddSalaryModal(success, data) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalHeader = document.getElementById('modal-header');
    const modalTitle = document.getElementById('modal-title');
    const modalIcon = document.getElementById('modal-icon');
    const modalBodyContent = document.getElementById('modal-body-content');
    const modalFooterButton = document.getElementById('modal-footer-button');
    
    modalHeader.className = `modal-header ${success ? 'success' : 'error'}`;
    modalTitle.textContent = success ? 'สำเร็จ!' : 'ผิดพลาด!';
    modalIcon.textContent = success ? '✓' : '✕';
    
    if (success) {
        modalBodyContent.innerHTML = `
            <div class="modal-success-content">
                <div class="modal-count">${data.savedRows}</div>
                <div class="modal-count-label">รายการบันทึกสำเร็จ</div>
                <div class="modal-info-box success">
                    <div class="modal-info-content">
                        <div class="modal-info-icon-wrapper success">
                            <span>✓</span>
                        </div>
                        <div class="modal-info-text">
                            <p class="modal-info-title success">บันทึกข้อมูลลงฐานข้อมูลเรียบร้อย</p>
                            <p class="modal-info-detail success">📊 จำนวนข้อมูลทั้งหมด: ${data.totalRows} แถว</p>
                            <p class="modal-info-detail success">✅ บันทึกสำเร็จ: ${data.savedRows} แถว</p>
                            <p class="modal-info-detail success">📅 ${data.message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        modalFooterButton.className = 'modal-footer-button success';
        modalFooterButton.textContent = '✓ เสร็จสิ้น';
    } else {
        modalBodyContent.innerHTML = `
            <div class="modal-info-box error">
                <div class="modal-info-content">
                    <div class="modal-info-icon-wrapper error">
                        <span>✕</span>
                    </div>
                    <div class="modal-info-text">
                        <p class="modal-info-title error">ไม่สามารถบันทึกข้อมูลได้</p>
                        <p class="modal-info-detail error">${data.message}</p>
                    </div>
                </div>
            </div>
            <p class="modal-error-hint">กรุณาตรวจสอบไฟล์และลองอีกครั้ง</p>
        `;
        modalFooterButton.className = 'modal-footer-button error';
        modalFooterButton.textContent = '🔄 ลองอีกครั้ง';
    }
    
    modalOverlay.style.display = 'flex';
}

window.closeAddSalaryModal = function() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.style.display = 'none';
    
    const modalData = document.getElementById('modal-header').classList.contains('success');
    if (modalData) {
        // Reset form
        document.getElementById('file-input').value = '';
        document.getElementById('month-select').value = '';
        document.getElementById('year-select').value = '';
        file = null;
        selectedMonth = '';
        selectedYear = '';
    }
};

