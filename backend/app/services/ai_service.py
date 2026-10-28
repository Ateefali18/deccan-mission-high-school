import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_assignment import TeacherAssignment
from app.models.examination import Exam, ExamSubject, Mark
from app.models.fee import Invoice, Payment
from app.models.notice import Notice
from app.models.class_model import Class
from app.models.section import Section
from app.models.ai import AIConversation, AIMessage
from app.services.attendance_service import AttendanceService
from app.services.timetable_service import TimetableService, get_current_school_time
from app.core.config import settings

class AIService:
    @staticmethod
    def resolve_user_context(db: Session, user: User) -> Dict[str, Any]:
        if user.roles:
            role = user.roles[0].upper() if isinstance(user.roles[0], str) else user.roles[0].name.upper()
        else:
            role = "STUDENT"
        context: Dict[str, Any] = {
            "user_id": user.id,
            "role": role,
            "full_name": user.full_name,
            "email": user.email,
            "authorized_class_ids": [],
            "authorized_section_ids": [],
            "student_profile_id": None,
            "teacher_profile_id": None,
        }

        if role == "ADMIN":
            context["authorized_all"] = True
        elif role == "TEACHER":
            teacher = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
            if teacher:
                context["teacher_profile_id"] = teacher.id
                assignments = db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == teacher.id).all()
                context["authorized_class_ids"] = list(set(a.class_id for a in assignments))
                context["authorized_section_ids"] = list(set(a.section_id for a in assignments if a.section_id))
        elif role == "STUDENT":
            student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            if student:
                context["student_profile_id"] = student.id
                enrollment = (
                    db.query(StudentEnrollment)
                    .filter(
                        StudentEnrollment.student_id == student.id,
                        StudentEnrollment.enrollment_status.in_(["enrolled", "active"]),
                    )
                    .first()
                )
                if enrollment:
                    context["authorized_class_ids"] = [enrollment.class_id]
                    context["authorized_section_ids"] = [enrollment.section_id]

        return context

    @staticmethod
    def execute_query(db: Session, user: User, question: str) -> Dict[str, Any]:
        ctx = AIService.resolve_user_context(db, user)
        role = ctx["role"]
        q_lower = question.lower().strip()

        # ----------------------------------------------------------------------
        # 1. NEXT PERIOD & TIMETABLE
        # ----------------------------------------------------------------------
        if "next period" in q_lower or "what is my next period" in q_lower:
            res = TimetableService.get_next_period_for_user(db, user.id, role)
            return {
                "answer": res["message"],
                "data": res,
                "source": "Official DMHS Master Timetable",
                "route": f"/{role.lower()}/dashboard",
                "filters": {"timezone": settings.TIMEZONE},
            }

        if "timetable" in q_lower or "schedule" in q_lower:
            now = get_current_school_time()
            weekday = now.isoweekday()
            if role == "STUDENT" and ctx.get("authorized_section_ids"):
                schedule = TimetableService.get_schedule(
                    db, section_id=ctx["authorized_section_ids"][0], day_of_week=weekday
                )
                periods_desc = ", ".join([f"Period {p['period_number']}: {p['subject']} ({p['start_time']})" for p in schedule]) or "No periods scheduled for today."
                return {
                    "answer": f"Here is your timetable for today ({now.strftime('%A')}): {periods_desc}",
                    "data": schedule,
                    "source": "Student Section Timetable",
                    "route": "/student/dashboard",
                    "filters": {"day": now.strftime("%A"), "section_id": ctx["authorized_section_ids"][0]},
                }
            elif role == "TEACHER" and ctx.get("teacher_profile_id"):
                schedule = TimetableService.get_schedule(
                    db, teacher_id=ctx["teacher_profile_id"], day_of_week=weekday
                )
                periods_desc = ", ".join([f"Period {p['period_number']}: {p['subject']} in {p['room'] or 'Room'} ({p['start_time']})" for p in schedule]) or "No teaching periods scheduled for today."
                return {
                    "answer": f"Your faculty timetable for today ({now.strftime('%A')}): {periods_desc}",
                    "data": schedule,
                    "source": "Teacher Faculty Timetable",
                    "route": "/teacher/dashboard",
                    "filters": {"day": now.strftime("%A"), "teacher_id": ctx["teacher_profile_id"]},
                }
            elif role == "ADMIN":
                return {
                    "answer": "To view class timetables, please visit the Academic Timetable manager in the Admin Portal.",
                    "data": [],
                    "source": "School Timetable Registry",
                    "route": "/admin/classes",
                    "filters": {},
                }

        # ----------------------------------------------------------------------
        # 2. ADMISSION NUMBER & STUDENT LOOKUP
        # ----------------------------------------------------------------------
        adm_match = re.search(r"(?:adm|dmhs)?[-\s]?(\d{3,5})", q_lower)
        if ("find student" in q_lower or "student profile" in q_lower or "admission number" in q_lower) and adm_match:
            adm_num_candidate = adm_match.group(1)
            # Find matching student
            student = (
                db.query(StudentProfile)
                .filter(StudentProfile.admission_number.ilike(f"%{adm_num_candidate}%"))
                .first()
            )

            if not student:
                return {
                    "answer": f"No student record found matching admission identifier '{adm_num_candidate}'.",
                    "data": None,
                    "source": "DMHS Student Registry",
                    "route": "/admin/students",
                    "filters": {"query": adm_num_candidate},
                }

            # Check authorization
            if role == "STUDENT" and student.id != ctx["student_profile_id"]:
                return {
                    "answer": "Access restricted: Students may only access their own student records.",
                    "data": None,
                    "source": "Access Control Boundary",
                    "route": "/student/profile",
                    "filters": {},
                }

            enrollment = (
                db.query(StudentEnrollment)
                .filter(
                    StudentEnrollment.student_id == student.id,
                    StudentEnrollment.enrollment_status.in_(["enrolled", "active"]),
                )
                .first()
            )

            if role == "TEACHER":
                if enrollment and enrollment.class_id not in ctx["authorized_class_ids"]:
                    return {
                        "answer": f"Access restricted: Student {student.user.full_name} is enrolled in a class outside your teaching allocation.",
                        "data": None,
                        "source": "Teacher Authorization Filter",
                        "route": "/teacher/my-students",
                        "filters": {},
                    }

            att_stat = AttendanceService.get_student_attendance(db, student.id)
            c_name = enrollment.class_.name if enrollment and enrollment.class_ else "Unassigned"
            s_name = enrollment.section.name if enrollment and enrollment.section else "-"

            msg = (
                f"Student Profile Found: **{student.user.full_name}** (Admission No: `{student.admission_number}`). "
                f"Class: {c_name} - Section {s_name}. Status: {student.student_status.upper()}. "
                f"Attendance: {att_stat['attendance_percentage']}% ({att_stat['present_count']}/{att_stat['total_sessions']} sessions attended)."
            )

            return {
                "answer": msg,
                "data": {
                    "id": student.id,
                    "admission_number": student.admission_number,
                    "name": student.user.full_name,
                    "class": c_name,
                    "section": s_name,
                    "status": student.student_status,
                    "attendance_pct": att_stat["attendance_percentage"],
                },
                "source": "DMHS Student Directory",
                "route": f"/admin/students?search={student.admission_number}" if role == "ADMIN" else "/teacher/my-students",
                "filters": {"admission_number": student.admission_number},
            }

        # ----------------------------------------------------------------------
        # 3. ATTENDANCE INQUIRIES
        # ----------------------------------------------------------------------
        if "attendance" in q_lower:
            if role == "STUDENT":
                if not ctx.get("student_profile_id"):
                    return {"answer": "No student profile linked to your account.", "data": None, "source": "Auth", "route": "/login", "filters": {}}
                att = AttendanceService.get_student_attendance(db, ctx["student_profile_id"])
                ans = f"Your current attendance is **{att['attendance_percentage']}%** ({att['present_count']} days present, {att['absent_count']} days absent, {att['late_count']} late) across {att['total_sessions']} verified school sessions."
                if att["is_low_attendance"]:
                    ans += " ⚠️ Warning: Your attendance is currently below the mandatory 75% CBSE threshold."
                return {
                    "answer": ans,
                    "data": att,
                    "source": "Student Attendance Record",
                    "route": "/student/dashboard",
                    "filters": {"student_id": ctx["student_profile_id"]},
                }

            if "below 75" in q_lower or "low attendance" in q_lower:
                school_id = user.school_id
                class_id = ctx["authorized_class_ids"][0] if role == "TEACHER" and ctx.get("authorized_class_ids") else None
                low_att = AttendanceService.get_low_attendance_students(db, school_id, threshold=75.0, class_id=class_id)
                count = len(low_att)
                names = ", ".join([f"{s['full_name']} ({s['admission_number']}: {s['attendance_percentage']}%)" for s in low_att[:5]])
                ans = f"Found **{count} student(s)** with attendance below the 75% threshold."
                if names:
                    ans += f" Showing first {min(5, count)}: {names}."
                return {
                    "answer": ans,
                    "data": low_att,
                    "source": "Attendance Warning Ledger",
                    "route": "/admin/students" if role == "ADMIN" else "/teacher/my-students",
                    "filters": {"threshold": 75.0, "class_id": class_id},
                }

            # General attendance summary
            return {
                "answer": "Today's school-wide attendance is logged across all active sections. Please check the Attendance Dashboard for section-wise breakdowns.",
                "data": {},
                "source": "Attendance Register",
                "route": "/admin/dashboard" if role == "ADMIN" else "/teacher/dashboard",
                "filters": {},
            }

        # ----------------------------------------------------------------------
        # 4. EXAMINATIONS & MARKS
        # ----------------------------------------------------------------------
        if "exam" in q_lower or "examination" in q_lower or "marks" in q_lower:
            exams_query = db.query(Exam).filter(Exam.school_id == user.school_id)
            if role == "STUDENT":
                exams_query = exams_query.filter(Exam.is_published == True)
            exams = exams_query.order_by(Exam.start_date.asc()).all()

            if not exams:
                return {
                    "answer": "No upcoming examinations currently scheduled.",
                    "data": [],
                    "source": "CBSE Examination Office",
                    "route": f"/{role.lower()}/dashboard",
                    "filters": {},
                }

            exam_desc = ", ".join([f"**{e.name}** ({e.start_date.strftime('%d %b %Y')} to {e.end_date.strftime('%d %b %Y')})" for e in exams[:3]])
            return {
                "answer": f"Upcoming Examinations: {exam_desc}.",
                "data": [{"id": e.id, "name": e.name, "start": str(e.start_date)} for e in exams],
                "source": "CBSE Examination Registry",
                "route": f"/{role.lower()}/dashboard",
                "filters": {"school_id": user.school_id},
            }

        # ----------------------------------------------------------------------
        # 5. FEES (Restricted strictly to Admin and individual Student)
        # ----------------------------------------------------------------------
        if "fee" in q_lower or "dues" in q_lower or "invoice" in q_lower:
            if role == "TEACHER":
                return {
                    "answer": "Access restricted: Faculty members are not authorized to access school financial or fee accounts.",
                    "data": None,
                    "source": "Financial Security Policy",
                    "route": "/teacher/dashboard",
                    "filters": {},
                }

            if role == "STUDENT":
                invoices = (
                    db.query(Invoice)
                    .filter(Invoice.student_id == ctx["student_profile_id"])
                    .all()
                )
                total_due = sum(inv.total_amount - inv.paid_amount for inv in invoices if inv.status != "paid")
                return {
                    "answer": f"Your current outstanding school fee balance is **₹{total_due:,.2f}**.",
                    "data": {"outstanding_amount": total_due, "invoices_count": len(invoices)},
                    "source": "School Accounts Ledger",
                    "route": "/student/dashboard",
                    "filters": {"student_id": ctx["student_profile_id"]},
                }

            if role == "ADMIN":
                total_invoices = db.query(Invoice).filter(Invoice.school_id == user.school_id).all()
                total_outstanding = sum(inv.total_amount - inv.paid_amount for inv in total_invoices if inv.status != "paid")
                overdue_count = sum(1 for inv in total_invoices if inv.status == "overdue")
                return {
                    "answer": f"Total school-wide outstanding fees: **₹{total_outstanding:,.2f}** across {len(total_invoices)} invoices ({overdue_count} overdue).",
                    "data": {"total_outstanding": total_outstanding, "overdue_count": overdue_count},
                    "source": "Administrative Accounts Portal",
                    "route": "/admin/dashboard",
                    "filters": {"school_id": user.school_id},
                }

        # ----------------------------------------------------------------------
        # 6. NOTICES & ANNOUNCEMENTS
        # ----------------------------------------------------------------------
        if "notice" in q_lower or "announcement" in q_lower:
            notices_query = db.query(Notice).filter(Notice.school_id == user.school_id, Notice.is_published == True)
            if role != "ADMIN":
                notices_query = notices_query.filter(Notice.target_audience.in_(["all", role.lower()]))
            latest_notice = notices_query.order_by(Notice.publish_date.desc()).first()

            if latest_notice:
                return {
                    "answer": f"Latest School Notice: **{latest_notice.title}** ({latest_notice.publish_date.strftime('%d %b %Y')}) — {latest_notice.content}",
                    "data": {"id": latest_notice.id, "title": latest_notice.title},
                    "source": "DMHS Official Notice Board",
                    "route": f"/{role.lower()}/dashboard",
                    "filters": {"priority": latest_notice.priority},
                }
            return {
                "answer": "No active school notices posted at this time.",
                "data": None,
                "source": "Notice Board",
                "route": f"/{role.lower()}/dashboard",
                "filters": {},
            }

        # ----------------------------------------------------------------------
        # 7. DEFAULT / CLARIFICATION
        # ----------------------------------------------------------------------
        return {
            "answer": (
                f"I am the Deccan Mission High School Assistant. You can ask me about: "
                f"next class periods, timetable, student records by admission number, attendance percentage, "
                f"upcoming examinations, fee balances, and school announcements."
            ),
            "data": None,
            "source": "DMHS Knowledge Base",
            "route": f"/{role.lower()}/dashboard",
            "filters": {},
        }
