CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID UNIQUE NOT NULL,

    pan_full_name VARCHAR(255) NOT NULL,

    pan_number VARCHAR(10) UNIQUE NOT NULL,

    aadhaar_number VARCHAR(12) UNIQUE NOT NULL,

    status VARCHAR(20) NOT NULL
    DEFAULT 'NOT_STARTED',

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_kyc_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);