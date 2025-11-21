import React, { useState, useEffect, useRef } from "react";
import { Search, X, Printer, Loader, AlertCircle, ChevronDown, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../components/SalarySystem.css";

const SalarySystem = () => {
    const navigate = useNavigate();
    const [searchForm, setSearchForm] = useState({
        cid: "",
        name: "",
        month: "",
        year: ""
    });
    const [activeTab, setActiveTab] = useState("all");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const itemsPerPage = 20;
    const dropdownRef = useRef(null);

    const API_URL = "http://127.0.0.1:5000";

    // ดึงข้อมูล user จาก sessionStorage
    useEffect(() => {
        const userData = sessionStorage.getItem('currentUser');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        } else {
            // ถ้าไม่มีข้อมูล user ให้ redirect กลับไปหน้า login
            window.location.href = '/';
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = '/';
    };



    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
        "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
        "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

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

    const formatCurrency = (value) => {
        if (!value) return "0.00";
        const cleanValue = value.toString().replace(/,/g, "").trim();
        const num = parseFloat(cleanValue);
        return isNaN(num) ? "0.00" : num.toLocaleString("th-TH", { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    const fetchSalaryData = async (filters = {}) => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            });

            const url = `${API_URL}/api/salary-data?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === "success") {
                // ใช้ข้อมูลจาก Backend โดยตรง (เรียงลำดับที่ Backend แล้ว)
                setResults(data.data || []);
                setCurrentPage(1);
            } else {
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
            }
        } catch (err) {
            setError(err.message);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaryData();
        fetchAvailableFilters();
    }, []);

    const fetchAvailableFilters = async () => {
        try {
            const response = await fetch(`${API_URL}/api/available-filters`);
            const data = await response.json();
            
            if (data.status === "success") {
                setAvailableMonths(data.months || []);
                setAvailableYears(data.years || []);
            } 
        } catch (err) {
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const filters = {};
            
            if (searchForm.cid) filters.cid = searchForm.cid;
            if (searchForm.name) filters.name = searchForm.name;
            if (searchForm.month) filters.month = searchForm.month;
            if (searchForm.year) filters.year = searchForm.year;
            
            if (activeTab === "government") {
                filters.employee = "ข้าราชการ";
            } else if (activeTab === "employee") {
                filters.employee = "ลูกจ้างเงินเดือน";
            }
            
            fetchSalaryData(filters);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchForm, activeTab]);

    const handleSearchChange = (field, value) => {
        setSearchForm({ ...searchForm, [field]: value });
    };

    const handleReset = () => {

        setSearchForm({ cid: "", name: "", month: "", year: "" });
        setActiveTab("all");
        setCurrentPage(1);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
    };

    const handlePrint = (employee) => {
        navigate('/slip', { 
            state: { 
                employees: [employee] 
            } 
        });
    };

    const handlePrintAll = () => {
        if (results.length === 0) {
            alert("ไม่มีข้อมูลให้พิมพ์");
            return;
        }
        navigate('/slip', { 
            state: { 
                employees: results 
            } 
        });
    };

    const handleAddNew = () => {
        window.location.href = "/add";
    };

    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentResults = results.slice(startIndex, endIndex);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 5;
        
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        return (
            <div className="pagination">
                <button 
                    className="pagination-btn"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                >
                    หน้าแรก
                </button>
                
                <button 
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ก่อนหน้า
                </button>

                {startPage > 1 && (
                    <>
                        <button className="pagination-btn" onClick={() => handlePageChange(1)}>1</button>
                        {startPage > 2 && <span className="pagination-dots">...</span>}
                    </>
                )}

                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                    <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                    >
                        {page}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="pagination-dots">...</span>}
                        <button className="pagination-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
                    </>
                )}

                <button 
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    ถัดไป
                </button>

                <button 
                    className="pagination-btn"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    หน้าสุดท้าย
                </button>

                <span className="pagination-info">
                    หน้า {currentPage} จาก {totalPages} (แสดง {startIndex + 1}-{Math.min(endIndex, results.length)} จาก {results.length} รายการ)
                </span>
            </div>
        );
    };

    return (
        <div className="container">
            {/* Header */}
            <div className="header">
                <div className="header-left">
                    <img src="/img/image-Photoroom (1).png" alt="Hospital Logo" className="logo" />
                    <h1 className="hospital-name">โรงพยาบาลจิตเวชเลยราชนครินทร์</h1>
                </div>
                <div className="header-right">
                    <button className="btn btn-green" onClick={handleAddNew}>
                       ✚  เพิ่มข้อมูล
                    </button>
                    
                    {/* Profile Section */}
                    {currentUser && (
                        <div className="profile-section" ref={dropdownRef}>
                            <button 
                                className="profile-button"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            >
                                <div className="profile-avatar">
                                    <img 
                                        src="/public/img/people.png" 
                                        alt="Profile"
                                        className="profile-icon"
                                        onError={(e) => {
                                            // ถ้าโหลดรูปไม่สำเร็จ แสดง fallback icon
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                                        }}
                                    />
                                </div>
                                <div className="profile-info">
                                    <div className="profile-cid">CID: {currentUser.cid}</div>
                                    <div className="profile-name">{currentUser.name}</div>
                                </div>
                                <ChevronDown size={20} className="profile-dropdown-icon" />
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileDropdown && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        <div className="dropdown-avatar">
                                            <img 
                                                src="/public/img/people.png" 
                                                alt="Profile"
                                                className="dropdown-icon"
                                                onError={(e) => {
                                                    // ถ้าโหลดรูปไม่สำเร็จ แสดง fallback icon
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                                                }}
                                            />
                                        </div>
                                        <div className="dropdown-name">{currentUser.name}</div>
                                        <div className="dropdown-position">{currentUser.status}</div>
                                    </div>
                                    <div className="dropdown-body">
                                        <div className="dropdown-item">
                                            <User size={18} />
                                            <span>CID: {currentUser.cid}</span>
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <div className="dropdown-item dropdown-logout" onClick={handleLogout}>
                                            <LogOut size={18} />
                                            <span>ออกจากระบบ</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Section */}
            <div className="search-section full-width">
                <h2 className="section-title">
                    <Search size={24} />
                    <span>ค้นหาข้อมูลเงินเดือน</span>
                </h2>

                <div className="form-grid">
                    <div className="form-group">
                        <label>เลขประจำตัว</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="กรอก 13 หลัก"
                            maxLength="13"
                            value={searchForm.cid}
                            onChange={(e) => handleSearchChange("cid", e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>ชื่อ-นามสกุล</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="กรอกชื่อหรือนามสกุล"
                            value={searchForm.name}
                            onChange={(e) => handleSearchChange("name", e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>เดือน</label>
                        <select
                            className="input-field"
                            value={searchForm.month}
                            onChange={(e) => handleSearchChange("month", e.target.value)}
                        >
                            <option value="">ทุกเดือน</option>
                            {availableMonths.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>ปี พ.ศ.</label>
                        <select
                            className="input-field"
                            value={searchForm.year}
                            onChange={(e) => handleSearchChange("year", e.target.value)}
                        >
                            <option value="">ทุกปี</option>
                            {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => handleTabChange('all')}
                    >
                        ทั้งหมด
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'government' ? 'active' : ''}`}
                        onClick={() => handleTabChange('government')}
                    >
                        ข้าราชการ
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'employee' ? 'active' : ''}`}
                        onClick={() => handleTabChange('employee')}
                    >
                        ลูกจ้างเงินเดือน
                    </button>
                </div>

                <button className="btn btn-dangerous" onClick={handleReset}>
                    <X size={20} />
                    <span>ล้างผลการค้นหา</span>
                </button>
            </div>

            {/* Results Section */}
            <div className="results-section">
                <div className="results-header-container">
                    <h2 className="results-header">
                        📋 ผลการค้นหา 
                        {activeTab === 'all' && <span className="results-count"> - ทั้งหมด ({results.length} รายการ)</span>}
                        {activeTab === 'government' && <span className="results-count"> - ข้าราชการ ({results.length} รายการ)</span>}
                        {activeTab === 'employee' && <span className="results-count"> - ลูกจ้างเงินเดือน ({results.length} รายการ)</span>}
                    </h2>
                    {!loading && !error && results.length > 0 && (
                        <button className="btn-print-all" onClick={handlePrintAll}>
                            <Printer size={20} />
                            <span>พิมพ์ทั้งหมด ({results.length} รายการ)</span>
                        </button>
                    )}
                </div>

                {loading && (
                    <div className="loading-container">
                        <Loader size={40} className="spinner" />
                        <p>กำลังโหลดข้อมูล...</p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <AlertCircle size={24} />
                        <div>
                            <strong>ไม่มีข้อมูล:</strong>
                        </div>
                    </div>
                )}

                {!loading && !error && results.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">
                            <Search size={60} color="#9ca3af" />
                        </div>
                        <h3>ไม่พบข้อมูลที่ค้นหา</h3>
                        <p>กรุณาลองค้นหาด้วยเงื่อนไขอื่น หรือเพิ่มข้อมูลใหม่</p>
                    </div>
                ) : !loading && !error && (
                    <>
                        <div className="table-container">
                            <table className="salary-table">
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
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentResults.map((employee, index) => (
                                        <tr key={employee.id || index}>
                                            <td>{startIndex + index + 1}</td>
                                            <td>{employee.name || '-'}</td>
                                            <td>
                                                <span className={`badge ${employee.employee === 'ข้าราชการ' ? 'badge-government' : 'badge-employee'}`}>
                                                    {employee.employee || 'ไม่ระบุ'}
                                                </span>
                                            </td>
                                            <td>{employee.cid || '-'}</td>
                                            <td>{employee.bank_account || '-'}</td>
                                            <td>{getThaiMonthName(employee.month)}</td>
                                            <td>{employee.year || '-'}</td>
                                            <td className="text-green">{formatCurrency(employee.total_income)}</td>
                                            <td className="text-red">{formatCurrency(employee.total_expense)}</td>
                                            <td className="text-blue text-bold">{formatCurrency(employee.net_balance)}</td>
                                            <td>
                                                <button 
                                                    className="action-btn action-btn-primary" 
                                                    onClick={() => handlePrint(employee)}
                                                    title="พิมพ์"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination()}
                    </>
                )}
            </div>
        </div>
    );
};

export default SalarySystem;