import pytest
from app.core.security import create_access_token

def test_admin_dashboard_counts(client, seeded_data):
    admin_token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )

    res = client.get(
        "/api/v1/dashboards/admin",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_active_students"] == 2
    assert data["total_active_teachers"] == 1
    assert data["total_classes"] == 2
    assert data["total_sections"] == 3
    assert data["current_academic_year"] == "2025-2026"

def test_teacher_dashboard(client, seeded_data):
    teacher_token = create_access_token(
        subject="teacher_test",
        role="TEACHER",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["teacher"].id,
    )

    res = client.get(
        "/api/v1/dashboards/teacher",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["employee_id"] == "EMP-T01"
    assert data["total_assigned_classes"] == 1
    assert data["total_authorized_students"] == 1  # only student 1 is in 10-A
    assert "Mathematics" in data["assigned_subjects"]

def test_student_dashboard(client, seeded_data):
    student_token = create_access_token(
        subject="student1_test",
        role="STUDENT",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["student1"].id,
    )

    res = client.get(
        "/api/v1/dashboards/student",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["admission_number"] == "ADM-T001"
    assert data["class_name"] == "Class 10"
    assert data["section_name"] == "A"
    assert data["status"] == "active"
