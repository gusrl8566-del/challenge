# Database Relationships

## Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│     participants        │       │      inbody_records    │
├─────────────────────────┤       ├─────────────────────────┤
│ id (UUID, PK)           │◄──────│ id (UUID, PK)           │
│ name (VARCHAR)          │       │ participant_id (UUID, FK)│
│ phone (VARCHAR)         │       │ phase (VARCHAR) - before │
│ created_at (TIMESTAMP)  │       │ weight (DECIMAL)        │
└─────────────────────────┘       │ skeletal_muscle_mass    │
                                   │ body_fat_mass           │
                                   │ image_url (VARCHAR)    │
                                   │ created_at (TIMESTAMP) │
                                   └─────────────────────────┘
           
           ┌─────────────────────────┐
           │         scores         │
           ├─────────────────────────┤
           │ id (UUID, PK)           │
           │ participant_id (UUID, FK)│◄────
           │ communication_score     │
           │ inspiration_score       │
           │ created_at (TIMESTAMP)  │
           │ updated_at (TIMESTAMP)  │
           └─────────────────────────┘

```

## Relationships

### 1. Participant -> InbodyRecords (One-to-Many)
- One Participant can have multiple InbodyRecords (before and after)
- Each InbodyRecord belongs to one Participant
- Cascade delete: When a participant is deleted, their records are deleted

### 2. Participant -> Score (One-to-One)
- One Participant has one Score record
- Each Score belongs to one Participant
- Cascade delete: When a participant is deleted, their score is deleted

### 3. InbodyRecords (Unique Constraint)
- A participant can only have one "before" and one "after" record
- Unique constraint on (participant_id, phase)

## Indexes

### participants table
- `idx_participants_phone` - For phone lookups
- `idx_participants_created_at` - For sorting by creation date

### inbody_records table
- `idx_inbody_records_participant_id` - For joining with participants
- `idx_inbody_records_phase` - For filtering by phase
- `idx_inbody_records_participant_phase` - Unique constraint index

### scores table
- `idx_scores_participant_id` - For joining with participants

## Running Migrations

```bash
# Run migrations
npm run migration:run

# Generate a new migration
npm run migration:generate -- -d src/database/typeorm.config.ts MigrationName

# Revert last migration
npm run migration:revert
```
