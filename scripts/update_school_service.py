with open('backend/app/services/school_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        db.commit()
        db.refresh(new_year)
        return new_year"""

addition = """        db.commit()
        db.refresh(new_year)
        return new_year

    @staticmethod
    def update_academic_year(
        db: Session, school_id: int, year_id: int, data: AcademicYearUpdate, user_id: int
    ) -> AcademicYear:
        year = (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == school_id, AcademicYear.id == year_id)
            .first()
        )
        if not year:
            raise ResourceNotFoundException("Academic year not found.")

        if data.name and data.name != year.name:
            existing = (
                db.query(AcademicYear)
                .filter(AcademicYear.school_id == school_id, AcademicYear.name == data.name, AcademicYear.id != year_id)
                .first()
            )
            if existing:
                raise ConflictException(f"Academic year '{data.name}' already exists.")
            year.name = data.name

        if data.start_date is not None:
            year.start_date = data.start_date
        if data.end_date is not None:
            year.end_date = data.end_date

        if year.end_date <= year.start_date:
            raise ConflictException("End date must be after start date.")

        if data.status is not None:
            year.status = data.status

        if data.is_current is True:
            db.query(AcademicYear).filter(AcademicYear.school_id == school_id).update({"is_current": False})
            year.is_current = True
        elif data.is_current is False:
            year.is_current = False

        db.add(AuditLog(
            school_id=school_id,
            user_id=user_id,
            action="UPDATE_ACADEMIC_YEAR",
            resource_type="AcademicYear",
            resource_id=str(year.id),
            details=f"Updated academic year {year.name}"
        ))
        db.commit()
        db.refresh(year)
        return year

    @staticmethod
    def set_current_academic_year(db: Session, school_id: int, year_id: int, user_id: int) -> AcademicYear:
        year = (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == school_id, AcademicYear.id == year_id)
            .first()
        )
        if not year:
            raise ResourceNotFoundException("Academic year not found.")

        db.query(AcademicYear).filter(AcademicYear.school_id == school_id).update({"is_current": False})
        year.is_current = True
        year.status = "active"

        db.add(AuditLog(
            school_id=school_id,
            user_id=user_id,
            action="SET_CURRENT_ACADEMIC_YEAR",
            resource_type="AcademicYear",
            resource_id=str(year.id),
            details=f"Set {year.name} as current academic year"
        ))
        db.commit()
        db.refresh(year)
        return year"""

content_normalized = content.replace('\r\n', '\n')
target_normalized = target.replace('\r\n', '\n')
addition_normalized = addition.replace('\r\n', '\n')

if target_normalized in content_normalized:
    new_content = content_normalized.replace(target_normalized, addition_normalized, 1)
    with open('backend/app/services/school_service.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: school_service.py updated")
else:
    print("ERROR: Target not found in school_service.py")
