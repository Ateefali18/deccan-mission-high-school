import sqlite3

def reset_local_database():
    conn = sqlite3.connect('dmhs.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF;")

    # 1. Clear transactional & transient tables
    tables_to_truncate = [
        'attendance_records',
        'attendance_sessions',
        'marks',
        'invoices',
        'payments',
        'fee_structure',
        'assignment_submissions',
        'assignments',
        'ai_messages',
        'ai_conversations',
        'audit_logs',
        'expenses'
    ]

    for table in tables_to_truncate:
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        if cursor.fetchone():
            cursor.execute(f"DELETE FROM {table};")
            print(f"Cleared {table}")

    # 2. Reset student enrollments and extra profiles
    cursor.execute("DELETE FROM student_enrollments;")
    print("Cleared student_enrollments")

    # Delete non-primary student profiles (keep Ali, user_id=3)
    cursor.execute("DELETE FROM student_profiles WHERE user_id != 3;")
    print("Retained student_profile for Ali (user_id 3)")

    # Delete non-primary teacher profiles (keep Ateef, user_id=2)
    cursor.execute("DELETE FROM teacher_assignments;")
    cursor.execute("DELETE FROM teacher_profiles WHERE user_id != 2;")
    print("Retained teacher_profile for Ateef (user_id 2)")

    # Delete extra users (keep 1: STA khadri, 2: Ateef, 3: Ali)
    cursor.execute("DELETE FROM user_roles WHERE user_id NOT IN (1, 2, 3);")
    cursor.execute("DELETE FROM users WHERE id NOT IN (1, 2, 3);")
    print("Retained primary accounts in users: STA khadri (1), Ateef (2), Ali (3)")

    # Ensure Ali's student profile has admission_number
    cursor.execute("SELECT id FROM student_profiles WHERE user_id = 3;")
    sp = cursor.fetchone()
    if not sp:
        cursor.execute("""
            INSERT INTO student_profiles (user_id, school_id, admission_number, student_status, is_active)
            VALUES (3, 1, 'ADM-ALI', 'active', 1)
        """)
    else:
        cursor.execute("""
            UPDATE student_profiles
            SET admission_number = 'ADM-ALI', student_status = 'active', is_active = 1
            WHERE user_id = 3
        """)

    # Ensure Ateef's teacher profile has employee_id
    cursor.execute("SELECT id FROM teacher_profiles WHERE user_id = 2;")
    tp = cursor.fetchone()
    if not tp:
        cursor.execute("""
            INSERT INTO teacher_profiles (user_id, school_id, employee_id, designation, department, employment_status, is_active)
            VALUES (2, 1, 'EMP-ATEEF', 'Senior Mathematics Faculty', 'Mathematics', 'active', 1)
        """)
    else:
        cursor.execute("""
            UPDATE teacher_profiles
            SET employee_id = 'EMP-ATEEF', designation = 'Senior Mathematics Faculty', department = 'Mathematics', employment_status = 'active', is_active = 1
            WHERE user_id = 2
        """)

    conn.commit()
    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.close()
    print("Local database dmhs.db safely reset.")

if __name__ == "__main__":
    reset_local_database()
