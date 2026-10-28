import pytest
from app.core.security import create_access_token

def test_global_search_student_by_admission_number(client, seeded_data):
    admin_token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )

    res = client.get(
        "/api/v1/search/?q=ADM-T001",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any(r["identifier"] == "ADM-T001" for r in data["results"])

def test_global_search_teacher_by_employee_id(client, seeded_data):
    admin_token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )

    res = client.get(
        "/api/v1/search/?q=EMP-T01",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any(r["identifier"] == "EMP-T01" for r in data["results"])

def test_persistence_create_and_fetch_academic_year(client, seeded_data):
    admin_token = create_access_token(
        subject="admin_test",
        role="ADMIN",
        school_id=seeded_data["school"].id,
        user_id=seeded_data["admin"].id,
    )

    # 1. Create a new Academic Year
    create_res = client.post(
        "/api/v1/academic-years/",
        json={
            "name": "2026-2027",
            "start_date": "2026-06-01",
            "end_date": "2027-04-30",
            "is_current": False,
            "status": "planned"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # 2. Query list to verify persistence
    list_res = client.get(
        "/api/v1/academic-years/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    years = list_res.json()
    assert any(y["id"] == created_id and y["name"] == "2026-2027" for y in years)
