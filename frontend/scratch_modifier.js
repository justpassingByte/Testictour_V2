const fs = require('fs');

// Files to update
const commonEnPath = 'locales/en/common.json';
const commonViPath = 'locales/vi/common.json';
const matchesTabPath = 'app/[locale]/minitour/lobbies/[id]/components/LobbyMatchesTab.tsx';
const actionCardPath = 'app/[locale]/minitour/lobbies/[id]/components/LobbyActionCard.tsx';

// 1. Update Locales
const enAdditions = {
  "championship_prize_pool": "Championship Prize Pool",
  "prize_awarded_end_matches": "Prize is awarded at the end of all matches based on cumulative points.",
  "searching_for_match": "Searching for match...",
  "riot_id": "Riot ID",
  "waiting_for_match_complete": "Waiting for match to complete...",
  "no_results_yet": "No results yet",
  "fetched_automatically_desc": "Fetched automatically when the game ends \u2014 or sync manually:",
  "sync_via_riot_api": "Sync via Riot API",
  "no_matches_created_yet": "No matches have been created yet.",
  "lobby_live_status": "Lobby Live Status",
  "reconnecting": "Reconnecting...",
  "players_joined": "Players Joined",
  "entry_fee_colon": "Entry Fee:",
  "prize_pool_colon": "Prize Pool:",
  "joining": "Joining...",
  "match_starting": "Match Starting!",
  "match_in_progress": "Match in Progress",
  "match_finished": "Match Finished",
  "admin_intervention": "Admin Intervention",
  "ready_required": "Ready ({required} required)",
  "admin_reviewing_lobby": "Admin reviewing lobby.",
  "match_starting_do_not_close": "Match is starting! Do not close.",
  "updating": "Updating...",
  "waiting_for_others": "Waiting for others...",
  "click_to_ready_up": "Click to Ready Up",
  "players_status": "Players Status",
  "unknown": "Unknown"
};

const viAdditions = {
  "championship_prize_pool": "Tổng giải thưởng chức vô địch",
  "prize_awarded_end_matches": "Phần thưởng được trao sau khi kết thúc mọi trận đấu dựa trên tổng điểm.",
  "searching_for_match": "Đang tìm trận đấu...",
  "riot_id": "Riot ID",
  "waiting_for_match_complete": "Đang chờ trận đấu kết thúc...",
  "no_results_yet": "Chưa có kết quả",
  "fetched_automatically_desc": "Được lấy tự động khi trận đấu kết thúc \u2014 hoặc đồng bộ thủ công:",
  "sync_via_riot_api": "Đồng bộ qua Riot API",
  "no_matches_created_yet": "Chưa có trận đấu nào được tạo.",
  "lobby_live_status": "Trạng thái sảnh trực tiếp",
  "reconnecting": "Đang kết nối lại...",
  "players_joined": "Người chơi đã tham gia",
  "entry_fee_colon": "Phí vào:",
  "prize_pool_colon": "Tổng thưởng:",
  "joining": "Đang vào...",
  "match_starting": "Trận đấu đang bắt đầu!",
  "match_in_progress": "Trận đấu đang diễn ra",
  "match_finished": "Trận đấu đã kết thúc",
  "admin_intervention": "Admin can thiệp",
  "ready_required": "Sẵn sàng (Cần {required} người)",
  "admin_reviewing_lobby": "Admin đang kiểm tra sảnh.",
  "match_starting_do_not_close": "Trận đấu sắp diễn ra! Đừng đóng cửa sổ.",
  "updating": "Đang cập nhật...",
  "waiting_for_others": "Đang chờ người khác...",
  "click_to_ready_up": "Nhấn để Sẵn Sàng",
  "players_status": "Trạng thái người chơi",
  "unknown": "Không xác định"
};

function updateJson(path, additions) {
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    Object.assign(data, additions);
    // Sort keys logically or just append
    const sorted = Object.keys(data).sort().reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});
    fs.writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  }
}

updateJson(commonEnPath, enAdditions);
updateJson(commonViPath, viAdditions);

// 2. Update LobbyMatchesTab.tsx
if (fs.existsSync(matchesTabPath)) {
  let content = fs.readFileSync(matchesTabPath, 'utf8');
  // Add import
  if (!content.includes('useTranslations')) {
    content = content.replace('import { ChevronDown } from "lucide-react"', 'import { ChevronDown } from "lucide-react"\nimport { useTranslations } from "next-intl"');
  }
  
  // Replace in MatchResultTable
  content = content.replace(
    'function MatchResultTable({ match, participants }: { match: MiniTourMatch; participants: MiniTourLobbyParticipant[] }) {',
    'function MatchResultTable({ match, participants }: { match: MiniTourMatch; participants: MiniTourLobbyParticipant[] }) {\n  const t = useTranslations("Common");'
  );
  content = content.replace(/>Unknown</g, '>{t("unknown")}<');
  
  // Replace in LobbyMatchesTab
  content = content.replace(
    'export function LobbyMatchesTab({ lobby }: LobbyMatchesTabProps) {',
    'export function LobbyMatchesTab({ lobby }: LobbyMatchesTabProps) {\n  const t = useTranslations("Common");'
  );
  
  content = content.replace(/>No matches have been created yet\.</g, '>{t("no_matches_created_yet")}<');
  content = content.replace(/>\s*Championship Prize Pool\s*</g, '>{t("championship_prize_pool")}<');
  content = content.replace(/>\s*Prize is awarded at the end of all matches based on cumulative points\.\s*</g, '>{t("prize_awarded_end_matches")}<');
  content = content.replace(/>Matches</g, '>{t("matches")}<');
  content = content.replace(/pollingMessage \|\| 'Searching for match\.\.\.'/g, 'pollingMessage || t("searching_for_match")');
  content = content.replace(/>Match \{match/g, '>{t("match")} {match');
  content = content.replace(/Status:\s*<Badge/g, '{t("status")} <Badge');
  content = content.replace(/>Completed</g, '>{t("completed_status")}<');
  content = content.replace(/>Pending</g, '>{t("pending")}<');
  content = content.replace(/Riot ID: /g, '{t("riot_id")}: ');
  content = content.replace(/>Waiting for match to complete\.\.\.</g, '>{t("waiting_for_match_complete")}<');
  content = content.replace(/>No results yet</g, '>{t("no_results_yet")}<');
  content = content.replace(/>\s*Fetched automatically when the game ends — or sync manually:\s*</g, '>{t("fetched_automatically_desc")}<');
  content = content.replace(/>\s*Sync via Riot API\s*</g, '>{t("sync_via_riot_api")}<');
  content = content.replace(/>\s*Syncing\.\.\.\s*</g, '>{t("syncing")}<');
  
  fs.writeFileSync(matchesTabPath, content, 'utf8');
}

// 3. Update LobbyActionCard.tsx
if (fs.existsSync(actionCardPath)) {
  let content = fs.readFileSync(actionCardPath, 'utf8');
  if (!content.includes('useTranslations')) {
    content = content.replace('import type { SecondaryAction } from "../hooks/useLobbyActions";', 'import type { SecondaryAction } from "../hooks/useLobbyActions";\nimport { useTranslations } from "next-intl";');
  }
  
  // Modify stateConfig function to accept t function
  content = content.replace(/function stateConfig\(state: string\) \{/g, 'function stateConfig(state: string, t: any) {');
  content = content.replace(/'Waiting for players'/g, 't("waiting_for_players")');
  content = content.replace(/'Ready Check'/g, 't("ready_check")');
  content = content.replace(/'Grace Period'/g, 't("grace_period")');
  content = content.replace(/'Match Starting!'/g, 't("match_starting")');
  content = content.replace(/'Match in Progress'/g, 't("match_in_progress")');
  content = content.replace(/'Match Finished'/g, 't("match_finished")');
  content = content.replace(/'Cancelled'/g, 't("cancelled")');
  content = content.replace(/'Admin Intervention'/g, 't("admin_intervention")');
  
  // Replace in LobbyActionCard component
  content = content.replace(
    /export function LobbyActionCard\(\{\n  lobby,/g,
    'export function LobbyActionCard({\n  lobby,'
  );
  content = content.replace(
    '  currentUserId\n}: LobbyActionCardProps) {',
    '  currentUserId\n}: LobbyActionCardProps) {\n  const t = useTranslations("Common");'
  );
  
  content = content.replace(/const sc = stateConfig\(lobby\.status\);/g, 'const sc = stateConfig(lobby.status, t);');
  
  content = content.replace(/>\s*Lobby Live Status\s*</g, '>{t("lobby_live_status")}<');
  content = content.replace(/>Live</g, '>{t("live")}<');
  content = content.replace(/>Reconnecting…</g, '>{t("reconnecting")}<');
  content = content.replace(/>Players Joined</g, '>{t("players_joined")}<');
  content = content.replace(/>Entry Fee:</g, '>{t("entry_fee_colon")}<');
  content = content.replace(/>Prize Pool:</g, '>{t("prize_pool_colon")}<');
  content = content.replace(/>\s*Joining\.\.\.\s*</g, '>{t("joining")}<');
  content = content.replace(/<span>Ready \(\{Math\.max\(6, Math\.min\(lobby\.currentPlayers, lobby\.maxPlayers\)\)\} required\)<\/span>/g, '<span>{t("ready_required", { required: Math.max(6, Math.min(lobby.currentPlayers, lobby.maxPlayers)) })}</span>');
  content = content.replace(/>\s*Admin reviewing lobby\.\s*</g, '>{t("admin_reviewing_lobby")}<');
  content = content.replace(/>\s*Match is starting! Do not close\.\s*</g, '>{t("match_starting_do_not_close")}<');
  content = content.replace(/>\s*Updating…\s*</g, '>{t("updating")}<');
  content = content.replace(/>\s*Waiting for others\.\.\.\s*</g, '>{t("waiting_for_others")}<');
  content = content.replace(/>\s*Click to Ready Up\s*</g, '>{t("click_to_ready_up")}<');
  content = content.replace(/>Players Status</g, '>{t("players_status")}<');
  
  fs.writeFileSync(actionCardPath, content, 'utf8');
}

console.log("Done modifying minitour specific translations.");
