import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import '../components/SalarySlip.css';

const SalarySlip = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const hasPrintedRef = useRef(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });

        if (location.state && location.state.employees) {
            setEmployees(location.state.employees);
        } else {
            navigate('/');
        }
    }, [location, navigate]);

    const formatCurrency = (value) => {
        if (!value) return "0.00";
        const cleanValue = value.toString().replace(/,/g, "").trim();
        const num = parseFloat(cleanValue);
        return isNaN(num) ? "0.00" : num.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getThaiMonthName = (monthNumber) => {
        if (!monthNumber) return '-';
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
            "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
            "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        const index = parseInt(monthNumber) - 1;
        return monthNames[index] || '-';
    };

    const formatDate = () => {
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;
        const year = today.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    };

    const handleOpenModal = (employee) => {
        setSelectedEmployee(employee);
        setShowModal(true);
        document.body.style.overflow = 'hidden';
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEmployee(null);
        document.body.style.overflow = 'auto';
    };

    const ITEMS_PER_PAGE = 9;
    const ITEMS_PER_PAGE_PRINT = 2; // สำหรับพิมพ์ 2 รายการต่อหน้า
    const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
    const totalPrintPages = Math.ceil(employees.length / ITEMS_PER_PAGE_PRINT);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToPage = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, employees.length);
    const currentEmployees = employees.slice(startIndex, endIndex);

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        return (
            <div className="pagination-controls no-print">
                <button
                    className="btn-page"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                >
                    หน้าแรก
                </button>

                <button
                    className="btn-page"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                >
                    ก่อนหน้า
                </button>

                <div className="page-numbers">
                    {startPage > 1 && (
                        <>
                            <button className="btn-page-number" onClick={() => goToPage(1)}>1</button>
                            {startPage > 2 && <span className="pagination-dots">...</span>}
                        </>
                    )}

                    {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                        <button
                            key={page}
                            className={`btn-page-number ${currentPage === page ? 'active' : ''}`}
                            onClick={() => goToPage(page)}
                        >
                            {page}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <span className="pagination-dots">...</span>}
                            <button className="btn-page-number" onClick={() => goToPage(totalPages)}>{totalPages}</button>
                        </>
                    )}
                </div>

                <button
                    className="btn-page"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    ถัดไป
                </button>

                <button
                    className="btn-page"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    หน้าสุดท้าย
                </button>

                <div className="pagination-info">
                    หน้า {currentPage} จาก {totalPages} (แสดง {startIndex + 1}-{endIndex} จาก {employees.length} รายการ)
                </div>
            </div>
        );
    };

    // Component สลิปเงินเดือน - แบบแนวนอน
    const SalarySlipCard = ({ employee, showExpandButton = true }) => (
        <div className="salary-slip-mini horizontal-layout">
            {showExpandButton && (
                <button
                    className="expand-btn no-print"
                    onClick={() => handleOpenModal(employee)}
                    title="ขยายเต็มหน้าจอ"
                >
                    <Maximize2 size={16} />
                </button>
            )}

            {/* Header - เต็มความกว้าง */}
            <div className="slip-header-mini">
                <div className="hospital-logo-mini">
                    <img src="/img/image-Photoroom (1).png" alt="Logo" />
                </div>
                <div className="hospital-info-mini">
                    <h2>โรงพยาบาลจิตเวชเลยราชนครินทร์</h2>
                    <p>ใบแจ้งรายการเงินเดือน</p>
                </div>
            </div>

            {/* Body - 2 คอลัมน์ */}
            <div className="slip-body-mini">
                {/* คอลัมน์ซ้าย - ข้อมูลพนักงาน */}
                <div className="employee-info-mini">
                    <div className="info-row-mini">
                        <span className="label-mini">ชื่อ:</span>
                        <span className="value-mini">{employee.name || '-'}</span>
                    </div>
                    <div className="info-row-mini">
                        <span className="label-mini">ประเภท:</span>
                        <span className="value-mini">{employee.employee || '-'}</span>
                    </div>
                    <div className="info-row-mini">
                        <span className="label-mini">บัตรปชช:</span>
                        <span className="value-mini">{employee.cid || '-'}</span>
                    </div>
                    <div className="info-row-mini">
                        <span className="label-mini">บัญชี:</span>
                        <span className="value-mini">{employee.bank_account || '-'}</span>
                    </div>
                    <div className="info-row-mini">
                        <span className="label-mini">เดือน/ปี:</span>
                        <span className="value-mini">
                            {getThaiMonthName(employee.month)} {employee.year}
                        </span>
                    </div>
                </div>

                {/* คอลัมน์ขวา - รายละเอียดเงินเดือน */}
                <div className="salary-details-mini">
                    <div className="detail-row-mini income">
                        <span>รายรับ:</span>
                        <span className="amount-mini">
                            {formatCurrency(employee.total_income)}
                        </span>
                    </div>
                    <div className="detail-row-mini expense">
                        <span>รายจ่าย:</span>
                        <span className="amount-mini">
                            {formatCurrency(employee.total_expense)}
                        </span>
                    </div>
                    <div className="net-balance-mini">
                        <span>เงินได้สุทธิ:</span>
                        <span className="net-amount-mini">
                            {formatCurrency(employee.net_balance)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer - เต็มความกว้าง */}
            <div className="slip-footer-mini">
                <p>พิมพ์: {formatDate()}</p>
            </div>
        </div>
    );

    // Component สลิปเงินเดือน - แบบแนวนอนสำหรับ Modal (ใช้คอมโพเนนต์เดียวกัน)
    const SalarySlipHorizontal = ({ employee }) => (
        <SalarySlipCard employee={employee} showExpandButton={false} />
    );

    return (
        <div className="print-container">
            <div className="print-actions no-print">
                <button onClick={() => navigate(-1)} className="btn-back">
                    HOME
                </button>
                <div className="page-info">
                    รายการทั้งหมด: {employees.length} | จำนวนหน้า: {totalPages}
                </div>
                <button onClick={() => window.print()} className="btn-print">
                    🖨️ พิมพ์ทั้งหมด
                </button>
            </div>

            {renderPagination()}

            <div className="print-page screen-only">
                <div className="page-number no-print">
                    หน้า {currentPage} / {totalPages}
                </div>
                <div className="slips-grid">
                    {currentEmployees.map((employee, index) => (
                        <SalarySlipCard
                            key={`${currentPage}-${index}`}
                            employee={employee}
                        />
                    ))}

                    {Array.from({ length: ITEMS_PER_PAGE - currentEmployees.length }, (_, i) => (
                        <div key={`empty-${i}`} className="salary-slip-mini empty-slot"></div>
                    ))}
                </div>
            </div>

            <div className="print-all-pages">
                {Array.from({ length: totalPrintPages }, (_, pageIndex) => {
                    const pageStartIndex = pageIndex * ITEMS_PER_PAGE_PRINT;
                    const pageEndIndex = Math.min(pageStartIndex + ITEMS_PER_PAGE_PRINT, employees.length);
                    const pageEmployees = employees.slice(pageStartIndex, pageEndIndex);

                    return (
                        <div key={pageIndex} className="print-page print-mode">
                            <div className="slips-grid">
                                {pageEmployees.map((employee, index) => (
                                    <SalarySlipCard
                                        key={`print-${pageIndex}-${index}`}
                                        employee={employee}
                                        showExpandButton={false}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {renderPagination()}

            {/* Modal แสดงสลิปขยายเต็มจอ - แนวนอน */}
            {showModal && selectedEmployee && (
                <div className="modal-overlay no-print" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={handleCloseModal}>
                            <X size={60} strokeWidth={3} />
                        </button>
                        <div className="modal-slip-wrapper">
                            <SalarySlipHorizontal employee={selectedEmployee} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalarySlip;