// SalarySystem.js - Role-based Access (ADMIN + นักวิชาการเงินและบัญชี)

let currentPage = 1;
let results = [];
let availableMonths = [];
let availableYears = [];
const itemsPerPage = 20;

async function fetchEmployeesWithUtilities(filters = {}) {
    try {
        const user = Auth.getCurrentUser();
        const isAdmin = hasAdminPrivileges(user);
        const userCID = user.cid || user.idcard || user.ref_l_id;

        const cleanFilters = { ...filters };

        if (!isAdmin) {
            delete cleanFilters.cid;
            delete cleanFilters.name;
            cleanFilters.user_cid = userCID;
        } else {
            delete cleanFilters.user_cid;
        }

        const data = await API.get('salary-data', cleanFilters);

        if (data.status === 'success' && data.data) {
            return data.data;
        } else {
            console.error('❌ Failed to fetch employees:', data);
            return [];
        }
    } catch (error) {
        console.error('❌ Error fetching employees:', error);
        return [];
    }
}

// ==========================================
// HELPER: ตรวจสอบสิทธิ์แบบ Admin
// ==========================================
function hasAdminPrivileges(user) {
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
}
// ==========================================
// 1. MAIN RENDER FUNCTION
// ==========================================
window.renderSalarySystem = async function () {

    // ตรวจสอบ sessionStorage
    const userStr = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');

    const user = Auth.getCurrentUser();

    if (!user) {
        router.navigate('/', true);
        return;
    }

    const root = document.getElementById('root');
    if (!root) return;

    // ดึงข้อมูลจาก user object
    const positionDisplay = user.posname || 'ไม่ระบุตำแหน่ง';
    const statusDisplay = user.status || 'USER';

    // ตรวจสอบสิทธิ์แบบ Admin (ADMIN หรือ นักวิชาการเงินและบัญชี)
    const isAdmin = hasAdminPrivileges(user);

    // กำหนด icon และ label ตามสิทธิ์
    const userIcon = isAdmin ? '👑' : '👤';
    const userRole = user.status || 'USER';
    const userRoleDisplay = isAdmin ? 'ADMIN (จากตำแหน่ง)' : user.status || 'USER';

    // โครงสร้าง HTML หลัก
    root.innerHTML = `
        <div class="container">
            <div class="header">
                <div class="header-left">
                    <img src="/SalaryApp/public/img/image-Photoroom (1).png" alt="Logo" class="logo" />
                    <div class="header-text">
                        <h1 class="hospital-name">โรงพยาบาลจิตเวชเลยราชนครินทร์</h1>
                        <p class="name-app">ระบบสลิปเงินเดือนบุคลากร</p>
                    </div>
                </div>
                <div class="header-right">
                    ${isAdmin ? `<button class="btn btn-green" id="add-new-btn">✚ เพิ่มข้อมูล</button>` : ''}
                    <div class="profile-section" id="profile-section">
                        <button class="profile-button" id="profile-button">
                            <div class="profile-avatar">${userIcon}</div>
                            <div class="profile-info">
                                <div class="profile-name">${user.firstname} ${user.lastname}</div>
                                <div class="profile-position">${positionDisplay}</div>
                            </div>
                            <span class="profile-dropdown-icon">▼</span>
                        </button>
                        <div class="profile-dropdown" id="profile-dropdown" style="display: none;">
                            <div class="dropdown-header">
                                <div class="dropdown-avatar">${userIcon}</div>
                                <div class="dropdown-name">
                                    ${user.firstname} ${user.lastname}
                                </div>
                            </div>
                            <div class="dropdown-body">
                                <div class="dropdown-item">
                                    <span class="dropdown-label">ตำแหน่ง:</span>
                                    <span>${positionDisplay || '-'}</span>
                                </div>
                                <div class="dropdown-item">
                                    <span class="dropdown-label">เลขประจำตัว:</span>
                                    <span>${user.cid || '-'}</span>
                                </div>
                                <div class="dropdown-item">
                                    <span class="dropdown-label">สถานะ:</span>
                                    <span class="badge-${user.status}">${user.status}</span>
                                </div>
                                ${isAdmin && user.status !== 'ADMIN' ? `
                                <div class="dropdown-item">
                                    <span class="dropdown-label">สิทธิ์การใช้งาน:</span>
                                    <span class="badge-admin">ADMIN (จากตำแหน่ง)</span>
                                </div>
                                ` : ''}
                                ${!isAdmin ? `
                                <div class="dropdown-divider"></div>
                                <div class="dropdown-info-box">
                                    <div class="info-icon">ℹ️</div>
                                    <div class="info-text">คุณสามารถดูข้อมูลเงินเดือนของตัวเองได้เท่านั้น</div>
                                </div>
                                ` : ''}
                                <div class="dropdown-divider"></div>
                                <div class="dropdown-item dropdown-logout" id="logout-btn">
                                    <span>🚪 ออกจากระบบ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="search-section full-width">
                <h2 class="section-title">
                    <span class="icon">🔍</span>
                    <span class="title">ค้นหาข้อมูลเงินเดือน</span>
                    ${isAdmin ? `<button class="report-btn" id="dashboard-btn">📊 รายงานผล</button>` : ''}
                </h2>
                <div class="search-inputs-container">
                    ${isAdmin ? `
                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label>เลขประจำตัว</label>
                            <input type="text" id="search-cid" class="input-field" placeholder="กรอก 13 หลัก" maxlength="13" style="width: 100%;" />
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label>ชื่อ-นามสกุล</label>
                            <input type="text" id="search-name" class="input-field" placeholder="กรอกชื่อ หรือนามสกุล" style="width: 100%;" />
                        </div>
                    </div>
                    ` : ''}
                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label>เดือน</label>
                            <select id="search-month" class="input-field" style="width: 100%;"><option value="">ทุกเดือน</option></select>
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 200px;">
                            <label>ปี พ.ศ.</label>
                            <select id="search-year" class="input-field" style="width: 100%;"><option value="">ทุกปี</option></select>
                        </div>
                    </div>
                </div>
                <button class="btn btn-dangerous" id="reset-btn"><span>✕</span><span>ล้างผลการค้นหา</span></button>
            </div>

            <div class="results-section">
                <div class="results-header-container">
                    <h2 class="results-header" id="results-header">📋 ผลการค้นหา</h2>
                    <button class="btn-print-all" id="print-all-btn" style="display: none;"><span>🖨️</span><span>พิมพ์ทั้งหมด</span></button>
                </div>
                <div id="loading-container" class="loading-container" style="display: none;"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>
                <div id="error-container" class="error-message" style="display: none;"></div>
                <div id="no-results" class="no-results" style="display: none;">
                    <div class="no-results-icon">🔍</div><h3>ไม่พบข้อมูล</h3><p>กรุณาลองค้นหาใหม่</p>
                </div>
                <div id="main-content-area"></div>
            </div>
        </div>

        <style>
            /* Info Box for USER */
            .dropdown-info-box {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 12px;
                margin: 10px 0;
                border-radius: 4px;
                display: flex;
                gap: 10px;
                align-items: flex-start;
            }

            .info-icon {
                font-size: 1.2em;
                flex-shrink: 0;
            }

            .info-text {
                font-size: 0.85em;
                color: #1565c0;
                line-height: 1.4;
            }

            /* Badge Styles */
            .badge-admin {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.75em;
                font-weight: 600;
            }

            .badge-user {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.75em;
                font-weight: 600;
            }
        </style>
    `;

    setupEventListeners(isAdmin);
    fetchAvailableFilters();
    fetchSalaryData();
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
function setupEventListeners(isAdmin) {
    const safeOn = (id, evt, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); };

    // ปุ่มเพิ่มข้อมูล (เฉพาะ Admin)
    if (isAdmin) {
        safeOn('add-new-btn', 'click', () => router.navigate('/addsalary'));
        safeOn('dashboard-btn', 'click', () => router.navigate('/dashboard'));
    }

    safeOn('logout-btn', 'click', () => Auth.logout());

    const pBtn = document.getElementById('profile-button');
    const pDrop = document.getElementById('profile-dropdown');
    if (pBtn && pDrop) {
        pBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pDrop.style.display = pDrop.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#profile-section')) pDrop.style.display = 'none';
        });
    }

    let timeout;
    const runSearch = () => {
        const f = {};

        // Admin ค้นหาได้ทั้ง CID และชื่อ
        if (isAdmin) {
            const cid = document.getElementById('search-cid');
            const name = document.getElementById('search-name');
            if (cid?.value) f.cid = cid.value;
            if (name?.value) f.name = name.value;
        }

        // ทุกคนค้นหาได้เดือน/ปี
        const m = document.getElementById('search-month');
        const y = document.getElementById('search-year');
        if (m?.value) f.month = m.value;
        if (y?.value) f.year = y.value;

        currentPage = 1;
        fetchSalaryData(f);
    };

    // กำหนด search fields ตามสิทธิ์
    const searchFields = isAdmin
        ? ['search-cid', 'search-name', 'search-month', 'search-year']
        : ['search-month', 'search-year'];

    searchFields.forEach(id => {
        safeOn(id, 'input', () => { clearTimeout(timeout); timeout = setTimeout(runSearch, 300); });
    });

    safeOn('reset-btn', 'click', () => {
        searchFields.forEach(id => {
            if (document.getElementById(id)) document.getElementById(id).value = '';
        });
        runSearch();
    });

    safeOn('print-all-btn', 'click', async () => {
        if (!results.length) return alert('ไม่มีข้อมูล');

        // ดึงเดือน/ปีจาก filter ปัจจุบัน
        const monthSelect = document.getElementById('search-month');
        const yearSelect = document.getElementById('search-year');

        const filters = {};
        if (monthSelect?.value) filters.month = monthSelect.value;
        if (yearSelect?.value) filters.year = yearSelect.value;

        // ถ้าเป็น Admin และมีการกรอก CID หรือชื่อ ให้เพิ่มเข้าไป
        if (isAdmin) {
            const cidInput = document.getElementById('search-cid');
            const nameInput = document.getElementById('search-name');
            if (cidInput?.value) filters.cid = cidInput.value;
            if (nameInput?.value) filters.name = nameInput.value;
        }

        // ⭐ ดึงข้อมูลใหม่พร้อมค่าน้ำ-ไฟ
        const fullData = await fetchEmployeesWithUtilities(filters);

        if (fullData.length > 0) {
            sessionStorage.setItem('printEmployees', JSON.stringify(fullData));
            router.navigate('/salaryslip');
        } else {
            alert('ไม่สามารถดึงข้อมูลได้');
        }
    });

}

// ==========================================
// แก้ไข fetchAvailableFilters()
// ==========================================
async function fetchAvailableFilters() {
    try {
        const user = Auth.getCurrentUser();
        const isAdmin = hasAdminPrivileges(user);

        // สร้าง filters สำหรับดึงข้อมูลที่มีอยู่จริง
        const filterParams = {};

        // ⭐ แก้ไขตรงนี้: ถ้าไม่ใช่ Admin ให้กรองตาม CID ของ user
        if (!isAdmin) {
            const userCID = user.cid || user.idcard || user.ref_l_id;
            if (userCID) {
                filterParams.user_cid = userCID;
            }
        }
        // ⭐ ถ้าเป็น Admin ไม่ส่ง user_cid ไปเลย

        const data = await API.get('available-filters', filterParams);
        if (data.status === 'success') {
            const mSel = document.getElementById('search-month');
            const ySel = document.getElementById('search-year');

            // เคลียร์ options เดิม (เหลือแต่ตัวเลือก "ทุกเดือน" และ "ทุกปี")
            if (mSel) {
                mSel.innerHTML = '<option value="">ทุกเดือน</option>';
                (data.months || []).forEach(m => {
                    const o = document.createElement('option');
                    o.value = m.value;
                    o.textContent = m.label;
                    mSel.appendChild(o);
                });
            }

            if (ySel) {
                ySel.innerHTML = '<option value="">ทุกปี</option>';
                (data.years || []).forEach(y => {
                    const o = document.createElement('option');
                    o.value = y;
                    o.textContent = y;
                    ySel.appendChild(o);
                });
            }
        }
    } catch (e) {
        console.error('Error fetching filters:', e);
    }
}

// ==========================================
// แก้ไข fetchSalaryData()
// ==========================================
async function fetchSalaryData(filters = {}) {
    const loader = document.getElementById('loading-container');
    const errBox = document.getElementById('error-container');
    const content = document.getElementById('main-content-area');

    if (!loader) return;

    loader.style.display = 'block';
    if (errBox) errBox.style.display = 'none';
    if (content) content.innerHTML = '';

    try {
        const user = Auth.getCurrentUser();
        const isAdmin = hasAdminPrivileges(user);
        const userCID = user.cid || user.idcard || user.ref_l_id;

        // ⭐ สร้าง filters object ใหม่เพื่อไม่ให้มี user_cid ติดมา
        const cleanFilters = { ...filters };

        if (!isAdmin) {
            // USER MODE
            if (!userCID) {
                throw new Error('ไม่พบเลขประจำตัวประชาชน\nกรุณาติดต่อผู้ดูแลระบบ');
            }

            // ลบ cid, name ออก
            delete cleanFilters.cid;
            delete cleanFilters.name;

            // เพิ่ม user_cid
            cleanFilters.user_cid = userCID;

        } else {
            // ADMIN MODE - ต้องลบ user_cid ออกอย่างชัดเจน
            delete cleanFilters.user_cid;
        }

        const data = await API.get('salary-data', cleanFilters);

        if (data.status === 'success') {
            results = data.data || [];
            // Double check (เฉพาะ USER)
            if (!isAdmin && userCID) {
                results = results.filter(row => row.cid === userCID);
            }

            renderContent();
        } else {
            throw new Error(data.message || data.error || 'เกิดข้อผิดพลาด');
        }
    } catch (err) {
        console.error('❌ Error:', err);
        if (errBox) {
            errBox.style.display = 'block';
            errBox.innerHTML = `<span>⚠️</span> ${err.message}`;
        }
        results = [];
        renderContent();
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

// ==========================================
// 3. RENDER CONTENT (TABLE + PAGINATION)
// ==========================================
function renderContent() {
    const container = document.getElementById('main-content-area');
    const noResults = document.getElementById('no-results');
    const header = document.getElementById('results-header');
    const printBtn = document.getElementById('print-all-btn');

    if (!container) return;

    // อัปเดตจำนวนรายการ
    if (header) header.innerHTML = `📋 ผลการค้นหา (พบ ${results.length} รายการ)`;

    // กรณีไม่มีข้อมูล
    if (results.length === 0) {
        if (noResults) noResults.style.display = 'block';
        if (printBtn) printBtn.style.display = 'none';

        container.innerHTML = `
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 0.9em;">
                แสดงรายการที่ 0 ถึง 0 จากทั้งหมด 0 รายการ
            </div>
        `;
        return;
    }

    // กรณีมีข้อมูล
    if (noResults) noResults.style.display = 'none';
    if (printBtn) printBtn.style.display = 'block';

    const totalPages = Math.ceil(results.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentData = results.slice(start, end);

    let html = `
        <table class="salary-table" style="width:100%; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th>ลำดับ</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>เลขประจำตัว</th>
                    <th>บัญชี</th>
                    <th>เดือน/ปี</th>
                    <th>รับ</th>
                    <th>จ่าย</th>
                    <th>คงเหลือ</th>
                    <th>พิมพ์</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentData.forEach((row, i) => {
        html += `
            <tr>
                <td>${start + i + 1}</td>
                <td>${row.name || '-'}</td>
                <td>${row.cid || '-'}</td>
                <td>${row.bank_account || '-'}</td>
                <td>${Utils.getThaiMonthName(row.month)} ${row.year || ''}</td>
                <td class="text-green">${Utils.formatCurrency(row.total_income)}</td>
                <td class="text-red">${Utils.formatCurrency(row.total_expense)}</td>
                <td class="text-blue text-bold">${Utils.formatCurrency(row.net_balance)}</td>
                <td><button class="action-btn" onclick="printEmployee(${start + i})">🖨️</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;

    // --- PAGINATION ---
    let range = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
        if (currentPage <= 4) range = [1, 2, 3, 4, 5, '...', totalPages];
        else if (currentPage >= totalPages - 3) range = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        else range = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }

    html += `
        <div class="pagination-wrapper" style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 20px; padding-bottom: 40px;">
            <div style="display: flex; justify-content: center; gap: 6px; align-items: center; flex-wrap: wrap;">
                <button class="pagination-btn text-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(1)">หน้าแรก</button>
                <button class="pagination-btn text-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">ก่อนหน้า</button>
    `;

    range.forEach(p => {
        if (p === '...') {
            html += `<span class="page-dots">...</span>`;
        } else {
            const isActive = (p === currentPage) ? 'active' : '';
            html += `<button class="pagination-btn number-btn ${isActive}" onclick="goToPage(${p})">${p}</button>`;
        }
    });

    html += `
                <button class="pagination-btn text-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">ถัดไป</button>
                <button class="pagination-btn text-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})">หน้าสุดท้าย</button>
            </div>

            <div style="font-size: 0.9em; color: #666; text-align: center;">
                แสดงรายการที่ ${start + 1} ถึง ${Math.min(end, results.length)} จากทั้งหมด ${results.length} รายการ
            </div>
        </div>
    `;

    container.innerHTML = html;
}

window.goToPage = function (p) {
    if (p < 1) p = 1;
    currentPage = p;
    renderContent();
    const section = document.querySelector('.results-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.printEmployee = async function (index) {
    if (!results[index]) return;

    const employee = results[index];

    // ดึงข้อมูลใหม่พร้อมค่าน้ำ-ไฟ
    const filters = {
        cid: employee.cid,
        month: employee.month,
        year: employee.year
    };

    const fullData = await fetchEmployeesWithUtilities(filters);

    if (fullData.length > 0) {
        sessionStorage.setItem('printEmployees', JSON.stringify(fullData));
        router.navigate('/salaryslip');
    } else {
        alert('ไม่สามารถดึงข้อมูลได้');
    }
};