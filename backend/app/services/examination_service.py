from typing import List, Optional, Dict, Any, Tuple
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.examination import Exam, ExamSubject, Mark, ExamType
from app.models.subject import Subject, ClassSubject, GradingScale
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.class_model import Class
from app.models.section import Section
from app.models.user import User
from app.core.exceptions import ValidationException, ResourceNotFoundException

class ExaminationService:
    @staticmethod
    def calculate_ssc_grade(pct: float, db: Optional[Session] = None, school_id: Optional[int] = None) -> Tuple[str, float]:
        """
        Determines grade based on school's grading_scales table or official Telangana SSC 9-point scale.
        """
        if db and school_id:
            scales = (
                db.query(GradingScale)
                .filter(GradingScale.school_id == school_id)
                .order_by(GradingScale.min_percentage.desc())
                .all()
            )
            for s in scales:
                if pct >= s.min_percentage:
                    return s.grade, s.grade_point or 0.0

        # Default Telangana SSC 9-point secondary scale
        if pct >= 91.0:
            return "A1", 10.0
        elif pct >= 81.0:
            return "A2", 9.0
        elif pct >= 71.0:
            return "B1", 8.0
        elif pct >= 61.0:
            return "B2", 7.0
        elif pct >= 51.0:
            return "C1", 6.0
        elif pct >= 41.0:
            return "C2", 5.0
        elif pct >= 33.0:
            return "D", 4.0
        elif pct >= 21.0:
            return "E1", 0.0
        else:
            return "E2", 0.0

    @staticmethod
    def list_exams(db: Session, school_id: int, academic_year_id: Optional[int] = None) -> List[Exam]:
        query = db.query(Exam).filter(Exam.school_id == school_id)
        if academic_year_id:
            query = query.filter(Exam.academic_year_id == academic_year_id)
        return query.order_by(Exam.start_date.desc()).all()

    @staticmethod
    def list_subjects(db: Session, school_id: int, class_id: Optional[int] = None) -> List[Dict[str, Any]]:
        if class_id:
            class_subjects = (
                db.query(ClassSubject, Subject)
                .join(Subject, ClassSubject.subject_id == Subject.id)
                .filter(ClassSubject.class_id == class_id, Subject.is_active.is_(True))
                .all()
            )
            if class_subjects:
                return [
                    {
                        "id": s.id,
                        "name": s.name,
                        "code": s.code,
                        "department": s.department,
                        "is_elective": cs.is_elective,
                    }
                    for cs, s in class_subjects
                ]

        # Fallback to all active subjects for school
        subjects = db.query(Subject).filter(Subject.school_id == school_id, Subject.is_active.is_(True)).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "department": s.department,
                "is_elective": False,
            }
            for s in subjects
        ]

    @staticmethod
    def get_or_create_exam_subject(
        db: Session,
        school_id: int,
        exam_id: int,
        class_id: int,
        subject_name: str,
        max_marks: float = 100.0,
        passing_marks: float = 35.0,
    ) -> ExamSubject:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.school_id == school_id).first()
        if not exam:
            raise ResourceNotFoundException("Exam not found")

        es = (
            db.query(ExamSubject)
            .filter(
                ExamSubject.exam_id == exam_id,
                ExamSubject.class_id == class_id,
                ExamSubject.subject_name == subject_name,
            )
            .first()
        )
        if not es:
            # find matching subject if exists
            sub = db.query(Subject).filter(Subject.school_id == school_id, Subject.name == subject_name).first()
            es = ExamSubject(
                exam_id=exam_id,
                class_id=class_id,
                subject_id=sub.id if sub else None,
                subject_name=subject_name,
                max_marks=max_marks,
                passing_marks=passing_marks,
                exam_date=exam.start_date or date.today(),
            )
            db.add(es)
            db.flush()
        else:
            if max_marks is not None:
                es.max_marks = max_marks
            if passing_marks is not None:
                es.passing_marks = passing_marks
            db.flush()

        return es

    @staticmethod
    def get_marks_entry_sheet(
        db: Session,
        school_id: int,
        exam_id: int,
        class_id: int,
        section_id: int,
        subject_name: str,
    ) -> Dict[str, Any]:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.school_id == school_id).first()
        if not exam:
            raise ResourceNotFoundException("Exam not found")

        # Get or create ExamSubject
        exam_sub = ExaminationService.get_or_create_exam_subject(
            db=db,
            school_id=school_id,
            exam_id=exam_id,
            class_id=class_id,
            subject_name=subject_name,
        )

        # Get active enrolled students in this class and section
        students = (
            db.query(StudentProfile)
            .join(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
            .filter(
                StudentProfile.school_id == school_id,
                StudentProfile.is_active.is_(True),
                StudentEnrollment.class_id == class_id,
                StudentEnrollment.section_id == section_id,
                StudentEnrollment.enrollment_status.in_(["enrolled", "active"]),
            )
            .order_by(StudentEnrollment.roll_number.asc(), StudentProfile.admission_number.asc())
            .all()
        )

        # Fetch existing marks
        existing_marks = (
            db.query(Mark)
            .filter(Mark.exam_subject_id == exam_sub.id)
            .all()
        )
        marks_map = {m.student_id: m for m in existing_marks}

        student_entries = []
        for s in students:
            m = marks_map.get(s.id)
            enrollment = (
                db.query(StudentEnrollment)
                .filter(StudentEnrollment.student_id == s.id, StudentEnrollment.section_id == section_id)
                .first()
            )
            student_entries.append({
                "student_id": s.id,
                "admission_number": s.admission_number,
                "full_name": s.user.full_name if s.user else "Student",
                "roll_number": enrollment.roll_number if enrollment else "-",
                "marks_obtained": m.marks_obtained if m and not m.is_absent else None,
                "is_absent": m.is_absent if m else False,
                "remarks": m.remarks if m else "",
                "is_saved": m is not None,
            })

        return {
            "exam_id": exam.id,
            "exam_name": exam.name,
            "class_id": class_id,
            "section_id": section_id,
            "subject_name": subject_name,
            "exam_subject_id": exam_sub.id,
            "max_marks": exam_sub.max_marks,
            "passing_marks": exam_sub.passing_marks,
            "students": student_entries,
        }

    @staticmethod
    def save_marks(
        db: Session,
        school_id: int,
        user_id: Optional[int],
        exam_id: int,
        class_id: int,
        section_id: int,
        subject_name: str,
        max_marks: float,
        passing_marks: float,
        entries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        exam_sub = ExaminationService.get_or_create_exam_subject(
            db=db,
            school_id=school_id,
            exam_id=exam_id,
            class_id=class_id,
            subject_name=subject_name,
            max_marks=max_marks,
            passing_marks=passing_marks,
        )

        saved_count = 0
        for item in entries:
            student_id = item["student_id"]
            marks_obtained = item.get("marks_obtained")
            is_absent = item.get("is_absent", False)
            remarks = item.get("remarks")

            # Validate against maximum marks
            if not is_absent and marks_obtained is not None:
                if marks_obtained < 0:
                    raise ValidationException(f"Marks obtained cannot be negative for student ID {student_id}")
                if marks_obtained > exam_sub.max_marks:
                    raise ValidationException(
                        f"Marks obtained ({marks_obtained}) cannot exceed maximum marks ({exam_sub.max_marks}) for student ID {student_id}"
                    )

            # Prevent duplicate entries via upsert on (exam_subject_id, student_id)
            existing_mark = (
                db.query(Mark)
                .filter(
                    Mark.exam_subject_id == exam_sub.id,
                    Mark.student_id == student_id,
                )
                .first()
            )

            if existing_mark:
                existing_mark.marks_obtained = None if is_absent else marks_obtained
                existing_mark.is_absent = is_absent
                existing_mark.remarks = remarks
                existing_mark.evaluated_by_user_id = user_id
            else:
                new_mark = Mark(
                    exam_subject_id=exam_sub.id,
                    student_id=student_id,
                    marks_obtained=None if is_absent else marks_obtained,
                    is_absent=is_absent,
                    remarks=remarks,
                    evaluated_by_user_id=user_id,
                )
                db.add(new_mark)
            saved_count += 1

        db.commit()
        return {
            "status": "success",
            "exam_subject_id": exam_sub.id,
            "subject_name": exam_sub.subject_name,
            "saved_count": saved_count,
            "message": f"Marks successfully recorded for {saved_count} students.",
        }

    @staticmethod
    def get_class_results(
        db: Session,
        school_id: int,
        exam_id: int,
        class_id: int,
        section_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        exam = db.query(Exam).filter(Exam.id == exam_id, Exam.school_id == school_id).first()
        if not exam:
            raise ResourceNotFoundException("Exam not found")

        exam_subjects = db.query(ExamSubject).filter(ExamSubject.exam_id == exam.id, ExamSubject.class_id == class_id).all()
        es_ids = [es.id for es in exam_subjects]

        # Students in class & section
        query = (
            db.query(StudentProfile)
            .join(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
            .filter(
                StudentProfile.school_id == school_id,
                StudentProfile.is_active.is_(True),
                StudentEnrollment.class_id == class_id,
            )
        )
        if section_id:
            query = query.filter(StudentEnrollment.section_id == section_id)

        students = query.all()

        results = []
        for s in students:
            marks = (
                db.query(Mark, ExamSubject)
                .join(ExamSubject, Mark.exam_subject_id == ExamSubject.id)
                .filter(Mark.student_id == s.id, Mark.exam_subject_id.in_(es_ids))
                .all()
            )

            total_max = sum(es.max_marks for _, es in marks)
            total_obtained = sum(m.marks_obtained or 0.0 for m, _ in marks if not m.is_absent)
            any_absent = any(m.is_absent for m, _ in marks)
            failed_any = any(
                (m.marks_obtained or 0.0) < es.passing_marks
                for m, es in marks
                if not m.is_absent
            )

            pct = (total_obtained / total_max * 100.0) if total_max > 0 else 0.0
            grade, _ = ExaminationService.calculate_ssc_grade(pct, db=db, school_id=school_id)

            status = "Absent" if any_absent and len(marks) == len(es_ids) else "Failed" if failed_any else "Passed"

            results.append({
                "student_id": s.id,
                "admission_number": s.admission_number,
                "full_name": s.user.full_name if s.user else "Student",
                "total_max": total_max,
                "total_obtained": round(total_obtained, 2),
                "percentage": round(pct, 2),
                "grade": grade,
                "status": status,
                "subjects_recorded": len(marks),
                "total_subjects": len(exam_subjects),
            })

        # Rank by percentage descending
        results.sort(key=lambda r: r["percentage"], reverse=True)
        for i, r in enumerate(results, 1):
            r["rank"] = i

        return results
