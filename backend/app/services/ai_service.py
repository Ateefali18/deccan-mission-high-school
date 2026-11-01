import re
import logging
from datetime import date
from typing import Dict, Any, List, Optional
import httpx
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
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.ai import AIConversation, AIMessage
from app.services.attendance_service import AttendanceService
from app.services.timetable_service import TimetableService, get_current_school_time
from app.core.config import settings

logger = logging.getLogger(__name__)

# Sensitive Personally Identifiable Information (PII) Redaction Regexes
PHONE_PATTERN = re.compile(r"(\+?91[\-\s]?)?[6-9]\d{9}")
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
AADHAAR_PATTERN = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")

def redact_pii(text: str) -> str:
    """
    Scrubs phone numbers, email addresses, and national ID patterns
    before text is ever transmitted to an external LLM provider.
    """
    text = PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
    text = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    text = AADHAAR_PATTERN.sub("[REDACTED_ID]", text)
    return text


class AIService:
    @staticmethod
    def get_provider_status() -> Dict[str, Any]:
        """
        Returns the configured AI status without exposing secret API keys to the client.
        """
        is_configured = bool(settings.AI_API_KEY and len(settings.AI_API_KEY.strip()) > 0)
        return {
            "provider": settings.AI_PROVIDER,
            "model": settings.AI_MODEL,
            "is_api_key_configured": is_configured,
            "server_side_key_enforced": True,
            "pii_safeguards_active": True,
            "grounded_queries_supported": [
                "Master Timetable & Next Period",
                "Student Directory & Profile by Admission Number",
                "Attendance Summary & Low Attendance (<75%) Alerts",
                "Class-Wise Attendance & Enrollment Statistics",
                "CBSE Examinations & Result Schedules",
                "Pending Marks Entry Tracking",
                "Fee Balances & Overdue Ledgers (Role-Secured)",
                "Official Notices & Announcements",
            ],
        }

    @staticmethod
    def query_gemini(prompt: str, user_role: str, user_name: str) -> Optional[str]:
        """
        Queries Google Gemini API securely from the backend server.
        Enforces strict PII scrubbing before sending prompt.
        Returns None if key is unconfigured or request fails.
        """
        api_key = settings.AI_API_KEY
        if not api_key or not api_key.strip():
            return None

        clean_prompt = redact_pii(prompt)
        system_instruction = (
            f"You are the Deccan Mission High School (DMHS) Academic & School Assistant in Hyderabad, India. "
            f"You are answering an authorized user ({user_name}) who holds the role: {user_role}. "
            f"Guidelines: "
            f"1. Be polite, concise, educational, and professional following CBSE academic standards. "
            f"2. Never disclose private personal details (phone numbers, home addresses, government IDs). "
            f"3. If asked about student personal records or confidential finances, guide the user to the official ERP pages."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_instruction}\n\nUser Question: {clean_prompt}"}],
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800,
            },
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                else:
                    logger.warning(f"Gemini API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error querying Gemini API: {e}")

        return None

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
                "is_grounded": True,
                "provider": "institutional_db",
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
                    "is_grounded": True,
                    "provider": "institutional_db",
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
                    "is_grounded": True,
                    "provider": "institutional_db",
                }
            elif role == "ADMIN":
                return {
                    "answer": "To view class timetables, please visit the Academic Timetable manager in the Admin Portal.",
                    "data": [],
                    "source": "School Timetable Registry",
                    "route": "/admin/classes",
                    "filters": {},
                    "is_grounded": True,
                    "provider": "institutional_db",
                }

        # ----------------------------------------------------------------------
        # 2. ADMISSION NUMBER & STUDENT LOOKUP
        # ----------------------------------------------------------------------
        adm_match = re.search(r"(?:adm|dmhs)?[-\s]?(\d{3,5})", q_lower)
        if ("find student" in q_lower or "student profile" in q_lower or "admission number" in q_lower) and adm_match:
            adm_num_candidate = adm_match.group(1)
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
                    "is_grounded": True,
                    "provider": "institutional_db",
                }

            # Check authorization
            if role == "STUDENT" and student.id != ctx["student_profile_id"]:
                return {
                    "answer": "Access restricted: Students may only access their own student records.",
                    "data": None,
                    "source": "Access Control Boundary",
                    "route": "/student/profile",
                    "filters": {},
                    "is_grounded": True,
                    "provider": "institutional_db",
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
                        "is_grounded": True,
                        "provider": "institutional_db",
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
                "is_grounded": True,
                "provider": "institutional_db",
            }

        # ----------------------------------------------------------------------
        # 3. CLASS & SECTION STUDENT COUNTS
        # ----------------------------------------------------------------------
        class_count_match = re.search(r"(?:how many students|number of students).*class\s*([0-9a-zA-Z]+)(?:[,\s]+section\s*([a-zA-Z]))?", q_lower)
        if class_count_match:
            c_query = class_count_match.group(1)
            s_query = class_count_match.group(2)

            class_obj = db.query(Class).filter(
                Class.school_id == user.school_id,
                (Class.name.ilike(f"%{c_query}%") | (Class.grade_level == int(c_query) if c_query.isdigit() else False))
            ).first()

            if class_obj:
                query = db.query(StudentEnrollment).filter(
                    StudentEnrollment.class_id == class_obj.id,
                    StudentEnrollment.enrollment_status.in_(["enrolled", "active"])
                )
                section_name = None
                if s_query:
                    sec_obj = db.query(Section).filter(
                        Section.class_id == class_obj.id,
                        Section.name.ilike(f"%{s_query}%")
                    ).first()
                    if sec_obj:
                        query = query.filter(StudentEnrollment.section_id == sec_obj.id)
                        section_name = sec_obj.name

                total_count = query.count()
                loc_desc = f"{class_obj.name}" + (f", Section {section_name}" if section_name else "")
                return {
                    "answer": f"There are **{total_count} active student(s)** enrolled in **{loc_desc}**.",
                    "data": {"class_id": class_obj.id, "class_name": class_obj.name, "count": total_count},
                    "source": "DMHS Enrollment Registry",
                    "route": "/admin/students" if role == "ADMIN" else "/teacher/my-students",
                    "filters": {"class_id": class_obj.id},
                    "is_grounded": True,
                    "provider": "institutional_db",
                }

        # "active students in every class" / "students by class"
        if ("active students in every class" in q_lower or "students by class" in q_lower or "active students in each class" in q_lower):
            classes = db.query(Class).filter(Class.school_id == user.school_id, Class.is_active == True).order_by(Class.grade_level).all()
            breakdown = []
            for c in classes:
                count = (
                    db.query(StudentEnrollment)
                    .filter(
                        StudentEnrollment.class_id == c.id,
                        StudentEnrollment.enrollment_status.in_(["enrolled", "active"])
                    )
                    .count()
                )
                breakdown.append(f"• **{c.name}**: {count} student(s)")

            summary = "\n".join(breakdown) if breakdown else "No active classes found."
            return {
                "answer": f"Active Student Count by Class:\n\n{summary}",
                "data": [{"class": c.name, "grade": c.grade_level} for c in classes],
                "source": "DMHS Class Directory",
                "route": "/admin/classes" if role == "ADMIN" else "/teacher/dashboard",
                "filters": {},
                "is_grounded": True,
                "provider": "institutional_db",
            }

        # ----------------------------------------------------------------------
        # 4. INACTIVE STUDENTS
        # ----------------------------------------------------------------------
        if "inactive student" in q_lower:
            if role != "ADMIN":
                return {
                    "answer": "Access restricted: Only administrators can view inactive or archived student directories.",
                    "data": None,
                    "source": "Access Control Boundary",
                    "route": f"/{role.lower()}/dashboard",
                    "filters": {},
                    "is_grounded": True,
                    "provider": "institutional_db",
                }
            inactive_students = (
                db.query(StudentProfile)
                .join(User)
                .filter(StudentProfile.student_status != "active")
                .limit(10)
                .all()
            )
            count = len(inactive_students)
            list_desc = ", ".join([f"{s.user.full_name} ({s.admission_number} - {s.student_status})" for s in inactive_students])
            return {
                "answer": f"Found **{count} inactive/archived student(s)** in the system: {list_desc or 'None found'}.",
                "data": [{"id": s.id, "adm": s.admission_number, "status": s.student_status} for s in inactive_students],
                "source": "DMHS Archive Ledger",
                "route": "/admin/students?status=inactive",
                "filters": {"status": "inactive"},
                "is_grounded": True,
                "provider": "institutional_db",
            }

        # ----------------------------------------------------------------------
        # 5. ATTENDANCE INQUIRIES
        # ----------------------------------------------------------------------
        if "attendance" in q_lower:
            if role == "STUDENT":
                if not ctx.get("student_profile_id"):
                    return {"answer": "No student profile linked to your account.", "data": None, "source": "Auth", "route": "/login", "filters": {}, "is_grounded": True, "provider": "institutional_db"}
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
                    "is_grounded": True,
                    "provider": "institutional_db",
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
                    "is_grounded": True,
                    "provider": "institutional_db",
                }

            # Class specific attendance: "today's attendance for class 6"
            class_att_match = re.search(r"class\s*([0-9a-zA-Z]+)", q_lower)
            if class_att_match:
                c_num = class_att_match.group(1)
                class_obj = db.query(Class).filter(
                    Class.school_id == user.school_id,
                    (Class.name.ilike(f"%{c_num}%") | (Class.grade_level == int(c_num) if c_num.isdigit() else False))
                ).first()

                if class_obj:
                    today = date.today()
                    session_rec = db.query(AttendanceSession).filter(
                        AttendanceSession.class_id == class_obj.id,
                        AttendanceSession.session_date == today
                    ).first()

                    if session_rec:
                        present_c = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_rec.id, AttendanceRecord.status == "present").count()
                        total_c = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_rec.id).count()
                        pct = round((present_c / total_c) * 100, 1) if total_c > 0 else 0.0
                        return {
                            "answer": f"Today's attendance for **{class_obj.name}**: **{pct}%** ({present_c}/{total_c} present).",
                            "data": {"class_id": class_obj.id, "present": present_c, "total": total_c, "pct": pct},
                            "source": "Daily Attendance Registry",
                            "route": "/admin/attendance" if role == "ADMIN" else "/teacher/attendance",
                            "filters": {"class_id": class_obj.id, "date": str(today)},
                            "is_grounded": True,
                            "provider": "institutional_db",
                        }
                    else:
                        return {
                            "answer": f"No attendance has been submitted yet today for **{class_obj.name}**.",
                            "data": None,
                            "source": "Daily Attendance Registry",
                            "route": "/admin/attendance" if role == "ADMIN" else "/teacher/attendance",
                            "filters": {"class_id": class_obj.id, "date": str(today)},
                            "is_grounded": True,
                            "provider": "institutional_db",
                        }

            # General attendance summary
            return {
                "answer": "Today's school-wide attendance is logged across all active sections. Please check the Attendance Dashboard for section-wise breakdowns.",
                "data": {},
                "source": "Attendance Register",
                "route": "/admin/attendance" if role == "ADMIN" else "/teacher/attendance",
                "filters": {},
                "is_grounded": True,
                "provider": "institutional_db",
            }

        # ----------------------------------------------------------------------
        # 6. EXAMINATIONS & MARKS
        # ----------------------------------------------------------------------
        if "pending marks entry" in q_lower or "completed marks entry" in q_lower or "teachers have not completed marks" in q_lower:
            if role != "ADMIN":
                return {
                    "answer": "Access restricted: Only administrators can view school-wide marks completion status.",
                    "data": None,
                    "source": "Access Control Boundary",
                    "route": f"/{role.lower()}/dashboard",
                    "filters": {},
                    "is_grounded": True,
                    "provider": "institutional_db",
                }
            # Find exams without marks entered
            exam_subjects = db.query(ExamSubject).join(Exam).filter(Exam.school_id == user.school_id).all()
            pending = []
            for es in exam_subjects:
                marks_count = db.query(Mark).filter(Mark.exam_subject_id == es.id).count()
                if marks_count == 0:
                    pending.append(f"• **{es.exam.name}** — {es.subject_name} (Class {es.class_id})")

            summary = "\n".join(pending[:8]) if pending else "All scheduled examination subjects have marks submitted."
            return {
                "answer": f"Pending Marks Entry Report:\n\n{summary}",
                "data": {"pending_count": len(pending)},
                "source": "CBSE Examination Office",
                "route": "/admin/marks",
                "filters": {},
                "is_grounded": True,
                "provider": "institutional_db",
            }

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
                    "is_grounded": True,
                    "provider": "institutional_db",
                }

            exam_desc = ", ".join([f"**{e.name}** ({e.start_date.strftime('%d %b %Y')} to {e.end_date.strftime('%d %b %Y')})" for e in exams[:3]])
            return {
                "answer": f"Upcoming Examinations: {exam_desc}.",
                "data": [{"id": e.id, "name": e.name, "start": str(e.start_date)} for e in exams],
                "source": "CBSE Examination Registry",
                "route": f"/{role.lower()}/dashboard",
                "filters": {"school_id": user.school_id},
                "is_grounded": True,
                "provider": "institutional_db",
            }

        # ----------------------------------------------------------------------
        # 7. FEES (Restricted strictly to Admin and individual Student)
        # ----------------------------------------------------------------------
        if "fee" in q_lower or "dues" in q_lower or "invoice" in q_lower:
            if role == "TEACHER":
                return {
                    "answer": "Access restricted: Faculty members are not authorized to access school financial or fee accounts.",
                    "data": None,
                    "source": "Financial Security Policy",
                    "route": "/teacher/dashboard",
                    "filters": {},
                    "is_grounded": True,
                    "provider": "institutional_db",
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
                    "is_grounded": True,
                    "provider": "institutional_db",
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
                    "is_grounded": True,
                    "provider": "institutional_db",
                }

        # ----------------------------------------------------------------------
        # 8. NOTICES & ANNOUNCEMENTS
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
                    "is_grounded": True,
                    "provider": "institutional_db",
                }
            return {
                "answer": "No active school notices posted at this time.",
                "data": None,
                "source": "Notice Board",
                "route": f"/{role.lower()}/dashboard",
                "filters": {},
                "is_grounded": True,
                "provider": "institutional_db",
            }

        # ----------------------------------------------------------------------
        # 9. GENERAL / CURRICULUM QUESTIONS: GEMINI FALLBACK WITH PII PROTECTION
        # ----------------------------------------------------------------------
        if settings.AI_API_KEY and settings.AI_API_KEY.strip():
            gemini_ans = AIService.query_gemini(question, role, user.full_name)
            if gemini_ans:
                return {
                    "answer": gemini_ans,
                    "data": None,
                    "source": f"Google Gemini ({settings.AI_MODEL}) [Server-Side Safeguarded]",
                    "route": f"/{role.lower()}/dashboard",
                    "filters": {"provider": "gemini", "model": settings.AI_MODEL},
                    "is_grounded": False,
                    "provider": "gemini",
                }

        # ----------------------------------------------------------------------
        # 10. HONEST DEFAULT / CLARIFICATION (NO KEY PRETENSE)
        # ----------------------------------------------------------------------
        return {
            "answer": (
                f"I am the Deccan Mission High School Assistant (Grounded Institutional Engine). "
                f"You can ask me verified school questions such as:\n"
                f"• \"Find student with admission number ADM-1001\"\n"
                f"• \"Which students have attendance below 75%?\"\n"
                f"• \"Show today's attendance for Class 6\"\n"
                f"• \"How many students are in Class 8, Section B?\"\n"
                f"• \"Show the number of active students in every class\"\n"
                f"• \"Show upcoming examinations\"\n"
                f"• \"What is my next period? / Timetable\"\n"
                f"• \"Show latest school notices\"\n\n"
                f"ℹ️ *Note: External generative AI reasoning (Google Gemini) is currently offline because `AI_API_KEY` is not set in `backend/.env`. Institutional database queries are 100% operational.*"
            ),
            "data": None,
            "source": "DMHS Grounded Relational Database",
            "route": f"/{role.lower()}/dashboard",
            "filters": {"provider": "institutional_db", "api_key_configured": False},
            "is_grounded": True,
            "provider": "institutional_db",
        }
