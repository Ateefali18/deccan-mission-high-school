import pytest
from app.services.attendance_service import AttendanceService
from app.core.security import create_access_token

def test_attendance_percentage_calculation():
    # 1. Perfect attendance
    pct1 = AttendanceService.calculate_percentage(present_count=100, late_count=0, absent_count=0, excused_count=0)
    assert pct1 == 100.0

    # 2. Standard 80/20 attendance
    pct2 = AttendanceService.calculate_percentage(present_count=80, late_count=0, absent_count=20, excused_count=0)
    assert pct2 == 80.0

    # 3. With late counting as 1.0
    pct3 = AttendanceService.calculate_percentage(present_count=70, late_count=10, absent_count=20, excused_count=0, late_weight=1.0)
    assert pct3 == 80.0

    # 4. With late counting as half (0.5)
    pct4 = AttendanceService.calculate_percentage(present_count=70, late_count=10, absent_count=20, excused_count=0, late_weight=0.5)
    assert pct4 == 75.0

    # 5. Zero sessions edge case
    pct5 = AttendanceService.calculate_percentage(present_count=0, late_count=0, absent_count=0, excused_count=0)
    assert pct5 == 100.0

def test_ai_query_next_period_and_timetable(client, seeded_data):
    admin = seeded_data["admin"]
    token = create_access_token(admin.username, "ADMIN", admin.school_id, admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/ai/query",
        json={"question": "What is my next period?"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "source" in data
    assert "conversation_id" in data

def test_ai_query_admission_lookup(client, seeded_data):
    admin = seeded_data["admin"]
    token = create_access_token(admin.username, "ADMIN", admin.school_id, admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/ai/query",
        json={"question": "Find student with admission number ADM-T001"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "Ali Student" in data["answer"]
    assert "ADM-T001" in data["answer"]

def test_ai_query_teacher_blocked_from_finances(client, seeded_data):
    teacher = seeded_data["teacher"]
    token = create_access_token(teacher.username, "TEACHER", teacher.school_id, teacher.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/ai/query",
        json={"question": "Show school outstanding fee collection"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "restricted" in data["answer"].lower() or "not authorized" in data["answer"].lower()

def test_ai_query_notices(client, seeded_data):
    student = seeded_data["student1"]
    token = create_access_token(student.username, "STUDENT", student.school_id, student.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/ai/query",
        json={"question": "Show latest notice from the principal"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
