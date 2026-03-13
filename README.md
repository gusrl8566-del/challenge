# InBody Challenge - Full Stack Application

A fullstack web application for managing InBody challenge competitions.

## Tech Stack

- **Frontend**: Next.js 14, TailwindCSS
- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## Features

- Participant registration and authentication
- Upload InBody images (before/after)
- Extract and store InBody metrics:
  - Weight
  - Skeletal muscle mass
  - Body fat mass
- Ranking system:
  - **Gain King**: Priority by muscle gain, then fat loss
  - **Loss King**: Priority by fat loss, then muscle gain
  - **Communication King**: Admin-scored
  - **Inspiration King**: Admin-scored

## Quick Start

### Prerequisites

- Docker
- Docker Compose

### Running the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Development Mode

#### Backend

```bash
cd backend
npm install
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
inbody-challenge/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── entities/
│   │   ├── modules/
│   │   │   ├── participants/
│   │   │   ├── inbody-data/
│   │   │   ├── rankings/
│   │   │   ├── admin/
│   │   │   └── uploads/
│   │   ├── dto/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── rankings/
│   │   ├── upload/
│   │   └── admin/
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Participants
- `POST /api/participants/register` - Register new participant
- `POST /api/participants/login` - Login
- `GET /api/participants` - Get all participants
- `GET /api/participants/:id` - Get participant by ID

### InBody Data
- `POST /api/inbody-data/:participantId` - Submit InBody data
- `GET /api/inbody-data/participant/:participantId` - Get participant's InBody data
- `GET /api/inbody-data` - Get all InBody data
- `GET /api/inbody-data/gains/:participantId` - Calculate gains

### Rankings
- `GET /api/rankings/gain-king` - Get Gain King rankings
- `GET /api/rankings/loss-king` - Get Loss King rankings
- `GET /api/rankings/communication-king` - Get Communication King rankings
- `GET /api/rankings/inspiration-king` - Get Inspiration King rankings

### Admin
- `GET /api/admin/participants` - Get all participants
- `GET /api/admin/participants/:id` - Get participant details
- `PUT /api/admin/participants/:id/scores` - Update scores

### Uploads
- `POST /api/uploads/image` - Upload single image
- `POST /api/uploads/images` - Upload multiple images
