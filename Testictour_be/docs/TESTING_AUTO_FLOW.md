# Hướng Dẫn Kiểm Thử Luồng Giải Đấu Tự Động (Auto Tournament Flow)

Để kiểm thử toàn bộ luồng giải đấu tự động, từ tạo template đến tự động tạo giải, xử lý các vòng đấu, và phát thưởng, bạn có thể sử dụng cơ chế mô phỏng (mocking) Riot API đã được triển khai.

## Bước 0: Thiết lập môi trường và Server

### 1. Thiết lập môi trường
-   **Bật chế độ Mock API:** Mở file `.env` và thêm `MOCK_RIOT_API=true`.
-   **Chạy server:** `npm run build` và `npm start`.
-   **Chạy Worker (QUAN TRỌNG):** Mở terminal mới và chạy `npm run worker`. Worker xử lý các tác vụ nền như lấy kết quả trận đấu và tự động chuyển vòng.

### 2. Scripts Hỗ Trợ
Các script sau nằm trong thư mục `scripts/`. Chạy chúng từ thư mục gốc `TesTicTour/backend`.

-   **`seed.ts`**: Tạo dữ liệu ban đầu, bao gồm tài khoản `admin@test.com` và các tài khoản participants tự động đăng ký và một mẫu giải đấu phức tạp.
-   **`clearDb.ts`**: Xóa SẠCH toàn bộ dữ liệu trong database.
## Bước 1: Tạo Template Giải Đấu

Sử dụng request `POST /api/tournament-templates` hoặc dùng template đã được tạo bởi script `seed.ts`. Cấu hình `phases` với các thuộc tính như `type`, `advancementCondition`, `numberOfRounds`, `pointsMapping`, `carryOverScores`.

## Bước 2: Kích hoạt Giải Đấu và Đăng ký người chơi

1.  **Kích hoạt Giải Đấu:**
    -   **Tự động:** Chờ Cron Job `autoTournamentCron` tự tạo giải đấu.
    -   **Thủ công (Khuyến nghị):** Gửi `POST` đến `http://localhost:4000/api/tournaments/auto` với body `{"templateId": "YOUR_TEMPLATE_ID"}`.
    -   **Kết quả:** Một giải đấu mới sẽ được tạo. Quan trọng là: **Tất cả các phase và round sẽ được tạo sẵn với một lịch trình thi đấu DỰ KIẾN.**
        -   Vòng 1 sẽ có `startTime` = `startTime` của giải + 5 phút.
        -   Các vòng tiếp theo có `startTime` dự kiến cách nhau 45 phút.


## Bước 3: Quan sát Luồng Tự động (Logic đã hoàn thiện)

Hệ thống giờ hoạt động theo mô hình **Hybrid (Cron Job + Event-Driven)**.

1.  **Bắt đầu Vòng 1:**
    -   Cron job `autoRoundAdvanceCron` chạy mỗi phút, đóng vai trò "người gác cổng".
    -   Khi đến `startTime` dự kiến của Vòng 1, cron job sẽ tìm thấy nó và đưa vào hàng đợi (`Queue`) để Worker xử lý.

2.  **Worker xử lý `autoAdvanceRound`:**
    -   Worker lấy job từ hàng đợi và gọi `RoundService.autoAdvance`. Hàm này rất thông minh và sẽ xử lý dựa trên trạng thái của vòng đấu:
    -   **Nếu vòng đang `pending`:**
        -   Worker sẽ **Bắt đầu Vòng đấu**.
        -   Nó kiểm tra xem giải có người tham gia không (chỉ áp dụng cho vòng đầu tiên).
        -   Đổi trạng thái vòng thành `in_progress`.
        -   Tạo `Lobbies` và `Matches`, chia người chơi vào các sảnh. Vòng đấu chính thức "sống".

3.  **Xử lý kết quả (Event-Driven):**
    -   Khi trận đấu trong game kết thúc, worker `fetchMatchData` sẽ lấy kết quả (dữ liệu mock).
    -   `MatchResultService` xử lý điểm, cập nhật `scoreTotal` cho người chơi.
    -   Khi **TẤT CẢ** các lobby trong một vòng đã có kết quả, `MatchResultService` sẽ **kích hoạt một sự kiện**: đưa chính `roundId` đó trở lại hàng đợi.

4.  **Hoàn thành và Chuyển tiếp Vòng đấu:**
    -   Worker lại nhận được job cho vòng đấu vừa xong, nhưng lần này trạng thái của nó là `in_progress`.
    -   **Nếu vòng đang `in_progress`:**
        -   Worker sẽ **Hoàn thành Vòng đấu**.
        -   Đổi trạng thái thành `completed`.
        -   Áp dụng `advancementCondition` để loại người chơi.
        -   Tìm ra vòng đấu tiếp theo (`nextRound`).
        -   **CẬP NHẬT `startTime` của `nextRound`** thành `hiện tại + 5 phút`. Điều này đảm bảo lịch trình linh hoạt.
        -   **Đưa `nextRound` vào hàng đợi ngay lập tức** để giải đấu diễn ra liền mạch.

-   Quá trình này lặp lại cho đến khi vòng cuối cùng kết thúc, giải đấu được hoàn tất và phần thưởng được chi trả.

-   Theo dõi log của server và worker để thấy toàn bộ quá trình diễn ra.

---

Luồng này giờ đây đã được tự động hóa, điều khiển bằng sự kiện, có lịch trình dự kiến và logic rõ ràng. Chúc bạn kiểm thử thành công!

## Sử dụng Riot API Thật (Trong Tương Lai)

Khi bạn đã sẵn sàng tích hợp với Riot API thật để lấy dữ liệu trận đấu, hãy làm theo các bước sau:

1.  **Cấu hình Riot API Key:**
    *   Mở file `.env` của bạn.
    *   Đảm bảo bạn đã có `RIOT_API_KEY` được cấu hình với khóa API hợp lệ từ Riot Games.
    *   Thiết lập `MOCK_RIOT_API=false` hoặc xóa dòng này hoàn toàn để tắt chế độ mock.
        ```
        RIOT_API_KEY=YOUR_REAL_RIOT_API_KEY
        MOCK_RIOT_API=false
        ```
2.  **Rebuild và Khởi động lại Server:**
    *   Sau khi thay đổi `.env`, bạn cần rebuild và khởi động lại server:
        ```bash
        npm run build
        npm start
        ```
3.  **Thay đổi cách kích hoạt `fetchMatchData` (Quan trọng):**
    *   Trong môi trường production, bạn sẽ không gọi `MatchService.fetchAndSaveMatchData` ngay lập tức sau khi tạo `Match` như trong môi trường mock.
    *   Thay vào đó, bạn sẽ cần một cơ chế để phát hiện khi một trận đấu Riot Games thực sự kết thúc và có `matchIdRiotApi` khả dụng. Điều này thường liên quan đến:
        *   **Webhook từ Riot Games:** Riot Games có thể gửi webhook khi một trận đấu kết thúc.
        *   **Polling định kỳ:** Một cron job hoặc worker khác sẽ định kỳ kiểm tra các trận đấu đang diễn ra và lấy `matchIdRiotApi` khi chúng hoàn tất.
    *   Sau khi có `matchIdRiotApi` từ một trận đấu thực tế, bạn sẽ gọi `MatchService.fetchAndSaveMatchData` với `matchId` (Prisma ID của match tương ứng) và `matchIdRiotApi` thực tế để lưu dữ liệu trận đấu và xử lý kết quả.

**Lưu ý:** Việc tích hợp Riot API thật đòi hỏi phải tuân thủ các chính sách của Riot Games và quản lý tốc độ gọi API (rate limiting) để tránh bị khóa.

---