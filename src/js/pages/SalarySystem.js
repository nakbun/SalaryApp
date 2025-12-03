// SalarySystem.js (Final Polish: Pagination Text)

let currentPage = 1;
let results = [];
let availableMonths = [];
let availableYears = [];
const itemsPerPage = 20;

// ==========================================
// 1. MAIN RENDER FUNCTION
// ==========================================
window.renderSalarySystem = function () {
    const user = Auth.getCurrentUser();
    if (!user) { router.navigate('/', true); return; }

    const root = document.getElementById('root');
    if (!root) return;

    // โครงสร้าง HTML หลัก
    root.innerHTML = `
        <div class="container">
            <div class="header">
                <div class="header-left">
                    <img src="/SalaryApp/public/img/image-Photoroom (1).png" alt="Logo" class="logo" />
                    <h1 class="hospital-name">โรงพยาบาลจิตเวชเลยราชนครินทร์</h1>
                </div>
                <div class="header-right">
                    <button class="btn btn-green" id="add-new-btn">✚ เพิ่มข้อมูล</button>
                    <div class="profile-section" id="profile-section">
                        <button class="profile-button" id="profile-button">
                            <div class="profile-avatar">👤</div>
                            <div class="profile-info"><div class="profile-cid">CID: ${user.cid}</div><div class="profile-name">${user.name}</div></div>
                            <span class="profile-dropdown-icon">▼</span>
                        </button>
                        <div class="profile-dropdown" id="profile-dropdown" style="display: none;">
                            <div class="dropdown-header"><div class="dropdown-avatar">👤</div><div class="dropdown-name">${user.name}</div><div class="dropdown-position">ผู้ใช้งาน</div></div>
                            <div class="dropdown-body">
                                <div class="dropdown-item"><span>CID: ${user.cid}</span></div>
                                <div class="dropdown-divider"></div>
                                <div class="dropdown-item dropdown-logout" id="logout-btn"><span>ออกจากระบบ</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="search-section full-width">
                <h2 class="section-title"><span>🔍</span><span>ค้นหาข้อมูลเงินเดือน</span></h2>
                <div class="search-inputs-container">
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
                <div class="tab-buttons">
                    <button class="tab-btn active" data-tab="all">ทั้งหมด</button>
                    <button class="tab-btn" data-tab="government">ข้าราชการ</button>
                    <button class="tab-btn" data-tab="employee">ลูกจ้างเงินเดือน</button>
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
    `;

    setupEventListeners();
    fetchAvailableFilters();
    fetchSalaryData();
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
function setupEventListeners() {
    const safeOn = (id, evt, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); };

    safeOn('add-new-btn', 'click', () => router.navigate('/addsalary'));
    safeOn('logout-btn', 'click', () => Auth.logout());

    const pBtn = document.getElementById('profile-button');
    const pDrop = document.getElementById('profile-dropdown');
    if (pBtn && pDrop) {
        pBtn.addEventListener('click', (e) => { e.stopPropagation(); pDrop.style.display = pDrop.style.display === 'block' ? 'none' : 'block'; });
        document.addEventListener('click', (e) => { if (!e.target.closest('#profile-section')) pDrop.style.display = 'none'; });
    }

    let timeout;
    const runSearch = () => {
        const f = {};
        const cid = document.getElementById('search-cid'), name = document.getElementById('search-name'),
            m = document.getElementById('search-month'), y = document.getElementById('search-year');
        if (cid?.value) f.cid = cid.value;
        if (name?.value) f.name = name.value;
        if (m?.value) f.month = m.value;
        if (y?.value) f.year = y.value;

        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const t = activeTab.dataset.tab;
            if (t === 'government') f.employee = 'ข้าราชการ';
            if (t === 'employee') f.employee = 'ลูกจ้างเงินเดือน';
        }
        currentPage = 1;
        fetchSalaryData(f);
    };

    ['search-cid', 'search-name', 'search-month', 'search-year'].forEach(id => {
        safeOn(id, 'input', () => { clearTimeout(timeout); timeout = setTimeout(runSearch, 300); });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            runSearch();
        });
    });

    safeOn('reset-btn', 'click', () => {
        ['search-cid', 'search-name', 'search-month', 'search-year'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const all = document.querySelector('.tab-btn[data-tab="all"]');
        if (all) all.classList.add('active');
        runSearch();
    });

    safeOn('print-all-btn', 'click', () => {
        if (!results.length) return alert('ไม่มีข้อมูล');
        sessionStorage.setItem('printEmployees', JSON.stringify(results));
        router.navigate('/salaryslip');
    });
}

async function fetchAvailableFilters() {
    try {
        const data = await API.get('available-filters');
        if (data.status === 'success') {
            const mSel = document.getElementById('search-month');
            const ySel = document.getElementById('search-year');
            if (mSel) (data.months || []).forEach(m => { const o = document.createElement('option'); o.value = m.value; o.textContent = m.label; mSel.appendChild(o); });
            if (ySel) (data.years || []).forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; ySel.appendChild(o); });
        }
    } catch (e) { console.error(e); }
}

async function fetchSalaryData(filters = {}) {
    const loader = document.getElementById('loading-container');
    const errBox = document.getElementById('error-container');
    const content = document.getElementById('main-content-area');

    if (!loader) return;

    loader.style.display = 'block';
    if (errBox) errBox.style.display = 'none';
    if (content) content.innerHTML = '';

    try {
        const data = await API.get('salary-data', filters);
        if (data.status === 'success') {
            results = data.data || [];
            renderContent();
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        if (errBox) { errBox.style.display = 'block'; errBox.innerHTML = `<span>⚠️</span> ${err.message}`; }
        results = [];
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

// ==========================================
// 3. RENDER CONTENT (TABLE + PAGINATION)
// ==========================================
// ในไฟล์ SalarySystem.js

function renderContent() {
    const container = document.getElementById('main-content-area');
    const noResults = document.getElementById('no-results');
    const header = document.getElementById('results-header');
    const printBtn = document.getElementById('print-all-btn');
    
    if(!container) return;

    // 🔴 1. อัปเดตจำนวนรายการทันที (ไว้บนสุดเลย เพื่อให้เลขเปลี่ยนเสมอ)
    if(header) header.innerHTML = `📋 ผลการค้นหา (พบ ${results.length} รายการ)`;

    // 2. กรณีไม่มีข้อมูล (0 รายการ)
    if (results.length === 0) {
        if(noResults) noResults.style.display = 'block';
        if(printBtn) printBtn.style.display = 'none';
        
        // แสดงข้อความ 0 ถึง 0 ให้ชัดเจน
        container.innerHTML = `
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 0.9em;">
                แสดงรายการที่ 0 ถึง 0 จากทั้งหมด 0 รายการ
            </div>
        `;
        return;
    }

    // 3. กรณีมีข้อมูล
    if(noResults) noResults.style.display = 'none';
    if(printBtn) printBtn.style.display = 'block';

    const totalPages = Math.ceil(results.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentData = results.slice(start, end);

    let html = `
        <table class="salary-table" style="width:100%; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th>ลำดับ</th><th>ชื่อ-นามสกุล</th><th>ประเภท</th>
                    <th>เลขประจำตัว</th><th>บัญชี</th><th>เดือน/ปี</th>
                    <th>รับ</th><th>จ่าย</th><th>คงเหลือ</th><th>พิมพ์</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentData.forEach((row, i) => {
        let badgeClass = 'badge-gray';
        const type = (row.employee || '').trim();
        if (type === 'ข้าราชการ') badgeClass = 'badge-government';
        else if (type === 'ลูกจ้างเงินเดือน' || type === 'ลูกจ้าง') badgeClass = 'badge-employee';

        html += `
            <tr>
                <td>${start + i + 1}</td>
                <td>${row.name||'-'}</td>
                <td><span class="badge ${badgeClass}">${row.employee||'ไม่ระบุ'}</span></td>
                <td>${row.cid||'-'}</td>
                <td>${row.bank_account||'-'}</td>
                <td>${Utils.getThaiMonthName(row.month)} ${row.year||''}</td>
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
                <button class="pagination-btn text-btn" ${currentPage===1?'disabled':''} onclick="goToPage(1)">หน้าแรก</button>
                <button class="pagination-btn text-btn" ${currentPage===1?'disabled':''} onclick="goToPage(${currentPage-1})">ก่อนหน้า</button>
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
                <button class="pagination-btn text-btn" ${currentPage===totalPages?'disabled':''} onclick="goToPage(${currentPage+1})">ถัดไป</button>
                <button class="pagination-btn text-btn" ${currentPage===totalPages?'disabled':''} onclick="goToPage(${totalPages})">หน้าสุดท้าย</button>
            </div>

            <div style="font-size: 0.9em; color: #666; text-align: center;">
                แสดงรายการที่ ${start+1} ถึง ${Math.min(end, results.length)} จากทั้งหมด ${results.length} รายการ
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

window.printEmployee = function (index) {
    if (results[index]) {
        sessionStorage.setItem('printEmployees', JSON.stringify([results[index]]));
        router.navigate('/salaryslip');
    }
};