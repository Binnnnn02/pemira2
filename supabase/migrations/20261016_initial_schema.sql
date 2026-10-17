-- ==============================================================================
-- SISTEM PENILAIAN WAWANCARA KANDIDAT PEMIRA SEKOLAH
-- Complete Database Migration & Schema (Supabase PostgreSQL)
-- Multi-Role: Admin & Pewawancara (Interviewer)
-- Strict RLS, Check Constraints, Audit Logging, and Stored Procedures
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'interviewer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status') THEN
        CREATE TYPE assessment_status AS ENUM ('draft', 'submitted');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM ('active', 'inactive', 'replaced');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status') THEN
        CREATE TYPE schedule_status AS ENUM ('scheduled', 'in_progress', 'completed', 'rescheduled', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_type') THEN
        CREATE TYPE recommendation_type AS ENUM ('highly_recommended', 'recommended', 'considered', 'not_recommended');
    END IF;
END $$;

-- 3. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'interviewer',
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PERIODS TABLE (Periode Pemilihan PEMIRA)
CREATE TABLE IF NOT EXISTS public.periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_period_dates CHECK (end_date >= start_date)
);

-- 5. CANDIDATES TABLE (Kandidat Calon Pengurus OSIS/MPK)
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    candidate_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    nisn TEXT,
    class_grade TEXT NOT NULL,
    target_position TEXT NOT NULL,
    vision TEXT,
    mission TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'disqualified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_candidate_number_per_period UNIQUE (period_id, candidate_number)
);

-- 6. RUBRIC CRITERIA TABLE (Aspek Penilaian & Bobot)
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    weight NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
    min_score NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (min_score >= 0),
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (max_score <= 100 AND max_score > min_score),
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. INTERVIEWER ASSIGNMENTS TABLE (Penugasan Pewawancara ke Kandidat)
-- RULE: Exactly 1 active interviewer per candidate in one period
CREATE TABLE IF NOT EXISTS public.interviewer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status assignment_status NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- UNIQUE CONSTRAINT: Only ONE active interviewer assigned per candidate per period
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_interviewer_per_candidate_period
    ON public.interviewer_assignments (candidate_id, period_id)
    WHERE status = 'active';

-- 8. INTERVIEW SCHEDULES TABLE (Jadwal Wawancara)
CREATE TABLE IF NOT EXISTS public.interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.interviewer_assignments(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
    location TEXT NOT NULL,
    notes TEXT,
    status schedule_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. ASSESSMENTS TABLE (Penilaian Header & Nilai Akhir)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL UNIQUE REFERENCES public.interviewer_assignments(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    status assessment_status NOT NULL DEFAULT 'draft',
    final_score NUMERIC(6,2),
    strengths TEXT,
    weaknesses TEXT,
    general_notes TEXT,
    recommendation recommendation_type,
    submitted_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    unlocked_at TIMESTAMPTZ,
    unlocked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    unlock_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ASSESSMENT SCORES TABLE (Detail Nilai per Aspek Rubrik)
CREATE TABLE IF NOT EXISTS public.assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    criteria_id UUID NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE RESTRICT,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 1.00 AND score <= 100.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_criteria_per_assessment UNIQUE (assessment_id, criteria_id)
);

-- 11. AUDIT LOGS TABLE (Pencatatan Aktivitas Penting)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_email TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
$$;

-- Trigger to prevent non-admins from changing their role or is_active in profiles
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.role := OLD.role;
        NEW.is_active := OLD.is_active;
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Trigger to automatically lock/prevent edits on assessments that are already submitted
CREATE OR REPLACE FUNCTION public.protect_locked_assessment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If already submitted and trying to update fields other than admin unlock:
    IF OLD.status = 'submitted' AND NEW.status = 'submitted' THEN
        RAISE EXCEPTION 'Penilaian sudah disubmit dan terkunci. Hanya Admin yang dapat membuka kunci penilaian ini.';
    END IF;
    
    -- If changing from submitted to draft, verify admin role and require reason
    IF OLD.status = 'submitted' AND NEW.status = 'draft' THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Hanya admin yang memiliki wewenang untuk membuka kembali penilaian yang sudah disubmit.';
        END IF;
        IF NEW.unlock_reason IS NULL OR trim(NEW.unlock_reason) = '' THEN
            RAISE EXCEPTION 'Alasan pembukaan kunci penilaian wajib diisi.';
        END IF;
        NEW.unlocked_at := timezone('utc'::text, now());
        NEW.unlocked_by := auth.uid();
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_locked_assessment ON public.assessments;
CREATE TRIGGER trg_protect_locked_assessment
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_locked_assessment();

-- Prevent editing assessment_scores if parent assessment is submitted
CREATE OR REPLACE FUNCTION public.protect_locked_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_status assessment_status;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status INTO v_status FROM public.assessments WHERE id = OLD.assessment_id;
    ELSE
        SELECT status INTO v_status FROM public.assessments WHERE id = NEW.assessment_id;
    END IF;

    IF v_status = 'submitted' THEN
        RAISE EXCEPTION 'Detail nilai tidak dapat diubah karena penilaian sudah disubmit dan terkunci.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_locked_scores ON public.assessment_scores;
CREATE TRIGGER trg_protect_locked_scores
    BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_locked_scores();

-- ==============================================================================
-- 13. BUSINESS LOGIC STORED PROCEDURES (With Atomic Transactions)
-- ==============================================================================

-- Stored Procedure: Submit Assessment (Calculates weighted final score & locks)
CREATE OR REPLACE FUNCTION public.submit_assessment(p_assessment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assessment RECORD;
    v_total_weight NUMERIC(7,2) := 0;
    v_calculated_score NUMERIC(7,2) := 0;
    v_criteria_count INT := 0;
    v_scored_count INT := 0;
    v_actor_profile RECORD;
BEGIN
    -- 1. Fetch assessment
    SELECT * INTO v_assessment FROM public.assessments WHERE id = p_assessment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Penilaian dengan ID % tidak ditemukan.', p_assessment_id;
    END IF;

    -- 2. Verify authorization: actor must be assigned interviewer or admin
    SELECT * INTO v_actor_profile FROM public.profiles WHERE id = auth.uid();
    IF v_actor_profile.role != 'admin' AND v_assessment.interviewer_id != auth.uid() THEN
        RAISE EXCEPTION 'Anda tidak memiliki wewenang untuk men-submit penilaian ini.';
    END IF;

    IF v_assessment.status = 'submitted' THEN
        RAISE EXCEPTION 'Penilaian ini sudah berstatus disubmit dan terkunci.';
    END IF;

    -- 3. Verify total active criteria weight for the period is strictly 100%
    SELECT coalesce(SUM(weight), 0), count(*)
    INTO v_total_weight, v_criteria_count
    FROM public.rubric_criteria
    WHERE period_id = v_assessment.period_id AND is_active = true;

    IF v_total_weight <> 100.00 THEN
        RAISE EXCEPTION 'Total bobot aspek penilaian pada periode ini harus tepat 100%% (saat ini: % %%). Mohon hubungi Admin.', v_total_weight;
    END IF;

    -- 4. Verify all active criteria have been given scores between 1 and 100
    SELECT count(s.id), coalesce(SUM(s.score * (c.weight / 100.0)), 0)
    INTO v_scored_count, v_calculated_score
    FROM public.rubric_criteria c
    JOIN public.assessment_scores s ON s.criteria_id = c.id AND s.assessment_id = p_assessment_id
    WHERE c.period_id = v_assessment.period_id AND c.is_active = true;

    IF v_scored_count < v_criteria_count THEN
        RAISE EXCEPTION 'Semua % aspek penilaian wajib diisi sebelum submit (baru terisi % aspek).', v_criteria_count, v_scored_count;
    END IF;

    -- 5. Atomic Update to Submitted status & Lock
    UPDATE public.assessments
    SET status = 'submitted',
        final_score = round(v_calculated_score, 2),
        submitted_at = timezone('utc'::text, now()),
        locked_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_assessment_id;

    -- 6. Record Audit Log
    INSERT INTO public.audit_logs (actor_id, actor_email, actor_role, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        v_actor_profile.email,
        v_actor_profile.role::text,
        'SUBMIT_ASSESSMENT',
        'assessment',
        p_assessment_id::text,
        jsonb_build_object(
            'candidate_id', v_assessment.candidate_id,
            'final_score', round(v_calculated_score, 2),
            'criteria_count', v_criteria_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'assessment_id', p_assessment_id,
        'final_score', round(v_calculated_score, 2),
        'status', 'submitted'
    );
END;
$$;

-- Stored Procedure: Admin Unlock Assessment (with mandatory reason & audit)
CREATE OR REPLACE FUNCTION public.unlock_assessment(p_assessment_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assessment RECORD;
    v_admin_profile RECORD;
BEGIN
    -- Check admin
    SELECT * INTO v_admin_profile FROM public.profiles WHERE id = auth.uid();
    IF v_admin_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Hanya admin yang dapat membuka kembali penilaian yang sudah terkunci.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Alasan pembukaan kunci penilaian wajib diisi minimal 5 karakter.';
    END IF;

    SELECT * INTO v_assessment FROM public.assessments WHERE id = p_assessment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Penilaian tidak ditemukan.';
    END IF;

    IF v_assessment.status != 'submitted' THEN
        RAISE EXCEPTION 'Penilaian belum disubmit atau sudah dalam keadaan draft.';
    END IF;

    -- Update assessment back to draft
    UPDATE public.assessments
    SET status = 'draft',
        unlocked_at = timezone('utc'::text, now()),
        unlocked_by = auth.uid(),
        unlock_reason = p_reason,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_assessment_id;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, actor_email, actor_role, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        v_admin_profile.email,
        'admin',
        'UNLOCK_ASSESSMENT',
        'assessment',
        p_assessment_id::text,
        jsonb_build_object(
            'candidate_id', v_assessment.candidate_id,
            'interviewer_id', v_assessment.interviewer_id,
            'unlock_reason', p_reason,
            'previous_final_score', v_assessment.final_score
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'assessment_id', p_assessment_id,
        'status', 'draft',
        'message', 'Penilaian berhasil dibuka kembali untuk revisi.'
    );
END;
$$;

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviewer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Profiles are viewable by owner or admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile name and phone"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can insert and delete profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- PERIODS RLS
CREATE POLICY "Authenticated users can view periods"
    ON public.periods FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage periods"
    ON public.periods FOR ALL
    USING (public.is_admin());

-- CANDIDATES RLS
CREATE POLICY "Authenticated users can view candidates"
    ON public.candidates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage candidates"
    ON public.candidates FOR ALL
    USING (public.is_admin());

-- RUBRIC CRITERIA RLS
CREATE POLICY "Authenticated users can view rubric criteria"
    ON public.rubric_criteria FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage rubric criteria"
    ON public.rubric_criteria FOR ALL
    USING (public.is_admin());

-- INTERVIEWER ASSIGNMENTS RLS
CREATE POLICY "Admins can view all assignments"
    ON public.interviewer_assignments FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Interviewers can view their own assignments"
    ON public.interviewer_assignments FOR SELECT
    USING (interviewer_id = auth.uid());

CREATE POLICY "Only admins can insert/update/delete assignments"
    ON public.interviewer_assignments FOR ALL
    USING (public.is_admin());

-- SCHEDULES RLS
CREATE POLICY "Admins can view all schedules"
    ON public.interview_schedules FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Interviewers can view their assigned schedules"
    ON public.interview_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interviewer_assignments a
            WHERE a.id = interview_schedules.assignment_id AND a.interviewer_id = auth.uid()
        )
    );

CREATE POLICY "Only admins can manage schedules"
    ON public.interview_schedules FOR ALL
    USING (public.is_admin());

-- ASSESSMENTS RLS
CREATE POLICY "Admins can view all assessments"
    ON public.assessments FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Interviewers can view their own assessments"
    ON public.assessments FOR SELECT
    USING (interviewer_id = auth.uid());

CREATE POLICY "Interviewers can insert initial draft assessments"
    ON public.assessments FOR INSERT
    WITH CHECK (interviewer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Interviewers can update their own draft assessments"
    ON public.assessments FOR UPDATE
    USING ((interviewer_id = auth.uid() AND status = 'draft') OR public.is_admin());

-- ASSESSMENT SCORES RLS
CREATE POLICY "Admins can view all assessment scores"
    ON public.assessment_scores FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Interviewers can view their own assessment scores"
    ON public.assessment_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_scores.assessment_id AND a.interviewer_id = auth.uid()
        )
    );

CREATE POLICY "Interviewers can insert and update their scores while draft"
    ON public.assessment_scores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_scores.assessment_id AND a.interviewer_id = auth.uid() AND a.status = 'draft'
        ) OR public.is_admin()
    );

CREATE POLICY "Interviewers can update their scores while draft"
    ON public.assessment_scores FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_scores.assessment_id AND a.interviewer_id = auth.uid() AND a.status = 'draft'
        ) OR public.is_admin()
    );

-- AUDIT LOGS RLS
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================================================
-- 15. SEED INITIAL DATA (Default Active Period & 5 Initial Rubric Aspects)
-- ==============================================================================

DO $$
DECLARE
    v_period_id UUID;
BEGIN
    -- Insert default active period if not exists
    IF NOT EXISTS (SELECT 1 FROM public.periods WHERE name = 'PEMIRA OSIS & MPK 2026/2027') THEN
        INSERT INTO public.periods (name, academic_year, description, is_active, start_date, end_date)
        VALUES (
            'PEMIRA OSIS & MPK 2026/2027',
            '2026/2027',
            'Tahap Seleksi & Wawancara Calon Pengurus Inti OSIS dan Majelis Perwakilan Kelas',
            true,
            '2026-10-01',
            '2026-11-30'
        )
        RETURNING id INTO v_period_id;

        -- Insert 5 Initial Rubric Criteria with 20% weight each (Total 100%)
        INSERT INTO public.rubric_criteria (period_id, name, description, weight, min_score, max_score, sort_order, is_active)
        VALUES
            (v_period_id, 'Kepemimpinan', 'Kemampuan memimpin, integritas, visi misi organisasi, dan pengambilan keputusan.', 20.00, 1.00, 100.00, 1, true),
            (v_period_id, 'Komunikasi', 'Kejelasan artikulasi, kesantunan bertutur, kemampuan mendengar aktif, dan persuasi.', 20.00, 1.00, 100.00, 2, true),
            (v_period_id, 'Tanggung Jawab', 'Komitmen, kedisiplinan, rekam jejak amanah, dan konsistensi terhadap tugas.', 20.00, 1.00, 100.00, 3, true),
            (v_period_id, 'Pemecahan Masalah', 'Pola pikir kritis, inisiatif, resolusi konflik antarsiswa, dan solusi kreatif program kerja.', 20.00, 1.00, 100.00, 4, true),
            (v_period_id, 'Motivasi', 'Semangat dedikasi pengabdian sekolah, daya juang menghadapi tekanan, dan motivasi internal.', 20.00, 1.00, 100.00, 5, true);
    END IF;
END $$;

