const fs = require('fs');

const commonEnPath = 'frontend/locales/en/common.json';
const commonViPath = 'frontend/locales/vi/common.json';

const commonEn = JSON.parse(fs.readFileSync(commonEnPath));
const commonVi = JSON.parse(fs.readFileSync(commonViPath));

const tMap = {
  "partner_dashboard": "Partner Dashboard",
  "partner_panel": "Partner Panel",
  "manage": "Manage",
  "overview": "Overview",
  "tournaments": "Tournaments",
  "lobbies": "Lobbies",
  "players": "Players",
  "finance_analytics": "Finance & Analytics",
  "revenue": "Revenue",
  "wallet": "Wallet",
  "analytics": "Analytics",
  "plans": "Plans",
  "engagement_settings": "Engagement & Settings",
  "rewards": "Rewards",
  "achievements": "Achievements",
  "settings": "Settings",
  "net_balance": "Net Balance",
  "available_to_withdraw": "Available to withdraw",
  "platform_fee": "Platform Fee",
  "all_time": "all-time",
  "secured_in_escrow": "Secured in Escrow",
  "pending_settlement": "Pending settlement",
  "players_engaged": "Players Engaged",
  "across_all_events": "Across all events",
  "recent_tournaments": "Recent Tournaments",
  "recent_match_results": "Recent Match Results",
  "no_tournaments_yet": "No tournaments yet",
  "no_completed_matches_yet": "No completed matches yet",
  "your_latest_competitive_events": "Your latest competitive events",
  "latest_completed_tournament_matches": "Latest completed tournament matches"
};

const viMap = {
  "partner_dashboard": "Bảng Điều Khiển Đối Tác",
  "partner_panel": "Bảng Đối Tác",
  "manage": "Quản Lý",
  "overview": "Tổng Quan",
  "tournaments": "Giải Đấu",
  "lobbies": "Phòng Đấu",
  "players": "Người Chơi",
  "finance_analytics": "Tài Chính & Phân Tích",
  "revenue": "Doanh Thu",
  "wallet": "Ví Tiền",
  "analytics": "Phân Tích",
  "plans": "Gói Đăng Ký",
  "engagement_settings": "Tương Tác & Cài Đặt",
  "rewards": "Phần Thưởng",
  "achievements": "Thành Tựu",
  "settings": "Cài Đặt",
  "net_balance": "Số Dư Thực Tế",
  "available_to_withdraw": "Có thể rút",
  "platform_fee": "Phí Nền Tảng",
  "all_time": "toàn thời gian",
  "secured_in_escrow": "Đã bảo chứng trong Escrow",
  "pending_settlement": "Chờ quyết toán",
  "players_engaged": "Người chơi tham gia",
  "across_all_events": "Trên tất cả sự kiện",
  "recent_tournaments": "Giải đấu Gần đây",
  "recent_match_results": "Kết quả Trận đấu Gần đây",
  "no_tournaments_yet": "Chưa có giải đấu nào",
  "no_completed_matches_yet": "Chưa có trận đấu nào hoàn tất",
  "your_latest_competitive_events": "Các sự kiện cạnh tranh mới nhất của bạn",
  "latest_completed_tournament_matches": "Kết quả trận đấu giải đấu đã hoàn tất mới nhất"
};

let modifiedEn = false;
let modifiedVi = false;

Object.entries(tMap).forEach(([key, enText]) => {
  if (!commonEn[key]) {
    commonEn[key] = enText;
    modifiedEn = true;
  }
});

Object.entries(viMap).forEach(([key, viText]) => {
  if (!commonVi[key]) {
    commonVi[key] = viText;
    modifiedVi = true;
  }
});

if (modifiedEn) fs.writeFileSync(commonEnPath, JSON.stringify(commonEn, null, 2));
if (modifiedVi) fs.writeFileSync(commonViPath, JSON.stringify(commonVi, null, 2));

console.log("Locales updated!");
