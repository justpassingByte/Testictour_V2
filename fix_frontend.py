#!/usr/bin/env python3
import re

path = r'C:\Users\Admin\Desktop\projects\TesTicTour_V2\frontend\app\[locale]\dashboard\admin\dev-tools\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact old button text
old_start = '<Button size="sm" variant="outline" className="w-full justify-start border-purple-500/40 text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 mt-2"'
old_end = '1. Seed Configured Tournament (Pending)\n                      </Button>'

# Find the position
idx_start = content.find(old_start)
idx_end = content.find(old_end, idx_start)
if idx_start == -1 or idx_end == -1:
    print("ERROR: Could not find old button")
    # Try a simpler search
    if 'Seed Configured Tournament' in content:
        print("Found 'Seed Configured Tournament' but exact match failed")
    print(content[9900:10500])
else:
    idx_end += len(old_end)
    old_block = content[idx_start:idx_end]
    
    new_block = '''<div className="flex items-center gap-3 mt-2 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={skipEscrow}
                                onChange={e => setSkipEscrow(e.target.checked)}
                                className="w-4 h-4 rounded border-white/30 bg-black/30 accent-cyan-500"
                              />
                              <span className="text-xs text-cyan-400 font-medium">B&#x1ECF; qua Escrow</span>
                            </label>
                            <span className="text-[10px] text-muted-foreground">Khi b&#x1EAD;t, tournament &#x111;&#x1B0;&#x1EE3;c t&#x1EA1;o kh&#x1EDB;ng c&#x1EA7;n escrow</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                          <Button size="sm" variant="outline" className="flex-1 border-amber-500/40 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25"
                            onClick={() => {
                              let parsedPhases = undefined;
                              try { parsedPhases = JSON.parse(simPhasesConfigRaw); } catch (e) { addLog("error", "Invalid JSON config."); return; }
                              handleAutomation("seed-env", { 
                                type: "tournament", skipEscrow,
                                region: getRiotRegion(simRegion), numPlayers: parseInt(simTourPlayers),
                                phasesConfig: parsedPhases
                              });
                            }}>
                            Seed Dummy ({simTourPlayers}P)
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 border-emerald-500/40 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25"
                            onClick={() => {
                              if (!simGameName) { addLog("error", "Nhập Player Name trước"); return; }
                              let parsedPhases = undefined;
                              try { parsedPhases = JSON.parse(simPhasesConfigRaw); } catch (e) { addLog("error", "Invalid JSON config."); return; }
                              handleAutomation("seed-env", { 
                                type: "tournament", skipEscrow,
                                gameName: simGameName, tagLine: simTagLine,
                                gameName2: simGameName2 || undefined, tagLine2: simTagLine2 || undefined,
                                gameName3: simGameName3 || undefined, tagLine3: simTagLine3 || undefined,
                                gameName4: simGameName4 || undefined, tagLine4: simTagLine4 || undefined,
                                region: getRiotRegion(simRegion), numPlayers: parseInt(simTourPlayers),
                                phasesConfig: parsedPhases
                              });
                            }}>
                            Seed từ Player Name
                          </Button>
                          </div>'''
    
    content = content[:idx_start] + new_block + content[idx_end:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Done! Replaced {len(old_block)} chars with {len(new_block)} chars")
