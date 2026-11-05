import sqlite3
import os

print("--- SQLITE INSPECTION ---")
if os.path.exists("dmhs.db"):
    conn = sqlite3.connect("dmhs.db")
    c = conn.cursor()
    tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    print("Tables in dmhs.db:", tables)
    for t in ["users", "schools", "academic_years", "classes", "sections", "student_profiles", "teacher_profiles", "payments", "invoices"]:
        if t in tables:
            cnt = c.execute(f"SELECT COUNT(*) FROM {t};").fetchone()[0]
            print(f"  {t} row count:", cnt)
else:
    print("dmhs.db does not exist")
