import { useState } from 'react';
import './LoginPage.css';

export default function LoginPage() {
  const [cid, setCid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (!cid || !password) {
        setError('กรุณากรอก CID และรหัสผ่าน');
        setLoading(false);
        return;
      }

      // จำลองการโหลด 1.5 วินาที
      await new Promise(resolve => setTimeout(resolve, 1500));

      // เรียก API เพื่อตรวจสอบการล็อกอิน
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid: cid,
          password: password
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // บันทึกข้อมูลผู้ใช้ใน sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify({
          cid: data.user.cid,
          name: data.user.name,
          position: data.user.position
        }));

        // แสดง animation สำเร็จก่อน redirect
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect ไปหน้า /home
        window.location.href = '/home';
      } else {
        setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      setLoading(false);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="left-panel">

        <div className="decorative-circle-1"></div>
        <div className="decorative-circle-2"></div>
        <div className="decorative-circle-3"></div>

        <div className="left-content">
          <div className="brand-logo">
            <img src="/img/image-Photoroom (1).png" alt="Hospital Logo" className="logo-login"></img>
          </div>
          <h1 className="brand-title">ระบบออกสลิปเงินเดือนบุคลากร</h1>
          <p className="brand-subtitle">เข้าสู่ระบบเพื่อเริ่มต้นประสบการณ์ที่ยอดเยี่ยม</p>
          <div className="decorative-line"></div>
        </div>
      </div>

      <div className="right-panel">
        <div className="login-box">
          <div className="login-header">
            <h2 className="login-title">เข้าสู่ระบบ</h2>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-container">
            <div className="input-group">
              <label htmlFor="cid" className="label">
                <span className="label-icon">👤</span>
                เลขประจำตัว (CID)
              </label>
              <input
                type="text"
                id="cid"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                placeholder="กรอกเลขประจำตัวของคุณ"
                className="input"
                maxLength="13"
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" className="label">
                <span className="label-icon">🔒</span>
                รหัสผ่าน
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  className="input password-input"
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleSubmit()}
                  disabled={loading}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-button"
                  type="button"
                  disabled={loading}
                >
                  <img
                    src={showPassword ? "/public/img/openeye.png" : "/public/img/closeeye.png"}
                    alt="toggle password visibility"
                    className="eye-icon"
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  <span className="button-text">กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <span className="button-text">เข้าสู่ระบบ</span>
                  <span className="button-arrow">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}