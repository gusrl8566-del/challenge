-- Migration: Seed Test Data
-- Created: 2026-03-06

-- Insert test participants
INSERT INTO participants (id, name, phone, created_at) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'John Doe', '010-1234-5678', CURRENT_TIMESTAMP),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Jane Smith', '010-2345-6789', CURRENT_TIMESTAMP),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Mike Johnson', '010-3456-7890', CURRENT_TIMESTAMP),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Sarah Lee', '010-4567-8901', CURRENT_TIMESTAMP),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Tom Brown', '010-5678-9012', CURRENT_TIMESTAMP);

-- Insert test InbodyRecords (Before)
INSERT INTO inbody_records (id, participant_id, phase, weight, skeletal_muscle_mass, body_fat_mass, image_url, created_at) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'before', 80.5, 35.2, 18.5, '/uploads/before_1.jpg', CURRENT_TIMESTAMP),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'before', 75.0, 32.0, 22.0, '/uploads/before_2.jpg', CURRENT_TIMESTAMP),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'before', 90.0, 38.5, 28.0, '/uploads/before_3.jpg', CURRENT_TIMESTAMP),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'before', 65.0, 28.0, 15.0, '/uploads/before_4.jpg', CURRENT_TIMESTAMP),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'before', 85.0, 36.0, 25.0, '/uploads/before_5.jpg', CURRENT_TIMESTAMP);

-- Insert test InbodyRecords (After)
INSERT INTO inbody_records (id, participant_id, phase, weight, skeletal_muscle_mass, body_fat_mass, image_url, created_at) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'after', 75.0, 38.5, 12.0, '/uploads/after_1.jpg', CURRENT_TIMESTAMP),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'after', 68.0, 34.5, 14.0, '/uploads/after_2.jpg', CURRENT_TIMESTAMP),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'after', 82.0, 40.0, 18.0, '/uploads/after_3.jpg', CURRENT_TIMESTAMP),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'after', 58.0, 30.5, 10.0, '/uploads/after_4.jpg', CURRENT_TIMESTAMP),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'after', 78.0, 39.0, 16.0, '/uploads/after_5.jpg', CURRENT_TIMESTAMP);

-- Insert test Scores
INSERT INTO scores (id, participant_id, communication_score, inspiration_score, created_at, updated_at) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 85, 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 75, 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 95, 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 80, 85, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 70, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
