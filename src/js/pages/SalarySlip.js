// SalarySlip.js - WITH DYNAMIC SIGNATURE SUPPORT

window.SLIP_API_URL = window.SLIP_API_URL || '/SalaryApp/src/API/index.php';
window.slipEmployees = window.slipEmployees || [];
window.slipCurrentPage = window.slipCurrentPage || 1;
window.slipItemsPerPage = 6;
window.signerData = null;

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

async function fetchSignatureData() {
    try {
        const response = await fetch(`${window.SLIP_API_URL}?action=get-signature`);
        const result = await response.json();
        
        if (result.status === 'success' && result.signer) {
            window.signerData = result.signer;
            console.log('✅ Signature data loaded:', window.signerData);
        } else {
            console.warn('⚠️ No signature data found');
            window.signerData = null;
        }
    } catch (error) {
        console.error('❌ Error fetching signature:', error);
        window.signerData = null;
    }
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

    await fetchSignatureData();
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

        const apiUrl = `${window.SLIP_API_URL}?action=salary-data&month=${month}&year=${year}`;

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.status === 'success' && result.data?.length > 0) {
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
    const monthNum = parseInt(emp.month);
    const monthName = thaiMonths[monthNum - 1];

    const total_income = parseFloat(emp.total_income || 0);
    const total_expense = parseFloat(emp.total_expense || 0);
    const net_balance = parseFloat(emp.net_balance || 0);

    const elec_prev = parseFloat(emp.elec_prev_reading || 0);
    const elec_current = parseFloat(emp.elec_current_reading || 0);
    const elec_total = parseFloat(emp.elec_total_units || 0);
    const elec_excess = parseFloat(emp.elec_excess_units || 0);

    const water_prev = parseFloat(emp.water_prev_reading || 0);
    const water_current = parseFloat(emp.water_current_reading || 0);
    const water_total = parseFloat(emp.water_total_units || 0);
    const water_excess = parseFloat(emp.water_excess_units || 0);

    const incomes = [
        { label: 'เงินเดือน', value: parseFloat(emp.salary || 0) },
        { label: 'เงินเดือน (ตกเบิก)', value: parseFloat(emp.retroactive_salary_emp || 0) },
        // { label: 'เงินเดือนสุทธิ', value: parseFloat(emp.salary_deductions || 0) },
        { label: 'เงินประจำตำแหน่ง', value: parseFloat(emp.ot_professional || 0) },
        { label: 'ค่าตอบแทน พตส.', value: parseFloat(emp.special_public_health_allowance || 0) },
        { label: 'ค่าตอบแทนไม่ปฏิบัติเวชส่วนตัว', value: parseFloat(emp.cola_allowance || 0) },
        { label: 'ค่าตอบแทนการปฏิบัติงาน (โอที)', value: parseFloat(emp.ot_outpatient_dept || 0) },
        { label: 'ค่าตอบแทนการปฏิบัติงาน (บ่าย-ดึก)', value: parseFloat(emp.evening_night_shift_pay || 0) },
        { label: 'ค่าตอบแทน P4P', value: parseFloat(emp.pay_for_performance || 0) },
        { label: 'เงินช่วยเหลือค่าเล่าเรียนบุตร', value: parseFloat(emp.ot_assistant || 0) },
        { label: 'ค่าตอบแทนรายเดือน', value: parseFloat(emp.leave_day_deduction || 0) },
        { label: 'เงินกู้สวัสดิการ รพ.', value: parseFloat(emp.welfare_loan_received || 0) },
        { label: 'อื่นๆ', value: parseFloat(emp.other_income || 0) }
    ];

    const expenses = [
        { label: 'ภาษี', value: parseFloat(emp.tax_deduction || 0) },
        { label: 'กบข./ประกันสังคม', value: parseFloat(emp.social_security_deduction_emp || 0) },
        { label: 'กบข.สะสมส่วนเพิ่ม', value: parseFloat(emp.gpf_extra_contribution || 0) },
        { label: 'สอ.กรมสุขภาพจิต', value: parseFloat(emp.coop_deduction_dept || 0) },
        { label: 'สอ.สาธารณสุขเลย', value: parseFloat(emp.coop_deduction_phso || 0) },
        { label: 'ฌกส.กระทรวง', value: parseFloat(emp.funeral_welfare_deduction || 0) },
        { label: 'กองทุน พกส.', value: parseFloat(emp.phks_provident_fund || 0) },
        { label: 'ธนาคารออมสิน', value: parseFloat(emp.gsb_loan_naan || 0) },
        { label: 'ธนาคารกรุงไทย', value: parseFloat(emp.ktb_loan_deduction_emp || 0) },
        { label: 'ธนาคารอาคารสงเคราะห์', value: parseFloat(emp.gsb_loan_loei || 0) },
        { label: 'ค่าน้ำประปา', value: parseFloat(emp.water_bill_deduction || 0) },
        { label: 'ค่าไฟฟ้า', value: parseFloat(emp.electricity_bill_deduction || 0) },
        { label: 'ค่าอินเตอร์เน็ต', value: parseFloat(emp.internet_deduction_emp || 0) },
        { label: 'ค่าประกัน AIA', value: parseFloat(emp.aia_insurance_deduction_emp || 0) },
        { label: 'กยศ.', value: parseFloat(emp.student_loan_deduction_emp || 0) },
        { label: 'เงินกู้ รพ/ประกันงาน', value: parseFloat(emp.hospital_loan_deduction || 0) },
        { label: 'อื่นๆ', value: parseFloat(emp.shift_assistant || 0) }
    ];

    return {
        ...emp,
        monthName,
        incomes,
        expenses,
        total_income,
        total_expense,
        net_balance,
        elec_prev_reading: elec_prev,
        elec_current_reading: elec_current,
        elec_total_units: elec_total,
        elec_excess_units: elec_excess,
        water_prev_reading: water_prev,
        water_current_reading: water_current,
        water_total_units: water_total,
        water_excess_units: water_excess
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

    const pages = window.slipEmployees.map((emp, idx) => {
        return `<div class="print-page">${createSlipCard(emp, idx, false)}</div>`;
    }).join('');
    
    printAllPages.innerHTML = pages;
}

function createSignatureHTML() {
    // กรณีไม่มีข้อมูล หรือดึงข้อมูลไม่ได้
    if (!window.signerData || !window.signerData.signature) {
        return `
            <div class="signature-wrapper">
                <div class="signature-section">
                    <div class="signature-left">
                        <div class="sig-line">
                            <span class="sig-label">ลงชื่อ</span>
                            <span class="sig-dots">................................................</span>
                            <span class="sig-role-inline">(ผู้มีหน้าที่จ่ายเงิน)</span>
                        </div>
                        <p class="sig-name-center">(.......................................................)</p>
                        <p class="sig-position-center">(.......................................................)</p>
                    </div>
                </div>
            </div>
        `;
    }

    // แสดงผลตามข้อมูลที่ดึงมาจาก Query
    return `
        <div class="signature-wrapper">
            <div class="signature-section">
                <div class="signature-left">
                    <div class="sig-line">
                        <span class="sig-label">ลงชื่อ</span>
                        <img src="${window.signerData.signature}" 
                             alt="ลายเซ็น" 
                             class="signature-image-inline"
                             onerror="this.style.visibility='hidden';">
                        <span class="sig-role-inline">(ผู้มีหน้าที่จ่ายเงิน)</span>
                    </div>
                    <p class="sig-name-center">(${window.signerData.fullname})</p>
                    <p class="sig-position-center">${window.signerData.posname}</p>
                </div>
            </div>
        </div>
    `;
}

function createSlipCard(employee, index, showExpandButton) {
    const params = new URLSearchParams(window.location.search);
    const month = employee.month || params.get('month') || (new Date().getMonth() + 1);
    const year = employee.year || params.get('year') || (new Date().getFullYear() + 543);
    const monthName = employee.monthName || thaiMonths[parseInt(month) - 1];

    const maxRows = 17;

    let rows = '';
    for (let i = 0; i < maxRows; i++) {
        const income = employee.incomes[i];
        const expense = employee.expenses[i];

        // ถ้ามีรายการแต่ไม่มีจำนวนเงิน แสดง "-"
        // ถ้าไม่มีรายการเลย แสดงค่าว่าง
        const incomeAmount = income ? (income.value > 0 ? formatCurrency(income.value) : '-') : '';
        const expenseAmount = expense ? (expense.value > 0 ? formatCurrency(expense.value) : '-') : '';

        rows += `
            <tr>
                <td class="seq">${income ? (i + 1) : ''}</td>
                <td class="label">${income ? income.label : ''}</td>
                <td class="amount">${incomeAmount}</td>
                <td class="seq">${expense ? (i + 1) : ''}</td>
                <td class="label">${expense ? expense.label : ''}</td>
                <td class="amount">${expenseAmount}</td>
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
                    <p><strong>ตำแหน่ง:</strong> ${employee.posname || '-'}</p>
                </div>
                <div class="header-info">
                    <p>440 หมู่ 4 ตำบลนาอาน</p>
                    <p>อำเภอเมือง จังหวัดเลย 42000</p>       
                </div>
            </div>

            <table class="slip-table">
                <colgroup>
                    <col style="width:8%">
                    <col style="width:38%">
                    <col style="width:15%">
                    <col style="width:8%">
                    <col style="width:38%">
                    <col style="width:15%">
                </colgroup>

                <thead>
                    <tr class="main-header">
                        <th colspan="3">รายรับ</th>
                        <th colspan="3">รายจ่าย</th>
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
                    </tr>
                    <tr class="net-row">
                        <td colspan="3"></td>
                        <td colspan="2"><strong>รับสุทธิ</strong></td>
                        <td><strong>${formatCurrency(employee.net_balance)}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <div class="bottom-section">
                <div class="notes-box">
                    <div class="notes-title"><strong>ค่าไฟฟ้า ค่าน้ำประปา ประจำเดือน ${monthName} ${year}</strong></div>
                    <table class="notes-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>จดครั้งก่อน</th>
                                <th>จดครั้งนี้</th>
                                <th>รวมหน่วย</th>
                                <th>ส่วนเกิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>ค่าน้ำ</strong></td>
                                <td>${employee.water_prev_reading || '0'}</td>
                                <td>${employee.water_current_reading || '0'}</td>
                                <td>${employee.water_total_units || '0'}</td>
                                <td>${employee.water_excess_units || '0'}</td>
                            </tr>
                            <tr>
                                <td><strong>ค่าไฟ</strong></td>
                                <td>${employee.elec_prev_reading || '0'}</td>
                                <td>${employee.elec_current_reading || '0'}</td>
                                <td>${employee.elec_total_units || '0'}</td>
                                <td>${employee.elec_excess_units || '0'}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="rights-info">
                        <p>สิทธิในการใช้น้ำประปา: <strong>${employee.right_w || '0'}</strong> หน่วย</p>
                        <p>สิทธิในการใช้ไฟฟ้า: <strong>${employee.right_e || '0'}</strong> หน่วย</p>
                    </div>
                </div>
                
                ${createSignatureHTML()}
            </div>
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

window.openSlipModal = openSlipModal;
window.closeSlipModal = closeSlipModal;
window.goToPageSlip = goToPageSlip;