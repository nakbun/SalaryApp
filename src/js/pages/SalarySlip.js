// Salary Slip Page
let employees = [];
let slipCurrentPage = 1;
let selectedEmployee = null;
let showModal = false;
let slipItemsPerPage = window.innerWidth <= 768 ? 6 : 9;

window.renderSalarySlip = function() {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    const employeesStr = sessionStorage.getItem('printEmployees');
    if (!employeesStr) {
        router.navigate('/home', true);
        return;
    }
    
    employees = JSON.parse(employeesStr);
    
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="print-container">
            <div class="print-actions no-print">
                <button class="btn-back" onclick="router.navigate('/home', true)">HOME</button>
                <div class="page-info" id="page-info"></div>
                <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ทั้งหมด</button>
            </div>
            <div id="pagination-controls" class="pagination-controls no-print"></div>
            <div class="print-page screen-only">
                <div class="page-number no-print" id="page-number"></div>
                <div class="slips-grid" id="slips-grid"></div>
            </div>
            <div class="print-all-pages" id="print-all-pages"></div>
            <div id="pagination-controls-bottom" class="pagination-controls no-print"></div>
            <div id="modal-overlay" class="modal-overlay no-print" style="display: none;" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    <div class="modal-slip-wrapper" id="modal-slip-wrapper"></div>
                </div>
            </div>
        </div>
    `;
    
    window.addEventListener('resize', () => {
        slipItemsPerPage = window.innerWidth <= 768 ? 6 : 9;
        renderSlips();
    });
    
    renderSlips();
    renderPrintPages();
}

function renderSlips() {
    const totalPages = Math.ceil(employees.length / slipItemsPerPage);
    const startIndex = (slipCurrentPage - 1) * slipItemsPerPage;
    const endIndex = Math.min(startIndex + slipItemsPerPage, employees.length);
    const currentEmployees = employees.slice(startIndex, endIndex);
    
    document.getElementById('page-info').textContent = 
        `รายการทั้งหมด: ${employees.length} | จำนวนหน้า: ${totalPages}`;
    document.getElementById('page-number').textContent = `หน้า ${slipCurrentPage} / ${totalPages}`;
    
    const slipsGrid = document.getElementById('slips-grid');
    slipsGrid.innerHTML = currentEmployees.map((employee, index) => 
        createSlipCard(employee, true)
    ).join('') + 
    Array.from({ length: slipItemsPerPage - currentEmployees.length }, (_, i) => 
        `<div class="salary-slip-mini empty-slot"></div>`
    ).join('');
    
    renderPagination(totalPages, startIndex, endIndex);
}

function renderPrintPages() {
    const ITEMS_PER_PAGE_PRINT = 2;
    const totalPrintPages = Math.ceil(employees.length / ITEMS_PER_PAGE_PRINT);
    const printAllPages = document.getElementById('print-all-pages');
    
    printAllPages.innerHTML = Array.from({ length: totalPrintPages }, (_, pageIndex) => {
        const pageStartIndex = pageIndex * ITEMS_PER_PAGE_PRINT;
        const pageEndIndex = Math.min(pageStartIndex + ITEMS_PER_PAGE_PRINT, employees.length);
        const pageEmployees = employees.slice(pageStartIndex, pageEndIndex);
        
        return `
            <div class="print-page print-mode">
                <div class="slips-grid">
                    ${pageEmployees.map(employee => createSlipCard(employee, false)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function createSlipCard(employee, showExpandButton) {
    return `
        <div class="salary-slip-mini horizontal-layout">
            ${showExpandButton ? `
                <button class="expand-btn no-print" onclick="openModal(${employees.indexOf(employee)})" title="ขยายเต็มหน้าจอ">
                    ⛶
                </button>
            ` : ''}
            <div class="slip-header-mini">
                <div class="hospital-logo-mini">
                    <img src="/SalaryApp/public/img/image-Photoroom (1).png" alt="Logo" />
                </div>
                <div class="hospital-info-mini">
                    <h2>โรงพยาบาลจิตเวชเลยราชนครินทร์</h2>
                    <p>ใบแจ้งรายการเงินเดือน</p>
                </div>
            </div>
            <div class="slip-body-mini">
                <div class="employee-info-mini">
                    <div class="info-row-mini">
                        <span class="label-mini">ชื่อ:</span>
                        <span class="value-mini">${employee.name || '-'}</span>
                    </div>
                    <div class="info-row-mini">
                        <span class="label-mini">ประเภท:</span>
                        <span class="value-mini">${employee.employee || '-'}</span>
                    </div>
                    <div class="info-row-mini">
                        <span class="label-mini">เลขประจำตัว:</span>
                        <span class="value-mini">${employee.cid || '-'}</span>
                    </div>
                    <div class="info-row-mini">
                        <span class="label-mini">บัญชี:</span>
                        <span class="value-mini">${employee.bank_account || '-'}</span>
                    </div>
                    <div class="info-row-mini">
                        <span class="label-mini">เดือน/ปี:</span>
                        <span class="value-mini">${Utils.getThaiMonthName(employee.month)} ${employee.year}</span>
                    </div>
                </div>
                <div class="salary-details-mini">
                    <div class="detail-row-mini income">
                        <span>รายรับ:</span>
                        <span class="amount-mini">${Utils.formatCurrency(employee.total_income)}</span>
                    </div>
                    <div class="detail-row-mini expense">
                        <span>รายจ่าย:</span>
                        <span class="amount-mini">${Utils.formatCurrency(employee.total_expense)}</span>
                    </div>
                    <div class="net-balance-mini">
                        <span>เงินได้สุทธิ:</span>
                        <span class="net-amount-mini">${Utils.formatCurrency(employee.net_balance)}</span>
                    </div>
                </div>
            </div>
            <div class="slip-footer-mini">
                <p>พิมพ์: ${Utils.formatDate()}</p>
            </div>
        </div>
    `;
}

window.openModal = function(index) {
    selectedEmployee = employees[index];
    showModal = true;
    document.body.style.overflow = 'hidden';
    
    const modalOverlay = document.getElementById('modal-overlay');
    const modalSlipWrapper = document.getElementById('modal-slip-wrapper');
    
    modalOverlay.style.display = 'flex';
    modalSlipWrapper.innerHTML = createSlipCard(selectedEmployee, false);
};

window.closeModal = function() {
    showModal = false;
    selectedEmployee = null;
    document.body.style.overflow = 'auto';
    document.getElementById('modal-overlay').style.display = 'none';
};

function renderPagination(totalPages, startIndex, endIndex) {
    const container = document.getElementById('pagination-controls');
    const containerBottom = document.getElementById('pagination-controls-bottom');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        containerBottom.innerHTML = '';
        return;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, slipCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    const paginationHTML = `
        <button class="btn-page" ${slipCurrentPage === 1 ? 'disabled' : ''} onclick="goToPageSlip(1)">หน้าแรก</button>
        <button class="btn-page" ${slipCurrentPage === 1 ? 'disabled' : ''} onclick="goToPageSlip(${slipCurrentPage - 1})">ก่อนหน้า</button>
        <div class="page-numbers">
            ${startPage > 1 ? `
                <button class="btn-page-number" onclick="goToPageSlip(1)">1</button>
                ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ''}
            ` : ''}
            ${Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => `
                <button class="btn-page-number ${slipCurrentPage === page ? 'active' : ''}" onclick="goToPageSlip(${page})">
                    ${page}
                </button>
            `).join('')}
            ${endPage < totalPages ? `
                ${endPage < totalPages - 1 ? '<span class="pagination-dots">...</span>' : ''}
                <button class="btn-page-number" onclick="goToPageSlip(${totalPages})">${totalPages}</button>
            ` : ''}
        </div>
        <button class="btn-page" ${slipCurrentPage === totalPages ? 'disabled' : ''} onclick="goToPageSlip(${slipCurrentPage + 1})">ถัดไป</button>
        <button class="btn-page" ${slipCurrentPage === totalPages ? 'disabled' : ''} onclick="goToPageSlip(${totalPages})">หน้าสุดท้าย</button>
        <div class="pagination-info">
            หน้า ${slipCurrentPage} จาก ${totalPages} (แสดง ${startIndex + 1}-${endIndex} จาก ${employees.length} รายการ)
        </div>
    `;
    
    container.innerHTML = paginationHTML;
    containerBottom.innerHTML = paginationHTML;
}

window.goToPageSlip = function(page) {
    slipCurrentPage = page;
    renderSlips();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};


