# Face Photo Search

เว็บแอปค้นหาภาพจากใบหน้า — ผู้เข้าร่วมงานถ่าย selfie แล้วเจอภาพตัวเองจากกองภาพช่างภาพได้ทันที

## 🚀 เริ่มใช้งานเร็ว — Windows / Mac

ต้องมี **Node.js 20+** ([ดาวน์โหลด](https://nodejs.org/))

### Windows
ดับเบิลคลิก **`start.bat`** → จะทำให้อัตโนมัติ:
1. ติดตั้ง dependencies (ครั้งแรก ~2 นาที)
2. ดาวน์โหลด face-api models (~30MB ครั้งเดียว)
3. Build production
4. เปิด server + browser ที่ `http://localhost:3000`

ครั้งต่อๆ ไป รันแค่ start ใหม่จะใช้เวลาไม่กี่วินาที

### Mac
เปิด Terminal → `bash start.command` (หรือดับเบิลคลิกถ้าตั้ง executable ไว้)

### Linux
`bash start.command`

---

## 🧙 Setup Wizard

ครั้งแรกที่เปิด `http://localhost:3000` — จะถูก redirect ไปที่ `/setup` อัตโนมัติ

3 ขั้นตอนเสร็จในไม่กี่นาที:
1. **ลาก Google service-account.json มาวาง** (ไป [Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) สร้าง service account + enable Drive API)
2. **ตั้งรหัสผ่าน admin**
3. **เลือก folder Drive** — ระบบจะ list folder ที่ service account เข้าได้ หรือ paste link folder เอง

> อย่าลืม **แชร์ Drive folder** กับ email ของ service account (สิทธิ์ Viewer พอ)

---

## Workflow ใช้งานจริง

1. รัน `start.bat`/`start.command`
2. เข้า `/admin/login` ด้วยรหัสที่ตั้งใน setup
3. ไปแท็บ Drive → เลือก folder งาน → "เริ่มงานที่นี่"
4. รอ embed (~5 วินาที/ภาพ ใน CPU mode)
5. แชร์ URL `http://<ip-เครื่องคุณ>:3000` หรือ QR code ให้แขก
6. แขกเข้า `/search` ถ่าย selfie → เจอภาพตัวเอง

## หน้าจอ

| URL | คือ |
|---|---|
| `/` | Feed ภาพล่าสุด |
| `/search` | ผู้ใช้ถ่าย selfie / อัพภาพ → ค้นหา |
| `/photo/[id]` | ภาพเต็ม + ดาวน์โหลด |
| `/admin/login` + `/admin` | กล้องควบคุม |
| `/setup` | Setup wizard (auto redirect ถ้ายังไม่ตั้ง) |

## โครงสร้างไฟล์

ดู [`ARCHITECTURE.md`](./ARCHITECTURE.md) — แผนที่ทุกไฟล์ในโค้ด

## ประวัติการเปลี่ยนแปลง

ดู [`CHANGELOG.md`](./CHANGELOG.md)

---

## Dev mode

```powershell
npm install
npm run models      # download face-api models
npm run dev         # next dev at port 3000
```

## Tech stack
- Next.js 14 (App Router) — UI + API routes
- SQLite (better-sqlite3) — local file, no server
- face-api.js (vladmandic) + @tensorflow/tfjs-wasm
- @napi-rs/canvas (prebuilt, no native compile)
- googleapis (Drive API via service account)
- In-process job queue (ไม่มี Redis/Docker)
