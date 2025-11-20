from flask import Flask, request, jsonify
import pandas as pd
import mysql.connector
import os
from flask_cors import CORS
import openpyxl
import numpy as np
import re

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# -------------------------------------------------------------------
#                          MySQL CONFIG
# -------------------------------------------------------------------
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'salary_db'
}

# -------------------------------------------------------------------
#                        COLUMN MAPPING
# -------------------------------------------------------------------
COLUMN_MAP = {
    # Basic - ไม่รับ 'ลำดับที่' และ 'เลขที่' จาก Excel
    'cid': 'cid', 
    'เลขบัตรประชาชน': 'cid',
    'ชื่อ': 'name', 
    'เลขที่บัญชี': 'bank_account',
    'เดือน': 'month', 
    'ปี': 'year',

    # Income
    'เงินเดือน': 'salary',
    'เงินเดือนสุทธิ': 'salary_deductions',
    'รวมรับ': 'total_income',
    'ค่าครองชีพ': 'cola_allowance',
    'ค่าครองชีพ(ตกเบิก)': 'retroactive_cola_allowance',
    'ง/ด(ตกเบิก)': 'retroactive_salary_emp',
    'ง/ด ตกเบิก': 'retroactive_salary_emp',
    'พตส.': 'special_public_health_allowance',
    'ปจต.': 'position_allowance',
    'รายเดือน': 'monthly_allowance',
    'P4P': 'pay_for_performance',
    'โควิด-19': 'covid_risk_pay',
    'เพิ่มโควิด-19': 'covid_risk_pay',
    'เสี่ยงภัยโควิด': 'covid_risk_pay',
    'เงินกู้สวัสดิการ': 'welfare_loan_received',
    'โอที': 'overtime_pay',
    'บ่าย-ดึก': 'evening_night_shift_pay',
    'OT/OPD': 'ot_outpatient_dept',
    'OT/พบ.': 'ot_professional',
    'OT/ผช.': 'ot_assistant',
    'บ-ด/พบ.': 'shift_professional',
    'บ-ด/ผช.': 'shift_assistant',
    'อื่นๆ': 'other_income',

    # Deductions
    'รวมจ่าย': 'total_expense',
    'คงเหลือ': 'net_balance',
    'หักวันลา': 'leave_day_deduction',
    'ภาษี': 'tax_deduction',
    'ภาษี ตกเบิก': 'retroactive_tax_deduction',
    'กบข.': 'gpf_contribution',
    'กบข.ตกเบิก': 'retroactive_gpf_deduction',
    'กบข.เพิ่ม': 'gpf_extra_contribution',
    'ปกสค.': 'social_security_deduction_gov',
    'ประกันสังคม': 'social_security_deduction_emp',
    'กองทุน พกส.': 'phks_provident_fund',
    'ฌกส.': 'funeral_welfare_deduction',
    'สอ.กรม': 'coop_deduction_dept',
    'สอ.สสจ.เลย': 'coop_deduction_phso',
    'กยศ.': 'student_loan_deduction_emp',
    'กยศ': 'student_loan_deduction_emp',
    'ค่าน้ำ': 'water_bill_deduction',
    'ค่าไฟ': 'electricity_bill_deduction',
    'net': 'internet_deduction_emp',
    'ค่าNet': 'internet_deduction_emp',
    'AIA': 'aia_insurance_deduction_emp',
    'ค่าAIA': 'aia_insurance_deduction_emp',
    'ออมสิน': 'gsb_loan_deduction_emp',
    'ออมสินนาอาน': 'gsb_loan_naan',
    'ธนาคารออมสินเลย': 'gsb_loan_loei',
    'ธอส': 'ghb_loan_deduction',
    'กรุงไทย': 'ktb_loan_deduction_emp',
    'ธนาคารกรุงไทย': 'ktb_loan_deduction_emp',
    'เงินกู้ รพ.': 'hospital_loan_deduction',
    'เงินกู้ รพ/ประกันงาน': 'hospital_loan_deduction',
    'การศึกษาบุตร': 'child_education_deduction',
    'ค่ารักษาพยาบาล': 'medical_expense_deduction',
    'ไม่ปฏิบัติเวช': 'no_private_practice_deduction',
}

# กำหนดคอลัมน์ที่เป็นตัวเลข (decimal) - ไม่รวม order_no
NUMERIC_COLUMNS = {
    'salary', 'salary_deductions', 'total_income', 'cola_allowance',
    'retroactive_cola_allowance', 'retroactive_salary_emp', 'special_public_health_allowance',
    'position_allowance', 'monthly_allowance', 'pay_for_performance', 'covid_risk_pay',
    'welfare_loan_received', 'overtime_pay', 'evening_night_shift_pay', 'ot_outpatient_dept',
    'ot_professional', 'ot_assistant', 'shift_professional', 'shift_assistant', 'other_income',
    'total_expense', 'net_balance', 'leave_day_deduction', 'tax_deduction',
    'retroactive_tax_deduction', 'gpf_contribution', 'retroactive_gpf_deduction',
    'gpf_extra_contribution', 'social_security_deduction_gov', 'social_security_deduction_emp',
    'phks_provident_fund', 'funeral_welfare_deduction', 'coop_deduction_dept',
    'coop_deduction_phso', 'student_loan_deduction_emp', 'water_bill_deduction',
    'electricity_bill_deduction', 'internet_deduction_emp', 'aia_insurance_deduction_emp',
    'gsb_loan_deduction_emp', 'gsb_loan_naan', 'gsb_loan_loei', 'ghb_loan_deduction',
    'ktb_loan_deduction_emp', 'hospital_loan_deduction', 'child_education_deduction',
    'medical_expense_deduction', 'no_private_practice_deduction'
}

# แปลงชื่อเดือนไทยเป็นตัวเลข
MONTH_MAP = {
    'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
    'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
    'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12,
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4,
    'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8,
    'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12
}

EXCLUDE_COLUMNS = {"ลำดับที่"}

import bcrypt

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    cid = data.get("cid").strip()
    password = data.get("password").strip()
    name = data.get("name").strip()
    position = data.get("position").strip()

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO users (cid, password, name, position)
        VALUES (%s, %s, %s, %s)
    """, (cid, hashed, name, position))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"status": "success"})

# -------------------------------------------------------------------
#                     🔐 BCRYPT HELPER FUNCTIONS
# -------------------------------------------------------------------
def hash_password(password):
    """เข้ารหัสรหัสผ่านด้วย bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, hashed_password):
    """ตรวจสอบรหัสผ่านกับ hash ที่เก็บไว้"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


# -------------------------------------------------------------------
#                           CLEAN FUNCTIONS
# -------------------------------------------------------------------
def clean_column_name(col):
    c = str(col).strip()
    if c.lower() in ['', 'nan', 'none', '#ref!']:
        c = "col_empty"
    safe = (c.replace(" ", "_")
              .replace("/", "_")
              .replace("-", "_")
              .replace(".", "_")
              .replace("(", "")
              .replace(")", "")
              .replace("%", "pct")
              .replace("#", "no"))
    return safe[:64]

def clean_value(val):
    if val is None or pd.isna(val):
        return ''
    s = str(val).strip()
    if s.lower() in ['nan', 'none', '#ref!', 'null']:
        return ''
    return s

def convert_to_decimal(value):
    """แปลงค่าเป็น decimal โดยลบเครื่องหมาย comma และอักขระพิเศษ"""
    if value is None or value == '' or pd.isna(value):
        return None
    
    s = str(value).strip()
    s = s.replace(',', '')
    s = re.sub(r'[^\d.-]', '', s)
    
    try:
        return float(s) if s else None
    except:
        return None

def convert_month_to_number(month_value):
    """แปลงเดือนเป็นตัวเลข"""
    if month_value is None or month_value == '':
        return None
    
    try:
        num = int(month_value)
        if 1 <= num <= 12:
            return num
    except:
        pass
    
    month_str = str(month_value).strip()
    return MONTH_MAP.get(month_str, None)

# -------------------------------------------------------------------
#                    🔐 API: Hash Existing Passwords in DB
# -------------------------------------------------------------------
@app.route("/api/hash-passwords", methods=["POST"])
def hash_existing_passwords():
    """
    เข้ารหัสรหัสผ่านทั้งหมดที่มีอยู่ในฐานข้อมูล
    ⚠️ ใช้เฉพาะครั้งเดียวเพื่อ migrate ข้อมูลเก่า
    """
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # ดึงผู้ใช้ทั้งหมดที่รหัสผ่านยังไม่เข้ารหัส
        cursor.execute("SELECT id, cid, password FROM users")
        users = cursor.fetchall()
        
        updated_count = 0
        skipped_count = 0
        
        for user in users:
            # ตรวจสอบว่ารหัสผ่านถูก hash แล้วหรือยัง (bcrypt hash เริ่มต้นด้วย $2b$)
            if user['password'].startswith('$2b$'):
                print(f"Skip {user['cid']} - already hashed")
                skipped_count += 1
                continue
            
            # เข้ารหัสรหัสผ่าน
            hashed = hash_password(user['password'])
            
            # อัพเดทในฐานข้อมูล
            cursor.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (hashed, user['id'])
            )
            
            print(f"Hashed password for {user['cid']}")
            updated_count += 1
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "เข้ารหัสรหัสผ่านสำเร็จ",
            "updated": updated_count,
            "skipped": skipped_count
        })
        
    except Exception as e:
        print(f"Hash Passwords Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# -------------------------------------------------------------------
#                    🆕 API: Reset ตาราง
# -------------------------------------------------------------------
@app.route("/api/reset-table", methods=["POST"])
def reset_table():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # ลบข้อมูลทั้งหมด
        cursor.execute("TRUNCATE TABLE salary_data")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "ลบข้อมูลและ reset ID เรียบร้อยแล้ว"
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# -------------------------------------------------------------------
#                    🆕 API: ดึงข้อมูลเงินเดือน
# -------------------------------------------------------------------
# เปลี่ยนจาก employee_type เป็น employee
@app.route("/api/salary-data", methods=["GET"])
def get_salary_data():
    try:
        print("=== API Called ===")
        print(f"Request args: {request.args}")
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cid = request.args.get('cid', '')
        name = request.args.get('name', '')
        month = request.args.get('month', '')
        year = request.args.get('year', '')
        employee = request.args.get('employee', '')
        
        # แปลงชื่อเดือนภาษาไทยเป็นตัวเลข
        month_number = None
        if month:
            month_number = MONTH_MAP.get(month, None)
            if month_number is None:
                try:
                    month_number = int(month)
                except:
                    pass
        
        print(f"Filters - CID: {cid}, Name: {name}, Month: {month} ({month_number}), Year: {year}, Employee: {employee}")
        
        query = "SELECT * FROM salary_data WHERE 1=1"
        params = []
        
        if cid:
            query += " AND cid LIKE %s"
            params.append(f"%{cid}%")
        
        if name:
            query += " AND name LIKE %s"
            params.append(f"%{name}%")
            
        if month_number is not None:
            query += " AND month = %s"
            params.append(month_number)
            
        if year:
            query += " AND year = %s"
            params.append(year)
            
        if employee:
            query += " AND employee = %s"
            params.append(employee)
        
        # เรียงลำดับ: ข้าราชการก่อน แล้วตามด้วย id เก่าไปใหม่ (ตามฐานข้อมูล)
        query += """
            ORDER BY 
                CASE 
                    WHEN employee = 'ข้าราชการ' THEN 0 
                    WHEN employee = 'ลูกจ้างเงินเดือน' THEN 1 
                    ELSE 2 
                END,
                id ASC
        """
        
        print(f"SQL Query: {query}")
        print(f"SQL Params: {params}")
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        print(f"Found {len(results)} records")
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "data": results,
            "count": len(results)
        })
        
    except mysql.connector.Error as db_err:
        print(f"Database Error: {db_err}")
        return jsonify({
            "status": "error",
            "message": f"Database error: {str(db_err)}"
        }), 500
        
    except Exception as e:
        print(f"General Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    
# -------------------------------------------------------------------
#                    🆕 API: ดึงรายการเดือนและปีที่มีในฐานข้อมูล
# -------------------------------------------------------------------
@app.route("/api/available-filters", methods=["GET"])
def get_available_filters():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # ดึงเดือนที่มีในฐาน (แปลงเป็นชื่อเดือนไทย)
        cursor.execute("SELECT DISTINCT month FROM salary_data WHERE month IS NOT NULL ORDER BY month")
        months_data = cursor.fetchall()
        
        # แปลงเลขเดือนเป็นชื่อภาษาไทย
        month_names = {
            1: 'มกราคม', 2: 'กุมภาพันธ์', 3: 'มีนาคม', 4: 'เมษายน',
            5: 'พฤษภาคม', 6: 'มิถุนายน', 7: 'กรกฎาคม', 8: 'สิงหาคม',
            9: 'กันยายน', 10: 'ตุลาคม', 11: 'พฤศจิกายน', 12: 'ธันวาคม'
        }
        
        available_months = []
        for (month_num,) in months_data:
            if month_num in month_names:
                available_months.append({
                    'value': month_names[month_num],
                    'label': month_names[month_num],
                    'number': month_num
                })
        
        # ดึงปีที่มีในฐาน
        cursor.execute("SELECT DISTINCT year FROM salary_data WHERE year IS NOT NULL ORDER BY year DESC")
        years_data = cursor.fetchall()
        available_years = [str(year[0]) for year in years_data]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "months": available_months,
            "years": available_years
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# -------------------------------------------------------------------
#                        SAVE TO MYSQL
# -------------------------------------------------------------------
def save_to_mysql(df):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    df.columns = [clean_column_name(c) for c in df.columns]

    # สร้างตารางถ้ายังไม่มี
    cursor.execute("SHOW TABLES LIKE 'salary_data'")
    if not cursor.fetchone():
        col_defs = []
        for c in df.columns:
            clean_col = clean_column_name(c)

            if clean_col in ['cid', 'bank_account', 'name', 'employee', 'employee_type']:
                col_defs.append(f"`{clean_col}` VARCHAR(255)")
            elif clean_col == 'year':
                col_defs.append(f"`{clean_col}` INT")
            elif clean_col == 'month':
                col_defs.append(f"`{clean_col}` TINYINT")
            elif clean_col in NUMERIC_COLUMNS:
                col_defs.append(f"`{clean_col}` DECIMAL(10,2)")
            else:
                col_defs.append(f"`{clean_col}` TEXT")

        cols_sql = ", ".join(col_defs)
        cursor.execute(f"""
            CREATE TABLE salary_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                {cols_sql},
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Created salary_data table with proper data types")

    saved = updated = failed = 0

    for idx, row in df.iterrows():
        try:
            processed_row = {}

            # ลบคอลัมน์ที่ซ้ำ เช่น xxx_1, xxx_2
            processed_row = {
                k: v for k, v in processed_row.items()
                if not re.match(r".+_\d+$", k)
            }

            # -----------------------------
            #  SAFE VALUES (ป้องกัน insert fail)
            # -----------------------------
            for col in df.columns:
                clean_col = clean_column_name(col)
                value = row[col]

                if clean_col == 'month':
                    processed_row[clean_col] = convert_month_to_number(value)

                elif clean_col == 'year':
                    try:
                        processed_row[clean_col] = int(value) if value and value != '' else None
                    except:
                        processed_row[clean_col] = None

                elif clean_col in NUMERIC_COLUMNS:
                    processed_row[clean_col] = convert_to_decimal(value)

                else:
                    v = clean_value(value)
                    processed_row[clean_col] = v if v != '' else None

            # -----------------------------
            #  CHECK DUPLICATE → UPDATE
            # -----------------------------
            cid = processed_row.get('cid', "")
            month = processed_row.get('month', None)

            cursor.execute(
                "SELECT id FROM salary_data WHERE cid = %s AND month = %s AND year = %s",
                (str(cid), int(month), int(processed_row.get('year')))
            )

            exists = cursor.fetchone()

            # -----------------------------
            #   UPDATE
            # -----------------------------
            if exists:
                set_clause = ", ".join([f"`{clean_column_name(c)}`=%s" for c in df.columns])

                cursor.execute(
                    f"UPDATE salary_data SET {set_clause} WHERE id=%s",
                    tuple(processed_row.values()) + (exists[0],)
                )
                updated += 1

            # -----------------------------
            #   INSERT (SAFE)
            # -----------------------------
            else:
                cols = ", ".join([f"`{clean_column_name(c)}`" for c in df.columns])
                holders = ", ".join(["%s"] * len(df.columns))

                cursor.execute(
                    f"INSERT INTO salary_data ({cols}) VALUES ({holders})",
                    tuple(processed_row.values())
                )
                saved += 1

        except Exception as e:
            failed += 1
            print(f"Row error at index {idx}: {e}")

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Saved: {saved}, Updated: {updated}, Failed: {failed}")

    return saved + updated

# -------------------------------------------------------------------
#                        UPLOAD ROUTE
# -------------------------------------------------------------------
@app.route("/upload", methods=["POST"])
def upload_api():
    if 'file' not in request.files:
        return {"error": "No file"}, 400

    if 'month' not in request.form:
        return {"error": "กรุณาเลือกเดือน"}, 400
    
    if 'year' not in request.form:
        return {"error": "กรุณาเลือกปี"}, 400

    file = request.files['file']
    selected_month = request.form['month']
    selected_year = request.form['year']
    
    selected_month_num = convert_month_to_number(selected_month)
    if selected_month_num is None:
        try:
            selected_month_num = int(selected_month)
        except:
            return {"error": "รูปแบบเดือนไม่ถูกต้อง"}, 400
    
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    try:
        wb = openpyxl.load_workbook(path, data_only=True)
        dfs = []
        skipped = []

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows = list(sheet.iter_rows(values_only=True))

            if not rows:
                skipped.append(sheet_name)
                continue

            raw_header = []
            for h in rows[0]:
                if h is None or str(h).strip().lower() in ["", "nan", "none", "#ref!"]:
                    raw_header.append("col_empty")
                else:
                    raw_header.append(str(h).strip())

            data_rows = rows[1:]

            cut = None
            for i, r in enumerate(data_rows):
                if any(isinstance(c, str) and "รายละเอียดเพิ่มเติม" in c for c in r if c):
                    cut = i
                    break
            if cut is not None:
                data_rows = data_rows[:cut]

            filtered = []
            for r in data_rows:
                if not r:
                    continue
                if all(c in [None, "", " "] for c in r):
                    continue
                filtered.append(r)

            if not filtered:
                skipped.append(sheet_name)
                continue

            max_cols = max(len(raw_header), max(len(r) for r in filtered))
            header = raw_header + [f"col_empty_{i}" for i in range(len(raw_header), max_cols)]

            fixed_rows = [list(r) + ['']*(max_cols - len(r)) for r in filtered]
            df = pd.DataFrame(fixed_rows, columns=header)

            df = df[[c for c in df.columns if c not in EXCLUDE_COLUMNS]]

            # แปลงชื่อคอลัมน์ตาม mapping
            mapped_cols = []
            for c in df.columns:
                key = str(c).strip()
                if key.lower() in ["", "nan", "none"]:
                    key = "col_empty"
                mapped_cols.append(COLUMN_MAP.get(key, key))

            df.columns = mapped_cols

            # จัดการ duplicate columns
            final_cols = []
            seen = {}
            for c in df.columns:
                if c not in seen:
                    seen[c] = 1
                    final_cols.append(c)
                else:
                    final_cols.append(f"{c}_{seen[c]}")
                    seen[c] += 1
            df.columns = final_cols

            df.columns = [clean_column_name(c) for c in df.columns]

            # ลบคอลัมน์ order_no ถ้ามีมาจาก Excel
            columns_to_drop = ['order_no', 'row_no']
            for col in columns_to_drop:
                if col in df.columns:
                    df = df.drop(columns=[col])
                    print(f"ลบคอลัมน์ {col} ที่มาจาก Excel ใน sheet: {sheet_name}")

            if 'cid' not in df.columns:
                df['cid'] = [f"{sheet_name}_{i}" for i in range(len(df))]

            df['employee'] = sheet_name
            df['month'] = selected_month_num
            df['year'] = selected_year

            dfs.append(df)

        if not dfs:
            return {"error": "No usable sheets", "skipped": skipped}, 400

        final_df = pd.concat(dfs, ignore_index=True)

        saved = save_to_mysql(final_df)

        return jsonify({
            "status": "success",
            "processed_sheets": [d['employee'].iloc[0] for d in dfs],
            "skipped_sheets": skipped,
            "rows": len(final_df),
            "saved": saved,
            "selected_month": selected_month_num,
            "selected_year": selected_year
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 400

    finally:
        try:
            os.remove(path)
        except:
            pass

# เพิ่มโค้ดนี้ใน Flask app ของคุณ (ประมาณบรรทัด 300-400)

# -------------------------------------------------------------------
#                    🆕 API: Login
# -------------------------------------------------------------------
@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        cid = data.get('cid', '').strip()
        password = data.get('password', '').strip()
        
        if not cid or not password:
            return jsonify({
                "status": "error",
                "message": "กรุณากรอก CID และรหัสผ่าน"
            }), 400
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # ตรวจสอบผู้ใช้ในตาราง users
        cursor.execute(
            "SELECT * FROM users WHERE cid = %s AND password = %s",
            (cid, password)
        )
        
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user:
            return jsonify({
                "status": "success",
                "message": "เข้าสู่ระบบสำเร็จ",
                "user": {
                    "cid": user['cid'],
                    "name": user['name'],
                    "position": user['position']
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": "CID หรือรหัสผ่านไม่ถูกต้อง"
            }), 401
            
    except Exception as e:
        print(f"Login Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# -------------------------------------------------------------------
#                    🆕 API: Register User
# -------------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        cid = data.get('cid', '').strip()
        password = data.get('password', '').strip()
        name = data.get('name', '').strip()
        position = data.get('position', '').strip()
        
        if not cid or not password or not name or not position:
            return jsonify({
                "status": "error",
                "message": "กรุณากรอกข้อมูลให้ครบถ้วน"
            }), 400
        
        # ตรวจสอบความยาว CID
        if len(cid) != 13:
            return jsonify({
                "status": "error",
                "message": "CID ต้องมี 13 หลัก"
            }), 400
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # ตรวจสอบว่า CID ซ้ำหรือไม่
        cursor.execute("SELECT cid FROM users WHERE cid = %s", (cid,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({
                "status": "error",
                "message": "CID นี้มีในระบบแล้ว"
            }), 400
        
        # เพิ่มผู้ใช้ใหม่
        cursor.execute(
            """
            INSERT INTO users (cid, password, name, position)
            VALUES (%s, %s, %s, %s)
            """,
            (cid, password, name, position)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "ลงทะเบียนสำเร็จ"
        })
        
    except Exception as e:
        print(f"Register Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# -------------------------------------------------------------------
#                    🆕 API: Get All Users (สำหรับ Admin)
# -------------------------------------------------------------------
@app.route("/api/users", methods=["GET"])
def get_users():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT cid, name, position, created_at FROM users ORDER BY created_at DESC")
        users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "users": users
        })
        
    except Exception as e:
        print(f"Get Users Error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# -------------------------------------------------------------------
#                    🆕 API: Delete User
# -------------------------------------------------------------------
@app.route("/api/users/<cid>", methods=["DELETE"])
def delete_user(cid):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM users WHERE cid = %s", (cid,))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({
                "status": "error",
                "message": "ไม่พบผู้ใช้"
            }), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "ลบผู้ใช้สำเร็จ"
        })
        
    except Exception as e:
        print(f"Delete User Error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=5000)
