// ============================================
// dashboard.js - Payroll Dashboard with Dual Filter Mode
// ============================================

const PayrollDashboard = {
  state: {
    activeTab: 'all',
    filterMode: 'yearRange',
    startYear: 'all',
    endYear: 'all',
    selectedYear: 'all',
    startMonth: 'all',
    endMonth: 'all',
    charts: {},
    rawData: [],
    processedData: { all: [], employee: [], government: [] },
    availableYears: [],
    availableMonths: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
    monthToNum: {
      'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
      'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
    }
  },

  async fetchData() {
    try {
      window.API = window.API || {
        get: async () => ({
          status: 'success',
          data: [
            { year: '2564', month: '1', employee: 'ข้าราชการ', salary: 30000, overtime_pay: 5000, evening_night_shift_pay: 2000, pay_for_performance: 1000, cid: '1234567890123' },
            { year: '2564', month: '2', employee: 'ข้าราชการ', salary: 30500, overtime_pay: 5500, evening_night_shift_pay: 2200, pay_for_performance: 1100, cid: '1234567890123' },
            { year: '2564', month: '3', employee: 'ลูกจ้างเงินเดือน', salary_deductions: 18000, ot_outpatient_dept: 1000, ot_professional: 500, ot_assistant: 300, shift_professional: 200, shift_assistant: 100, pay_for_performance: 500, cid: '9876543210987' },
            { year: '2565', month: '1', employee: 'ข้าราชการ', salary: 32000, overtime_pay: 7000, evening_night_shift_pay: 3000, pay_for_performance: 1500, cid: '1111222233334' },
            { year: '2565', month: '12', employee: 'ลูกจ้าง', salary_deductions: 20000, ot_outpatient_dept: 1500, ot_professional: 750, ot_assistant: 500, shift_professional: 400, shift_assistant: 200, pay_for_performance: 750, cid: '5555666677778' },
          ]
        })
      };

      const response = await API.get('salary-data', {});
      if (response.status === 'success') {
        this.state.rawData = response.data || [];
        this.extractYears();
        this.processData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch salary data:', error);
      return false;
    }
  },

  extractYears() {
    const years = new Set();
    this.state.rawData.forEach(record => {
      if (record.year) years.add(String(record.year));
    });
    this.state.availableYears = Array.from(years).sort();
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

  processData() {
    const months = this.state.availableMonths;
    let startY, endY, startM, endM;

    if (this.state.filterMode === 'yearRange') {
      // แก้ไขตรงนี้: ใช้ Math.min/max เพื่อรองรับการเลือกปีสลับกัน (เช่น 2569 - 2568)
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

    const allData = new Map(months.map(month => [month, { month, salary: 0, ot: 0, shift: 0, p4p: 0, count: 0 }]));
    const employeeData = new Map(months.map(month => [month, { month, netSalary: 0, otOpd: 0, otPh: 0, otAsst: 0, shiftPh: 0, shiftAsst: 0, p4p: 0, count: 0 }]));
    const governmentData = new Map(months.map(month => [month, { month, salary: 0, ot: 0, shift: 0, p4p: 0, count: 0 }]));

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

      const type = (record.employee || '').trim();

      if (type === 'ลูกจ้างเงินเดือน' || type === 'ลูกจ้าง') {
        const data = employeeData.get(recordMName);
        data.netSalary += parseFloat(record.salary_deductions || 0);
        data.otOpd += parseFloat(record.ot_outpatient_dept || 0);
        data.otPh += parseFloat(record.ot_professional || 0);
        data.otAsst += parseFloat(record.ot_assistant || 0);
        data.shiftPh += parseFloat(record.shift_professional || 0);
        data.shiftAsst += parseFloat(record.shift_assistant || 0);
        data.p4p += parseFloat(record.pay_for_performance || 0);
        data.count++;

        const allDataMonth = allData.get(recordMName);
        allDataMonth.salary += parseFloat(record.salary_deductions || 0);
        allDataMonth.ot += parseFloat(record.ot_outpatient_dept || 0) + parseFloat(record.ot_professional || 0) + parseFloat(record.ot_assistant || 0);
        allDataMonth.shift += parseFloat(record.shift_professional || 0) + parseFloat(record.shift_assistant || 0);
        allDataMonth.p4p += parseFloat(record.pay_for_performance || 0);
        allDataMonth.count++;
      } else if (type === 'ข้าราชการ') {
        const data = governmentData.get(recordMName);
        data.salary += parseFloat(record.salary || 0);
        data.ot += parseFloat(record.overtime_pay || 0);
        data.shift += parseFloat(record.evening_night_shift_pay || 0);
        data.p4p += parseFloat(record.pay_for_performance || 0);
        data.count++;

        const allDataMonth = allData.get(recordMName);
        allDataMonth.salary += parseFloat(record.salary || 0);
        allDataMonth.ot += parseFloat(record.overtime_pay || 0);
        allDataMonth.shift += parseFloat(record.evening_night_shift_pay || 0);
        allDataMonth.p4p += parseFloat(record.pay_for_performance || 0);
        allDataMonth.count++;
      }
    });

    const chartMonths = (this.state.filterMode === 'singleYear' && (this.state.startMonth !== 'all' || this.state.endMonth !== 'all'))
      ? months.filter(month => {
        const monthNum = this.state.monthToNum[month];
        return monthNum >= startM && monthNum <= endM;
      })
      : months;

    this.state.processedData.all = chartMonths.map(month => {
      const data = allData.get(month);
      return data.count > 0
        ? { month: data.month, salary: Math.round(data.salary / data.count), ot: Math.round(data.ot / data.count), shift: Math.round(data.shift / data.count), p4p: Math.round(data.p4p / data.count), count: data.count }
        : { month: data.month, salary: 0, ot: 0, shift: 0, p4p: 0, count: 0 };
    });

    this.state.processedData.employee = chartMonths.map(month => {
      const data = employeeData.get(month);
      return data.count > 0
        ? { month: data.month, netSalary: Math.round(data.netSalary / data.count), otOpd: Math.round(data.otOpd / data.count), otPh: Math.round(data.otPh / data.count), otAsst: Math.round(data.otAsst / data.count), shiftPh: Math.round(data.shiftPh / data.count), shiftAsst: Math.round(data.shiftAsst / data.count), p4p: Math.round(data.p4p / data.count), count: data.count }
        : { month: data.month, netSalary: 0, otOpd: 0, otPh: 0, otAsst: 0, shiftPh: 0, shiftAsst: 0, p4p: 0, count: 0 };
    });

    this.state.processedData.government = chartMonths.map(month => {
      const data = governmentData.get(month);
      return data.count > 0
        ? { month: data.month, salary: Math.round(data.salary / data.count), ot: Math.round(data.ot / data.count), shift: Math.round(data.shift / data.count), p4p: Math.round(data.p4p / data.count), count: data.count }
        : { month: data.month, salary: 0, ot: 0, shift: 0, p4p: 0, count: 0 };
    });
  },

  getCurrentData() {
    if (this.state.activeTab === 'all') return this.state.processedData.all;
    if (this.state.activeTab === 'government') return this.state.processedData.government;
    return this.state.processedData.employee;
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
                <p>สรุปข้อมูลเงินเดือนประจำปี</p>
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
              <div class="tab-group">
                <button class="tab-btn active" id="allBtn">🏢 ทั้งหมด</button>
                <button class="tab-btn" id="governmentBtn">👔 ข้าราชการ</button>
                <button class="tab-btn" id="employeeBtn">👥 ลูกจ้าง</button>
              </div>
            </div>
          </header>
          <div id="dashboardLoading" class="loading-container" style="display: none;">กำลังโหลดข้อมูล...</div>
          <div class="stats-grid" id="statsGrid"></div>
          <div class="charts-grid">
            <div class="chart-card"><h3>📊 การเปรียบเทียบรายได้</h3><div class="chart-container"><canvas id="incomeChart"></canvas></div></div>
            <div class="chart-card"><h3>⏰ แนวโน้มค่าล่วงเวลา (OT)</h3><div class="chart-container"><canvas id="otChart"></canvas></div></div>
            <div class="chart-card"><h3>🌙 แนวโน้มค่าเวรบ่าย-ดึก</h3><div class="chart-container"><canvas id="shiftChart"></canvas></div></div>
            <div class="chart-card"><h3 id="salaryChartTitle">📈 แนวโน้มเงินเดือน</h3><div class="chart-container"><canvas id="salaryChart"></canvas></div></div>
          </div>
        </div>
      </div>
    `;
  },

  getYearlyChartData() {
    const yearly = {};

    // แก้ไข: ดึงค่าช่วงปีที่ "ถูกต้อง" มาก่อน
    const rawStart = this.state.startYear === 'all' ? Math.min(...this.state.availableYears.map(Number)) : Number(this.state.startYear);
    const rawEnd = this.state.endYear === 'all' ? Math.max(...this.state.availableYears.map(Number)) : Number(this.state.endYear);
    const startY = Math.min(rawStart, rawEnd);
    const endY = Math.max(rawStart, rawEnd);

    this.state.rawData.forEach(r => {
      const y = Number(r.year);
      // เพิ่ม Filter ตรงนี้เพื่อให้กราฟเส้นแสดงเฉพาะช่วงปีที่เลือกจริง
      if (y < startY || y > endY) return;

      if (!yearly[y]) {
        yearly[y] = { year: y, salary: 0, netSalary: 0, ot: 0, shift: 0, p4p: 0 };
      }

      const type = (r.employee || '').trim();

      if (type === 'ข้าราชการ') {
        yearly[y].salary += +r.salary || 0;
        yearly[y].ot += +r.overtime_pay || 0;
        yearly[y].shift += +r.evening_night_shift_pay || 0;
        yearly[y].p4p += +r.pay_for_performance || 0;
      } else {
        yearly[y].netSalary += +r.salary_deductions || 0;
        yearly[y].ot += (+r.ot_outpatient_dept || 0) + (+r.ot_professional || 0) + (+r.ot_assistant || 0);
        yearly[y].shift += (+r.shift_professional || 0) + (+r.shift_assistant || 0);
        yearly[y].p4p += +r.pay_for_performance || 0;
      }
    });

    return Object.values(yearly).sort((a, b) => a.year - b.year);
  },

  updateCards() {
    let governmentStats = { personnel: new Set(), records: 0, salary: 0, p4p: 0, ot: 0, shift: 0 };
    let employeeStats = { personnel: new Set(), records: 0, salary: 0, p4p: 0, otOpd: 0, otPh: 0, otAsst: 0, shiftPh: 0, shiftAsst: 0 };
    let totalRecords = 0;
    let startY, endY, startM, endM;

    if (this.state.filterMode === 'yearRange') {
      // แก้ไขตรงนี้: ป้องกันการเลือกปีสลับกัน
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

      const type = (record.employee || '').trim();
      const cid = record.cid || record.citizen_id || record.id_card || record.employee_id;

      if (type === 'ข้าราชการ') {
        if (cid) governmentStats.personnel.add(cid);
        governmentStats.records++;
        totalRecords++;
        governmentStats.salary += parseFloat(record.salary || 0);
        governmentStats.p4p += parseFloat(record.pay_for_performance || 0);
        governmentStats.ot += parseFloat(record.overtime_pay || 0);
        governmentStats.shift += parseFloat(record.evening_night_shift_pay || 0);
      } else if (type === 'ลูกจ้างเงินเดือน' || type === 'ลูกจ้าง') {
        if (cid) employeeStats.personnel.add(cid);
        employeeStats.records++;
        totalRecords++;
        employeeStats.salary += parseFloat(record.salary_deductions || 0);
        employeeStats.p4p += parseFloat(record.pay_for_performance || 0);
        employeeStats.otOpd += parseFloat(record.ot_outpatient_dept || 0);
        employeeStats.otPh += parseFloat(record.ot_professional || 0);
        employeeStats.otAsst += parseFloat(record.ot_assistant || 0);
        employeeStats.shiftPh += parseFloat(record.shift_professional || 0);
        employeeStats.shiftAsst += parseFloat(record.shift_assistant || 0);
      }
    });

    let displayPersonnel, displaySalary, displayP4P, displayOT1, displayOT2, displayOT3;
    let cardTitle, cardSubtitle, otLabel1, otLabel2, otLabel3, displayTotalRecords;

    const periodLabel = (this.state.filterMode === 'yearRange' && this.state.startYear === 'all' && this.state.endYear === 'all')
      ? ' (ทั้งหมด)'
      : (this.state.filterMode === 'singleYear' && this.state.selectedYear !== 'all')
        ? ` (ปี ${this.state.selectedYear})`
        : ' (ช่วงที่เลือก)';

    if (this.state.activeTab === 'all') {
      displayPersonnel = governmentStats.personnel.size + employeeStats.personnel.size;
      displayTotalRecords = totalRecords;
      displaySalary = governmentStats.salary + employeeStats.salary;
      displayP4P = governmentStats.p4p + employeeStats.p4p;
      displayOT1 = governmentStats.ot + employeeStats.otOpd + employeeStats.otPh + employeeStats.otAsst;
      displayOT2 = governmentStats.shift + employeeStats.shiftPh + employeeStats.shiftAsst;
      displayOT3 = 0;
      cardTitle = 'จำนวนบุคลากรทั้งหมด';
      cardSubtitle = `ข้าราชการ ${governmentStats.personnel.size} • ลูกจ้าง ${employeeStats.personnel.size} คน`;
      otLabel1 = 'ค่า OT รวม';
      otLabel2 = 'ค่าเวรบ่าย-ดึก รวม';
      otLabel3 = null;
    } else if (this.state.activeTab === 'government') {
      displayPersonnel = governmentStats.personnel.size;
      displayTotalRecords = governmentStats.records;
      displaySalary = governmentStats.salary;
      displayP4P = governmentStats.p4p;
      displayOT1 = governmentStats.ot;
      displayOT2 = governmentStats.shift;
      displayOT3 = 0;
      cardTitle = 'จำนวนข้าราชการ';
      cardSubtitle = `${governmentStats.records} รายการข้อมูล`;
      otLabel1 = 'ค่า OT';
      otLabel2 = 'ค่าเวรบ่าย-ดึก';
      otLabel3 = null;
    } else {
      displayPersonnel = employeeStats.personnel.size;
      displayTotalRecords = employeeStats.records;
      displaySalary = employeeStats.salary;
      displayP4P = employeeStats.p4p;
      displayOT1 = employeeStats.otOpd;
      displayOT2 = employeeStats.otPh + employeeStats.otAsst;
      displayOT3 = employeeStats.shiftPh + employeeStats.shiftAsst;
      cardTitle = 'จำนวนลูกจ้าง';
      cardSubtitle = `${employeeStats.records} รายการข้อมูล`;
      otLabel1 = 'ค่า OT/OPD';
      otLabel2 = 'ค่า OT (พบ.+ผช.)';
      otLabel3 = 'ค่าเวร (พบ.+ผช.)';
    }

    const avgPerMonth = displayTotalRecords > 0 ? displaySalary / displayTotalRecords : 0;
    const avgP4PPerRecord = displayTotalRecords > 0 ? displayP4P / displayTotalRecords : 0;
    const avgOT1PerRecord = displayTotalRecords > 0 ? displayOT1 / displayTotalRecords : 0;
    const avgOT2PerRecord = displayTotalRecords > 0 ? displayOT2 / displayTotalRecords : 0;
    const avgOT3PerRecord = displayTotalRecords > 0 ? displayOT3 / displayTotalRecords : 0;

    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      let cardsHTML = `
        <div class="stat-card">
          <div class="card-content">
            <div><p class="card-title">${cardTitle}</p><h3 class="card-value">${displayPersonnel.toLocaleString()} คน</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">${cardSubtitle}</p></div>
            <div class="card-icon orange">👥</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div><p class="card-title">เงินเดือนรวม ${periodLabel}</p><h3 class="card-value">฿${displaySalary.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgPerMonth).toLocaleString()}/เดือน</p></div>
            <div class="card-icon blue">💰</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div><p class="card-title">ค่า P4P ${periodLabel}</p><h3 class="card-value">฿${displayP4P.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgP4PPerRecord).toLocaleString()}/เดือน</p></div>
            <div class="card-icon green">📈</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div><p class="card-title">${otLabel1} ${periodLabel}</p><h3 class="card-value">฿${displayOT1.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgOT1PerRecord).toLocaleString()}/เดือน</p></div>
            <div class="card-icon purple">⏰</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="card-content">
            <div><p class="card-title">${otLabel2} ${periodLabel}</p><h3 class="card-value">฿${displayOT2.toLocaleString()}</h3>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgOT2PerRecord).toLocaleString()}/เดือน</p></div>
            <div class="card-icon pink">🌙</div>
          </div>
        </div>
      `;

      if (otLabel3) {
        cardsHTML += `
          <div class="stat-card">
            <div class="card-content">
              <div><p class="card-title">${otLabel3} ${periodLabel}</p><h3 class="card-value">฿${displayOT3.toLocaleString()}</h3>
                <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">เฉลี่ย ฿${Math.round(avgOT3PerRecord).toLocaleString()}/เดือน</p></div>
              <div class="card-icon indigo">🌃</div>
            </div>
          </div>
        `;
      }
      statsGrid.innerHTML = cardsHTML;
    }
  },

  createCharts() {

    const isYearRangeMode = this.state.filterMode === 'yearRange';

    const data = isYearRangeMode
      ? this.getYearlyChartData()
      : this.getCurrentData();

    const labels = isYearRangeMode
      ? data.map(d => `ปี ${d.year}`)
      : data.map(d => d.month);

    const chartType = isYearRangeMode ? 'line' : 'bar';

    Object.values(this.state.charts).forEach(chart => { if (chart) chart.destroy(); });

    const createChartDataset = (label, dataKey, color) => ({
      label: label,
      data: data.map(d => d[dataKey]),
      backgroundColor: chartType === 'line' ? color + '80' : color,
      borderColor: color,
      tension: 0.4,
      borderWidth: chartType === 'line' ? 3 : 0,
      fill: chartType === 'line' ? false : true,
      pointRadius: chartType === 'line' ? 4 : 0,
      pointBackgroundColor: chartType === 'line' ? color : undefined
    });

    const incomeCtx = document.getElementById('incomeChart');
    if (!incomeCtx) return;

    // ลบ chart เดิมก่อน
    if (this.state.charts.income) {
      this.state.charts.income.destroy();
    }

    if (isYearRangeMode) {
      // ===============================
      // โหมดช่วงปี (Pie ตามปี)
      // ===============================

      // แก้ไข: ใช้ Math.min/max เพื่อรองรับการเลือกปีสลับด้าน (เช่น 2569 - 2568)
      const rawStart = this.state.startYear === 'all'
        ? Math.min(...this.state.availableYears.map(Number))
        : Number(this.state.startYear);
      const rawEnd = this.state.endYear === 'all'
        ? Math.max(...this.state.availableYears.map(Number))
        : Number(this.state.endYear);

      const startY = Math.min(rawStart, rawEnd);
      const endY = Math.max(rawStart, rawEnd);

      const yearlyData = {};

      this.state.rawData.forEach(record => {
        const y = Number(record.year);
        if (y < startY || y > endY) return;

        if (!yearlyData[y]) {
          yearlyData[y] = { salary: 0, netSalary: 0 };
        }

        const type = (record.employee || '').trim();

        if (type === 'ลูกจ้างเงินเดือน' || type === 'ลูกจ้าง') {
          yearlyData[y].netSalary += Number(record.salary_deductions || 0);
          yearlyData[y].salary += Number(record.salary_deductions || 0);
        } else if (type === 'ข้าราชการ') {
          yearlyData[y].salary += Number(record.salary || 0);
        }
      });

      const years = Object.keys(yearlyData).sort();
      const pieLabels = years.map(y => `ปี ${y}`);
      const colorPalette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

      const pieData = (this.state.activeTab === 'employee')
        ? years.map(y => yearlyData[y].netSalary)
        : years.map(y => yearlyData[y].salary);

      this.state.charts.income = new Chart(incomeCtx, {
        type: 'pie',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: pieLabels.map((_, i) => colorPalette[i % colorPalette.length]),
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: pieOptions()
      });

    } else {
      // ===============================
      // โหมด ปี + เดือน (แยกประเภทรายได้)
      // ===============================
      let pieLabels = [];
      let pieData = [];
      let pieColors = [];

      if (this.state.activeTab === 'all' || this.state.activeTab === 'government') {
        pieLabels = ['เงินเดือน', 'โอที', 'P4P', 'บ่าย-ดึก'];
        pieData = [
          data.reduce((s, d) => s + d.salary, 0),
          data.reduce((s, d) => s + d.ot, 0),
          data.reduce((s, d) => s + d.p4p, 0),
          data.reduce((s, d) => s + d.shift, 0)
        ];
        pieColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
      } else {
        pieLabels = ['เงินเดือนสุทธิ', 'P4P', 'OT/OPD'];
        pieData = [
          data.reduce((s, d) => s + (d.netSalary || 0), 0),
          data.reduce((s, d) => s + (d.p4p || 0), 0),
          data.reduce((s, d) => s + (d.otOpd || 0), 0)
        ];
        pieColors = ['#3b82f6', '#10b981', '#8b5cf6'];
      }

      this.state.charts.income = new Chart(incomeCtx, {
        type: 'pie',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: pieColors,
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: pieOptions()
      });
    }

    // ===============================
    // Pie option กลาง
    // ===============================
    function pieOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 15, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const value = ctx.parsed || 0;
                const pct = total ? ((value / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ฿${value.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      };
    }

    const otCtx = document.getElementById('otChart');
    if (otCtx) {
      let datasets;
      if (this.state.activeTab === 'all' || this.state.activeTab === 'government') {
        datasets = [createChartDataset('โอทีรวม', 'ot', '#8b5cf6')];
      } else {
        datasets = [
          createChartDataset('OT/OPD', 'otOpd', '#6366f1'),
          createChartDataset('OT/พบ.', 'otPh', '#a855f7'),
          createChartDataset('OT/ผช.', 'otAsst', '#d946ef')
        ];
      }
      this.state.charts.ot = new Chart(otCtx, {
        type: chartType,
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    const shiftCtx = document.getElementById('shiftChart');
    if (shiftCtx) {
      let datasets;
      // ในโหมดช่วงปี แสดงแบบรวม / ในโหมดเดือน แสดงแบบแยกประเภท
      if (isYearRangeMode || this.state.activeTab === 'all' || this.state.activeTab === 'government') {
        datasets = [createChartDataset('บ่าย-ดึกรวม', 'shift', '#f59e0b')];
      } else {
        datasets = [
          createChartDataset('บ-ด/พบ.', 'shiftPh', '#f97316'),
          createChartDataset('บ-ด/ผช.', 'shiftAsst', '#fbbf24')
        ];
      }
      this.state.charts.shift = new Chart(shiftCtx, {
        type: chartType,
        data: { labels: labels, datasets: datasets }, // ✅ ใช้ labels แล้ว
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    const salaryTitle = document.getElementById('salaryChartTitle');
    if (salaryTitle) {
      salaryTitle.textContent = this.state.activeTab === 'employee' ? '📈 แนวโน้มเงินเดือนสุทธิ' : '📈 แนวโน้มเงินเดือน';
    }

    const salaryCtx = document.getElementById('salaryChart');
    if (salaryCtx) {
      const salaryKey = this.state.activeTab === 'employee' ? 'netSalary' : 'salary';
      const datasets = [createChartDataset('รายได้หลัก', salaryKey, '#0ea5e9')];

      if (chartType === 'line') {
        datasets[0].borderWidth = 4;
        datasets[0].pointRadius = 5;
      }

      this.state.charts.salary = new Chart(salaryCtx, {
        type: chartType,
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true } }
        }
      });
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

    const tabClickHandler = (tab) => {
      this.state.activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById(tab + 'Btn').classList.add('active');
      updateDashboard();
    };

    document.getElementById('allBtn').addEventListener('click', () => tabClickHandler('all'));
    document.getElementById('governmentBtn').addEventListener('click', () => tabClickHandler('government'));
    document.getElementById('employeeBtn').addEventListener('click', () => tabClickHandler('employee'));

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/home', true);
      });
    }
  },

  loadChartJS() {
    return new Promise((resolve) => {
      if (typeof Chart !== 'undefined') { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = () => console.error("Failed to load Chart.js");
      document.head.appendChild(script);
    });
  },

  async init(containerId = 'root') {
    try {
      await this.loadChartJS();
      const container = document.getElementById(containerId);
      if (!container) { console.error('Container not found:', containerId); return; }
      container.innerHTML = this.getTemplate();
      const loading = document.getElementById('dashboardLoading');
      if (loading) loading.style.display = 'flex';
      const success = await this.fetchData();
      if (loading) loading.style.display = 'none';
      if (success) {
        this.setupEventListeners();
        this.processData();
        this.updateCards();
        setTimeout(() => { this.createCharts(); }, 100);
      } else {
        container.innerHTML = '<div style="text-align:center;padding:50px;">❌ ไม่สามารถโหลดข้อมูลได้</div>';
      }
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
    }
  }
};

window.renderDashboard = function () {
  return PayrollDashboard.init('root');
};

window.PayrollDashboard = PayrollDashboard;