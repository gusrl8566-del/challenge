# InBody Challenge

## Quick Start

```bash
cd challenge
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## Auth

- Phone + Password login
- Register: POST /api/participants/register
- Login: POST /api/participants/login

## Ranking Criteria

- **Gain King**: Muscle gain ↑, Fat loss ↓
- **Loss King**: Fat loss ↑, Muscle gain ↑
- **Communication King**: Admin scored
- **Inspiration King**: Admin scored
