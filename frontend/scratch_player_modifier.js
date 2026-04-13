const fs = require('fs');

const commonEnPath = 'locales/en/common.json';
const commonViPath = 'locales/vi/common.json';
const inlinePath = 'app/[locale]/players/[id]/match-details-inline.tsx';
const modalPath = 'app/[locale]/players/[id]/match-details-modal.tsx';

// 1. Update Locales
const enAdditions = {
  "match_summary": "Match Summary",
  "placement": "Placement",
  "prize": "Prize",
  "coins": "Coins",
  "fetch_full_combat_analytics": "Fetch Full Combat Analytics",
  "decrypting_match_data": "Decrypting Match Data...",
  "match_data_processing": "Match data is still processing or unavailable.",
  "match_details": "Match Details",
  "deep_analytics_desc": "Deep analytics & team compositions for match",
  "close_details": "Close Details",
  "round": "Round",
  "detailed_team_analytics_req": "Detailed team compositions and combat analytics require fetching data from Grimoire Riot API.",
  "pts": "pts",
  "remaining": "remaining"
};

const viAdditions = {
  "match_summary": "Tóm tắt trận đấu",
  "placement": "Vị trí",
  "prize": "Phần thưởng",
  "coins": "Xu",
  "fetch_full_combat_analytics": "Lấy Data Giao Tranh Đầy Đủ",
  "decrypting_match_data": "Đang giải mã dữ liệu trận đấu...",
  "match_data_processing": "Dữ liệu trận đấu đang được xử lý hoặc không có sẵn.",
  "match_details": "Chi tiết trận đấu",
  "deep_analytics_desc": "Phân tích chuyên sâu & đội hình cho trận đấu",
  "close_details": "Đóng chi tiết",
  "round": "Vòng",
  "detailed_team_analytics_req": "Phân tích đội hình và giao tranh chi tiết yêu cầu lấy dữ liệu từ Grimoire Riot API.",
  "pts": "điểm",
  "remaining": "còn lại"
};

function updateJson(path, additions) {
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    Object.assign(data, additions);
    const sorted = Object.keys(data).sort().reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});
    fs.writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  }
}

updateJson(commonEnPath, enAdditions);
updateJson(commonViPath, viAdditions);

// 2. Update match-details-inline.tsx
if (fs.existsSync(inlinePath)) {
  let content = fs.readFileSync(inlinePath, 'utf8');
  if (!content.includes('useTranslations')) {
    content = content.replace('import { GrimoireMatchData } from "@/app/types/riot";', 'import { GrimoireMatchData } from "@/app/types/riot";\nimport { useTranslations } from "next-intl";');
  }
  
  content = content.replace(
    'export function MatchDetailsInline({ matchId, userId }: MatchDetailsInlineProps) {',
    'export function MatchDetailsInline({ matchId, userId }: MatchDetailsInlineProps) {\n  const t = useTranslations("Common");'
  );
  
  // Need to pass t to LegacyMatchView
  content = content.replace(
    /function LegacyMatchView\(\{ data, userId, resultMap \}:/g,
    'function LegacyMatchView({ data, userId, resultMap, t }:'
  );
  content = content.replace(
    /<LegacyMatchView data=\{matchDetailsRaw\} userId=\{highlightPuuid \|\| userId\} resultMap=\{resultMap\} \/>/g,
    '<LegacyMatchView data={matchDetailsRaw} userId={highlightPuuid || userId} resultMap={resultMap} t={t} />'
  );
  
  content = content.replace(/>\s*Match Summary\s*</g, '>{t("match_summary")}<');
  content = content.replace(/— Round /g, '— {t("round")} ');
  content = content.replace(/>Placement</g, '>{t("placement")}<');
  content = content.replace(/>Prize</g, '>{t("prize")}<');
  content = content.replace(/>Coins</g, '>{t("coins")}<');
  content = content.replace(/>\s*Detailed team compositions and combat analytics require fetching data from Grimoire Riot API\.\s*</g, '>{t("detailed_team_analytics_req")}<');
  content = content.replace(/>\s*Fetch Full Combat Analytics\s*</g, '>{t("fetch_full_combat_analytics")}<');
  content = content.replace(/>Decrypting Match Data\.\.\.</g, '>{t("decrypting_match_data")}<');
  content = content.replace(/>Match data is still processing or unavailable\.</g, '>{t("match_data_processing")}<');
  
  content = content.replace(/pts</g, '{t("pts")}<');
  content = content.replace(/remaining</g, '{t("remaining")}<');

  fs.writeFileSync(inlinePath, content, 'utf8');
}

// 3. Update match-details-modal.tsx
if (fs.existsSync(modalPath)) {
  let content = fs.readFileSync(modalPath, 'utf8');
  if (!content.includes('useTranslations')) {
    content = content.replace('import { GrimoireMatchData } from "@/app/types/riot";', 'import { GrimoireMatchData } from "@/app/types/riot";\nimport { useTranslations } from "next-intl";');
  }
  
  content = content.replace(
    'export function MatchDetailsModal({ matchId, userId, isOpen, onClose }: MatchDetailsModalProps) {',
    'export function MatchDetailsModal({ matchId, userId, isOpen, onClose }: MatchDetailsModalProps) {\n  const t = useTranslations("Common");'
  );
  
  content = content.replace(
    /function LegacyMatchView\(\{ data, userId, resultMap \}:/g,
    'function LegacyMatchView({ data, userId, resultMap, t }:'
  );
  content = content.replace(
    /<LegacyMatchView data=\{matchDetailsRaw\} userId=\{highlightPuuid \|\| userId\} resultMap=\{resultMap\} \/>/g,
    '<LegacyMatchView data={matchDetailsRaw} userId={highlightPuuid || userId} resultMap={resultMap} t={t} />'
  );

  content = content.replace(/>\s*Match Details\s*</g, '>{t("match_details")}<');
  content = content.replace(/>\s*Deep analytics &amp; team compositions for match /g, '>{t("deep_analytics_desc")} ');
  content = content.replace(/>Decrypting Match Data\.\.\.</g, '>{t("decrypting_match_data")}<');
  content = content.replace(/>Match data is still processing or unavailable\.</g, '>{t("match_data_processing")}<');
  content = content.replace(/>Close Details</g, '>{t("close_details")}<');

  content = content.replace(/pts</g, '{t("pts")}<');
  content = content.replace(/remaining</g, '{t("remaining")}<');

  fs.writeFileSync(modalPath, content, 'utf8');
}

console.log("Done modifying player match data translations.");
