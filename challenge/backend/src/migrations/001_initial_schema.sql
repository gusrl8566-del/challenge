-- Migration: Create InBody Challenge Schema
-- Created: 2026-03-06

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Participants Table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_participants_phone ON participants(phone);

-- InbodyRecords Table
CREATE TABLE IF NOT EXISTS inbody_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL,
    phase VARCHAR(10) NOT NULL CHECK (phase IN ('before', 'after')),
    weight DECIMAL(5, 2),
    skeletal_muscle_mass DECIMAL(5, 2),
    body_fat_mass DECIMAL(5, 2),
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inbody_records_participant 
        FOREIGN KEY (participant_id) 
        REFERENCES participants(id) 
        ON DELETE CASCADE,
    CONSTRAINT uq_inbody_records_participant_phase 
        UNIQUE (participant_id, phase)
);

CREATE INDEX idx_inbody_records_participant_id ON inbody_records(participant_id);

-- Scores Table
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL UNIQUE,
    communication_score INTEGER DEFAULT 0 CHECK (communication_score >= 0 AND communication_score <= 100),
    inspiration_score INTEGER DEFAULT 0 CHECK (inspiration_score >= 0 AND inspiration_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_scores_participant 
        FOREIGN KEY (participant_id) 
        REFERENCES participants(id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_scores_participant_id ON scores(participant_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scores_updated_at 
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
