from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, utc_now

class FeeCategory(Base, TimestampMixin):
    __tablename__ = "fee_categories"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)


class FeeStructure(Base, TimestampMixin):
    __tablename__ = "fee_structures"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    fee_category_id = Column(Integer, ForeignKey("fee_categories.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="pending", nullable=False) # pending, partial, paid, overdue
    due_date = Column(Date, nullable=False)

    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="cash", nullable=False) # cash, online, cheque, upi
    transaction_reference = Column(String(100), nullable=True)
    payment_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    invoice = relationship("Invoice", back_populates="payments")
