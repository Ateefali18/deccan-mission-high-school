import argparse
import sys
import getpass
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.school import School
from app.models.role import Role, UserRole
from app.models.user import User
from app.models.academic_year import AcademicYear
from app.models.class_model import Class
from app.models.section import Section
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_assignment import TeacherAssignment
from app.models.audit_log import AuditLog
from app.services.school_service import SchoolService

def ensure_roles(db: Session):
    for role_name, desc in [
        ("ADMIN", "Administrative & Principal Authority"),
        ("TEACHER", "Faculty & Instructional Staff"),
        ("STUDENT", "Enrolled Student Authority"),
    ]:
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=desc)
            db.add(role)
    db.commit()

def bootstrap_admin(username: str, email: str, full_name: str, password: str = None):
    db: Session = SessionLocal()
    try:
        ensure_roles(db)
        school = SchoolService.get_or_create_school(
            db, name=settings.SCHOOL_NAME, code=settings.SCHOOL_CODE
        )

        # Check if an ADMIN already exists in this school
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        existing_admin = (
            db.query(User)
            .join(UserRole, User.id == UserRole.user_id)
            .filter(User.school_id == school.id, UserRole.role_id == admin_role.id)
            .first()
        )

        if existing_admin:
            print(f"[SECURITY ALERT] An administrator already exists for {school.name}: {existing_admin.username} ({existing_admin.email}).")
            print("Refusing to overwrite existing administrator. Bootstrap aborted.")
            return

        # Prompt for password if not provided
        if not password:
            password = settings.BOOTSTRAP_ADMIN_PASSWORD
        if not password:
            print("\nEnter password for initial administrator:")
            password = getpass.getpass("Password: ")
            confirm = getpass.getpass("Confirm Password: ")
            if password != confirm:
                print("Error: Passwords do not match. Aborted.")
                sys.exit(1)
            if len(password) < 8:
                print("Error: Password must be at least 8 characters long. Aborted.")
                sys.exit(1)

        # Create Admin user
        admin_user = User(
            school_id=school.id,
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            is_active=True,
        )
        db.add(admin_user)
        db.flush()

        db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

        db.add(AuditLog(
            school_id=school.id,
            user_id=admin_user.id,
            action="BOOTSTRAP_INITIAL_ADMIN",
            resource_type="User",
            resource_id=str(admin_user.id),
            details=f"Initial administrator {username} bootstrapped successfully"
        ))
        db.commit()

        print("==================================================")
        print("  DECCAN MISSION HIGH SCHOOL ERP - BOOTSTRAP")
        print("==================================================")
        print("Initial administrator created successfully!")
        print(f"School:    {school.name} ({school.code})")
        print(f"Username:  {username}")
        print(f"Email:     {email}")
        print(f"Role:      ADMIN")
        print("You can now sign in at http://localhost:5173/login")
        print("==================================================")
    finally:
        db.close()

def seed_dev_data():
    db: Session = SessionLocal()
    try:
        print("\n****************************************************************")
        print(" [WARNING] DEVELOPMENT DATA SEEDING - NOT FOR PRODUCTION")
        print(" Seeding classes, sections, academic years, teachers and students")
        print("****************************************************************\n")

        ensure_roles(db)
        school = SchoolService.get_or_create_school(db, settings.SCHOOL_NAME, settings.SCHOOL_CODE)

        # 1. Academic Year 2025-2026
        ay = db.query(AcademicYear).filter(AcademicYear.school_id == school.id, AcademicYear.name == "2025-2026").first()
        if not ay:
            ay = AcademicYear(
                school_id=school.id,
                name="2025-2026",
                start_date=date(2025, 6, 1),
                end_date=date(2026, 4, 30),
                is_current=True,
                status="active"
            )
            db.add(ay)
            db.flush()

        # 2. Classes & Sections: Class 1 to Class 10
        classes_data = [
            ("Class 1", 1), ("Class 2", 2), ("Class 3", 3),
            ("Class 4", 4), ("Class 5", 5), ("Class 6", 6),
            ("Class 7", 7), ("Class 8", 8), ("Class 9", 9),
            ("Class 10", 10),
        ]

        class_map = {}
        section_map = {}

        for c_name, g_level in classes_data:
            c = db.query(Class).filter(Class.school_id == school.id, Class.name == c_name).first()
            if not c:
                c = Class(school_id=school.id, name=c_name, grade_level=g_level, stream="General", is_active=True)
                db.add(c)
                db.flush()
                # Create Sections A and B
                for s_name in ["A", "B"]:
                    sec = Section(class_id=c.id, name=s_name, capacity=40, is_active=True)
                    db.add(sec)
                    db.flush()
            class_map[c_name] = c
            for s in c.sections:
                section_map[f"{c_name}-{s.name}"] = s

        db.commit()

        # 3. Create Sample Admin if none exists
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                school_id=school.id,
                username="admin",
                email="admin@dmhs.edu.in",
                full_name="Principal Dr. K. R. Ahmed",
                hashed_password=get_password_hash("Admin@DMHS2026"),
                is_active=True,
            )
            db.add(admin_user)
            db.flush()
            db.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

        # 4. Create Sample Teacher
        teacher_role = db.query(Role).filter(Role.name == "TEACHER").first()
        t_user = db.query(User).filter(User.username == "teacher1").first()
        if not t_user:
            t_user = User(
                school_id=school.id,
                username="teacher1",
                email="fatima.zahra@dmhs.edu.in",
                full_name="Mrs. Fatima Zahra",
                phone_number="+91 98490 12345",
                hashed_password=get_password_hash("Teacher@DMHS2026"),
                is_active=True,
            )
            db.add(t_user)
            db.flush()
            db.add(UserRole(user_id=t_user.id, role_id=teacher_role.id))

            t_profile = TeacherProfile(
                user_id=t_user.id,
                school_id=school.id,
                employee_id="EMP-1001",
                designation="Senior Mathematics Teacher",
                department="Mathematics",
                qualification="M.Sc. Mathematics, B.Ed",
                joining_date=date(2018, 6, 12),
                employment_status="active",
                is_active=True,
            )
            db.add(t_profile)
            db.flush()

            # Assign teacher to Class 10-A (Mathematics) and Class 9-A (Mathematics)
            sec_10a = section_map.get("Class 10-A")
            sec_9a = section_map.get("Class 9-A")
            if sec_10a:
                db.add(TeacherAssignment(
                    teacher_id=t_profile.id,
                    academic_year_id=ay.id,
                    class_id=class_map["Class 10"].id,
                    section_id=sec_10a.id,
                    subject_name="Mathematics",
                    role_type="class_teacher",
                    is_active=True,
                ))
            if sec_9a:
                db.add(TeacherAssignment(
                    teacher_id=t_profile.id,
                    academic_year_id=ay.id,
                    class_id=class_map["Class 9"].id,
                    section_id=sec_9a.id,
                    subject_name="Mathematics",
                    role_type="subject_teacher",
                    is_active=True,
                ))

        # 5. Create Sample Students
        student_role = db.query(Role).filter(Role.name == "STUDENT").first()
        students_seed = [
            ("student1", "mohammed.ali@dmhs.edu.in", "Mohammed Ali Khan", "ADM-2025-0101", "10A01", "Male", "Class 10-A", "Class 10"),
            ("student2", "ayesha.siddiqua@dmhs.edu.in", "Ayesha Siddiqua", "ADM-2025-0102", "10A02", "Female", "Class 10-A", "Class 10"),
            ("student3", "rahul.sharma@dmhs.edu.in", "Rahul Sharma", "ADM-2025-0103", "10B01", "Male", "Class 10-B", "Class 10"),
        ]

        for s_usr, s_email, s_name, adm_no, roll, gender, sec_key, cls_key in students_seed:
            s_u = db.query(User).filter(User.username == s_usr).first()
            if not s_u:
                s_u = User(
                    school_id=school.id,
                    username=s_usr,
                    email=s_email,
                    full_name=s_name,
                    hashed_password=get_password_hash("Student@DMHS2026"),
                    is_active=True,
                )
                db.add(s_u)
                db.flush()
                db.add(UserRole(user_id=s_u.id, role_id=student_role.id))

                s_prof = StudentProfile(
                    user_id=s_u.id,
                    school_id=school.id,
                    admission_number=adm_no,
                    gender=gender,
                    date_of_birth=date(2010, 4, 15),
                    blood_group="O+",
                    guardian_name="Guardian of " + s_name,
                    guardian_phone="+91 98491 55678",
                    address="Charminar Road, Hyderabad",
                    student_status="active",
                    is_active=True,
                )
                db.add(s_prof)
                db.flush()

                target_sec = section_map.get(sec_key)
                target_cls = class_map.get(cls_key)
                if target_sec and target_cls:
                    db.add(StudentEnrollment(
                        student_id=s_prof.id,
                        academic_year_id=ay.id,
                        class_id=target_cls.id,
                        section_id=target_sec.id,
                        roll_number=roll,
                        enrollment_status="enrolled",
                    ))

        db.commit()
        print("[SUCCESS] Development data successfully populated.")
        print("Accounts created:")
        print("  ADMIN:   Username: admin    / Password: Admin@DMHS2026")
        print("  TEACHER: Username: teacher1 / Password: Teacher@DMHS2026 (EMP-1001)")
        print("  STUDENT: Username: student1 / Password: Student@DMHS2026 (ADM-2025-0101)")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deccan Mission High School ERP Management CLI")
    subparsers = parser.add_subparsers(dest="command")

    bootstrap_parser = subparsers.add_parser("bootstrap-admin", help="Bootstrap initial administrator account")
    bootstrap_parser.add_argument("--username", default=settings.BOOTSTRAP_ADMIN_USERNAME, help="Admin username")
    bootstrap_parser.add_argument("--email", default=settings.BOOTSTRAP_ADMIN_EMAIL, help="Admin email")
    bootstrap_parser.add_argument("--name", default=settings.BOOTSTRAP_ADMIN_NAME, help="Admin full name")
    bootstrap_parser.add_argument("--password", default=None, help="Admin password (or set via BOOTSTRAP_ADMIN_PASSWORD env)")

    seed_parser = subparsers.add_parser("seed-dev-data", help="Seed classes, academic years and development test accounts")

    args = parser.parse_args()
    if args.command == "bootstrap-admin":
        bootstrap_admin(
            username=args.username,
            email=args.email,
            full_name=args.name,
            password=args.password
        )
    elif args.command == "seed-dev-data":
        seed_dev_data()
    else:
        parser.print_help()
