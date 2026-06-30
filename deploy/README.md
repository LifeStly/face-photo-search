# Deploy — Face Photo Search (SaaS edition)

คู่มือ deploy บน Linux VPS (แนะนำ Hetzner CX22 หรือ DigitalOcean Droplet 2GB+)

## ภาพรวม

```
Internet → Caddy (HTTPS + Let's Encrypt) → Next.js (localhost:3000) → SQLite
                                                                  ↓
                                                              Google Drive
                                                              (per-tenant SA/OAuth)
```

## ก่อนเริ่ม
- โดเมนชี้ A record มาที่ IP server แล้ว
- Server มี Ubuntu 22.04+ / Debian 12+ (Node 20+, npm)
- เปิดพอร์ต 80 + 443 ใน firewall

## 1. สร้าง user + clone code

```bash
sudo useradd -r -m -s /bin/bash -d /opt/face-photo-search facephoto
sudo -u facephoto -i
git clone <repo-url> /opt/face-photo-search
cd /opt/face-photo-search
npm install
npm run models  # ดาวน์โหลด face-api models
npm run build
```

## 2. ตั้ง .env

```bash
sudo -u facephoto cp .env.example .env
sudo -u facephoto vi .env
```

แก้:
- `APP_MODE=saas`
- `SESSION_SECRET=<64 hex chars>` (`openssl rand -hex 32`)
- `ADMIN_PASSWORD=` ปล่อยว่าง (saas ไม่ใช้)
- `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI` ถ้าจะเปิด OAuth ให้ tenant
  - REDIRECT_URI = `https://your-domain.com/api/oauth/google/callback`

## 3. ติดตั้ง Caddy + systemd

```bash
# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# คัดลอก config
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/your-domain.com/<โดเมนจริง>/g' /etc/caddy/Caddyfile
sudo systemctl reload caddy

# systemd unit
sudo cp deploy/face-photo-search.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now face-photo-search
```

## 4. ตั้งค่าครั้งแรก

เปิด `https://<โดเมน>` → Setup Wizard จะเด้งให้สร้าง super-admin คนแรก

จากนั้น login เข้า `/super` → กด "+ สร้าง Tenant" สร้างผู้เช่าคนแรก พร้อม:
- ชื่อ + slug
- วันหมดอายุ (ตั้งหรือเว้นว่าง)
- Quota (ภาพ/เดือน, ค้นหา/เดือน, Storage GB)
- บัญชี tenant-admin คนแรก (username + password)

ส่ง credential ให้ผู้เช่า → ผู้เช่า login ที่ `/admin/login` → เข้า `/admin` จัดการ folder/QR/etc.

## 5. ตั้ง Google OAuth (ถ้าให้ tenant ใช้ OAuth)

1. console.cloud.google.com → APIs & Services → OAuth consent screen
   - User type: External (หรือ Internal ถ้า workspace)
   - Scope: `https://www.googleapis.com/auth/drive.readonly`
   - Publishing status: Testing (จำกัด 100 user) หรือ In production (ต้องผ่าน verification)
2. Credentials → Create credentials → OAuth client ID
   - Type: Web application
   - Authorized redirect URI: `https://<โดเมน>/api/oauth/google/callback`
3. ใส่ Client ID + Secret ลง `.env` → restart service

## 6. Backup

แนะนำ cron backup ของ:
- `/opt/face-photo-search/data/` (DB + config)
- `/opt/face-photo-search/secrets/` (SA files per tenant)

ตัวอย่าง:
```bash
# /etc/cron.daily/face-photo-search-backup
0 3 * * * tar czf /backups/fps-$(date +%F).tar.gz -C /opt/face-photo-search data secrets
```

## Troubleshoot

| อาการ | สาเหตุที่น่าจะใช่ |
|---|---|
| 502 Bad Gateway | service ไม่รัน → `systemctl status face-photo-search` |
| Let's Encrypt fail | port 80 ปิด หรือ DNS ยังไม่ propagate |
| OAuth no_refresh_token | tenant เคยกด consent แล้ว → revoke ที่ myaccount.google.com/permissions ก่อน retry |
| face-api model error | `npm run models` ยังไม่ได้รัน |
| RAM โดน OOM kill | tenant มีภาพเยอะ → upgrade VPS หรือลด `FACE_CONCURRENCY` |
