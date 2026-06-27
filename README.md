# Face Photo Search

เว็บแอปค้นหาภาพจากใบหน้า — ผู้เข้าร่วมงานถ่าย selfie แล้วเจอภาพตัวเองจากกองภาพช่างภาพได้ทันที

ดู `project-plan.md` (วิสัยทัศน์/scope) และ `ARCHITECTURE.md` (แผนที่ไฟล์)

## Quick start (Ubuntu VM)

```bash
# 1. clone โปรเจคไปที่ /opt/face-photo (หรือที่ใดก็ได้)
# 2. setup
bash scripts/setup.sh

# 3. แก้ .env: ADMIN_PASSWORD, SESSION_SECRET, DRIVE_DEFAULT_FOLDER_ID
# 4. วาง Google service account key ที่ secrets/service-account.json

# 5. รัน
docker compose up -d

# 6. ตั้ง Cloudflare Tunnel
HOSTNAME=photos.example.com bash scripts/setup-tunnel.sh

# 7. ตั้ง auto-start เมื่อ VM boot
sudo cp systemd/photo-app.service /etc/systemd/system/
sudo systemctl enable --now photo-app.service
```

เปิด `https://<HOSTNAME>` → Feed / Search / Admin

## Workflow ใช้งานจริง

1. เปิด VM (Docker + Tunnel เริ่มอัตโนมัติ)
2. เข้า `/admin/login` → ใส่ ADMIN_PASSWORD
3. เลือก folder Drive ของงาน → กดเริ่ม
4. แชร์ URL หรือ QR code ให้แขก
5. ปิดงาน → ปิด VM (embedding หาย ภาพต้นฉบับยังอยู่บน Drive)

## Dev บนเครื่องตัวเอง

```bash
# ที่ root
npm install

# ดาวน์โหลด face-api models
npm run models

# ใช้ Redis ผ่าน docker
docker run -d -p 6379:6379 --name fps-redis redis:7-alpine

# terminal 1
npm run dev:web

# terminal 2
npm run dev:worker
```

Dev .env: ตั้ง `SQLITE_PATH=./data/db.sqlite` (เพราะไม่ผ่าน docker tmpfs) และ `FACE_MODELS_PATH=./models`
