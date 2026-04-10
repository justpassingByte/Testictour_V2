# Backend Auto Tournament & MiniTour System – TesTicTour

## 1. Kiến trúc tổng quan & Thư mục dự án

```
backend/
├── src/
│   ├── controllers/      # Xử lý logic cho từng route
│   ├── routes/           # Định nghĩa API endpoints (bao gồm dev.routes.ts để test)
│   ├── services/         # Business logic (LobbyStateService, MatchService, v.v.)
│   ├── jobs/             # Xử lý các tác vụ không đồng bộ (Cronjobs, BullMQ)
│   ├── sockets/          # Socket.IO handlers cho realtime Lobby State
│   ├── middlewares/      # Auth, rate limit, validate, error handler
│   ├── utils/            # Helper functions
│   ├── lib/              # Các thư viện, queues, và cấu hình
│   └── app.ts            # Khởi tạo app Express
├── prisma/               # Prisma ORM (schema.prisma)
├── scripts/              # Scripts để seed dữ liệu
├── package.json
├── tsconfig.json
└── .env
```

## 2. Thiết kế Cơ Sở Dữ Liệu (PostgreSQL)

Hệ thống hiện tại chia làm 3 mảng cốt lõi:
1. **Tournaments lớn (Standard Tournaments):** Quản lý qua `Tournament`, `Phase`, `Round`, `Lobby`, `Match`. Có lịch trình cụ thể, nhiều vòng (Elimination, Swiss, Checkmate).
2. **MiniTours (Automated Quick Lobbies):** Quản lý độc lập qua `MiniTourLobby`, `MiniTourMatch`, `MiniTourLobbyParticipant`. Là các giải nhỏ tự động bắt đầu khi đủ người.
3. **Quản trị & Cấu hình (Admin/Partner):** Quản lý qua `PartnerSubscription`, `PlatformSetting`, `SubscriptionPlanConfig`, `Notification`.

### Sơ đồ Bảng Chính

- **Users & Transactions**: `User`, `Balance`, `Transaction`, `PartnerSubscription`
- **Standard Tournament**: `TournamentTemplate`, `Tournament`, `Participant`, `Phase`, `Round`, `Lobby`, `Match`, `MatchResult`, `RoundOutcome`
- **MiniTour System**: `MiniTourLobby`, `MiniTourMatch`, `MiniTourMatchResult`, `MiniTourLobbyParticipant`
- **Statistics (Performance):** `PlayerMatchSummary`, `UserTournamentSummary`
- **Admin Settings**: `PlatformSetting`, `FeatureFlag`, `Notification`, `SubscriptionPlanConfig`

## 3. Cập Nhật Quan Trọng Trong Schema Gần Đây

### 3.1 Cỗ máy trạng thái sảnh (Lobby State Machine)
Bảng `Lobby` trong Standard Tournaments được đắp thêm một bộ cỗ máy trạng thái siêu mạnh mẽ để quản lý tính sẵn sàng và thời gian chờ (delay) của người chơi:
```prisma
model Lobby {
  // ... core logic
  state                    String    @default("WAITING") // WAITING, IN_PROGRESS, COMPLETED
  delayRequests            Json      @default("[]")   // Ghi nhận ai xin delay
  phaseStartedAt           DateTime?
  matchStartedAt           DateTime?
  totalDelaysUsed          Int       @default(0)
  lastPolledAt             DateTime?
  pausedFromState          String?
  remainingDurationOnPause Int?      // Quản lý pause/resume của sảnh
}
```

### 3.2 Hệ thống MiniTour Độc Lập
Được thiết kế riêng để tự động hóa 100%, tự chạy khi gom đủ lượng người chơi (thường là 8).
```prisma
model MiniTourLobby {
  id                String              @id @default(uuid())
  status            MiniTourLobbyStatus @default(WAITING) // Enum: WAITING, IN_PROGRESS, COMPLETED, CANCELLED
  currentPlayers    Int                 @default(0)
  maxPlayers        Int                 @default(8)
  entryFee          Float               @default(0)
  prizePool         Float               @default(0)
  // ...
  settings          Json?               // autoStart: boolean, privateMode: boolean
  matches           MiniTourMatch[]
  participants      MiniTourLobbyParticipant[]
}
```

### 3.3 Tối ưu hóa hiệu năng bằng Data Summaries
Thay vì trích xuất và tính toán động toàn bộ lịch sử Match, hệ thống lưu cache:
- `PlayerMatchSummary`: Lưu nhanh thành tích từng cá nhân ở mỗi trận đấu.
- `UserTournamentSummary`: Lưu tổng quan việc thành bại của một người trong suốt một giải đấu.
- Bảng `User` được thêm các trường như `totalMatchesPlayed`, `topFourRate`, `firstPlaceRate`, `tournamentsWon`.

### 3.4 Quản Trị Hệ Thống (Admin Dashboard & Đối Tác)
- Cấp quyền truy cập dựa trên gói cước qua `PartnerSubscription` và `SubscriptionPlanConfig`.
- Tuỳ biến sâu qua `PlatformSetting` và `FeatureFlag`.

## 4. API Endpoints Nâng Cao & Thử Nghiệm

Hệ thống có các REST API chuẩn hóa cho việc quản lý, nhưng đặc biệt cung cấp một router riêng cho tiến trình tự động hoá & phát triển (`/dev/automation`).

### DevTools Automation Flow (`dev.routes.ts`)
Được thiết kế cho Admin Dashboard để giả lập dữ liệu Riot API và trigger cron jobs thủ công:
- `POST /dev/test-riot-match`: Kéo dữ liệu 1 trận Riot thực tế đổ vào UI.
- `POST /dev/seed-full-tournament`: Tự động setup nguyên hệ thống giải đấu và kéo kết quả Riot API thật dập vào CSDL.
- **Automation Flow Testing**:
  - `POST /dev/automation/ready-toggle`: (lobbyId, userId) Bật cờ "Đã sẵn sàng".
  - `POST /dev/automation/auto-start`: Ép sảnh chuyển sang `IN_PROGRESS`.
  - `POST /dev/automation/poll-match`: Fetch kết quả Riot.
  - `POST /dev/automation/assign-lobby`: Chạy thuật toán chia người chơi.
  - `POST /dev/automation/advance-round`: Tổng kết vòng và đẩy người chơi vào vòng sau.

## 5. Service Layer Mở Rộng

Bên cạnh các service cũ, mã nguồn đã được bổ sung:
- **LobbyStateService:** Dành riêng cho cỗ máy trạng thái (chuyển qua lại giữa `WAITING`, `STARTING`, `IN_PROGRESS`, `PAUSED`). Kết hợp realtime Socket.IO.
- **GrimoireService:** Cầu nối chuyên dụng tương tác với API xử lý dữ liệu TFT.
- **MatchService:** Hàng đợi lấy dữ liệu cho cả giải đấu lớn và giải đấu mini, chạy Background processing với BullMQ `fetchMatchDataQueue`.
- **PrizeCalculationService:** Tính toán lại quỹ tiền bị hao hụt, trừ nền tảng, admin fee ra giải thưởng cho người chơi.
- **SummaryManagerService:** Auto cập nhật lại bộ Index Stats cho user khi trận kết thúc.

## 6. Luồng Tự Động Hóa Giải Đấu Chi Tiết (Cập Nhật Bổ Sung)

### MiniTour Auto-Play Flow
1. User bấm tạo MiniTour Lobby (nếu là Partner, check limit gói cước).
2. Các Users khác join vào, bị trừ Balance qua `Transaction` (dùng Prisma `$transaction` gom atomic).
3. Lúc đạt `maxPlayers` (hoặc thủ công), Lobby tự thiết lập status cập nhật `IN_PROGRESS`.
4. Một Dummy Match (`PENDING`) được tạo trong bảng `MiniTourMatch`.
5. Worker / Cronjob fetch kết quả từ Riot cho những người này. Khi match tìm thấy, ghi đè toàn bộ placement.
6. Tính tiền và trả thưởng cho top players thông qua `MatchResultService`.

### Cỗ Máy Trạng Thái Lobby Thông Thường (Standard Tournament State)
1. **WAITING:** Round bắt đầu, lobby chia xong.
2. Sockets đẩy dữ liệu realtime liên tục cho client về ai đã `ready`.
3. Nếu xin delay, cộng dồn timer cho phép (họ cần thêm 60s/lần) nếu tổng delay chưa quá ngưỡng.
4. **IN_PROGRESS:** Game đã start.
5. **COMPLETED:** Dữ liệu kéo về xong.

## 7. Tiêu Chuẩn Bảo Mật & Audit Mới
- **Atomic Database Operations**: Mọi giao dịch Balance (Nạp, Lôi, Refund, Mua Vé) 100% được gói trong `prisma.$transaction`. Nếu fail -> rollback trọn vẹn.
- **Rate Limit Data Mining**: Việc pull Riot API được throttle qua hàng đợi BullMQ, tích hợp Backoff Strategies chống 429 quá tải.
- **Quản lý giới hạn Partner**: Giới hạn max lobbies và max tournaments bằng hệ thống configs tập trung để ngăn chặn spam creation.


