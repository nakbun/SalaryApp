// ============================================
// dashboard.js - Payroll Dashboard (Compatible with existing API)
// ============================================

// =========================================
// 🔥 API FALLBACK - ตรวจสอบและรอ API object
// =========================================
async function waitForAPI(maxWait = 2000) {
  const startTime = Date.now();
  
  // รอ API object สูงสุด 3 วินาที
  while (!window.API) {
    if (Date.now() - startTime > maxWait) {
      
      // สร้าง API object ขึ้นมาเอง
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
        },
        
        async post(url, data) {
          try {
            const response = await fetch(this.baseURL + url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
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
      
      // รอให้ API object พร้อม (สูงสุด 3 วินาที)
      const apiReady = await waitForAPI();
      if (!apiReady) {
        console.error('❌ Failed to initialize API');
        return false;
      }
      
      // ใช้ API.get() ตาม structure ที่มีอยู่
      const response = await window.API.get('salary-data', {});
      
      if (response.status === 'success') {
        this.state.rawData = response.data || [];
        
        this.extractYears();
        this.processData();
        return true;
      } else {
        console.error('❌ API returned error:', response.error || response);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to fetch salary data:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
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

    const allData = new Map(months.map(month => [month, { 
      month, 
      totalIncome: 0,
      ot: 0,
      shift: 0,
      p4p: 0,
      count: 0 
    }]));

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

      const data = allData.get(recordMName);
      
      data.totalIncome += parseFloat(record.salary || 0);
      data.totalIncome += parseFloat(record.salary_deductions || 0);
      
      data.ot += parseFloat(record.overtime_pay || 0);
      data.ot += parseFloat(record.ot_outpatient_dept || 0);
      data.ot += parseFloat(record.ot_professional || 0);
      data.ot += parseFloat(record.ot_assistant || 0);
      
      data.shift += parseFloat(record.evening_night_shift_pay || 0);
      data.shift += parseFloat(record.shift_professional || 0);
      data.shift += parseFloat(record.shift_assistant || 0);
      
      data.p4p += parseFloat(record.pay_for_performance || 0);
      
      data.count++;
    });

    const chartMonths = (this.state.filterMode === 'singleYear' && (this.state.startMonth !== 'all' || this.state.endMonth !== 'all'))
      ? months.filter(month => {
        const monthNum = this.state.monthToNum[month];
        return monthNum >= startM && monthNum <= endM;
      })
      : months;

    this.state.processedData = chartMonths.map(month => {
      const data = allData.get(month);
      return data.count > 0
        ? { 
            month: data.month, 
            totalIncome: Math.round(data.totalIncome / data.count), 
            ot: Math.round(data.ot / data.count), 
            shift: Math.round(data.shift / data.count), 
            p4p: Math.round(data.p4p / data.count), 
            count: data.count 
          }
        : { month: data.month, totalIncome: 0, ot: 0, shift: 0, p4p: 0, count: 0 };
    });
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
              <div class="chart-container">
                <canvas id="incomeChart"></canvas>
              </div>
            </div>
            <div class="chart-card">
              <h3>⏰ แนวโน้มค่าล่วงเวลา (OT)</h3>
              <div class="chart-container">
                <canvas id="otChart"></canvas>
              </div>
            </div>
            <div class="chart-card">
              <h3>🌙 แนวโน้มค่าเวร</h3>
              <div class="chart-container">
                <canvas id="shiftChart"></canvas>
              </div>
            </div>
            <div class="chart-card">
              <h3>📈 แนวโน้มรายได้รวม</h3>
              <div class="chart-container">
                <canvas id="salaryChart"></canvas>
              </div>
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
        yearly[y] = { year: y, totalIncome: 0, ot: 0, shift: 0, p4p: 0 };
      }

      yearly[y].totalIncome += parseFloat(r.salary || 0);
      yearly[y].totalIncome += parseFloat(r.salary_deductions || 0);
      
      yearly[y].ot += parseFloat(r.overtime_pay || 0);
      yearly[y].ot += parseFloat(r.ot_outpatient_dept || 0);
      yearly[y].ot += parseFloat(r.ot_professional || 0);
      yearly[y].ot += parseFloat(r.ot_assistant || 0);
      
      yearly[y].shift += parseFloat(r.evening_night_shift_pay || 0);
      yearly[y].shift += parseFloat(r.shift_professional || 0);
      yearly[y].shift += parseFloat(r.shift_assistant || 0);
      
      yearly[y].p4p += parseFloat(r.pay_for_performance || 0);
    });

    return Object.values(yearly).sort((a, b) => a.year - b.year);
  },

  updateCards() {
    let totalPersonnel = new Set();
    let totalRecords = 0;
    let totalIncome = 0;
    let totalP4P = 0;
    let totalOT = 0;
    let totalShift = 0;
    
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
      totalIncome += parseFloat(record.salary_deductions || 0);
      
      totalP4P += parseFloat(record.pay_for_performance || 0);
      
      totalOT += parseFloat(record.overtime_pay || 0);
      totalOT += parseFloat(record.ot_outpatient_dept || 0);
      totalOT += parseFloat(record.ot_professional || 0);
      totalOT += parseFloat(record.ot_assistant || 0);
      
      totalShift += parseFloat(record.evening_night_shift_pay || 0);
      totalShift += parseFloat(record.shift_professional || 0);
      totalShift += parseFloat(record.shift_assistant || 0);
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

  createCharts() {
    const isYearRangeMode = this.state.filterMode === 'yearRange';

    const data = isYearRangeMode
      ? this.getYearlyChartData()
      : this.state.processedData;

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
    if (incomeCtx) {
      if (this.state.charts.income) {
        this.state.charts.income.destroy();
      }

      if (isYearRangeMode) {
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
            yearlyData[y] = 0;
          }

          yearlyData[y] += parseFloat(record.salary || 0);
          yearlyData[y] += parseFloat(record.salary_deductions || 0);
        });

        const years = Object.keys(yearlyData).sort();
        const pieLabels = years.map(y => `ปี ${y}`);
        const pieData = years.map(y => yearlyData[y]);
        const colorPalette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

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
          options: {
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
          }
        });

      } else {
        const pieLabels = ['รายได้รวม', 'OT', 'P4P', 'ค่าเวร'];
        const pieData = [
          data.reduce((s, d) => s + (d.totalIncome || 0), 0),
          data.reduce((s, d) => s + (d.ot || 0), 0),
          data.reduce((s, d) => s + (d.p4p || 0), 0),
          data.reduce((s, d) => s + (d.shift || 0), 0)
        ];
        const pieColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

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
          options: {
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
          }
        });
      }
    }

    const otCtx = document.getElementById('otChart');
    if (otCtx) {
      const datasets = [createChartDataset('ค่า OT รวม', 'ot', '#8b5cf6')];
      
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
      const datasets = [createChartDataset('ค่าเวรรวม', 'shift', '#f59e0b')];
      
      this.state.charts.shift = new Chart(shiftCtx, {
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

    const salaryCtx = document.getElementById('salaryChart');
    if (salaryCtx) {
      const datasets = [createChartDataset('รายได้รวม', 'totalIncome', '#0ea5e9')];

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
      script.onload = () => {
        resolve();
      };
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
      console.error('Error stack:', error.stack);
    }
  }
};

window.renderDashboard = function () {
  return PayrollDashboard.init('root');
};

window.PayrollDashboard = PayrollDashboard;