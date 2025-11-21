import React, { useState } from "react";
import { CheckCircle, XCircle, X, Upload, Database, TrendingUp, FileSpreadsheet, Calendar } from "lucide-react";
import './AddSalary.css';

export default function AddSalary() {
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    success: false,
    totalRows: 0,
    savedRows: 0,
    message: ""
  });

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

  const currentYear = new Date().getFullYear() + 543;
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 2; i++) {
    years.push(i);
  }

  const handleUpload = async () => {
    if (!file) {
      alert("กรุณาเลือกไฟล์ก่อน!");
      return;
    }

    if (!selectedMonth) {
      alert("กรุณาเลือกเดือนก่อนอัปโหลด!");
      return;
    }

    if (!selectedYear) {
      alert("กรุณาเลือกปีก่อนอัปโหลด!");
      return;
    }

    setLoading(true);
    setMessage("⏳ กำลังอัปโหลดและบันทึกข้อมูล...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", selectedMonth);
      formData.append("year", selectedYear);

      const uploadRes = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (uploadRes.ok && uploadData.status === "success") {
        setTableData(uploadData.data || []);
        setColumns(uploadData.columns || []);

        setModalData({
          success: true,
          totalRows: uploadData.rows,
          savedRows: uploadData.saved || uploadData.rows,
          message: `บันทึกข้อมูลเดือน ${selectedMonth} ${selectedYear} เรียบร้อย`
        });
        setShowModal(true);
        setUploaded(true);
        setMessage("");

        setTimeout(() => {
          window.location.href = "/home";
        }, 3000);

      } else {
        setModalData({
          success: false,
          totalRows: 0,
          savedRows: 0,
          message: uploadData.error || "ไม่พบข้อมูลในไฟล์ Excel"
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error(err);
      setModalData({
        success: false,
        totalRows: 0,
        savedRows: 0,
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์"
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (modalData.success) {
      setFile(null);
      setSelectedMonth("");
      setSelectedYear("");
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    }
  };

  const backHome = () => {
    window.location.href = "/home";
  }

  return (
    <div className="salary-container">
      <div className="bg-blobs">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
        <div className="bg-blob bg-blob-3"></div>
      </div>

      <div className="upload-section">
        <div className="content-wrapper">
          <button className="back-home-button" onClick={backHome}>
            HOME
          </button>
          <div className="upload-header">
            <div className="upload-header-content">
              <Upload size={40} className="upload-icon-bounce" />
              <h2 className="upload-title">อัปโหลดไฟล์ข้อมูล</h2>
            </div>
            <p className="upload-subtitle">
              รองรับไฟล์ Excel (.xlsx, .xls) - บันทึกข้อมูลอัตโนมัติ
            </p>
          </div>

          <div className="upload-body">
            <div className="upload-form">
              <div className="selection-grid">
                <div className="form-group">
                  <label className="form-label">
                    <Calendar className="label-icon indigo" />
                    เลือกเดือน
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="form-select indigo"
                    disabled={loading}
                  >
                    <option value="">-- เลือกเดือน --</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  {selectedMonth && (
                    <div className="selected-indicator">
                      <CheckCircle className="selected-icon" />
                      <span className="selected-text">{selectedMonth}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Calendar className="label-icon purple" />
                    เลือกปี พ.ศ.
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="form-select purple"
                    disabled={loading}
                  >
                    <option value="">-- เลือกปี --</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  {selectedYear && (
                    <div className="selected-indicator">
                      <CheckCircle className="selected-icon" />
                      <span className="selected-text">พ.ศ. {selectedYear}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FileSpreadsheet className="label-icon pink" />
                  เลือกไฟล์ Excel
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="form-file-input-add"
                  disabled={loading}
                />
                {file && (
                  <div className="selected-indicator">
                    <CheckCircle className="selected-icon" />
                    <span className="selected-text">{file.name}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={loading || !file || !selectedMonth || !selectedYear}
                className="upload-button"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    กำลังประมวลผล...
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    อัปโหลดและบันทึกข้อมูล
                  </>
                )}
              </button>
            </div>

            {message && (
              <div className="upload-message">
                <div className="message-spinner"></div>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className={`modal-header ${modalData.success ? 'success' : 'error'}`}>
              <div className="modal-header-content">
                <div className="modal-header-info">
                  <div className="modal-icon-wrapper">
                    {modalData.success ? (
                      <CheckCircle className="modal-icon" />
                    ) : (
                      <XCircle className="modal-icon" />
                    )}
                  </div>
                  <h2 className="modal-title">
                    {modalData.success ? 'สำเร็จ!' : 'ผิดพลาด!'}
                  </h2>
                </div>
                <button onClick={closeModal} className="modal-close-button">
                  <X className="modal-close-icon" />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {modalData.success ? (
                <div className="modal-success-content">
                  <div className="modal-count">
                    {modalData.savedRows}
                  </div>
                  <div className="modal-count-label">รายการบันทึกสำเร็จ</div>

                  <div className="modal-info-box success">
                    <div className="modal-info-content">
                      <div className="modal-info-icon-wrapper success">
                        <CheckCircle className="modal-info-icon" />
                      </div>
                      <div className="modal-info-text">
                        <p className="modal-info-title success">
                          บันทึกข้อมูลลงฐานข้อมูลเรียบร้อย
                        </p>
                        <p className="modal-info-detail success">
                          📊 จำนวนข้อมูลทั้งหมด: {modalData.totalRows} แถว
                        </p>
                        <p className="modal-info-detail success">
                          ✅ บันทึกสำเร็จ: {modalData.savedRows} แถว
                        </p>
                        <p className="modal-info-detail success">
                          📅 {modalData.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="modal-info-box error">
                    <div className="modal-info-content">
                      <div className="modal-info-icon-wrapper error">
                        <XCircle className="modal-info-icon" />
                      </div>
                      <div className="modal-info-text">
                        <p className="modal-info-title error">
                          ไม่สามารถบันทึกข้อมูลได้
                        </p>
                        <p className="modal-info-detail error">
                          {modalData.message}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="modal-error-hint">
                    กรุณาตรวจสอบไฟล์และลองอีกครั้ง
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={closeModal}
                className={`modal-footer-button ${modalData.success ? 'success' : 'error'}`}
              >
                {modalData.success ? '✓ เสร็จสิ้น' : '🔄 ลองอีกครั้ง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}