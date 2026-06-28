# Architecture — Face Photo Search

แผนที่ระบบ ทุกไฟล์ในโค้ดต้องหาเจอจากเอกสารนี้

## ภาพรวม flow (Phase 1 — process เดียว ไม่มี Docker/Redis)

```
Canon EOS RP  ──WiFi──▶  image.canon  ──auto-forward──▶  Google Drive
                                                              │
                                                              ▼ (poll ทุก N วินาที, ใน-process)
                                              ┌──────────────────────────────────┐
                                              │  Next.js server (PhotoSearch)    │
                                              │                                  │
                                              │   ┌─ instrumentation.ts (boot)   │
                                              │   ├─ jobs/driveSync (setTimeout) │
                                              │   ├─ jobs/faceProcess (in-queue) │
                                              │   ├─ API routes + UI             │
                                              │   └─ SQLite ไฟล์ ./data          │
                                              └────────────┬─────────────────────┘
                                                           │
   user / admin  ──browser──▶  http://localhost:3000  ◀────┘
```

ไม่มี Redis ไม่มี worker container — รวมเป็น Node process เดียว

---

## ระบบหลัก: Documentation  (root)
- `project-plan.md` — แผนต้นฉบับของโปรเจค (ห้ามแก้ ใช้อ้างอิง)
- `README.md` — quick start สำหรับ Windows/Mac
- `CHANGELOG.md` — บันทึกการเปลี่ยนแปลง
- `ARCHITECTURE.md` — ไฟล์นี้

---

## ระบบหลัก: Project skeleton  (root)
- `package.json` — npm workspaces (เหลือ `apps/web` workspace เดียว)
- `.env` / `.env.example` — environment vars (paths, admin password, ฯลฯ)
- `.gitignore` — ignore node_modules, .env, data/, models/, secrets/

---

## ระบบหลัก: Web app  (`apps/web/`)

Next.js 14 (App Router) + TypeScript + Tailwind — frontend + API + background jobs in one process

### Config/build
- `package.json`, `tsconfig.json`, `next.config.js` (มี webpack externals สำหรับ native deps), `tailwind.config.ts`, `postcss.config.js`

### Pages (App Router)
- `app/layout.tsx` — root layout, inject CSS brand color, wrap children ด้วย `<SetupGate>`
- `app/SetupGate.tsx` *(client)* — fetch `/api/setup/status` → redirect → `/setup` ถ้ายังไม่ตั้งค่า
- `app/globals.css` — Tailwind base
- `app/page.tsx` *(Feed)* — แสดงภาพล่าสุด ใช้ proxy URL `/api/photos/[id]/file?size=thumb`
- `app/search/page.tsx` *(ค้นหา)* — เปิดกล้อง / อัพโหลด → ส่ง selfie → แสดงผล % เหมือน
- `app/photo/[id]/page.tsx` *(ดูภาพ)* — เปิดภาพเต็มผ่าน proxy, ปุ่มดาวน์โหลด
- `app/setup/page.tsx` *(client)* — **Setup Wizard** 4 ขั้น (service account → password → folder → done)
- `app/admin/login/page.tsx` — admin login
- `app/admin/page.tsx` *(server)* — gate auth, render `AdminPanel`
- `app/admin/AdminPanel.tsx` *(client)* — tab switcher
- `app/admin/components/{RunControl,PhotoModeration,DriveBrowser,Branding}.tsx`
- `middleware.ts` — placeholder (gating ทำใน SetupGate client เพราะ middleware รัน edge ไม่มี fs)

### API routes
- `app/api/photos/route.ts` *(GET)* — รายชื่อภาพ
- `app/api/photos/[id]/route.ts` *(GET)* — meta
- `app/api/photos/[id]/file/route.ts` *(GET ?size=thumb)* — **proxy stream** ภาพจาก Drive ผ่าน service account (รองรับ private folder)
- `app/api/search/route.ts` *(POST)* — รับ selfie → embed → match → คืน top-K
- `app/api/admin/login/route.ts` *(POST)* — login → session cookie
- `app/api/admin/folders/route.ts` *(GET)* — list Drive folders
- `app/api/admin/folders/browse/route.ts` *(GET ?parent=)* — browse sub-folder
- `app/api/admin/status/route.ts` *(GET)* — progress + queue stats
- `app/api/admin/start/route.ts` *(POST)* — สร้าง run + เริ่ม drive-sync ใน-process
- `app/api/admin/runs/stop/route.ts` *(POST)* — หยุดงาน + clear queue
- `app/api/admin/runs/sync-now/route.ts` *(POST)* — บังคับ Drive sync ทันที
- `app/api/admin/runs/retry-failed/route.ts` *(POST)* — re-enqueue ภาพที่ fail
- `app/api/admin/photos/route.ts` *(GET)* — list ภาพ (รวม hidden)
- `app/api/admin/photos/[id]/route.ts` *(PATCH hide/pin, DELETE)*
- `app/api/admin/settings/route.ts` *(GET/PUT)* — branding
- `app/api/setup/status/route.ts` *(GET)* — เช็คว่า setup เสร็จยัง
- `app/api/setup/service-account/route.ts` *(POST upload)* — รับไฟล์ + validate + save
- `app/api/setup/save/route.ts` *(POST)* — บันทึก admin password / Drive folder ลง `data/config.json`
- `app/api/admin/tunnel/route.ts` *(GET status, POST start, DELETE stop)* — spawn `cloudflared` เปิด trycloudflare URL

### Lib — shared utilities
- `lib/config.ts` — env loader (typed) + default paths (data/, models/, secrets/)
- `lib/db.ts` — SQLite (better-sqlite3) + schema + helpers (`activeRun`, `listPhotos`, `allEmbeddings`, ฯลฯ) — auto-create dir
- `lib/drive.ts` — Google Drive client (service account auth), `listImagesInFolder`, `listFolders`, `downloadFile`, **`downloadThumbnail(fileId, size)`** — ใช้ภาพ thumbnail สำหรับ embed (เร็วขึ้น 5-10x แทนการดาวน์โหลด full)
- `lib/face.ts` — face-api.js loader + `embedImage()` ที่มี SHA1 cache (50 entries), wasm backend ถ้าได้/ไม่ได้ตก CPU
- `lib/setup.ts` — `readSetup()`/`writeSetup()`/`writeServiceAccount()`/`isSetupComplete()` (อ่าน-เขียน `data/config.json`)
- `lib/tunnel.ts` — spawn/stop cloudflared, capture trycloudflare URL (เก็บ proc/state บน globalThis)
- `lib/queue.ts` — **in-process queue** (ไม่ใช้ BullMQ/Redis) — `faceQueue` (concurrency = CPU-1) + `scheduleDriveSync()`/`cancelDriveSync()` (setTimeout loop) + `clearAll()`
- `lib/boot.ts` — `ensureBooted()` lazy resume active run จาก SQLite ครั้งแรกที่มี admin request เข้า (เรียกจาก `/api/admin/status`)
- `lib/auth.ts` — admin session cookie (iron-session)
- `lib/similarity.ts` — euclidean + similarity %
- `lib/settings.ts` — branding settings DB get/set

### Lib — background jobs  (`lib/jobs/`)
- `jobs/driveSync.ts` — `runDriveSync({runId,folderId,...})` ดึงรายการภาพจาก Drive → enqueue faceProcess + reschedule poll ตัวเอง
- `jobs/faceProcess.ts` — `enqueueFaceProcess()` ใส่ task ใน `faceQueue` → download thumbnail → embed → INSERT SQLite, มี retry 2 ครั้ง

### เชื่อมกับ
- → SQLite (ไฟล์ `apps/web/data/db.sqlite`)
- → Google Drive (service account, scope drive.readonly)
- → face-api models โหลดจาก `<root>/models/`

---

## ระบบหลัก: Models  (`models/`)
- pre-trained ของ face-api.js (ssd_mobilenetv1, face_landmark_68, face_recognition)
- โหลดด้วย `scripts/download-models.ps1` (Windows) — Mac/Linux เวอร์ชันจะเพิ่ม Phase 4

---

## ระบบหลัก: Scripts  (`scripts/`)
- `download-models.js` — **cross-platform** downloader (Node-only ไม่ต้อง bash/pwsh)
- `download-models.ps1` — Windows fallback
- `download-models.sh` — Mac/Linux fallback

---

## ระบบหลัก: Launchers  (root)
- `start.bat` — Windows ดับเบิลคลิก: check Node → install → models → build → start + open browser
- `start.command` — Mac/Linux ดับเบิลคลิก/bash: เหมือนกัน

---

## ระบบหลัก: Secrets  (`secrets/`)
- `service-account.json` — Google service account key (ไม่ commit, ใส่เอง)

---

## Data flow ที่สำคัญ

### A. เริ่มงานใหม่
1. Admin login → `POST /api/admin/login`
2. Admin เลือก folder → กด Start → `POST /api/admin/start`
3. Server สร้าง run row → call `startDriveSyncNow()` → `runDriveSync()` ทำงานใน Node process
4. `runDriveSync` list Drive → INSERT photos → `enqueueFaceProcess()` ต่อภาพใหม่ → reschedule poll
5. `faceQueue` รัน `runFaceProcess` ที่ concurrency CPU-1 → download **thumbnail** → embed → INSERT embeddings
6. Admin poll `GET /api/admin/status` ดู progress

### B. ผู้ใช้ค้นหา
1. หน้า `search` เปิดกล้อง → ถ่าย selfie → ส่ง blob
2. `POST /api/search` รับภาพ → server embed → euclidean vs ทุก embedding (เฉพาะที่ไม่ hidden) → top-K
3. คืน list `{photoId, similarity}` → frontend แสดง grid + %
4. คลิกภาพ → `app/photo/[id]` → ดาวน์โหลด **ภาพเต็มจาก Drive URL** (ไม่ใช่ thumbnail)

### C. Admin จัดการระหว่างงาน
- เปลี่ยน folder กลางทาง: Drive tab → "เริ่มงานที่นี่" → backend หยุด run เดิม + clear queue + สร้าง run ใหม่
- บังคับ sync ทันที: "Sync ภาพใหม่ทันที" → cancel timer + start `runDriveSync` ทันที
- ซ่อน/ลบ/pin: PhotoModeration tab
- branding: Branding tab → settings DB

### D. ปิดโปรแกรม
- Node process หยุด → in-memory queue หาย → SQLite ค้างที่ไฟล์ (สามารถ resume run ที่ status='running' ได้ตอนเปิดใหม่ ผ่าน `instrumentation.ts`)
