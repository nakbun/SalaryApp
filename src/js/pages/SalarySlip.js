// SalarySlip.js - โค้ดฉบับเต็ม (แก้ไข expensesDisplay)

window.SLIP_API_URL = window.SLIP_API_URL || '/SalaryApp/src/API/slip.php';
window.slipEmployees = window.slipEmployees || [];
window.slipCurrentPage = window.slipCurrentPage || 1;
window.slipItemsPerPage = 6;

window.thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

window.renderSalarySlip = async function () {

    const app = document.getElementById('root');
    if (!app) return;

    app.innerHTML = `
        <div class="print-container">
            <div class="print-actions no-print">
                <button id="back-btn" class="btn-back">Home</button>
                <div class="page-info" id="page-info"></div>
                <button id="print-btn" class="btn-print">🖨️ พิมพ์</button>
            </div>

            <div class="no-print">
                <div id="page-number" style="text-align: center; color: #6b7280; font-weight: 600;"></div>
            </div>

            <div id="pagination-controls" class="pagination-controls no-print"></div>
            
            <div class="screen-only">
                <div id="slips-grid" class="slips-grid">
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                        <div style="font-size: 48px;">⏳</div>
                        <p style="font-size: 18px; margin-top: 20px;">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            </div>
            
            <div id="pagination-controls-bottom" class="pagination-controls no-print"></div>
            
            <div id="print-all-pages" class="print-all-pages"></div>
        </div>

        <div id="slip-modal-overlay" class="slip-modal-overlay" style="display: none;">
            <div class="slip-modal-content">
                <button class="slip-modal-close-btn" id="slip-modal-close-btn">✕</button>
                <div id="modal-slip-wrapper"></div>
            </div>
        </div>
    `;

    await new Promise(r => requestAnimationFrame(r));

    document.getElementById('back-btn')?.addEventListener('click', () => {
        if (window.router?.navigate) {
            window.router.navigate('/home');
        } else {
            window.history.back();
        }
    });

    document.getElementById('print-btn')?.addEventListener('click', () => window.print());
    document.getElementById('slip-modal-close-btn')?.addEventListener('click', closeSlipModal);
    document.getElementById('slip-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'slip-modal-overlay') closeSlipModal();
    });

    await loadEmployees();

    window.addEventListener('resize', () => {
        window.slipItemsPerPage = 6;
        renderSlipContent();
    });
};

async function loadEmployees() {
    try {
        const printData = sessionStorage.getItem('printEmployees');

        if (printData) {
            const parsedData = JSON.parse(printData);
            if (parsedData?.length > 0) {
                window.slipEmployees = parsedData.map(processEmployeeForSlip);
                renderSlipContent();
                renderPrintPages();
                return;
            }
        }

        const params = new URLSearchParams(window.location.search);
        const month = params.get('month') || (new Date().getMonth() + 1);
        const year = params.get('year') || (new Date().getFullYear() + 543);

        const response = await fetch(`${window.SLIP_API_URL}?action=get_employees&month=${month}&year=${year}`);
        const result = await response.json();

        if (result.success && result.data?.length > 0) {
            window.slipEmployees = result.data.map(processEmployeeForSlip);

            renderSlipContent();
            renderPrintPages();
        } else {
            document.getElementById('slips-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">ไม่พบข้อมูล</div>';
        }
    } catch (error) {
        console.error('❌ Error:', error);
        document.getElementById('slips-grid').innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">เกิดข้อผิดพลาด: ${error.message}</div>`;
    }
}

function processEmployeeForSlip(emp) {
    if (emp.incomes && emp.expenses) return emp;

    const monthNum = parseInt(emp.month);
    const monthName = thaiMonths[monthNum - 1];

    // รายรับ - 13 รายการตามภาพสลิปจริง (แสดงในสลิป)
    const incomes = [
        { label: 'เงินเดือน', value: parseFloat(emp.salary || 0) },
        { label: 'เงินเดือน (ตกเบิก)', value: parseFloat(emp.retroactive_salary_emp || 0) },
        { label: 'เงินประจำตำแหน่ง', value: parseFloat(emp.position_allowance || 0) },
        { label: 'เงินประจำตำแหน่ง (ตกเบิก)', value: parseFloat(emp.retroactive_position_allowance || 0) },
        { label: 'ค่าตอบแทน พตส.', value: parseFloat(emp.special_public_health_allowance || 0) },
        { label: 'ค่าตอบแทนไม่ปฏิบัติเวชส่วนตัว', value: parseFloat(emp.no_private_practice_deduction || 0) },
        { label: 'ค่าตอบแทน P4P', value: parseFloat(emp.pay_for_performance || 0) },
        { label: 'ค่าตอบแทน P4P (ตกเบิก)', value: parseFloat(emp.retroactive_p4p || 0) },
        { label: 'เงินพิเศษเดิศ Covid-19', value: parseFloat(emp.covid_risk_pay || 0) },
        { label: 'ค่าตอบแทนเสี่ยงภัย Covid-19', value: parseFloat(emp.covid_exposure || 0) },
        { label: 'ค่าตอบแทนการปฏิบัติงาน (OT)', value: parseFloat(emp.overtime_pay || 0) },
        { label: 'ค่าตอบแทนการปฏิบัติงาน (บ่าย-ดึก)', value: parseFloat(emp.evening_night_shift_pay || 0) },
        { label: 'เงินช่วยเหลือค่าเล่าเรียนบุตร', value: parseFloat(emp.child_education_deduction || 0) }
    ];

    // รายจ่าย - 10 รายการตามภาพสลิปจริงเท่านั้น (แสดงในสลิป)
    const expenses = [
        { label: 'ภาษี', value: parseFloat(emp.tax_deduction || 0) },
        { label: 'ภาษี (ตกเบิก)', value: parseFloat(emp.retroactive_tax_deduction || 0) },
        { label: 'กบข.', value: parseFloat(emp.gpf_contribution || 0) },
        { label: 'กบข.(ตกเบิก)', value: parseFloat(emp.retroactive_gpf_deduction || 0) },
        { label: 'กบข.สะสมส่วนเพิ่ม', value: parseFloat(emp.gpf_extra_contribution || 0) },
        { label: 'สอ.กรมสุขภาพจิต', value: parseFloat(emp.coop_deduction_dept || 0) },
        { label: 'สอ.สาธารณสุขเลย', value: parseFloat(emp.coop_deduction_phso || 0) },
        { label: 'ผผส.กระทรวง', value: parseFloat(emp.moph_savings_deduction || 0) },
        { label: 'ค่าน้ำประปา', value: parseFloat(emp.water_bill_deduction || 0) },
        { label: 'ค่าไฟฟ้า', value: parseFloat(emp.electricity_bill_deduction || 0) }
    ];

    // รายจ่ายเพิ่มเติมที่ไม่แสดงในสลิป (สำหรับคำนวณเท่านั้น)
    const hiddenExpenses = [
        parseFloat(emp.internet_deduction_emp || 0),
        parseFloat(emp.social_security_deduction_emp || 0),
        parseFloat(emp.social_security_deduction_gov || 0),
        parseFloat(emp.phks_provident_fund || 0),
        parseFloat(emp.funeral_welfare_deduction || 0),
        parseFloat(emp.student_loan_deduction_emp || 0),
        parseFloat(emp.aia_insurance_deduction_emp || 0),
        parseFloat(emp.gsb_loan_deduction_emp || 0),
        parseFloat(emp.gsb_loan_naan || 0),
        parseFloat(emp.gsb_loan_loei || 0),
        parseFloat(emp.ghb_loan_deduction || 0),
        parseFloat(emp.ktb_loan_deduction_emp || 0),
        parseFloat(emp.hospital_loan_deduction || 0),
        parseFloat(emp.hospital_loan_employment || 0),
        parseFloat(emp.leave_day_deduction || 0)
    ];

    const total_income = incomes.reduce((sum, item) => sum + item.value, 0);
    const total_expense_display = expenses.reduce((sum, item) => sum + item.value, 0);
    const total_hidden = hiddenExpenses.reduce((sum, val) => sum + val, 0);
    const total_expense = total_expense_display + total_hidden;
    const net_balance = total_income - total_expense;

    return {
        ...emp,
        monthName,
        incomes,
        expenses, // ใช้เฉพาะ 10 รายการสำหรับแสดงผล
        total_income,
        total_expense,
        net_balance,
        // ข้อมูลค่าไฟฟ้า (รอดึงจากฐานข้อมูล)
        elec_prev_reading: emp.elec_prev_reading || 0,
        elec_current_reading: emp.elec_current_reading || 0,
        elec_total_units: emp.elec_total_units || 0,
        elec_excess_units: emp.elec_excess_units || 0,
        // ข้อมูลค่าน้ำประปา (รอดึงจากฐานข้อมูล)
        water_prev_reading: emp.water_prev_reading || 0,
        water_current_reading: emp.water_current_reading || 0,
        water_total_units: emp.water_total_units || 0,
        water_excess_units: emp.water_excess_units || 0
    };
}

function renderSlipContent() {
    const slipsGrid = document.getElementById('slips-grid');
    if (!slipsGrid) return;

    const totalPages = Math.max(1, Math.ceil(window.slipEmployees.length / window.slipItemsPerPage));
    if (window.slipCurrentPage > totalPages) window.slipCurrentPage = totalPages;

    const startIndex = (window.slipCurrentPage - 1) * window.slipItemsPerPage;
    const endIndex = Math.min(startIndex + window.slipItemsPerPage, window.slipEmployees.length);
    const currentEmployees = window.slipEmployees.slice(startIndex, endIndex);

    document.getElementById('page-info').textContent = `รายการทั้งหมด: ${window.slipEmployees.length} | จำนวนหน้า: ${totalPages}`;
    document.getElementById('page-number').textContent = `หน้า ${window.slipCurrentPage} / ${totalPages}`;

    slipsGrid.innerHTML = currentEmployees.map((emp, idx) => createSlipCard(emp, startIndex + idx, true)).join('');

    renderPagination(totalPages, startIndex, endIndex);
}

function renderPrintPages() {
    const printAllPages = document.getElementById('print-all-pages');
    if (!printAllPages) return;

    const ITEMS_PER_PAGE_PRINT = 2;
    const totalPrintPages = Math.ceil(window.slipEmployees.length / ITEMS_PER_PAGE_PRINT);

    printAllPages.innerHTML = Array.from({ length: totalPrintPages }, (_, pageIndex) => {
        const start = pageIndex * ITEMS_PER_PAGE_PRINT;
        const end = Math.min(start + ITEMS_PER_PAGE_PRINT, window.slipEmployees.length);
        const pageEmployees = window.slipEmployees.slice(start, end);

        return `
            <div class="print-page">
                ${pageEmployees.map((emp, idx) => createSlipCard(emp, start + idx, false)).join('')}
            </div>
        `;
    }).join('');
}

function createSlipCard(employee, index, showExpandButton) {
    const params = new URLSearchParams(window.location.search);
    const month = employee.month || params.get('month') || (new Date().getMonth() + 1);
    const year = employee.year || params.get('year') || (new Date().getFullYear() + 543);
    const monthName = employee.monthName || thaiMonths[parseInt(month) - 1];

    // กำหนดจำนวนแถวเป็น 13 (ตามจำนวนรายรับ)
    const maxRows = 13;

    let rows = '';
    for (let i = 0; i < maxRows; i++) {
        const income = employee.incomes[i];
        const expense = employee.expenses[i]; // แสดงเฉพาะ 10 รายการแรก

        let noteText = '';
        if (i === 0) {
            noteText = ''; // บรรทัดแรกว่าง
        } else if (i === 1) {
            noteText = `<div class="note-title-row"><strong>ค่าไฟฟ้า ค่าน้ำประปา ประจำเดือน ${monthName} ${year}</strong></div>`;
        } else if (i === 2) {
            noteText = `<div class="note-header-row">
                <span class="note-label"><strong></strong></span>
                <span class="note-col"><strong>จดครั้งก่อน</strong></span>
                <span class="note-col"><strong>จดครั้งนี้</strong></span>
                <span class="note-col"><strong>รวมหน่วย</strong></span>
                <span class="note-col"><strong>ส่วนเกิน</strong></span>
            </div>`;
        } else if (i === 3) {
            noteText = `<div class="note-data-row">
                <span class="note-label"><strong>ค่าน้ำ</strong></span>
                <span class="note-col">${employee.water_prev_reading || 0}</span>
                <span class="note-col">${employee.water_current_reading || 0}</span>
                <span class="note-col">${employee.water_total_units || 0}</span>
                <span class="note-col">${employee.water_excess_units || 0}</span>
            </div>`;
        } else if (i === 4) {
            noteText = `<div class="note-data-row">
                <span class="note-label"><strong>ค่าไฟ</strong></span>
                <span class="note-col">${employee.elec_prev_reading || 0}</span>
                <span class="note-col">${employee.elec_current_reading || 0}</span>
                <span class="note-col">${employee.elec_total_units || 0}</span>
                <span class="note-col">${employee.elec_excess_units || 0}</span>
            </div>`;
        }

        rows += `
            <tr>
                <td class="seq">${income ? (i + 1) : ''}</td>
                <td class="label">${income ? income.label : ''}</td>
                <td class="amount">${income && income.value > 0 ? formatCurrency(income.value) : '-'}</td>
                <td class="seq">${expense ? (i + 1) : ''}</td>
                <td class="label">${expense ? expense.label : ''}</td>
                <td class="amount">${expense && expense.value > 0 ? formatCurrency(expense.value) : '-'}</td>
                <td class="notes-cell">${noteText}</td>
            </tr>
        `;
    }

    return `
        <div class="slip-card">
            ${showExpandButton ? `<button class="expand-btn no-print" onclick="openSlipModal(${index})">⛶</button>` : ''}
            
            <div class="slip-header">
                <div class="logo-section">
                    <img src="/SalaryApp/public/img/image-Photoroom (1).png" class="logo-slip" alt="logo"/>
                </div>
                <div class="header-text">
                    <h3>โรงพยาบาลจิตเวชเลยราชนครินทร์</h3>
                    <p>รายการจ่ายเงินเดือน ประจำเดือน ${monthName} ${year}</p>
                    <p><strong>ชื่อ:</strong> ${employee.name || '-'}</p>
                    <p><strong>ตำแหน่ง:</strong> ${employee.station || '-'}</p>
                </div>
                <div class="header-info">
                    <p>440 หมู่ 4 ตำบลนาอาน</p>
                    <p>อำเภอเมือง จังหวัดเลย 42000</p>       
                </div>
            </div>

            <table class="slip-table">

                <colgroup>
                    <col style="width:6%">
                    <col style="width:20%">
                    <col style="width:10%">
                    <col style="width:6%">
                    <col style="width:20%">
                    <col style="width:10%">
                    <col style="width:28%">
                </colgroup>

                <thead>
                    <tr class="main-header">
                        <th colspan="3">รายรับ</th>
                        <th colspan="3">รายจ่าย</th>
                        <th rowspan="2" class="notes-header">หมายเหตุ</th>
                    </tr>
                    <tr class="sub-header">
                        <th>ลำดับ</th>
                        <th>รายการ</th>
                        <th>จำนวนเงิน</th>
                        <th>ลำดับ</th>
                        <th>รายการ</th>
                        <th>จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="2"><strong>รวมรับ</strong></td>
                        <td><strong>${formatCurrency(employee.total_income)}</strong></td>
                        <td colspan="2"><strong>รวมจ่าย</strong></td>
                        <td><strong>${formatCurrency(employee.total_expense)}</strong></td>
                        <td rowspan="2" class="notes-footer"></td>
                    </tr>
                    <tr class="net-row">
                        <td colspan="3"></td>
                        <td colspan="2"><strong>รับสุทธิ</strong></td>
                        <td><strong>${formatCurrency(employee.net_balance)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function openSlipModal(index) {
    const modal = document.getElementById('slip-modal-overlay');
    const wrapper = document.getElementById('modal-slip-wrapper');

    if (modal && wrapper) {
        wrapper.innerHTML = createSlipCard(window.slipEmployees[index], index, false);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeSlipModal() {
    const modal = document.getElementById('slip-modal-overlay');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function renderPagination(totalPages, startIndex, endIndex) {
    if (totalPages <= 1) {
        document.getElementById('pagination-controls').innerHTML = '';
        document.getElementById('pagination-controls-bottom').innerHTML = '';
        return;
    }

    const html = `
        <button class="btn-page" ${window.slipCurrentPage === 1 ? 'disabled' : ''} onclick="goToPageSlip(1)">หน้าแรก</button>
        <button class="btn-page" ${window.slipCurrentPage === 1 ? 'disabled' : ''} onclick="goToPageSlip(${window.slipCurrentPage - 1})">ก่อนหน้า</button>
        <div class="page-numbers">
            ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const page = Math.max(1, window.slipCurrentPage - 2) + i;
        if (page > totalPages) return '';
        return `<button class="btn-page-number ${window.slipCurrentPage === page ? 'active' : ''}" onclick="goToPageSlip(${page})">${page}</button>`;
    }).join('')}
        </div>
        <button class="btn-page" ${window.slipCurrentPage === totalPages ? 'disabled' : ''} onclick="goToPageSlip(${window.slipCurrentPage + 1})">ถัดไป</button>
        <button class="btn-page" ${window.slipCurrentPage === totalPages ? 'disabled' : ''} onclick="goToPageSlip(${totalPages})">หน้าสุดท้าย</button>
        <div class="pagination-info">หน้า ${window.slipCurrentPage} / ${totalPages} (${startIndex + 1}-${endIndex} จาก ${window.slipEmployees.length})</div>
    `;

    document.getElementById('pagination-controls').innerHTML = html;
    document.getElementById('pagination-controls-bottom').innerHTML = html;
}

function goToPageSlip(page) {
    window.slipCurrentPage = page;
    renderSlipContent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Export functions for global use
window.openSlipModal = openSlipModal;
window.closeSlipModal = closeSlipModal;
window.goToPageSlip = goToPageSlip;