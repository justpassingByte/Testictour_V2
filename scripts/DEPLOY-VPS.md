# VPS Auto-Deploy Setup

Push lên `main` → GitHub Actions tự SSH vào VM chạy deploy. Không cần mở VM gõ lệnh.

## 1. Trên VM — một lần duy nhất

```bash
cd /data/projects/Testictour_V2
git remote -v
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

## 2. GitHub Secrets (Settings → Secrets → Actions)

| Secret | Ví dụ |
|--------|--------|
| `VPS_HOST` | IP hoặc domain |
| `VPS_USER` | `justpassingbyte03` |
| `VPS_SSH_KEY` | Private key SSH |
| `VPS_SSH_PORT` | `22` (optional) |
| `VPS_PROJECT_PATH` | `/data/projects/Testictour_V2` (optional) |

Tạo key trên VM:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy   # → paste vào VPS_SSH_KEY
```

## 3. Hàng ngày

```bash
git push origin main   # tự deploy
```

Manual: GitHub → Actions → Deploy to VPS → Run workflow

## 4. Hotfix DB không build

```bash
SKIP_BUILD=1 ./scripts/deploy-vps.sh
```
