from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import date, datetime

from app.db.session import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.fee import FeeCategory, FeeStructure, Invoice, Payment
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.academic_year import AcademicYear

router = APIRouter()

class FeeCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class InvoiceCreate(BaseModel):
    student_id: int
    academic_year_id: int
    invoice_number: str
    total_amount: float
    due_date: date

class PaymentCreate(BaseModel):
    invoice_id: int
    student_id: int
    receipt_number: str
    amount: float
    payment_mode: str = "cash"
    transaction_reference: Optional[str] = None

@router.get("/stats")
def get_fee_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    school_id = current_user.school_id
    total_billed = db.query(func.coalesce(func.sum(Invoice.total_amount), 0.0)).filter(Invoice.school_id == school_id).scalar() or 0.0
    total_collected = db.query(func.coalesce(func.sum(Invoice.paid_amount), 0.0)).filter(Invoice.school_id == school_id).scalar() or 0.0
    outstanding = max(0.0, total_billed - total_collected)
    collection_rate = round((total_collected / total_billed * 100), 1) if total_billed > 0 else 100.0

    return {
        "total_billed": float(total_billed),
        "total_collected": float(total_collected),
        "outstanding": float(outstanding),
        "collection_rate": float(collection_rate),
    }

@router.get("/categories")
def list_fee_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(FeeCategory).filter(FeeCategory.school_id == current_user.school_id).all()

@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_fee_category(
    payload: FeeCategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cat = FeeCategory(
        school_id=current_user.school_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("/invoices")
def list_invoices(
    student_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Invoice, StudentProfile, User)
        .join(StudentProfile, Invoice.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .filter(Invoice.school_id == current_user.school_id)
    )

    if student_id:
        query = query.filter(Invoice.student_id == student_id)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)

    results = query.order_by(Invoice.created_at.desc()).all()
    invoices = []
    for inv, stud, u in results:
        invoices.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "student_id": inv.student_id,
            "student_name": u.full_name,
            "admission_number": stud.admission_number,
            "total_amount": inv.total_amount,
            "paid_amount": inv.paid_amount,
            "balance": inv.total_amount - inv.paid_amount,
            "status": inv.status,
            "due_date": str(inv.due_date),
            "created_at": str(inv.created_at),
        })
    return invoices

@router.post("/invoices", status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Invoice).filter(Invoice.invoice_number == payload.invoice_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Invoice number '{payload.invoice_number}' already exists.")

    inv = Invoice(
        school_id=current_user.school_id,
        student_id=payload.student_id,
        academic_year_id=payload.academic_year_id,
        invoice_number=payload.invoice_number,
        total_amount=payload.total_amount,
        paid_amount=0.0,
        status="pending",
        due_date=payload.due_date,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv

@router.post("/payments", status_code=status.HTTP_201_CREATED)
def record_payment(
    payload: PaymentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    inv = db.query(Invoice).filter(Invoice.id == payload.invoice_id, Invoice.school_id == current_user.school_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    payment = Payment(
        invoice_id=payload.invoice_id,
        student_id=payload.student_id,
        receipt_number=payload.receipt_number,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        transaction_reference=payload.transaction_reference,
    )
    db.add(payment)

    inv.paid_amount = (inv.paid_amount or 0.0) + payload.amount
    if inv.paid_amount >= inv.total_amount:
        inv.status = "paid"
    elif inv.paid_amount > 0:
        inv.status = "partial"

    db.commit()
    db.refresh(payment)
    return payment
