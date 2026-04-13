const fs = require('fs');

const f1 = 'c:\\Users\\Admin\\Desktop\\projects\\TesTicTour_V2\\frontend\\app\\[locale]\\dashboard\\admin\\components\\TournamentManagementTab.tsx';
if(fs.existsSync(f1)){
    let c1 = fs.readFileSync(f1, 'utf8');
    c1 = c1.replace('const TournamentManagementTab = observer(() => {', 'const TournamentManagementTab = observer(() => {\n  const t = useTranslations("Common");');
    fs.writeFileSync(f1, c1, 'utf8');
}

const f2 = 'c:\\Users\\Admin\\Desktop\\projects\\TesTicTour_V2\\frontend\\app\\[locale]\\dashboard\\partner\\components\\LobbyActions.tsx';
if(fs.existsSync(f2)){
    let c2 = fs.readFileSync(f2, 'utf8');
    c2 = c2.replace('export function LobbyActions({ lobby, onLobbiesUpdate }: { lobby: MiniTourLobby; onLobbiesUpdate?: (lobbies: MiniTourLobby[]) => void }) {', 'export function LobbyActions({ lobby, onLobbiesUpdate }: { lobby: MiniTourLobby; onLobbiesUpdate?: (lobbies: MiniTourLobby[]) => void }) {\n  const t = useTranslations("Common");');
    fs.writeFileSync(f2, c2, 'utf8');
}
