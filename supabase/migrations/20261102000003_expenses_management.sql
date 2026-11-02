-- ====================================================================
-- DECCAN MISSION HIGH SCHOOL ERP (DMHS)
-- Migration: 20261102000003_expenses_management.sql
-- Description: Operational Expense Management Schema, Indexes, Audit & RLS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (
        category IN (
            'Staff Salaries',
            'Aaya’s Salaries',
            'Building Rent',
            'Electricity Bill',
            'Drinking Water Expenses',
            'Usable Water Expenses',
            'Other Expenses'
        )
    ),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (
        payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Demand Draft', 'Other')
    ),
    reference_number TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning-fast queries and aggregate calculations
CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON public.expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON public.expenses(is_active);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_expenses_timestamp();

-- RLS Security: Expenses are restricted exclusively to authorized School Administrators
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 1. Administrators can view expenses for their school
DROP POLICY IF EXISTS "Admins can view expenses" ON public.expenses;
CREATE POLICY "Admins can view expenses"
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin() AND (
            school_id IS NULL OR school_id = public.get_current_school_id()
        )
    );

-- 2. Administrators can create expenses
DROP POLICY IF EXISTS "Admins can insert expenses" ON public.expenses;
CREATE POLICY "Admins can insert expenses"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
    );

-- 3. Administrators can update expenses (maintains auditability)
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
CREATE POLICY "Admins can update expenses"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
    );

-- 4. Safe deactivation / delete policy
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
CREATE POLICY "Admins can delete expenses"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
    );

COMMENT ON TABLE public.expenses IS 'Deccan Mission High School operational expense ledger for admin financial management';
