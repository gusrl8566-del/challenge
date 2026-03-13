-- Migration: Create InBody Challenge Schema
-- Created: 2026-03-06

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Participants Table
-- ============================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_participants_phone ON participants(phone);
CREATE INDEX idx_participants_created_at ON participants(created_at DESC);

-- ============================================
-- InbodyRecords Table
-- ============================================
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
        ON DELETE CASCADE
);

-- Indexes for InbodyRecords
CREATE INDEX idx_inbody_records_participant_id ON inbody_records(participant_id);
CREATE INDEX idx_inbody_records_phase ON inbody_records(phase);
CREATE INDEX idx_inbody_records_participant_phase 
    ON inbody_records(participant_id, phase) UNIQUE;

-- ============================================
-- Scores Table
-- ============================================
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

-- Index for Scores
CREATE INDEX idx_scores_participant_id ON scores(participant_id);

-- ============================================
-- Function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for scores table
CREATE TRIGGER update_scores_updated_at 
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
