# Thiết kế Backend Auto Tournament – TesTicTour

## 1. Kiến trúc tổng quan & Thư mục dự án

```
backend/
├── src/
│   ├── controllers/      # Xử lý logic cho từng route
│   ├── routes/           # Định nghĩa API endpoints
│   ├── services/         # Business logic, gọi DB, gọi Riot API, v.v.
│   ├── jobs/             # Xử lý các tác vụ không đồng bộ
│   ├── sockets/          # Socket.IO handlers
│   ├── middlewares/      # Auth, rate limit, validate, error handler
│   ├── utils/            # Helper functions
│   ├── lib/              # Các thư viện, queues, và cấu hình
│   └── app.ts            # Khởi tạo app Express
├── prisma/               # Prisma ORM
│   └── schema.prisma
├── scripts/              # Scripts để seed dữ liệu và các tác vụ khác
├── package.json
├── tsconfig.json
└── .env
```

## 2. Thiết kế Database

### Bảng chính & giải thích:
- **users**: Thông tin user, liên kết participant, balance, transaction
- **tournament_templates**: Mẫu giải auto (admin tạo, hệ thống sinh giải)
- **tournaments**: Thông tin giải, liên kết template, auto, trạng thái
- **participants**: User tham gia giải, trạng thái, điểm, đã trả phí chưa
- **phases**: Các giai đoạn của giải đấu (elimination, swiss, checkmate)
- **rounds**: Vòng đấu trong một phase
- **lobbies**: Bảng đấu nhỏ trong round
- **matches**: Trận đấu thực tế (liên kết Riot API)
- **match_results**: Kết quả từng trận, từng user
- **round_outcomes**: Kết quả của người chơi trong từng vòng đấu
- **balances**: Số dư user
- **transactions**: Lịch sử giao dịch (nạp, rút, entry_fee, reward, refund)
- **rewards**: Phần thưởng từng participant

## 3. Model Prisma (Hiện tại)

```prisma
// Core Models
model User {
  id           String         @id @default(uuid())
  username     String         @unique
  email        String         @unique
  password     String
  role         String         @default("user")
  puuid        String?        @unique
  riotGameName String
  riotGameTag  String
  region       String
  createdAt    DateTime       @default(now())
  participants Participant[]
  balance      Balance?
  transactions Transaction[]
  createdTournamentTemplates TournamentTemplate[] @relation("UserCreatedTournamentTemplates")
  organizedTournaments Tournament[] @relation("UserOrganizedTournaments")
  matchResults MatchResult[]
}

model TournamentTemplate {
  id                   String       @id @default(uuid())
  name                 String
  maxPlayers           Int
  entryFee             Float
  prizeStructure       Json
  hostFeePercent       Float        @default(0.1)
  expectedParticipants Int
  scheduleType         String
  startTime            String
  phases               Json?        @default("[]")
  createdBy            User         @relation("UserCreatedTournamentTemplates", fields: [createdById], references: [id])
  createdById          String
  createdAt            DateTime     @default(now())
  tournaments          Tournament[]

  @@unique([name])
}

model Tournament {
  id                       String       @id @default(uuid())
  name                     String
  description              String?
  image                    String?
  region                   String?
  startTime                DateTime
  endTime                  DateTime?
  entryFee                 Float        @default(0)
  organizer                User         @relation("UserOrganizedTournaments", fields: [organizerId], references: [id])
  organizerId              String
  status                   String     @default("pending")
  maxPlayers               Int
  createdAt                DateTime     @default(now())
  template                 TournamentTemplate? @relation(fields: [templateId], references: [id])
  templateId               String?
  auto                     Boolean      @default(false)
  registrationDeadline     DateTime
  participants             Participant[]
  phases                   Phase[]
  rewards                  Reward[]
  prizeStructure           Json
  hostFeePercent           Float        @default(0.1)
  expectedParticipants     Int
  actualParticipantsCount  Int?
  adjustedPrizeStructure   Json?
  registered               Boolean?
}

model Phase {
  id                   String     @id @default(uuid())
  tournament           Tournament @relation(fields: [tournamentId], references: [id])
  tournamentId         String
  name                 String
  phaseNumber          Int
  type                 String
  lobbySize            Int?
  lobbyAssignment      String?
  advancementCondition Json?
  advancementDetails   Json?      // Cho multi-round advancement, e.g., [{"round": 1, "advances": 32}, {"round": 2, "advances": 8}]
  matchesPerRound      Int?
  numberOfRounds       Int?
  tieBreakerRule       Json?      // Định nghĩa cách giải quyết trường hợp hòa. e.g. { "type": "highest_last_placement" }
  pointsMapping        Json?      // Định nghĩa điểm cho từng thứ hạng, e.g. [8,7,6,5,4,3,2,1]
  carryOverScores      Boolean    @default(false) // Xác định có giữ điểm từ phase trước không
  status               String
  rounds               Round[]

  @@unique([tournamentId, phaseNumber])
}

model Participant {
  id              String    @id @default(uuid())
  tournament      Tournament @relation(fields: [tournamentId], references: [id])
  tournamentId    String
  user            User      @relation(fields: [userId], references: [id])
  userId          String
  joinedAt        DateTime  @default(now())
  scoreTotal      Float     @default(0)
  eliminated      Boolean   @default(false)
  checkmateActive Boolean   @default(false)
  paid            Boolean   @default(false)
  rewarded        Boolean   @default(false)
  rewards         Reward[]
  roundOutcomes   RoundOutcome[]

  @@unique([userId, tournamentId])
}

model Reward {
  id            String       @id @default(uuid())
  participant   Participant  @relation(fields: [participantId], references: [id])
  participantId String
  tournament    Tournament   @relation(fields: [tournamentId], references: [id])
  tournamentId  String
  amount        Float
  status        String
  sentAt        DateTime?
}

model Round {
  id           String    @id @default(uuid())
  phase        Phase     @relation(fields: [phaseId], references: [id])
  phaseId      String
  roundNumber  Int
  startTime    DateTime
  endTime      DateTime?
  status       String
  lobbies      Lobby[]
  outcomes     RoundOutcome[]

  @@unique([phaseId, roundNumber])
}

model Lobby {
  id            String      @id @default(uuid())
  round         Round       @relation(fields: [roundId], references: [id])
  roundId       String
  name          String
  participants  Json
  matchId       String?
  fetchedResult Boolean      @default(false)
  matches       Match[]
  completedMatchesCount Int @default(0)
}

model Match {
  id            String      @id @default(uuid())
  matchIdRiotApi String @unique
  lobby         Lobby       @relation(fields: [lobbyId], references: [id])
  lobbyId       String
  fetchedAt     DateTime?
  matchData     Json?
  matchResults  MatchResult[]
}

model MatchResult {
  id        String   @id @default(uuid())
  match     Match    @relation(fields: [matchId], references: [id])
  matchId   String
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  placement Int
  points    Float

  @@unique([matchId, userId])
}

model Balance {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String   @unique
  amount    Float    @default(0)
  updatedAt DateTime @updatedAt
}

model Transaction {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  type      String   // deposit, withdraw, refund, entry_fee, reward
  amount    Float
  status    String   // pending, success, failed
  refId     String?
  createdAt DateTime @default(now())
}

model RoundOutcome {
  id             String   @id @default(cuid())
  participant    Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  participantId  String
  round          Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)
  roundId        String
  status         String   // "advanced", "eliminated"
  scoreInRound   Int      @default(0)

  @@unique([participantId, roundId])
}
```

## 4. API Endpoints (RESTful)

### Auth & User
- `POST /api/auth/register` – Đăng ký
- `POST /api/auth/login` – Đăng nhập
- `GET /api/auth/me` – Lấy thông tin user hiện tại
- `GET /api/users/:id` – Lấy thông tin user
- `PUT /api/users/:id` – Cập nhật thông tin user

### Tournament & Template
- `GET /api/tournaments` – Danh sách giải
- `POST /api/tournaments` – Tạo giải (admin)
- `GET /api/tournaments/:id` – Chi tiết giải
- `PUT /api/tournaments/:id` – Sửa giải (admin)
- `DELETE /api/tournaments/:id` – Xóa giải (admin)
- `GET /api/tournament-templates` – Danh sách template
- `POST /api/tournament-templates` – Tạo template giải đấu
- `POST /api/tournaments/auto` – (admin) Trigger tạo giải auto

### Phase & Round
- `GET /api/tournaments/:id/phases` – Danh sách phase của giải
- `GET /api/phases/:id/rounds` – Danh sách vòng của phase
- `GET /api/rounds/:id` – Chi tiết vòng đấu
- `GET /api/rounds/:id/results` – Kết quả vòng đấu

### Participant, Lobby, Match
- `POST /api/tournaments/:id/join` – User đăng ký tham gia giải
- `GET /api/tournaments/:id/participants` – Danh sách người chơi
- `GET /api/rounds/:roundId/lobbies` – Danh sách lobby của vòng
- `GET /api/lobbies/:lobbyId/matches` – Danh sách trận của lobby
- `GET /api/matches/:matchId/results` – Kết quả trận

### Balance & Transaction
- `POST /api/balance/deposit` – Nạp tiền
- `GET /api/balance` – Xem số dư
- `GET /api/transactions` – Lịch sử giao dịch

### Realtime (Socket.IO)
- `match_result_update` – Push kết quả trận cho client
- `tournament_update` – Push cập nhật giải đấu

## 5. Service Layer

- **UserService:** Đăng ký, đăng nhập, xác thực, quản lý user
- **TournamentService:** CRUD giải đấu, tạo phases, tạo rounds
- **ParticipantService:** Đăng ký giải, quản lý người chơi
- **PhaseService:** Quản lý các giai đoạn của giải đấu
- **RoundService:** Quản lý vòng đấu, tính điểm, loại người chơi, xử lý advancement
- **LobbyService:** Tự động chia lobby, quản lý lobby
- **RiotApiService:** Gọi Riot API để lấy thông tin user, fetch dữ liệu trận đấu
- **MatchService:** Lưu match, lưu kết quả thô từ Riot API
- **MatchResultService:** Xử lý phân tích dữ liệu match, tính điểm, cập nhật scoreInRound và scoreTotal
- **BalanceService:** Quản lý balance user
- **TransactionService:** Ghi nhận, cập nhật transaction
- **PrizeCalculationService:** Điều chỉnh giải thưởng dựa trên số người tham gia thực tế

## 6. Luồng tự động hóa giải đấu

### 6.1. Auto Tournament Flow
1. Admin tạo template giải đấu với các thông số cần thiết
2. Đến giờ: Cronjob tự tạo giải mới từ template, copy các thông số
3. Mở đăng ký: User đăng ký, đóng khi đủ người hoặc hết hạn
4. **Sau khi đóng đăng ký**: Hệ thống tính `actual_participants_count` và điều chỉnh `prize_structure`
5. Tự động bắt đầu: Đến giờ, hệ thống tự chia lobby, tạo round đầu tiên
6. Sau mỗi round: Tự động tính điểm, loại người chơi, chia lại lobby, advance round tiếp theo
7. Kết thúc: Khi hết round cuối hoặc có người chiến thắng trong phase checkmate, hệ thống tự động tổng kết, phát thưởng

### 6.2. Phase Types & Advancement
Hệ thống hỗ trợ nhiều loại phase:

1. **Elimination**: Loại người chơi dựa trên thứ hạng (placement) trong trận
2. **Swiss**: Chia lobby dựa trên điểm số, loại người chơi dựa trên tổng điểm sau một số vòng
3. **Checkmate**: Người chơi đạt đủ điểm sẽ được kích hoạt chế độ checkmate, nếu thắng (placement=1) sẽ thắng cả giải

### 6.3. Scoring & Round Outcomes
- Mỗi round, người chơi nhận điểm dựa trên thứ hạng (placement) theo `pointsMapping` của phase
- Điểm được lưu trong `RoundOutcome.scoreInRound` cho từng vòng
- `Participant.scoreTotal` được tính bằng tổng của tất cả `scoreInRound` từ các vòng đã hoàn thành
- Trong phase checkmate, hệ thống kiểm tra `scoreInRound` để kích hoạt chế độ checkmate

### 6.4. Xử lý kết quả trận đấu & Tích hợp Riot API
- Khi trận đấu kết thúc, hệ thống fetch dữ liệu từ Riot API
- `MatchResultService` phân tích dữ liệu, tính điểm cho từng người chơi
- Điểm được cập nhật vào `MatchResult.points` và `RoundOutcome.scoreInRound`
- `RoundService._updateParticipantTotalScores` cập nhật `Participant.scoreTotal` bằng tổng của tất cả `scoreInRound`
- Trong phase checkmate, hệ thống tạo nhiều trận đấu liên tiếp cho cùng một lobby cho đến khi có người thắng

### 6.5. Realtime
- Khi có kết quả mới, server emit event cho client:
  - `match_result_update` (gửi cho user trong lobby)
  - `tournament_update` (gửi cho tất cả user trong giải)

## 7. Bảo mật & tối ưu
- **JWT cho Auth** (Bearer token)
- **Rate limit** khi gọi Riot API
- **Redis cache** cho puuid, match data
- **Role-based access** (admin, user)
- **Validation** (Joi/Zod)
- **Error handling** chuẩn REST
- **Queue system** (BullMQ/Redis) để xử lý các tác vụ không đồng bộ:
  - `fetchMatchDataQueue`: Fetch dữ liệu trận đấu từ Riot API
  - `checkRoundCompletionQueue`: Kiểm tra khi nào round hoàn thành
  - `autoAdvanceRoundQueue`: Tự động advance round

## 8. Cải tiến gần đây
1. **Thêm bảng RoundOutcome**: Lưu kết quả và điểm của người chơi trong từng vòng đấu
2. **Cải thiện tính điểm**:
   - `scoreInRound`: Điểm trong một vòng đấu cụ thể
   - `scoreTotal`: Tổng điểm từ tất cả các vòng đã hoàn thành
3. **Phase Checkmate**: 
   - Hỗ trợ nhiều trận đấu liên tiếp trong cùng một lobby
   - Kích hoạt chế độ checkmate dựa trên `scoreInRound` thay vì `scoreTotal`
   - Tự động tạo trận mới cho đến khi có người thắng
4. **Multi-round advancement**: Hỗ trợ điều kiện loại người chơi khác nhau cho từng vòng trong cùng một phase
5. **Cải thiện transaction safety**: Sử dụng Prisma transaction để đảm bảo tính nhất quán của dữ liệu

## 9. Checklist kiểm thử bảo mật & nhất quán dữ liệu

### 9.1. Transaction & Lock
- [ ] Tất cả thao tác trừ tiền, hoàn tiền, phát thưởng đều nằm trong transaction DB
- [ ] Khi update balance, lock row theo user_id
- [ ] Nếu transaction thất bại, rollback toàn bộ thao tác liên quan

### 9.2. Queue & Retry
- [ ] Các thao tác fetch match data, update điểm, advance round đều chạy qua job queue
- [ ] Nếu job thất bại, có cơ chế retry tự động

### 9.3. Xác thực webhook thanh toán
- [ ] Chỉ cộng tiền khi xác thực callback từ cổng thanh toán thành công
- [ ] Log lại toàn bộ request webhook để audit

### 9.4. Phân quyền API
- [ ] API admin (tạo/xóa giải, template) phải kiểm tra role
- [ ] API user (join, xem balance, transaction) phải xác thực user, không cho truy cập chéo

### 9.5. Rate limit & Riot API
- [ ] Có rate limit cho từng user, từng giải, tổng hệ thống khi gọi Riot API
- [ ] Nếu bị block, tự động retry sau delay (với exponential backoff)

### 9.6. Monitoring & Alerting
- [ ] Theo dõi queue, transaction pending, error log, event bất thường
- [ ] Cảnh báo khi queue nghẽn, transaction pending quá lâu, hoặc có lỗi bất thường

### 9.7. Realtime event leak
- [ ] Khi emit event realtime, chỉ gửi đúng user/lobby/tournament
- [ ] Kiểm tra quyền trước khi emit event sensitive

### 9.8. Data consistency khi scale
- [ ] Nếu scale DB (sharding, partition), đảm bảo transaction liên bảng vẫn nhất quán
- [ ] Test rollback khi 1 bước trong flow auto tournament lỗi giữa chừng

### 9.9. Logic tính toán & điều chỉnh giải thưởng
- [ ] Khi chốt danh sách đăng ký, hệ thống luôn tính `actual_participants_count`
- [ ] Gọi `PrizeCalculationService.autoAdjustPrizeStructure` để tạo `adjusted_prize_structure`
- [ ] Tổng payout từ `adjusted_prize_structure` không vượt quá 90% tổng phí thực thu
- [ ] `hostFeePercent` luôn >= 0.1 (10%) tổng phí thực thu

### 9.10. Theo dõi kết quả trận đấu & Cập nhật điểm
- [ ] Dữ liệu trận đấu từ Riot API được fetch và lưu trữ đầy đủ
- [ ] `MatchResultService` phân tích chính xác `placement` và `points` cho từng user
- [ ] `RoundOutcome.scoreInRound` được cập nhật đúng sau mỗi trận đấu
- [ ] `Participant.scoreTotal` được cập nhật đúng sau mỗi vòng đấu
- [ ] Realtime event `match_result_update` được push kịp thời cho client

---

Thiết kế này đảm bảo hệ thống auto tournament luôn tự động tính toán và điều chỉnh giải thưởng theo số người tham gia thực tế, host luôn có lời tối thiểu 10% tổng phí, không bao giờ lỗ. Hệ thống hỗ trợ nhiều loại phase khác nhau, cho phép tổ chức các giải đấu phức tạp với nhiều vòng và điều kiện loại người chơi khác nhau. 

