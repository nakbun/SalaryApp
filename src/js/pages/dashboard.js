// ============================================
// dashboard.js - Payroll Dashboard (Yearly Charts + No Pie Scrollbar)
// ============================================

async function waitForAPI(maxWait = 2000) {
  const startTime = Date.now();

  while (!window.API) {
    if (Date.now() - startTime > maxWait) {
      window.API = {
        baseURL: '/SalaryApp/src/API/index.php',

        async get(actionName, params = {}) {
          try {
            const query = new URLSearchParams({ ...params, action: actionName });
            const url = `${this.baseURL}?${query}`;
            const response = await fetch(url, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
          } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
          }
        }
      };

      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return true;
}

const PayrollDashboard = {
  state: {
    filterMode: 'yearRange',
    startYear: 'all',
    endYear: 'all',
    selectedYear: 'all',
    startMonth: 'all',
    endMonth: 'all',
    charts: {},
    rawData: [],
    processedData: [],
    availableYears: [],
    availableMonths: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
    monthToNum: {
      'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
      'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
    }
  },

  async fetchData() {
    try {
      const apiReady = await waitForAPI();
      if (!apiReady) {
        console.error('❌ Failed to initialize API');
        return false;
      }

      const response = await window.API.get('salary-data', {});

      if (response.status === 'success') {
        this.state.rawData = response.data || [];

        if (this.state.rawData.length === 0) {
          alert('ไม่พบข้อมูลเงินเดือน\nกรุณาอัปโหลดไฟล์ Excel ก่อนใช้งาน Dashboard');
          return false;
        }

        this.extractYears();
        this.processData();
        return true;
      } else {
        console.error('❌ API returned error:', response.error || response);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to fetch salary data:', error);
      return false;
    }
  },

  extractYears() {
    const years = new Set();
    const yearDebug = {};

    this.state.rawData.forEach((record, index) => {
      if (record.year) {
        const yearStr = String(record.year);
        years.add(yearStr);

        if (!yearDebug[yearStr]) yearDebug[yearStr] = 0;
        yearDebug[yearStr]++;
      }
    });

    this.state.availableYears = Array.from(years).sort();

    if (this.state.availableYears.length === 0) {
      alert('ข้อผิดพลาด: ไม่พบข้อมูล "ปี" ในฐานข้อมูล\nกรุณาตรวจสอบข้อมูลที่อัปโหลด');
    }

    this.state.startYear = 'all';
    this.state.endYear = 'all';
    this.state.selectedYear = 'all';
    this.state.startMonth = 'all';
    this.state.endMonth = 'all';
    this.state.filterMode = 'yearRange';
  },

  getMonthName(monthNum) {
    const monthMap = {
      '1': 'ม.ค.', '01': 'ม.ค.', '2': 'ก.พ.', '02': 'ก.พ.', '3': 'มี.ค.', '03': 'มี.ค.',
      '4': 'เม.ย.', '04': 'เม.ย.', '5': 'พ.ค.', '05': 'พ.ค.', '6': 'มิ.ย.', '06': 'มิ.ย.',
      '7': 'ก.ค.', '07': 'ก.ค.', '8': 'ส.ค.', '08': 'ส.ค.', '9': 'ก.ย.', '09': 'ก.ย.',
      '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.'
    };
    return monthMap[String(monthNum)] || null;
  },

  // ฟังก์ชันประมวลผลข้อมูล - รองรับทั้งแบบรายปี และรายเดือน
  processData() {
    let startY, endY, startM, endM;

    if (this.state.filterMode === 'yearRange') {
      const rawStart = this.state.startYear === 'all' ? Math.min(...this.state.availableYears.map(Number)) : Number(this.state.startYear);
      const rawEnd = this.state.endYear === 'all' ? Math.max(...this.state.availableYears.map(Number)) : Number(this.state.endYear);
      startY = Math.min(rawStart, rawEnd);
      endY = Math.max(rawStart, rawEnd);
      startM = 1;
      endM = 12;
    } else {
      if (this.state.selectedYear === 'all') {
        startY = Math.min(...this.state.availableYears.map(Number));
        endY = Math.max(...this.state.availableYears.map(Number));
      } else {
        startY = endY = Number(this.state.selectedYear);
      }
      startM = this.state.startMonth === 'all' ? 1 : this.state.monthToNum[this.state.startMonth];
      endM = this.state.endMonth === 'all' ? 12 : this.state.monthToNum[this.state.endMonth];
    }

    // ถ้าเป็นโหมดช่วงปี -> รวมเป็นรายปี
    if (this.state.filterMode === 'yearRange') {
      const yearlyData = new Map();

      this.state.rawData.forEach(record => {
        const recordY = Number(record.year);
        const recordMName = this.getMonthName(record.month);
        const recordM = recordMName ? this.state.monthToNum[recordMName] : null;

        if (!recordM || recordY < startY || recordY > endY) return;

        let inMonthRange = false;
        if (startY === endY) {
          if (recordM >= startM && recordM <= endM) inMonthRange = true;
        } else if (recordY === startY) {
          if (recordM >= startM) inMonthRange = true;
        } else if (recordY === endY) {
          if (recordM <= endM) inMonthRange = true;
        } else if (recordY > startY && recordY < endY) {
          inMonthRange = true;
        }

        if (!inMonthRange) return;

        // รวมข้อมูลตามปี
        if (!yearlyData.has(recordY)) {
          yearlyData.set(recordY, {
            year: recordY,
            totalIncome: 0,
            otOPD: 0,
            otProfessional: 0,
            otAssistant: 0,
            shiftProfessional: 0,
            shiftAssistant: 0,
            p4p: 0,
            count: 0
          });
        }

        const data = yearlyData.get(recordY);

        // รายได้รวม = เงินเดือนหลักเท่านั้น (ไม่รวมค่าหัก)
        data.totalIncome += parseFloat(record.salary || 0);

        data.otOPD += parseFloat(record.ot_outpatient_dept || 0);
        data.otProfessional += parseFloat(record.ot_professional || 0);
        data.otAssistant += parseFloat(record.ot_assistant || 0);

        data.shiftProfessional += parseFloat(record.shift_professional || 0);
        data.shiftAssistant += parseFloat(record.shift_assistant || 0);

        data.p4p += parseFloat(record.pay_for_performance || 0);

        data.count++;
      });

      // แปลงเป็น array และคำนวณค่าเฉลี่ย
      this.state.processedData = Array.from(yearlyData.values())
        .sort((a, b) => a.year - b.year)
        .map(data => {
          return data.count > 0
            ? {
              year: data.year,
              label: `ปี ${data.year}`,
              totalIncome: Math.round(data.totalIncome / data.count),
              otOPD: Math.round(data.otOPD / data.count),
              otProfessional: Math.round(data.otProfessional / data.count),
              otAssistant: Math.round(data.otAssistant / data.count),
              shiftProfessional: Math.round(data.shiftProfessional / data.count),
              shiftAssistant: Math.round(data.shiftAssistant / data.count),
              p4p: Math.round(data.p4p / data.count),
              count: data.count
            }
            : {
              year: data.year,
              label: `ปี ${data.year}`,
              totalIncome: 0,
              otOPD: 0,
              otProfessional: 0,
              otAssistant: 0,
              shiftProfessional: 0,
              shiftAssistant: 0,
              p4p: 0,
              count: 0
            };
        });
    } 
    // ถ้าเป็นโหมดปี+เดือน -> แสดงรายเดือน
    else {
      const monthlyData = new Map();

      this.state.rawData.forEach(record => {
        const recordY = Number(record.year);
        const recordMName = this.getMonthName(record.month);
        const recordM = recordMName ? this.state.monthToNum[recordMName] : null;

        if (!recordM || recordY < startY || recordY > endY) return;

        let inMonthRange = false;
        if (startY === endY) {
          if (recordM >= startM && recordM <= endM) inMonthRange = true;
        } else if (recordY === startY) {
          if (recordM >= startM) inMonthRange = true;
        } else if (recordY === endY) {
          if (recordM <= endM) inMonthRange = true;
        } else if (recordY > startY && recordY < endY) {
          inMonthRange = true;
        }

        if (!inMonthRange) return;

        const key = `${recordY}-${recordM}`;

        if (!monthlyData.has(key)) {
          monthlyData.set(key, {
            year: recordY,
            month: recordMName,
            monthNum: recordM,
            totalIncome: 0,
            otOPD: 0,
            otProfessional: 0,
            otAssistant: 0,
            shiftProfessional: 0,
            shiftAssistant: 0,
            p4p: 0,
            count: 0
          });
        }

        const data = monthlyData.get(key);

        // รายได้รวม = เงินเดือนหลักเท่านั้น (ไม่รวมค่าหัก)
        data.totalIncome += parseFloat(record.salary || 0);

        data.otOPD += parseFloat(record.ot_outpatient_dept || 0);
        data.otProfessional += parseFloat(record.ot_professional || 0);
        data.otAssistant += parseFloat(record.ot_assistant || 0);

        data.shiftProfessional += parseFloat(record.shift_professional || 0);
        data.shiftAssistant += parseFloat(record.shift_assistant || 0);

        data.p4p += parseFloat(record.pay_for_performance || 0);

        data.count++;
      });

      this.state.processedData = Array.from(monthlyData.values())
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.monthNum - b.monthNum;
        })
        .map(data => {
          return data.count > 0
            ? {
              year: data.year,
              month: data.month,
              monthNum: data.monthNum,
              label: `${data.month} ${data.year}`,
              totalIncome: Math.round(data.totalIncome / data.count),
              otOPD: Math.round(data.otOPD / data.count),
              otProfessional: Math.round(data.otProfessional / data.count),
              otAssistant: Math.round(data.otAssistant / data.count),
              shiftProfessional: Math.round(data.shiftProfessional / data.count),
              shiftAssistant: Math.round(data.shiftAssistant / data.count),
              p4p: Math.round(data.p4p / data.count),
              count: data.count
            }
            : {
              year: data.year,
              month: data.month,
              monthNum: data.monthNum,
              label: `${data.month} ${data.year}`,
              totalIncome: 0,
              otOPD: 0,
              otProfessional: 0,
              otAssistant: 0,
              shiftProfessional: 0,
              shiftAssistant: 0,
              p4p: 0,
              count: 0
            };
        });
    }
  },

  getTemplate() {
    return `
      <div class="payroll-dashboard">
        <div class="dashboard-container">
          <header class="dashboard-header">
            <div class="header-main-row">
              <button class="back-btn" id="backBtn">Home</button>
              <div class="header-title">
                <h1>📊 Dashboard เงินเดือน</h1>
                <p>สรุปข้อมูลเงินเดือนทั้งหมด</p>
              </div>
            </div>
            <div class="header-controls">
              <div class="mode-selector">
                <button class="mode-btn active" id="yearRangeMode">📅 ช่วงปี</button>
                <button class="mode-btn" id="singleYearMode">📆 ปี + เดือน</button>
              </div>
              <div class="filter-group year-range-group" id="yearRangeFilter">
                <label>ช่วงปี:</label>
                <select id="startYearSelect" class="filter-select"><option value="all">ทั้งหมด</option></select>
                <label class="range-separator">ถึง</label>
                <select id="endYearSelect" class="filter-select"><option value="all">ทั้งหมด</option></select>
              </div>
              <div class="filter-group single-year-group" id="singleYearFilter" style="display: none;">
                <label>ปี:</label>
                <select id="selectedYearSelect" class="filter-select"><option value="all">ทั้งหมด</option></select>
                <label style="margin-left: 10px;">ช่วงเดือน:</label>
                <select id="startMonthSelect" class="filter-select"><option value="all">ทั้งหมด</option></select>
                <label class="range-separator">ถึง</label>
                <select id="endMonthSelect" class="filter-select"><option value="all">ทั้งหมด</option></select>
              </div>
              <button class="reset-btn" id="resetBtn">🔄 ล้างตัวกรอง</button>
            </div>
          </header>
          <div id="dashboardLoading" class="loading-container" style="display: none;">กำลังโหลดข้อมูล...</div>
          <div class="stats-grid" id="statsGrid"></div>
          <div class="charts-grid">
            <div class="chart-card">
              <h3>📊 การเปรียบเทียบรายได้</h3>
              <div class="chart-container chart-container-pie">
                <canvas id="incomeChart"></canvas>
              </div>
              <div class="chart-legend" id="incomeLegend"></div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <h3>⏰ แนวโน้มค่าล่วงเวลา (OT)</h3>
                <div class="chart-toggle">
                  <button class="toggle-btn active" data-chart="ot" data-mode="combined">รวม</button>
                  <button class="toggle-btn" data-chart="ot" data-mode="separated">แยก</button>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="otChart"></canvas>
              </div>
              <div class="chart-legend" id="otLegend"></div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <h3>🌙 แนวโน้มค่าเวร</h3>
                <div class="chart-toggle">
                  <button class="toggle-btn active" data-chart="shift" data-mode="combined">รวม</button>
                  <button class="toggle-btn" data-chart="shift" data-mode="separated">แยก</button>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="shiftChart"></canvas>
              </div>
              <div class="chart-legend" id="shiftLegend"></div>
            </div>
            <div class="chart-card">
              <h3>📈 แนวโน้ม P4P</h3>
              <div class="chart-container">
                <canvas id="p4pChart"></canvas>
              </div>
              <div class="chart-legend" id="p4pLegend"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  getYearlyChartData() {
    const yearly = {};
    const rawStart = this.state.startYear === 'all' ? Math.min(...this.state.availableYears.map(Number)) : Number(this.state.startYear);
    const rawEnd = this.state.endYear === 'all' ? Math.max(...this.state.availableYears.map(Number)) : Number(this.state.endYear);
    const startY = Math.min(rawStart, rawEnd);
    const endY = Math.max(rawStart, rawEnd);

    this.state.rawData.forEach(r => {
      const y = Number(r.year);
      if (y < startY || y > endY) return;

      if (!yearly[y]) {
        yearly[y] = {
          year: y, totalIncome: 0, otOPD: 0, otProfessional: 0, otAssistant: 0,
          shiftProfessional: 0, shiftAssistant: 0, p4p: 0
        };
      }

      yearly[y].totalIncome += parseFloat(r.salary || 0);
      yearly[y].otOPD += parseFloat(r.ot_outpatient_dept || 0);
      yearly[y].otProfessional += parseFloat(r.ot_professional || 0);
      yearly[y].otAssistant += parseFloat(r.ot_assistant || 0);
      yearly[y].shiftProfessional += parseFloat(r.shift_professional || 0);
      yearly[y].shiftAssistant += parseFloat(r.shift_assistant || 0);
      yearly[y].p4p += parseFloat(r.pay_for_performance || 0);
    });

    return Object.values(yearly).sort((a, b) => a.year - b.year);
  },

  updateCards() {
    let totalPersonnel = new Set();
    let totalRecords = 0;
    let totalIncome = 0, totalP4P = 0, totalOT = 0, totalShift = 0;

    let startY, endY, startM, endM;

    if (this.state.filterMode === 'yearRange') {
      const rawStart = this.state.startYear === 'all' ? Math.min(...this.state.availableYears.map(Number)) : Number(this.state.startYear);
      const rawEnd = this.state.endYear === 'all' ? Math.max(...this.state.availableYears.map(Number)) : Number(this.state.endYear);
      startY = Math.min(rawStart, rawEnd);
      endY = Math.max(rawStart, rawEnd);
      startM = 1;
      endM = 12;
    } else {
      if (this.state.selectedYear === 'all') {
        startY = Math.min(...this.state.availableYears.map(Number));
        endY = Math.max(...this.state.availableYears.map(Number));
      } else {
        startY = endY = Number(this.state.selectedYear);
      }
      startM = this.state.startMonth === 'all' ? 1 : this.state.monthToNum[this.state.startMonth];
      endM = this.state.endMonth === 'all' ? 12 : this.state.monthToNum[this.state.endMonth];
    }

    this.state.rawData.forEach(record => {
      const recordY = Number(record.year);
      const recordMName = this.getMonthName(record.month);
      const recordM = recordMName ? this.state.monthToNum[recordMName] : null;

      if (!recordM || recordY < startY || recordY > endY) return;

      let inMonthRange = false;
      if (startY === endY) {
        if (recordM >= startM && recordM <= endM) inMonthRange = true;
      } else if (recordY === startY) {
        if (recordM >= startM) inMonthRange = true;
      } else if (recordY === endY) {
        if (recordM <= endM) inMonthRange = true;
      } else if (recordY > startY && recordY < endY) {
        inMonthRange = true;
      }

      if (!inMonthRange) return;

      const cid = record.cid || record.citizen_id || record.id_card || record.employee_id;
      if (cid) totalPersonnel.add(cid);

      totalRecords++;
      totalIncome += parseFloat(record.salary || 0);
      totalP4P += parseFloat(record.pay_for_performance || 0);
      totalOT += parseFloat(record.ot_outpatient_dept || 0) +
        parseFloat(record.ot_professional || 0) + parseFloat(record.ot_assistant || 0);
      totalShift += parseFloat(record.shift_professional || 0) +
        parseFloat(record.shift_assistant || 0);
    });

    const periodLabel = (this.state.filterMode === 'yearRange' && this.state.startYear === 'all' && this.state.endYear === 'all')
      ? ' (ทั้งหมด)'
      : (this.state.filterMode === 'singleYear' && this.state.selectedYear !== 'all')
        ? ` (ปี ${this.state.selectedYear})`
        : ' (ช่วงที่เลือก)';

    const avgPerMonth = totalRecords > 0 ? totalIncome / totalRecords : 0;
    const avgP4P = totalRecords > 0 ? totalP4P / totalRecords : 0;
    const avgOT = totalRecords > 0 ? totalOT / totalRecords : 0;
    const avgShift = totalRecords > 0 ? totalShift / totalRecords : 0;

    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="card-content">
            <div>
              <p class="card-title">จำนวนบุคลากรทั้งหมด</p>
              <h3 class="card-value">${totalPersonnel.size.toLocaleString()} คน</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">${totalRecords.toLocaleString()} รายการข้อมูล</p>
            </div>
            <div class="card-icon orange">👥</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div>
              <p class="card-title">รายได้รวม ${periodLabel}</p>
              <h3 class="card-value">฿${totalIncome.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgPerMonth).toLocaleString()}/เดือน</p>
            </div>
            <div class="card-icon blue">💰</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div>
              <p class="card-title">ค่า P4P ${periodLabel}</p>
              <h3 class="card-value">฿${totalP4P.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgP4P).toLocaleString()}/เดือน</p>
            </div>
            <div class="card-icon green">📈</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div>
              <p class="card-title">ค่า OT รวม ${periodLabel}</p>
              <h3 class="card-value">฿${totalOT.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgOT).toLocaleString()}/เดือน</p>
            </div>
            <div class="card-icon purple">⏰</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div>
              <p class="card-title">ค่าเวรรวม ${periodLabel}</p>
              <h3 class="card-value">฿${totalShift.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgShift).toLocaleString()}/เดือน</p>
            </div>
            <div class="card-icon pink">🌙</div>
          </div>
        </div>
      `;
    }
  },

  // ฟังก์ชันสร้างเฉดสีไล่ระดับ
  generateGradientColors(baseColor, count) {
    // แปลง hex เป็น RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const baseRgb = hexToRgb(baseColor);
    if (!baseRgb) return Array(count).fill(baseColor);
    
    const colors = [];
    for (let i = 0; i < count; i++) {
      const factor = 0.3 + (i / (count - 1)) * 0.7; // ไล่จากอ่อน (0.3) ถึงเข้ม (1.0)
      const r = Math.round(baseRgb.r * factor + 255 * (1 - factor));
      const g = Math.round(baseRgb.g * factor + 255 * (1 - factor));
      const b = Math.round(baseRgb.b * factor + 255 * (1 - factor));
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
    
    return colors;
  },

  // ฟังก์ชันคำนวณความกว้างตามจำนวนข้อมูล
  calculateChartWidth(dataCount, chartType = 'normal') {
    // กราฟวงกลม - ไม่ต้อง scrollbar
    if (chartType === 'pie') {
      return '100%';
    }
    
    // กราฟเส้น (ช่วงปี) - คำนวณตามจำนวนปี
    if (this.state.filterMode === 'yearRange') {
      const minWidthPerPoint = 150; // ความกว้างต่อ 1 ปี
      const calculatedWidth = dataCount * minWidthPerPoint;
      // ถ้าข้อมูลน้อย ใช้ความกว้างปกติ (ไม่มี scrollbar)
      return calculatedWidth > 900 ? calculatedWidth : '100%';
    }
    
    // กราฟแท่ง (ปี+เดือน) - คำนวณตามจำนวนเดือน
    const minWidthPerPoint = 80; // ความกว้างต่อ 1 เดือน
    const calculatedWidth = dataCount * minWidthPerPoint;
    // ถ้าข้อมูลน้อย ใช้ความกว้างปกติ
    return calculatedWidth > 800 ? calculatedWidth : '100%';
  },

  // ฟังก์ชันสร้างกราฟครั้งแรก
  createCharts() {
    const data = this.state.processedData;
    const labels = data.map(d => d.label);
    
    // เลือกประเภทกราฟตาม filterMode
    const chartType = this.state.filterMode === 'yearRange' ? 'line' : 'bar';
    const dynamicWidth = this.calculateChartWidth(data.length, chartType);

    if (typeof Chart === 'undefined') {
      setTimeout(() => this.createCharts(), 500);
      return;
    }

    // ล้างกราฟเก่าออกก่อน
    Object.values(this.state.charts).forEach(chart => { if (chart) chart.destroy(); });

    // --- Income Pie Chart (ไม่มี scrollbar) ---
    const incomeCtx = document.getElementById('incomeChart');
    if (incomeCtx) {
      const container = incomeCtx.parentElement;
      
      // ไม่สร้าง wrapper สำหรับ pie chart
      incomeCtx.style.width = '100%';
      incomeCtx.style.height = '100%';
      
      const totalIncome = data.reduce((sum, d) => sum + (parseFloat(d.totalIncome) || 0), 0);
      const totalOT = data.reduce((sum, d) => sum + (parseFloat(d.otOPD || 0) + parseFloat(d.otProfessional || 0) + parseFloat(d.otAssistant || 0)), 0);
      const totalP4P = data.reduce((sum, d) => sum + (parseFloat(d.p4p) || 0), 0);
      const totalShift = data.reduce((sum, d) => sum + (parseFloat(d.shiftProfessional || 0) + parseFloat(d.shiftAssistant || 0)), 0);

      this.state.charts.income = new Chart(incomeCtx, {
        type: 'pie',
        data: {
          labels: ['รายได้รวม', 'OT', 'P4P', 'ค่าเวร'],
          datasets: [{
            data: [totalIncome, totalOT, totalP4P, totalShift],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      
      // สร้าง custom legend
      const legendContainer = document.getElementById('incomeLegend');
      if (legendContainer) {
        const legendItems = [
          { label: 'รายได้รวม', color: '#3b82f6' },
          { label: 'OT', color: '#8b5cf6' },
          { label: 'P4P', color: '#10b981' },
          { label: 'ค่าเวร', color: '#f59e0b' }
        ];
        legendContainer.innerHTML = legendItems.map(item => 
          `<div class="legend-item">
            <span class="legend-color" style="background-color: ${item.color}"></span>
            <span class="legend-label">${item.label}</span>
          </div>`
        ).join('');
      }
    }

    // --- กราฟเส้น/แท่งที่มี Scrollbar (ถ้าข้อมูลเยอะ) ---
    const chartConfigs = [
      { id: 'otChart', key: 'ot', label: 'ค่า OT รวม', color: '#7c3aed', bgColor: 'rgba(139, 92, 246, 0.1)', dataKey: (d) => (d.otOPD || 0) + (d.otProfessional || 0) + (d.otAssistant || 0) },
      { id: 'shiftChart', key: 'shift', label: 'ค่าเวรรวม', color: '#d97706', bgColor: 'rgba(245, 158, 11, 0.1)', dataKey: (d) => (d.shiftProfessional || 0) + (d.shiftAssistant || 0) },
      { id: 'p4pChart', key: 'p4p', label: 'P4P', color: '#059669', bgColor: 'rgba(16, 185, 129, 0.1)', dataKey: (d) => d.p4p || 0 }
    ];

    chartConfigs.forEach(cfg => {
      const canvas = document.getElementById(cfg.id);
      if (canvas) {
        const container = canvas.parentElement;
        
        // ล้าง wrapper เก่าถ้ามี
        const oldWrapper = container.querySelector('.chart-wrapper');
        if (oldWrapper) {
          const oldCanvas = oldWrapper.querySelector('canvas');
          if (oldCanvas) {
            container.appendChild(oldCanvas);
          }
          oldWrapper.remove();
        }
        
        // สร้าง wrapper เฉพาะเมื่อต้องการ scrollbar
        if (dynamicWidth !== '100%') {
          const wrapper = document.createElement('div');
          wrapper.className = 'chart-wrapper';
          wrapper.style.width = `${dynamicWidth}px`;
          wrapper.style.height = '280px';
          wrapper.style.position = 'relative';
          
          container.appendChild(wrapper);
          wrapper.appendChild(canvas);
          
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        } else {
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
        
        // สร้างกราฟตามประเภท
        const isLineChart = chartType === 'line';
        
        // สร้างสีไล่ระดับสำหรับกราฟแท่ง
        const barColors = !isLineChart ? this.generateGradientColors(cfg.color, data.length) : null;
        
        this.state.charts[cfg.key] = new Chart(canvas, {
          type: chartType,
          data: {
            labels: labels,
            datasets: [{
              label: cfg.label,
              data: data.map(cfg.dataKey),
              borderColor: cfg.color,
              backgroundColor: isLineChart ? cfg.bgColor : barColors,
              fill: isLineChart,
              tension: isLineChart ? 0.4 : 0,
              borderWidth: isLineChart ? 3 : 0,
              pointRadius: isLineChart ? 5 : 0,
              pointHoverRadius: isLineChart ? 7 : 0,
              borderRadius: isLineChart ? 0 : 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: { 
                beginAtZero: true, 
                ticks: { 
                  callback: v => '฿' + v.toLocaleString(),
                  font: { size: 12 }
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: { 
                ticks: { 
                  maxRotation: isLineChart ? 0 : 45, 
                  minRotation: isLineChart ? 0 : 45, 
                  font: { size: isLineChart ? 13 : 10, weight: isLineChart ? '600' : '500' }
                },
                grid: {
                  display: false
                }
              }
            }
          }
        });
        
        // สร้าง custom legend
        const legendId = cfg.key === 'ot' ? 'otLegend' : cfg.key === 'shift' ? 'shiftLegend' : 'p4pLegend';
        const legendContainer = document.getElementById(legendId);
        if (legendContainer) {
          legendContainer.innerHTML = `
            <div class="legend-item">
              <span class="legend-color" style="background-color: ${cfg.color}"></span>
              <span class="legend-label">${cfg.label}</span>
            </div>
          `;
        }
      }
    });
  },

  // ฟังก์ชันอัปเดตกราฟ (ตอนกดปุ่มสลับ รวม/แยก)
  updateChart(chartName, mode) {
    const data = this.state.processedData;
    const labels = data.map(d => d.label);
    const chartType = this.state.filterMode === 'yearRange' ? 'line' : 'bar';
    const dynamicWidth = this.calculateChartWidth(data.length, chartType);

    const canvas = document.getElementById(chartName === 'ot' ? 'otChart' : 'shiftChart');
    if (!canvas) return;

    // ล้างกราฟเก่า
    if (this.state.charts[chartName]) this.state.charts[chartName].destroy();

    // อัปเดต wrapper width (ถ้ามี)
    const wrapper = canvas.closest('.chart-wrapper');
    if (wrapper && dynamicWidth !== '100%') {
      wrapper.style.width = `${dynamicWidth}px`;
    }

    const isLineChart = chartType === 'line';
    let datasets = [];
    
    if (chartName === 'ot') {
      if (mode === 'combined') {
        const barColors = !isLineChart ? this.generateGradientColors('#7c3aed', data.length) : null;
        datasets = [{
          label: 'ค่า OT รวม',
          data: data.map(d => (d.otOPD || 0) + (d.otProfessional || 0) + (d.otAssistant || 0)),
          borderColor: '#7c3aed',
          backgroundColor: isLineChart ? 'rgba(139, 92, 246, 0.1)' : barColors,
          fill: isLineChart,
          tension: isLineChart ? 0.4 : 0,
          borderWidth: isLineChart ? 3 : 0,
          pointRadius: isLineChart ? 5 : 0,
          pointHoverRadius: isLineChart ? 7 : 0,
          borderRadius: isLineChart ? 0 : 6
        }];
      } else {
        datasets = [
          {
            label: 'OT/OPD',
            data: data.map(d => d.otOPD || 0),
            borderColor: '#7c3aed',
            backgroundColor: isLineChart ? 'rgba(124, 58, 237, 0.1)' : '#7c3aed',
            fill: isLineChart,
            tension: isLineChart ? 0.4 : 0,
            borderWidth: isLineChart ? 2 : 0,
            pointRadius: isLineChart ? 4 : 0,
            pointHoverRadius: isLineChart ? 6 : 0,
            borderRadius: isLineChart ? 0 : 4
          },
          {
            label: 'OT/พบ.',
            data: data.map(d => d.otProfessional || 0),
            borderColor: '#a78bfa',
            backgroundColor: isLineChart ? 'rgba(167, 139, 250, 0.1)' : '#a78bfa',
            fill: isLineChart,
            tension: isLineChart ? 0.4 : 0,
            borderWidth: isLineChart ? 2 : 0,
            pointRadius: isLineChart ? 4 : 0,
            pointHoverRadius: isLineChart ? 6 : 0,
            borderRadius: isLineChart ? 0 : 4
          },
          {
            label: 'OT/ผช.',
            data: data.map(d => d.otAssistant || 0),
            borderColor: '#c4b5fd',
            backgroundColor: isLineChart ? 'rgba(196, 181, 253, 0.1)' : '#c4b5fd',
            fill: isLineChart,
            tension: isLineChart ? 0.4 : 0,
            borderWidth: isLineChart ? 2 : 0,
            pointRadius: isLineChart ? 4 : 0,
            pointHoverRadius: isLineChart ? 6 : 0,
            borderRadius: isLineChart ? 0 : 4
          }
        ];
      }
    } else if (chartName === 'shift') {
      if (mode === 'combined') {
        const barColors = !isLineChart ? this.generateGradientColors('#d97706', data.length) : null;
        datasets = [{
          label: 'ค่าเวรรวม',
          data: data.map(d => (d.shiftProfessional || 0) + (d.shiftAssistant || 0)),
          borderColor: '#d97706',
          backgroundColor: isLineChart ? 'rgba(245, 158, 11, 0.1)' : barColors,
          fill: isLineChart,
          tension: isLineChart ? 0.4 : 0,
          borderWidth: isLineChart ? 3 : 0,
          pointRadius: isLineChart ? 5 : 0,
          pointHoverRadius: isLineChart ? 7 : 0,
          borderRadius: isLineChart ? 0 : 6
        }];
      } else {
        datasets = [
          {
            label: 'บ-ด/พบ.',
            data: data.map(d => d.shiftProfessional || 0),
            borderColor: '#d97706',
            backgroundColor: isLineChart ? 'rgba(217, 119, 6, 0.1)' : '#d97706',
            fill: isLineChart,
            tension: isLineChart ? 0.4 : 0,
            borderWidth: isLineChart ? 2 : 0,
            pointRadius: isLineChart ? 4 : 0,
            pointHoverRadius: isLineChart ? 6 : 0,
            borderRadius: isLineChart ? 0 : 4
          },
          {
            label: 'บ-ด/ผช.',
            data: data.map(d => d.shiftAssistant || 0),
            borderColor: '#fbbf24',
            backgroundColor: isLineChart ? 'rgba(251, 191, 36, 0.1)' : '#fbbf24',
            fill: isLineChart,
            tension: isLineChart ? 0.4 : 0,
            borderWidth: isLineChart ? 2 : 0,
            pointRadius: isLineChart ? 4 : 0,
            pointHoverRadius: isLineChart ? 6 : 0,
            borderRadius: isLineChart ? 0 : 4
          }
        ];
      }
    }

    this.state.charts[chartName] = new Chart(canvas, {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            display: false
          } 
        },
        scales: {
          y: { 
            beginAtZero: true, 
            ticks: { 
              callback: v => '฿' + v.toLocaleString(),
              font: { size: 12 }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: { 
            ticks: { 
              maxRotation: isLineChart ? 0 : 45, 
              minRotation: isLineChart ? 0 : 45, 
              font: { size: isLineChart ? 13 : 10, weight: isLineChart ? '600' : '500' }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
    
    // อัปเดต custom legend
    const legendId = chartName === 'ot' ? 'otLegend' : 'shiftLegend';
    const legendContainer = document.getElementById(legendId);
    if (legendContainer) {
      legendContainer.innerHTML = datasets.map(ds => `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${ds.borderColor}"></span>
          <span class="legend-label">${ds.label}</span>
        </div>
      `).join('');
    }
  },

  setupEventListeners() {
    const yearRangeModeBtn = document.getElementById('yearRangeMode');
    const singleYearModeBtn = document.getElementById('singleYearMode');
    const yearRangeFilter = document.getElementById('yearRangeFilter');
    const singleYearFilter = document.getElementById('singleYearFilter');
    const startYearSelect = document.getElementById('startYearSelect');
    const endYearSelect = document.getElementById('endYearSelect');
    const selectedYearSelect = document.getElementById('selectedYearSelect');
    const startMonthSelect = document.getElementById('startMonthSelect');
    const endMonthSelect = document.getElementById('endMonthSelect');
    const resetBtn = document.getElementById('resetBtn');

    const updateDashboard = () => {
      this.processData();
      this.updateCards();
      this.createCharts();
    };

    const switchMode = (mode) => {
      this.state.filterMode = mode;
      if (mode === 'yearRange') {
        yearRangeModeBtn.classList.add('active');
        singleYearModeBtn.classList.remove('active');
        yearRangeFilter.style.display = 'flex';
        singleYearFilter.style.display = 'none';
      } else {
        yearRangeModeBtn.classList.remove('active');
        singleYearModeBtn.classList.add('active');
        yearRangeFilter.style.display = 'none';
        singleYearFilter.style.display = 'flex';
      }
      updateDashboard();
    };

    yearRangeModeBtn.addEventListener('click', () => switchMode('yearRange'));
    singleYearModeBtn.addEventListener('click', () => switchMode('singleYear'));

    // Toggle buttons for OT and Shift
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartName = e.target.dataset.chart;
        const mode = e.target.dataset.mode;

        const siblings = e.target.parentElement.querySelectorAll('.toggle-btn');
        siblings.forEach(s => s.classList.remove('active'));
        e.target.classList.add('active');

        this.updateChart(chartName, mode);
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.state.startYear = 'all';
        this.state.endYear = 'all';
        this.state.selectedYear = 'all';
        this.state.startMonth = 'all';
        this.state.endMonth = 'all';
        if (startYearSelect) startYearSelect.value = 'all';
        if (endYearSelect) endYearSelect.value = 'all';
        if (selectedYearSelect) selectedYearSelect.value = 'all';
        if (startMonthSelect) startMonthSelect.value = 'all';
        if (endMonthSelect) endMonthSelect.value = 'all';
        updateDashboard();
      });
    }

    if (startYearSelect && endYearSelect) {
      startYearSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
      endYearSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
      this.state.availableYears.forEach(year => {
        const optionS = document.createElement('option');
        optionS.value = year;
        optionS.textContent = `ปี ${year}`;
        startYearSelect.appendChild(optionS);
        const optionE = document.createElement('option');
        optionE.value = year;
        optionE.textContent = `ปี ${year}`;
        endYearSelect.appendChild(optionE);
      });
      startYearSelect.value = this.state.startYear;
      endYearSelect.value = this.state.endYear;
      startYearSelect.addEventListener('change', (e) => {
        this.state.startYear = e.target.value;
        updateDashboard();
      });
      endYearSelect.addEventListener('change', (e) => {
        this.state.endYear = e.target.value;
        updateDashboard();
      });
    }

    if (selectedYearSelect) {
      selectedYearSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
      this.state.availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `ปี ${year}`;
        selectedYearSelect.appendChild(option);
      });
      selectedYearSelect.value = this.state.selectedYear;
      selectedYearSelect.addEventListener('change', (e) => {
        this.state.selectedYear = e.target.value;
        updateDashboard();
      });
    }

    if (startMonthSelect && endMonthSelect) {
      startMonthSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
      endMonthSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
      this.state.availableMonths.forEach(month => {
        const optionS = document.createElement('option');
        optionS.value = month;
        optionS.textContent = month;
        startMonthSelect.appendChild(optionS);
        const optionE = document.createElement('option');
        optionE.value = month;
        optionE.textContent = month;
        endMonthSelect.appendChild(optionE);
      });
      startMonthSelect.value = this.state.startMonth;
      endMonthSelect.value = this.state.endMonth;
      startMonthSelect.addEventListener('change', (e) => {
        this.state.startMonth = e.target.value;
        updateDashboard();
      });
      endMonthSelect.addEventListener('change', (e) => {
        this.state.endMonth = e.target.value;
        updateDashboard();
      });
    }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.router && typeof window.router.navigate === 'function') {
          router.navigate('/home', true);
        } else {
          window.location.href = 'index.html';
        }
      });
    }
  },

  loadChartJS() {
    return new Promise((resolve) => {
      if (typeof Chart !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = () => { resolve(); };
      script.onerror = () => {
        console.error("❌ Failed to load Chart.js");
        resolve();
      };
      document.head.appendChild(script);
    });
  },

  async init(containerId = 'root') {
    try {
      await this.loadChartJS();

      const container = document.getElementById(containerId);
      if (!container) {
        console.error('❌ Container not found:', containerId);
        return;
      }

      container.innerHTML = this.getTemplate();

      const loading = document.getElementById('dashboardLoading');
      if (loading) loading.style.display = 'flex';

      const success = await this.fetchData();

      if (loading) loading.style.display = 'none';

      if (success) {
        this.setupEventListeners();
        this.processData();
        this.updateCards();
        setTimeout(() => {
          this.createCharts();
        }, 100);
      } else {
        console.error('❌ Failed to load data');
        container.innerHTML = `
          <div style="text-align:center;padding:50px;">
            <h2>❌ ไม่สามารถโหลดข้อมูลได้</h2>
            <p>กรุณาตรวจสอบ Console (F12) เพื่อดู Error</p>
            <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;">รีเฟรชหน้า</button>
          </div>
        `;
      }
    } catch (error) {
      console.error('❌ Failed to initialize dashboard:', error);
    }
  }
};

// Export functions
window.renderDashboard = function () {
  return PayrollDashboard.init('root');
};

window.PayrollDashboard = PayrollDashboard;