
-- ============================================================
-- TalentFlow AI - PostgreSQL Production Schema
-- Safe to rerun: no DROP TABLE and no data reset
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'recruiter'
        CHECK (role IN ('admin', 'recruiter', 'hiring_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CANDIDATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.candidates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    skills TEXT[] NOT NULL DEFAULT '{}',
    experience_years NUMERIC(4,1)
        CHECK (experience_years IS NULL OR experience_years >= 0),
    applied_role VARCHAR(150),
    match_score NUMERIC(5,2) NOT NULL DEFAULT 0
        CHECK (match_score >= 0 AND match_score <= 100),
    resume_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (
            status IN (
                'new', 'screening', 'shortlisted',
                'interview', 'offered', 'hired', 'rejected'
            )
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate existing candidate tables without deleting data.
ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS applied_role VARCHAR(150);

ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS match_score NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Align the candidate status constraint with the application.
ALTER TABLE public.candidates
    DROP CONSTRAINT IF EXISTS candidates_status_check;

ALTER TABLE public.candidates
    ADD CONSTRAINT candidates_status_check
    CHECK (
        status IN (
            'new', 'screening', 'shortlisted',
            'interview', 'offered', 'hired', 'rejected'
        )
    );

-- ============================================================
-- 3. JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jobs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(150),
    employment_type VARCHAR(30)
        CHECK (
            employment_type IS NULL OR
            employment_type IN (
                'full-time', 'part-time', 'contract', 'internship'
            )
        ),
    description TEXT,
    requirements TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('draft', 'open', 'closed')),
    created_by BIGINT
        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. APPLICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.applications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id BIGINT NOT NULL
        REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL
        REFERENCES public.jobs(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL DEFAULT 'applied'
        CHECK (
            stage IN (
                'applied', 'screening', 'interview',
                'offer', 'hired', 'rejected'
            )
        ),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT applications_candidate_job_unique
        UNIQUE (candidate_id, job_id)
);

-- ============================================================
-- 5. INTERVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.interviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL
        REFERENCES public.applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    interview_type VARCHAR(30) NOT NULL DEFAULT 'technical'
        CHECK (
            interview_type IN (
                'technical', 'behavioral', 'hr', 'other'
            )
        ),
    interviewer_name VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (
            status IN (
                'scheduled', 'completed',
                'cancelled', 'rescheduled'
            )
        ),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. AI RESUME EVALUATIONS
-- One row per screening attempt; history is preserved.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.evaluations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    application_id BIGINT NOT NULL
        REFERENCES public.applications(id) ON DELETE CASCADE,

    candidate_id BIGINT NOT NULL
        REFERENCES public.candidates(id) ON DELETE CASCADE,

    job_id BIGINT NOT NULL
        REFERENCES public.jobs(id) ON DELETE CASCADE,

    model_name VARCHAR(100) NOT NULL,

    match_score NUMERIC(5,2)
        CHECK (
            match_score IS NULL OR
            (match_score >= 0 AND match_score <= 100)
        ),

    matched_skills JSONB NOT NULL DEFAULT '[]'::JSONB,
    missing_skills JSONB NOT NULL DEFAULT '[]'::JSONB,
    evidence JSONB NOT NULL DEFAULT '[]'::JSONB,
    summary TEXT NOT NULL,
    limitations JSONB NOT NULL DEFAULT '[]'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_email
    ON public.candidates(email);

CREATE INDEX IF NOT EXISTS idx_candidates_status
    ON public.candidates(status);

CREATE INDEX IF NOT EXISTS idx_candidates_applied_role
    ON public.candidates(applied_role);

CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON public.jobs(status);

CREATE INDEX IF NOT EXISTS idx_applications_candidate
    ON public.applications(candidate_id);

CREATE INDEX IF NOT EXISTS idx_applications_job
    ON public.applications(job_id);

CREATE INDEX IF NOT EXISTS idx_applications_stage
    ON public.applications(stage);

CREATE INDEX IF NOT EXISTS idx_interviews_schedule
    ON public.interviews(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_interviews_application
    ON public.interviews(application_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_application_created
    ON public.evaluations(application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_created
    ON public.evaluations(candidate_id, created_at DESC);

COMMIT;
