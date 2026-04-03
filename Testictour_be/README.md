# TesTicTour – Backend (Auto Tournament System)

> Express + TypeScript + Prisma + BullMQ + Socket.IO template generated from `AutoTour.md`

## 1. Prerequisites

1. Node.js ≥ 18.x  
2. PostgreSQL ≥ 13 (or compatible URL string)  
3. Redis ≥ 6 (BullMQ job queue)  
4. Yarn / NPM (choose one)  
5. Riot Games API key (for production)

## 2. Getting Started

```bash
# clone repo (nếu chưa)
cd TesTicTour/backend

# 1. Cài deps
npm install         # hoặc yarn install

# 2. Copy file môi trường
cp .env.example .env
# → sửa DATABASE_URL, REDIS_URL, JWT_SECRET... cho phù hợp

# 3. Sinh Prisma Client & migrate DB (đang dev)
npx prisma migrate dev --name init

# 4. Chạy server dev (hot-reload)
npm run dev
# http://localhost:4000/api/health   (# thêm route health check nếu muốn)
```

### Docker (tùy chọn)
```bash
# Build container
docker build -t testictour-backend .
# Run (dev compose)
docker compose -f docker-compose.dev.yml up -d
```

## 3. Scripts
| Script | Mô tả |
|---|---|
| `npm run dev` | Chạy server với `ts-node-dev`, hot-reload |
| `npm run build` | Compile TypeScript vào thư mục `dist/` |
| `npm start` | Chạy file build (production) |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:studio` | Mở Prisma Studio GUI |

## 4. Cấu trúc thư mục
```
backend/
├── prisma/
│   └── schema.prisma           # Data model (PostgreSQL)
├── src/
│   ├── controllers/            # API controllers
│   ├── middlewares/            # Auth, error handler, validation
│   ├── services/               # Business logic (TournamentService, ...)
│   ├── jobs/                   # BullMQ processors
│   ├── sockets/                # Socket.IO handlers
│   ├── routes/                 # API routes (Express Router)
│   ├── utils/                  # Helper (ApiError, logger, ...)
│   └── app.ts                  # App entry (creates Express + IO)
└── README.md
```

## 5. Environment Variables
| Key | Mô tả | Ví dụ |
|-----|-------|-------|
| `PORT` | Cổng server | 4000 |
| `DATABASE_URL` | PostgreSQL DSN | `postgresql://user:pass@localhost:5432/testictour` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | Chuỗi ký JWT | `supersecret` |
| `RIOT_API_KEY` | (prod) Riot Games API key | `RGAPI-xxxxx` |
| `MOCK_RIOT_API` | (dev) Bật chế độ mock Riot API | `true` (thêm vào .env)

## 6. Migrate & Seed
```bash
# Tạo migration mới (nếu schema.prisma thay đổi)
npx prisma migrate dev --name <your_migration_name>

# Chạy seed dữ liệu test
npx ts-node scripts/seed.ts
```

## 7. Testing API
- Sử dụng `Thunder Client`, `Insomnia`, hoặc `Postman` import collection trong `docs/postman_collection.json` (đã cập nhật cấu hình `phases` trong template).
- Tài liệu Swagger (`/api/docs`) sẽ được generate bằng `swagger-jsdoc` (TODO).

### 7.1. Seed dữ liệu test
```bash
# Tạo user admin và 16 user thường, nạp sẵn balance
npx ts-node scripts/seed.ts
# admin: admin@test.com / admin123
# users: user1@test.com - user16@test.com / user123
```

### 7.2. Helpers 
```bash
đăng ký người chơi vào giải đấu
# Sau khi tạo giải đấu và có Tournament ID, chạy lệnh sau:
npx ts-node scripts/joinUsersToTournament.ts <YOUR_TOURNAMENT_ID>
# Thay <YOUR_TOURNAMENT_ID> bằng ID của giải đấu bạn muốn đăng ký người chơi vào.
seed template
npx ts-node scripts/seed.ts 
```
