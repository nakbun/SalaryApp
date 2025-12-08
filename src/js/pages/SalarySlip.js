const API_URL = 'slip.php';
let employees = [];
let slipCurrentPage = 1;
let selectedEmployee = null;
let showModal = false;
let slipItemsPerPage = window.innerWidth <= 768 ? 6 : 9;

const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Get employees from URL params
const urlParams = new URLSearchParams(window.location.search);
const month = urlParams.get('month') || new Date().getMonth() + 1;
const year = urlParams.get('year') || (new Date().getFullYear() + 543);

function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate() {
    const now = new Date();
    const day = now.getDate();
    const month = thaiMonths[now.getMonth()];
    const year = now.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

// Load employees on page load
window.addEventListener('DOMContentLoaded', async function () {
    await loadEmployees();

    window.addEventListener('resize', () => {
        slipItemsPerPage = window.innerWidth <= 768 ? 6 : 9;
        renderSlips();
    });
});

async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}?action=get_employees&month=${month}&year=${year}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            employees = result.data;
            renderSlips();
            renderPrintPages();
        } else {
            document.getElementById('slips-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280;">ไม่พบข้อมูล</div>';
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        document.getElementById('slips-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">เกิดข้อผิดพลาด: ' + error.message + '</div>';
    }
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
    const monthName = thaiMonths[parseInt(month) - 1];
    
    // สร้างแถวทั้งหมด โดยเติมช่องว่างถ้าจำนวนรายการไม่เท่ากัน
    const maxRows = Math.max(employee.incomes.length, employee.expenses.length);
    let combinedRows = '';
    
    for (let i = 0; i < 15; i++) { // กำหนดแถวสูงสุด 15 แถวตามสลิปตัวอย่าง
        const incomeItem = employee.incomes[i];
        const expenseItem = employee.expenses[i];
        
        // รายรับ
        const incomeSeq = incomeItem ? (i + 1) : '';
        const incomeLabel = incomeItem ? incomeItem.label : '';
        const incomeAmount = incomeItem ? formatCurrency(incomeItem.value) : '';

        // รายจ่าย (ลำดับที่ของรายจ่ายจะเริ่มนับใหม่ 1, 2, 3...)
        const expenseSeq = expenseItem ? (i + 1) : '';
        const expenseLabel = expenseItem ? expenseItem.label : '';
        const expenseAmount = expenseItem ? formatCurrency(expenseItem.value) : '';
        // เนื่องจากไม่มีข้อมูลหมายเหตุใน data base เราจะเว้นว่างไว้
        const expenseNote = '';
        
        if (!incomeItem && !expenseItem && i >= maxRows) {
            // หยุดสร้างแถวว่าง ถ้าเกินจำนวนแถวที่มีข้อมูลจริงแล้ว
            // แต่เนื่องจากเรากำหนดให้วน 15 รอบเพื่อให้มีพื้นที่ว่างคล้ายสลิปจริง เราอาจจะปล่อยให้วนต่อไป
        }

        combinedRows += `
            <tr class="detail-row">
                <td class="col-seq income-seq">${incomeSeq}</td>
                <td class="col-label income-label">${incomeLabel}</td>
                <td class="col-amount income-amount">${incomeAmount}</td>
                
                <td class="col-seq expense-seq">${expenseSeq}</td>
                <td class="col-label expense-label">${expenseLabel}</td>
                <td class="col-amount expense-amount">${expenseAmount}</td>
                <td class="col-note expense-note">${expenseNote}</td>
            </tr>
        `;
    }

    return `
        <div class="salary-slip-mini horizontal-layout">
            ${showExpandButton ? `
                <button class="expand-btn no-print" onclick="openModal(${employees.indexOf(employee)})" title="ขยายเต็มหน้าจอ">
                    ⛶
                </button>
            ` : ''}
            
            <div class="slip-header-mini">
                <div class="hospital-info-mini" style="width: 100%; text-align: center; padding: 0 40px;">
                    <p style="font-size: 10px; margin: 0; font-weight: 500;">
                         <img src="https://example.com/hospital_logo.png" style="width: 20px; vertical-align: middle; margin-right: 5px;"/>
                         โรงพยาบาลจิตเวชเลยราชนครินทร์
                    </p>
                    <p style="font-size: 11px; font-weight: 700; color: #000; margin: 2px 0;">
                        รายการแจ้งยอดเงินเดือนข้าราชการ
                    </p>
                    <p style="font-size: 9px; margin: 0;">ประจำเดือน ${monthName} ${year}</p>
                    
                    <div class="employee-header-info">
                        <span class="info-item">ชื่อ - สกุล: <strong>${employee.name || '-'}</strong></span>
                        <span class="info-item">เลขที่บัญชี: <strong>${employee.bank_account || '-'}</strong></span>
                        <span class="info-item">ประเภท: <strong>${employee.employee_type || '-'}</strong></span>
                    </div>
                </div>
            </div>
            
            <div class="slip-body-mini" style="display: block; padding: 5px;">
                <table class="slip-table">
                    <thead>
                        <tr>
                            <th colspan="3" class="header-income">รายรับ</th>
                            <th colspan="4" class="header-expense">รายจ่าย</th>
                        </tr>
                        <tr>
                            <th class="col-seq">ลำดับที่</th>
                            <th class="col-label">รายการ</th>
                            <th class="col-amount">จำนวนเงิน</th>
                            <th class="col-seq">ลำดับที่</th>
                            <th class="col-label">รายการ</th>
                            <th class="col-amount">จำนวนเงิน</th>
                            <th class="col-note">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${combinedRows}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="2" class="col-label total-label">รวมรับ:</td>
                            <td class="col-amount total-amount-val">${formatCurrency(employee.total_income)}</td>
                            <td colspan="3" class="col-label total-label">รวมจ่าย:</td>
                            <td class="col-amount total-amount-val">${formatCurrency(employee.total_expense)}</td>
                            <td class="col-note total-note"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="net-balance-footer-wrapper">
                <div class="net-balance-mini">
                    <div style="font-size: 8px;">เงินได้สุทธิ</div>
                    <div class="net-amount-mini">${formatCurrency(employee.net_balance)}</div>
                </div>
                <div class="slip-footer-mini">
                    <p>พิมพ์: ${formatDate()}</p>
                </div>
            </div>
        </div>
    `;
}

function openModal(index) {
    selectedEmployee = employees[index];
    showModal = true;
    document.body.style.overflow = 'hidden';

    const modalOverlay = document.getElementById('modal-overlay');
    const modalSlipWrapper = document.getElementById('modal-slip-wrapper');

    modalOverlay.style.display = 'flex';
    modalSlipWrapper.innerHTML = createSlipCard(selectedEmployee, false);
}

function closeModal() {
    showModal = false;
    selectedEmployee = null;
    document.body.style.overflow = 'auto';
    document.getElementById('modal-overlay').style.display = 'none';
}

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

function goToPageSlip(page) {
    slipCurrentPage = page;
    renderSlips();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}