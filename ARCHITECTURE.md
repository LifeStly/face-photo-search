# Architecture — Face Photo Search

แผนที่ระบบ ทุกไฟล์ในโค้ดต้องหาเจอจากเอกสารนี้

## ภาพรวม flow

```
Canon EOS RP  ──WiFi──▶  image.canon  ──auto-forward──▶  Google Drive
                                                              │
                                                              ▼ (poll)
                                                  ┌──────────────────────┐
                                                  │  Worker (BullMQ)     │
                                                  │  - drive sync        │
                                                  │  - face embedding    │
                                                  └─────────┬────────────┘
                                                            │ write
                                                            ▼
                                                  ┌──────────────────────┐
                                                  │  SQLite (in-memory)  │
                                                  │  photos + embeddings │
                                                  └─────────┬────────────┘
                                                            │ read
                                                            ▼
   user / admin  ──Cloudflare Tunnel──▶  Next.js (web)  ──BullMQ──▶  Redis
```

---

## ระบบหลัก: Documentation  (root)
- `project-plan.md` — แผนต้นฉบับของโปรเจค (ห้ามแก้ ใช้อ้างอิง)
- `README.md` — quick start สำหรับ Ubuntu VM + workflow ใช้งาน + dev mode
- `CHANGELOG.md` — บันทึกการเปลี่ยนแปลง
- `ARCHITECTURE.md` — ไฟล์นี้

---

## ระบบหลัก: Project skeleton  (root)
- `package.json` — npm workspaces รวม `apps/web` + `apps/worker`
- `docker-compose.yml` — รัน web, worker, redis พร้อมกัน
- `.env.example` — ตัวอย่าง environment variables (Drive credentials, admin password, redis url, ฯลฯ)
- `.gitignore` — ignore node_modules, .env, models, etc.
- `.dockerignore` — กัน node_modules/secrets/sqlite/.next จากเครื่อง host หลุดเข้า docker build context

---

## ระบบหลัก: Web  (`apps/web/`)

Next.js 14 (App Router) + TypeScript + Tailwind — frontend + API routes

### Config/build
- `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `Dockerfile`

### Pages (App Router)
- `app/layout.tsx` — root layout, global nav
- `app/globals.css` — Tailwind base
- `app/page.tsx` *(Feed)* — แสดงภาพล่าสุดจากงาน, toggle "ภาพหมู่"
- `app/search/page.tsx` *(ค้นหา)* — เปิดกล้อง / อัพโหลด → ส่ง embedding → แสดงผล % ความเหมือน
- `app/photo/[id]/page.tsx` *(ดูภาพ)* — เปิดภาพเต็ม, ปุ่มดาวน์โหลด, แชร์
- `app/admin/login/page.tsx` — login ป้องกัน admin
- `app/admin/page.tsx` *(server)* — gate auth, render `AdminPanel`
- `app/admin/AdminPanel.tsx` *(client)* — tab switcher (Run/Photos/Drive/Branding)
- `app/admin/components/RunControl.tsx` — สถานะ + ปุ่ม sync-now/retry/stop
- `app/admin/components/PhotoModeration.tsx` — grid + hide/pin/delete + filter
- `app/admin/components/DriveBrowser.tsx` — ไล่ folder Drive + switch active
- `app/admin/components/Branding.tsx` — form ตั้งค่าแบรนด์ + QR + copy URL

### API routes  
- `app/api/photos/route.ts` *(GET)* — รายชื่อภาพ (paginate, filter)
- `app/api/photos/[id]/route.ts` *(GET)* — meta ภาพเดี่ยว + URL ดาวน์โหลด
- `app/api/search/route.ts` *(POST)* — รับ embedding selfie → ค้นในฐาน → คืน match
- `app/api/admin/login/route.ts` *(POST)* — admin login → session cookie
- `app/api/admin/folders/route.ts` *(GET)* — list Drive folders ระดับ root
- `app/api/admin/folders/browse/route.ts` *(GET ?parent=)* — browse sub-folder
- `app/api/admin/status/route.ts` *(GET)* — progress + system stats (redis ping)
- `app/api/admin/start/route.ts` *(POST)* — สร้าง run + enqueue `drive-sync`
- `app/api/admin/runs/stop/route.ts` *(POST)* — หยุดงาน + ลบ job ที่ค้าง
- `app/api/admin/runs/sync-now/route.ts` *(POST)* — บังคับ Drive sync ทันที
- `app/api/admin/runs/retry-failed/route.ts` *(POST)* — re-enqueue ภาพที่ fail
- `app/api/admin/photos/route.ts` *(GET)* — list ภาพ (รวม hidden)
- `app/api/admin/photos/[id]/route.ts` *(PATCH hide/pin, DELETE)*
- `app/api/admin/settings/route.ts` *(GET/PUT)* — branding

### Lib (shared utilities)
- `lib/db.ts` — SQLite (better-sqlite3), schema: `photos`, `embeddings`, `runs`, `settings` (โหลด schema อัตโนมัติ ไม่ต้อง migrate)
- `lib/drive.ts` — Google Drive client (service account auth, list/download/stream)
- `lib/face.ts` — face-api.js loader + embedding helper (server-side, @vladmandic/face-api). **Native deps (`tfjs-node`/`face-api`/`canvas`/`sharp`) เป็น dynamic import ใน `ready()`/`embedImage()` เท่านั้น** — ห้าม top-level import มิฉะนั้น `next build` (isPageStatic worker) จะ crash ตอนโหลด route module
- `lib/queue.ts` — BullMQ queue + job factory (`face-process`, `drive-sync`)
- `lib/auth.ts` — admin session + cookie helpers (iron-session)
- `lib/similarity.ts` — euclidean distance + similarity %
- `lib/settings.ts` — read/write tablesettings (appName, welcomeMessage, brandColor, publicUrl) พร้อม default จาก env
- `lib/config.ts` — env loader (typed)

### เชื่อมกับ
- → Worker (ผ่าน BullMQ/Redis): web `POST /api/admin/start` สร้าง job `drive-sync` ให้ worker
- → SQLite: web อ่าน embeddings ทำการค้น, worker เขียน
- → Google Drive: web ใช้ download URL ส่งกลับ user

---

## ระบบหลัก: Worker  (`apps/worker/`)

Background processor — ดึงภาพจาก Drive และสร้าง face embedding

### Config/build
- `package.json`, `tsconfig.json`, `Dockerfile`

### Source
- `src/index.ts` — entry: เปิด queue listener, register processors
- `src/driveSync.ts` *(processor: `drive-sync`)* — poll Drive folder → enqueue `face-process` ต่อภาพ
- `src/faceProcess.ts` *(processor: `face-process`)* — download → sharp resize → face-api detect+embed → write SQLite
- `src/queue.ts` — BullMQ Worker setup (เชื่อม redis)
- `src/db.ts` — เปิด SQLite connection (shared file-mode สำหรับ worker↔web ผ่าน volume `/data/db.sqlite` ซึ่ง mount เป็น tmpfs ใน docker-compose)
- `src/drive.ts` — same client เหมือน `apps/web/lib/drive.ts` แต่ stand-alone (จะ refactor เป็น shared package ทีหลังถ้าจำเป็น)
- `src/face.ts` — face-api loader + embedImage (server-side, @vladmandic/face-api + tfjs-node)
- `src/config.ts` — env loader (typed)

### เชื่อมกับ
- ← Redis (BullMQ): รับ job จาก web
- → Google Drive: ดึงไฟล์ภาพ (binary stream)
- → SQLite: เขียน embedding กลับ
- ← face-api models: `models/` (โหลดมาก่อนผ่าน `scripts/download-models.sh`)

---

## ระบบหลัก: Models  (`models/`)
- ไฟล์ pre-trained ของ face-api.js (ssd_mobilenetv1, face_landmark_68, face_recognition)
- โหลดด้วย `scripts/download-models.sh`
- mount เข้า web + worker container

---

## ระบบหลัก: Scripts  (`scripts/`)
- `setup.sh` — one-shot: ติดตั้ง deps + ดาวน์โหลด model + start docker
- `download-models.sh` — ดาวน์โหลด face-api weights
- `setup-tunnel.sh` — สร้าง Cloudflare named tunnel

---

## ระบบหลัก: Systemd  (`systemd/`)
- `photo-app.service` — auto-start `docker compose up` เมื่อ VM boot
- `README.md` — วิธีติดตั้ง unit + จุดผูกกับ Cloudflare Tunnel
- `cloudflared.service` (managed โดย cloudflared installer) — auto-start tunnel

---

## Data flow ที่สำคัญ

### A. เริ่มงานใหม่
1. Admin login → `POST /api/admin/login`
2. Admin เลือก folder → `POST /api/admin/folders`
3. Admin กด Start → `POST /api/admin/start` → enqueue `drive-sync`
4. Worker `driveSync.ts` list ไฟล์ → enqueue `face-process` ต่อภาพ
5. Worker `faceProcess.ts` download/resize/embed → INSERT SQLite
6. Admin poll `GET /api/admin/status` ดู progress

### B. ผู้ใช้ค้นหา
1. หน้า `search` เปิดกล้อง → ถ่าย selfie → ส่ง blob (หรือ embed ฝั่ง client ก็ได้)
2. `POST /api/search` รับภาพ → server สร้าง embedding → euclidean vs ทุก embedding (เฉพาะภาพที่ไม่ hidden) → top-K
3. คืน list `{photoId, similarity}` → frontend แสดง grid + % ความเหมือน
4. คลิกภาพ → `app/photo/[id]` → ดาวน์โหลดจาก Drive URL

### D. Admin จัดการระหว่างงาน
- เปลี่ยน folder กลางทาง: tab Drive → browse → "เริ่มงานที่นี่" → backend หยุด run เดิม + สร้าง run ใหม่ + enqueue drive-sync
- บังคับ sync ภาพใหม่: tab ควบคุมงาน → "Sync ภาพใหม่ทันที"
- ซ่อน/ลบภาพ: tab จัดการภาพ → hide (เหลือใน DB แต่ไม่โผล่ใน Feed/Search), delete (ลบจาก DB — ภาพต้นฉบับบน Drive ไม่ถูกแตะ ถ้า sync รอบหน้าจะเอามา process ใหม่)
- pin ภาพไว้บนสุด Feed: tab จัดการภาพ → pin (sort `pinned_at DESC` ก่อน)
- เปลี่ยนหน้าตา: tab ตั้งค่าหน้าเว็บ → ชื่อ/ข้อความ/สี/URL — บันทึกแล้วรีเฟรชหน้าผู้ใช้เห็นทันที (CSS var injected ใน layout)
- แชร์ให้แขก: tab ตั้งค่าหน้าเว็บ → QR code + copy URL

### C. ปิด VM
- Container หยุด → SQLite in-memory หาย → ภาพต้นฉบับ + ลิงก์ใน Drive ครบ
