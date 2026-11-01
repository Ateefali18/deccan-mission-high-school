import pytest
from app.core.security import create_access_token

def test_list_exams_and_subjects(client, seeded_data):
    teacher = seeded_data["teacher"]
    token = create_access_token(teacher.username, "TEACHER", teacher.school_id, teacher.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List Exams
    res_exams = client.get("/api/v1/examinations/exams", headers=headers)
    assert res_exams.status_code == 200
    exams = res_exams.json()
    assert len(exams) >= 1
    assert any("Mid-Term" in e["name"] for e in exams)

    # 2. List Subjects
    res_subjects = client.get("/api/v1/examinations/subjects", headers=headers)
    assert res_subjects.status_code == 200
    subjects = res_subjects.json()
    assert len(subjects) >= 1
    assert any(s["name"] == "Mathematics" for s in subjects)

def test_marks_entry_sheet_and_validation(client, seeded_data):
    teacher = seeded_data["teacher"]
    token = create_access_token(teacher.username, "TEACHER", teacher.school_id, teacher.id)
    headers = {"Authorization": f"Bearer {token}"}

    exam = seeded_data["exam"]
    cls10 = seeded_data["class10"]
    sec10a = seeded_data["sec10a"]
    student1 = seeded_data["student1_profile"]

    # 1. Fetch Marks Entry Sheet
    res_sheet = client.get(
        f"/api/v1/examinations/marks/entry-sheet?exam_id={exam.id}&class_id={cls10.id}&section_id={sec10a.id}&subject_name=Mathematics",
        headers=headers,
    )
    assert res_sheet.status_code == 200
    sheet = res_sheet.json()
    assert sheet["exam_id"] == exam.id
    assert sheet["max_marks"] == 100.0
    assert len(sheet["students"]) >= 1

    # 2. Validation Against Maximum Marks: submitting 105 / 100 fails!
    invalid_payload = {
        "exam_id": exam.id,
        "class_id": cls10.id,
        "section_id": sec10a.id,
        "subject_name": "Mathematics",
        "max_marks": 100.0,
        "passing_marks": 35.0,
        "entries": [
            {"student_id": student1.id, "marks_obtained": 105.0, "is_absent": False},
        ],
    }
    res_invalid = client.post("/api/v1/examinations/marks", json=invalid_payload, headers=headers)
    assert res_invalid.status_code in [400, 422]  # Validation rejected!

    # 3. Successful Marks Entry: 94 / 100
    valid_payload = {
        "exam_id": exam.id,
        "class_id": cls10.id,
        "section_id": sec10a.id,
        "subject_name": "Mathematics",
        "max_marks": 100.0,
        "passing_marks": 35.0,
        "entries": [
            {"student_id": student1.id, "marks_obtained": 94.0, "is_absent": False, "remarks": "Excellent performance"},
        ],
    }
    res_valid = client.post("/api/v1/examinations/marks", json=valid_payload, headers=headers)
    assert res_valid.status_code == 200
    assert res_valid.json()["saved_count"] == 1

    # 4. Duplicate Prevention & Editing: update marks to 96.0
    valid_payload["entries"][0]["marks_obtained"] = 96.0
    valid_payload["entries"][0]["remarks"] = "Re-evaluation +2"
    res_update = client.post("/api/v1/examinations/marks", json=valid_payload, headers=headers)
    assert res_update.status_code == 200

    # Verify sheet now shows 96.0
    res_sheet2 = client.get(
        f"/api/v1/examinations/marks/entry-sheet?exam_id={exam.id}&class_id={cls10.id}&section_id={sec10a.id}&subject_name=Mathematics",
        headers=headers,
    )
    assert res_sheet2.status_code == 200
    st1_entry = next(s for s in res_sheet2.json()["students"] if s["student_id"] == student1.id)
    assert st1_entry["marks_obtained"] == 96.0
    assert st1_entry["remarks"] == "Re-evaluation +2"

    # 5. Class Results Calculation with CBSE 9-Point Grade (96% -> A1)
    res_results = client.get(
        f"/api/v1/examinations/results/class?exam_id={exam.id}&class_id={cls10.id}&section_id={sec10a.id}",
        headers=headers,
    )
    assert res_results.status_code == 200
    results = res_results.json()
    assert len(results) >= 1
    st1_res = next(r for r in results if r["student_id"] == student1.id)
    assert st1_res["percentage"] == 96.0
    assert st1_res["grade"] == "A1"
    assert st1_res["status"] == "Passed"
    assert st1_res["rank"] == 1

def test_student_forbidden_from_marks_entry(client, seeded_data):
    student = seeded_data["student1"]
    token = create_access_token(student.username, "STUDENT", student.school_id, student.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "exam_id": seeded_data["exam"].id,
        "class_id": seeded_data["class10"].id,
        "section_id": seeded_data["sec10a"].id,
        "subject_name": "Mathematics",
        "max_marks": 100.0,
        "passing_marks": 35.0,
        "entries": [
            {"student_id": seeded_data["student1_profile"].id, "marks_obtained": 100.0},
        ],
    }

    # Student cannot enter marks
    res = client.post("/api/v1/examinations/marks", json=payload, headers=headers)
    assert res.status_code == 403
