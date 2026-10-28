import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.core.config import settings
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
from app.core.security import get_password_hash, create_access_token
from datetime import date

# Use an in-memory or dedicated test SQLite database
TEST_DATABASE_URL = "sqlite:///./test_dmhs.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def seeded_data(db_session):
    # Create school
    school = School(
        name="Deccan Mission High School",
        code="DMHS-TEST",
        timezone="Asia/Kolkata",
    )
    db_session.add(school)
    db_session.flush()

    # Create roles
    admin_role = Role(name="ADMIN", description="Admin")
    teacher_role = Role(name="TEACHER", description="Teacher")
    student_role = Role(name="STUDENT", description="Student")
    db_session.add_all([admin_role, teacher_role, student_role])
    db_session.flush()

    # Create Admin
    admin_user = User(
        school_id=school.id,
        username="admin_test",
        email="admin@test.com",
        full_name="Test Principal",
        hashed_password=get_password_hash("TestPass123"),
        is_active=True,
    )
    db_session.add(admin_user)
    db_session.flush()
    db_session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

    # Create Academic Year
    ay = AcademicYear(
        school_id=school.id,
        name="2025-2026",
        start_date=date(2025, 6, 1),
        end_date=date(2026, 4, 30),
        is_current=True,
        status="active"
    )
    db_session.add(ay)
    db_session.flush()

    # Create Class & Section
    cls10 = Class(school_id=school.id, name="Class 10", grade_level=10, stream="General", is_active=True)
    cls9 = Class(school_id=school.id, name="Class 9", grade_level=9, stream="General", is_active=True)
    db_session.add_all([cls10, cls9])
    db_session.flush()

    sec10a = Section(class_id=cls10.id, name="A", capacity=40, is_active=True)
    sec10b = Section(class_id=cls10.id, name="B", capacity=40, is_active=True)
    sec9a = Section(class_id=cls9.id, name="A", capacity=40, is_active=True)
    db_session.add_all([sec10a, sec10b, sec9a])
    db_session.flush()

    # Create Teacher
    teacher_user = User(
        school_id=school.id,
        username="teacher_test",
        email="teacher@test.com",
        full_name="Fatima Teacher",
        hashed_password=get_password_hash("TestPass123"),
        is_active=True,
    )
    db_session.add(teacher_user)
    db_session.flush()
    db_session.add(UserRole(user_id=teacher_user.id, role_id=teacher_role.id))

    t_profile = TeacherProfile(
        user_id=teacher_user.id,
        school_id=school.id,
        employee_id="EMP-T01",
        designation="Senior Faculty",
        department="Mathematics",
        employment_status="active",
        is_active=True,
    )
    db_session.add(t_profile)
    db_session.flush()

    # Assign Teacher ONLY to Class 10A
    db_session.add(TeacherAssignment(
        teacher_id=t_profile.id,
        academic_year_id=ay.id,
        class_id=cls10.id,
        section_id=sec10a.id,
        subject_name="Mathematics",
        role_type="class_teacher",
        is_active=True,
    ))

    # Create Student 1 (Enrolled in 10A)
    s1_user = User(
        school_id=school.id,
        username="student1_test",
        email="student1@test.com",
        full_name="Ali Student",
        hashed_password=get_password_hash("TestPass123"),
        is_active=True,
    )
    db_session.add(s1_user)
    db_session.flush()
    db_session.add(UserRole(user_id=s1_user.id, role_id=student_role.id))

    s1_profile = StudentProfile(
        user_id=s1_user.id,
        school_id=school.id,
        admission_number="ADM-T001",
        student_status="active",
        is_active=True,
    )
    db_session.add(s1_profile)
    db_session.flush()

    db_session.add(StudentEnrollment(
        student_id=s1_profile.id,
        academic_year_id=ay.id,
        class_id=cls10.id,
        section_id=sec10a.id,
        roll_number="10A01",
        enrollment_status="enrolled",
    ))

    # Create Student 2 (Enrolled in 10B)
    s2_user = User(
        school_id=school.id,
        username="student2_test",
        email="student2@test.com",
        full_name="Ayesha Student",
        hashed_password=get_password_hash("TestPass123"),
        is_active=True,
    )
    db_session.add(s2_user)
    db_session.flush()
    db_session.add(UserRole(user_id=s2_user.id, role_id=student_role.id))

    s2_profile = StudentProfile(
        user_id=s2_user.id,
        school_id=school.id,
        admission_number="ADM-T002",
        student_status="active",
        is_active=True,
    )
    db_session.add(s2_profile)
    db_session.flush()

    db_session.add(StudentEnrollment(
        student_id=s2_profile.id,
        academic_year_id=ay.id,
        class_id=cls10.id,
        section_id=sec10b.id,
        roll_number="10B01",
        enrollment_status="enrolled",
    ))

    db_session.commit()

    return {
        "school": school,
        "admin": admin_user,
        "teacher": teacher_user,
        "teacher_profile": t_profile,
        "student1": s1_user,
        "student1_profile": s1_profile,
        "student2": s2_user,
        "student2_profile": s2_profile,
        "class10": cls10,
        "sec10a": sec10a,
        "sec10b": sec10b,
        "academic_year": ay,
    }
