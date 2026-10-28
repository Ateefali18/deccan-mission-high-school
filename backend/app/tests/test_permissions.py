import pytest
from app.core.security import create_access_token

def test_student_isolation_cannot_access_other_student(client, seeded_data):
    # Student 1 tries to access Student 2's profile
    s1_token = create_access_token(
        subject="student1_test",
        role="STUDENT",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["student1"].id,
    )

    s2_profile_id = seeded_data["student2_profile"].id

    res = client.get(
        f"/api/v1/students/{s2_profile_id}",
        headers={"Authorization": f"Bearer {s1_token}"}
    )
    assert res.status_code == 403
    assert "Access denied" in res.json()["message"]

def test_student_can_access_own_profile(client, seeded_data):
    s1_token = create_access_token(
        subject="student1_test",
        role="STUDENT",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["student1"].id,
    )

    res = client.get(
        "/api/v1/students/me/profile",
        headers={"Authorization": f"Bearer {s1_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["admission_number"] == "ADM-T001"
    assert data["full_name"] == "Ali Student"

def test_teacher_assignment_restriction(client, seeded_data):
    # Teacher is assigned ONLY to Section 10-A (Student 1 is enrolled in 10-A)
    # Student 2 is enrolled in Section 10-B (Unassigned)
    teacher_token = create_access_token(
        subject="teacher_test",
        role="TEACHER",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["teacher"].id,
    )

    s1_id = seeded_data["student1_profile"].id
    s2_id = seeded_data["student2_profile"].id

    # 1. Teacher can access assigned student (10-A)
    res_s1 = client.get(
        f"/api/v1/students/{s1_id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res_s1.status_code == 200
    assert res_s1.json()["admission_number"] == "ADM-T001"

    # 2. Teacher CANNOT access unassigned student (10-B)
    res_s2 = client.get(
        f"/api/v1/students/{s2_id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res_s2.status_code == 403
    assert "Access denied" in res_s2.json()["message"]

def test_admin_access_control_and_creation(client, seeded_data):
    admin_token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )
    student_token = create_access_token(
        subject="student1_test",
        role="STUDENT",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["student1"].id,
    )

    # 1. Student cannot create a class
    res_unauth = client.post(
        "/api/v1/classes/",
        json={"name": "Class 11", "grade_level": 11, "stream": "Science"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res_unauth.status_code == 403

    # 2. Admin can create a class
    res_admin = client.post(
        "/api/v1/classes/",
        json={"name": "Class 11", "grade_level": 11, "stream": "Science"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 201
    assert res_admin.json()["name"] == "Class 11"
