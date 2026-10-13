
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'recruiter'
        CHECK (role IN ('admin', 'recruiter', 'hiring_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    skills TEXT[] NOT NULL DEFAULT '{}',
    experience_years NUMERIC(4,1)
        CHECK (experience_years IS NULL OR experience_years >= 0),
    resume_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'screening', 'interview', 'offered', 'hired', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(150),
    employment_type VARCHAR(30)
        CHECK (employment_type IS NULL OR employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
    description TEXT,
    requirements TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('draft', 'open', 'closed')),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL DEFAULT 'applied'
        CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS interviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    interview_type VARCHAR(30) NOT NULL DEFAULT 'technical'
        CHECK (interview_type IN ('technical', 'behavioral', 'hr', 'other')),
    interviewer_name VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_schedule ON interviews(scheduled_at);


