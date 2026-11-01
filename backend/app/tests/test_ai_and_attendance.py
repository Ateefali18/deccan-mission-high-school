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


def test_attendance_session_submission_and_retrieval(client, seeded_data):
    teacher = seeded_data["teacher"]
    token = create_access_token(teacher.username, "TEACHER", teacher.school_id, teacher.id)
    headers = {"Authorization": f"Bearer {token}"}

    student1 = seeded_data["student1_profile"]
    student2 = seeded_data["student2_profile"]
    student1_user = seeded_data["student1"]

    # 1. Submit Attendance
    payload = {
        "academic_year_id": seeded_data["academic_year"].id,
        "class_id": seeded_data["class10"].id,
        "section_id": seeded_data["sec10a"].id,
        "session_date": "2026-10-29",
        "period_number": 0,
        "records": [
            {"student_id": student1.id, "status": "present", "remarks": "On time"},
            {"student_id": student2.id, "status": "late", "remarks": "Bus delayed 10m"},
        ],
    }

    res = client.post("/api/v1/attendance/sessions", json=payload, headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "success"
    session_id = res_data["session_id"]

    # 2. Retrieve Attendance Session (Edit flow)
    res_get = client.get(
        f"/api/v1/attendance/sessions?section_id={seeded_data['sec10a'].id}&session_date=2026-10-29",
        headers=headers,
    )
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["session_id"] == session_id
    assert str(student1.id) in get_data["records"]
    assert get_data["records"][str(student1.id)]["status"] == "present"
    assert get_data["records"][str(student2.id)]["status"] == "late"

    # 3. Duplicate Prevention & Edit Verification: Update student2 to "present"
    payload["records"][1]["status"] = "present"
    payload["records"][1]["remarks"] = "Correction: was present"
    res_update = client.post("/api/v1/attendance/sessions", json=payload, headers=headers)
    assert res_update.status_code == 200
    assert res_update.json()["session_id"] == session_id  # Reused same session!

    # 4. Date-wise report
    res_report = client.get(
        f"/api/v1/attendance/reports/date-wise?class_id={seeded_data['class10'].id}",
        headers=headers,
    )
    assert res_report.status_code == 200
    report_items = res_report.json()
    assert len(report_items) >= 1
    session_summary = next(item for item in report_items if item["session_id"] == session_id)
    assert session_summary["present_count"] == 2
    assert session_summary["attendance_percentage"] == 100.0

    # 5. Security & Isolation: Student cannot submit attendance
    student_token = create_access_token(student1_user.username, "STUDENT", student1_user.school_id, student1_user.id)
    res_student_submit = client.post(
        "/api/v1/attendance/sessions",
        json=payload,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_student_submit.status_code == 403


def test_ai_status_and_capabilities(client, seeded_data):
    admin = seeded_data["admin"]
    token = create_access_token(admin.username, "ADMIN", admin.school_id, admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/ai/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "gemini"
    assert data["server_side_key_enforced"] is True
    assert data["pii_safeguards_active"] is True
    assert "Master Timetable & Next Period" in data["grounded_queries_supported"]


def test_ai_class_student_count_and_pii_redaction(client, seeded_data):
    from app.services.ai_service import redact_pii
    # 1. PII Redaction
    sample = "Call me at +91 9876543210 or email test@dmhs.edu.in with ID 1234 5678 9012"
    cleaned = redact_pii(sample)
    assert "+91 9876543210" not in cleaned
    assert "[REDACTED_PHONE]" in cleaned
    assert "test@dmhs.edu.in" not in cleaned
    assert "[REDACTED_EMAIL]" in cleaned
    assert "1234 5678 9012" not in cleaned
    assert "[REDACTED_ID]" in cleaned

    # 2. Query class count
    admin = seeded_data["admin"]
    token = create_access_token(admin.username, "ADMIN", admin.school_id, admin.id)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post(
        "/api/v1/ai/query",
        json={"question": "How many students are in Class 10?"},
        headers=headers,
    )
    assert res.status_code == 200
    q_data = res.json()
    assert "Class 10" in q_data["answer"]
    assert "student(s)" in q_data["answer"]


def test_notices_api_list_and_create(client, seeded_data):
    admin = seeded_data["admin"]
    teacher = seeded_data["teacher"]
    student = seeded_data["student1"]

    admin_token = create_access_token(admin.username, "ADMIN", admin.school_id, admin.id)
    teacher_token = create_access_token(teacher.username, "TEACHER", teacher.school_id, teacher.id)
    student_token = create_access_token(student.username, "STUDENT", student.school_id, student.id)

    # 1. Admin creates notice
    payload = {
        "title": "Annual CBSE Sports Meet 2026",
        "content": "All students must submit athletic registration entries by Friday.",
        "target_audience": "all",
        "priority": "high",
        "is_published": True,
    }
    res_create = client.post(
        "/api/v1/notices/",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_create.status_code == 201
    created_id = res_create.json()["id"]

    # 2. Teacher can read notices
    res_teacher = client.get(
        "/api/v1/notices/",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res_teacher.status_code == 200
    titles = [n["title"] for n in res_teacher.json()]
    assert "Annual CBSE Sports Meet 2026" in titles

    # 3. Student can read notices
    res_student = client.get(
        "/api/v1/notices/",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_student.status_code == 200
    student_titles = [n["title"] for n in res_student.json()]
    assert "Annual CBSE Sports Meet 2026" in student_titles

    # 4. Student cannot publish notice (Forbidden 403)
    res_student_post = client.post(
        "/api/v1/notices/",
        json=payload,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_student_post.status_code == 403


