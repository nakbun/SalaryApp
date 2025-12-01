// Salary System Page
let currentPage = 1;
let results = [];
let availableMonths = [];
let availableYears = [];
const itemsPerPage = 20;

window.renderSalarySystem = function() {
    const user = Auth.getCurrentUser();
    if (!user) {
        router.navigate('/', true);
        return;
    }
    
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div class="header">
                <div class="header-left">
                    <img src="/SalaryApp/public/img/image-Photoroom (1).png" alt="Hospital Logo" class="logo" />
                    <h1 class="hospital-name">โรงพยาบาลจิตเวชเลยราชนครินทร์</h1>
                </div>
                <div class="header-right">
                    <button class="btn btn-green" id="add-new-btn">✚ เพิ่มข้อมูล</button>
                    <div class="profile-section" id="profile-section">
                        <button class="profile-button" id="profile-button">
                            <div class="profile-avatar">👤</div>
                            <div class="profile-info">
                                <div class="profile-cid">CID: ${user.cid}</div>
                                <div class="profile-name">${user.name}</div>
                            </div>
                            <span class="profile-dropdown-icon">▼</span>
                        </button>
                        <div class="profile-dropdown" id="profile-dropdown" style="display: none;">
                            <div class="dropdown-header">
                                <div class="dropdown-avatar">👤</div>
                                <div class="dropdown-name">${user.name}</div>
                                <div class="dropdown-position">ผู้ใช้งาน</div>
                            </div>
                            <div class="dropdown-body">
                                <div class="dropdown-item">
                                    <span>CID: ${user.cid}</span>
                                </div>
                                <div class="dropdown-divider"></div>
                                <div class="dropdown-item dropdown-logout" id="logout-btn">
                                    <span>ออกจากระบบ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="search-section full-width">
                <h2 class="section-title">
                    <span>🔍</span>
                    <span>ค้นหาข้อมูลเงินเดือน</span>
                </h2>
                <div class="form-grid">
                    <div class="form-group">
                        <label>เลขประจำตัว</label>
                        <input type="text" id="search-cid" class="input-field" placeholder="กรอก 13 หลัก" maxlength="13" />
                    </div>
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล</label>
                        <input type="text" id="search-name" class="input-field" placeholder="กรอกชื่อหรือนามสกุล" />
                    </div>
                    <div class="form-group">
                        <label>เดือน</label>
                        <select id="search-month" class="input-field">
                            <option value="">ทุกเดือน</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>ปี พ.ศ.</label>
                        <select id="search-year" class="input-field">
                            <option value="">ทุกปี</option>
                        </select>
                    </div>
                </div>
                <div class="tab-buttons">
                    <button class="tab-btn active" data-tab="all">ทั้งหมด</button>
                    <button class="tab-btn" data-tab="government">ข้าราชการ</button>
                    <button class="tab-btn" data-tab="employee">ลูกจ้างเงินเดือน</button>
                </div>
                <button class="btn btn-dangerous" id="reset-btn">
                    <span>✕</span>
                    <span>ล้างผลการค้นหา</span>
                </button>
            </div>
            <div class="results-section">
                <div class="results-header-container">
                    <h2 class="results-header" id="results-header">📋 ผลการค้นหา</h2>
                    <button class="btn-print-all" id="print-all-btn" style="display: none;">
                        <span>🖨️</span>
                        <span>พิมพ์ทั้งหมด</span>
                    </button>
                </div>
                <div id="loading-container" class="loading-container" style="display: none;">
                    <div class="spinner"></div>
                    <p>กำลังโหลดข้อมูล...</p>
                </div>
                <div id="error-container" class="error-message" style="display: none;"></div>
                <div id="no-results" class="no-results" style="display: none;">
                    <div class="no-results-icon">🔍</div>
                    <h3>ไม่พบข้อมูลที่ค้นหา</h3>
                    <p>กรุณาลองค้นหาด้วยเงื่อนไขอื่น หรือเพิ่มข้อมูลใหม่</p>
                </div>
                <div id="table-container" class="table-container" style="display: none;"></div>
                <div id="pagination-container"></div>
            </div>
        </div>
    `;
    
    // Initialize
    let activeTab = 'all';
    let searchTimeout;
    
    // Event listeners
    document.getElementById('add-new-btn').addEventListener('click', () => {
        router.navigate('/addsalary');
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        Auth.logout();
    });
    
    const profileButton = document.getElementById('profile-button');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    profileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = profileDropdown.style.display === 'block';
        profileDropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#profile-section')) {
            profileDropdown.style.display = 'none';
        }
    });
    
    // Search inputs
    const searchCid = document.getElementById('search-cid');
    const searchName = document.getElementById('search-name');
    const searchMonth = document.getElementById('search-month');
    const searchYear = document.getElementById('search-year');
    
    const performSearch = () => {
        const filters = {};
        if (searchCid.value) filters.cid = searchCid.value;
        if (searchName.value) filters.name = searchName.value;
        if (searchMonth.value) filters.month = searchMonth.value;
        if (searchYear.value) filters.year = searchYear.value;
        
        if (activeTab === 'government') {
            filters.employee = 'ข้าราชการ';
        } else if (activeTab === 'employee') {
            filters.employee = 'ลูกจ้างเงินเดือน';
        }
        
        fetchSalaryData(filters);
    };
    
    [searchCid, searchName, searchMonth, searchYear].forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 300);
        });
    });
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            currentPage = 1;
            performSearch();
        });
    });
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        searchCid.value = '';
        searchName.value = '';
        searchMonth.value = '';
        searchYear.value = '';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="all"]').classList.add('active');
        activeTab = 'all';
        currentPage = 1;
        fetchSalaryData();
    });
    
    // Print all button
    document.getElementById('print-all-btn').addEventListener('click', () => {
        if (results.length === 0) {
            alert('ไม่มีข้อมูลให้พิมพ์');
            return;
        }
        sessionStorage.setItem('printEmployees', JSON.stringify(results));
        router.navigate('/salaryslip');
    });
    
    // Load initial data
    fetchAvailableFilters();
    fetchSalaryData();
}

async function fetchAvailableFilters() {
    try {
        const data = await API.get('/api/available-filters');
        if (data.status === 'success') {
            availableMonths = data.months || [];
            availableYears = data.years || [];
            
            const monthSelect = document.getElementById('search-month');
            const yearSelect = document.getElementById('search-year');
            
            availableMonths.forEach(month => {
                const option = document.createElement('option');
                option.value = month.value;
                option.textContent = month.label;
                monthSelect.appendChild(option);
            });
            
            availableYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error fetching filters:', err);
    }
}

async function fetchSalaryData(filters = {}) {
    const loadingContainer = document.getElementById('loading-container');
    const errorContainer = document.getElementById('error-container');
    const noResults = document.getElementById('no-results');
    const tableContainer = document.getElementById('table-container');
    const resultsHeader = document.getElementById('results-header');
    const printAllBtn = document.getElementById('print-all-btn');
    
    if (!loadingContainer || !errorContainer || !noResults || !tableContainer || !resultsHeader || !printAllBtn) {
        console.error('Required elements not found in fetchSalaryData');
        return;
    }
    
    loadingContainer.style.display = 'block';
    errorContainer.style.display = 'none';
    noResults.style.display = 'none';
    tableContainer.style.display = 'none';
    printAllBtn.style.display = 'none';
    
    try {
        const data = await API.get('/api/salary-data', filters);
        
        if (data.status === 'success') {
            results = data.data || [];
            currentPage = 1;
            renderResults();
        } else {
            throw new Error(data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
    } catch (err) {
        if (errorContainer) {
            errorContainer.style.display = 'block';
            errorContainer.innerHTML = `
                <span>⚠️</span>
                <div>
                    <strong>ไม่มีข้อมูล:</strong> ${err.message}
                </div>
            `;
        }
        results = [];
    } finally {
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    }
}

function renderResults() {
    const noResults = document.getElementById('no-results');
    const tableContainer = document.getElementById('table-container');
    const resultsHeader = document.getElementById('results-header');
    const printAllBtn = document.getElementById('print-all-btn');
    const errorContainer = document.getElementById('error-container');
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'all';
    
    if (!noResults || !tableContainer || !resultsHeader || !printAllBtn) {
        console.error('Required elements not found');
        return;
    }
    
    // Hide error container when showing results
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
    
    if (results.length === 0) {
        noResults.style.display = 'block';
        tableContainer.style.display = 'none';
        printAllBtn.style.display = 'none';
        return;
    }
    
    noResults.style.display = 'none';
    tableContainer.style.display = 'block';
    printAllBtn.style.display = 'block';
    
    const tabLabels = {
        'all': 'ทั้งหมด',
        'government': 'ข้าราชการ',
        'employee': 'ลูกจ้างเงินเดือน'
    };
    
    resultsHeader.innerHTML = `📋 ผลการค้นหา - ${tabLabels[activeTab]} (${results.length} รายการ)`;
    
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentResults = results.slice(startIndex, endIndex);
    
    const tableHTML = `
        <table class="salary-table">
            <thead>
                <tr>
                    <th>ลำดับ</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ประเภท</th>
                    <th>เลขประจำตัว</th>
                    <th>เลขที่บัญชี</th>
                    <th>เดือน</th>
                    <th>ปี</th>
                    <th>รวมรับ (บาท)</th>
                    <th>รวมจ่าย (บาท)</th>
                    <th>เงินได้สุทธิ (บาท)</th>
                    <th>พิมพ์</th>
                </tr>
            </thead>
            <tbody>
                ${currentResults.map((employee, index) => `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td>${employee.name || '-'}</td>
                        <td>
                            <span class="badge ${employee.employee === 'ข้าราชการ' ? 'badge-government' : 'badge-employee'}">
                                ${employee.employee || 'ไม่ระบุ'}
                            </span>
                        </td>
                        <td>${employee.cid || '-'}</td>
                        <td>${employee.bank_account || '-'}</td>
                        <td>${Utils.getThaiMonthName(employee.month)}</td>
                        <td>${employee.year || '-'}</td>
                        <td class="text-green">${Utils.formatCurrency(employee.total_income)}</td>
                        <td class="text-red">${Utils.formatCurrency(employee.total_expense)}</td>
                        <td class="text-blue text-bold">${Utils.formatCurrency(employee.net_balance)}</td>
                        <td>
                            <button class="action-btn action-btn-primary" onclick="printEmployee(${startIndex + index})" title="พิมพ์">
                                🖨️
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    if (tableContainer) {
        tableContainer.innerHTML = tableHTML;
    }
    renderPagination(totalPages, startIndex, endIndex);
}

window.printEmployee = function(index) {
    try {
        if (!results || results.length === 0) {
            alert('ไม่มีข้อมูลให้พิมพ์');
            return;
        }
        
        const actualIndex = parseInt(index);
        
        if (isNaN(actualIndex) || actualIndex < 0 || actualIndex >= results.length) {
            alert('ไม่พบข้อมูลที่ต้องการพิมพ์');
            return;
        }
        
        const employee = results[actualIndex];
        if (!employee) {
            alert('ไม่พบข้อมูลที่ต้องการพิมพ์');
            return;
        }
        
        sessionStorage.setItem('printEmployees', JSON.stringify([employee]));
        router.navigate('/salaryslip');
    } catch (err) {
        console.error('Error in printEmployee:', err);
        alert('เกิดข้อผิดพลาดในการพิมพ์: ' + err.message);
    }
};

function renderPagination(totalPages, startIndex, endIndex) {
    const container = document.getElementById('pagination-container');
    
    if (!container) {
        console.error('pagination-container not found');
        return;
    }
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    let paginationHTML = '<div class="pagination">';
    
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(1)">หน้าแรก</button>
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">ก่อนหน้า</button>
    `;
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
    }
    
    for (let page = startPage; page <= endPage; page++) {
        paginationHTML += `
            <button class="pagination-btn ${currentPage === page ? 'active' : ''}" onclick="goToPage(${page})">
                ${page}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">ถัดไป</button>
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})">หน้าสุดท้าย</button>
        <span class="pagination-info">
            หน้า ${currentPage} จาก ${totalPages} (แสดง ${startIndex + 1}-${Math.min(endIndex, results.length)} จาก ${results.length} รายการ)
        </span>
    </div>
    `;
    
    container.innerHTML = paginationHTML;
}

window.goToPage = function(page) {
    currentPage = page;
    renderResults();
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};


