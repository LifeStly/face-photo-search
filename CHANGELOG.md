# Changelog

## 2026-06-28 — Redesign Phase 2/3/4 (Wizard + Speed + Launcher)

### Phase 2 — Setup Wizard
- **เพิ่ม** `apps/web/app/setup/page.tsx` — 4-step wizard (service account upload → admin password → drive folder → done)
- **เพิ่ม** API: `apps/web/app/api/setup/{status,service-account,save}/route.ts`
- **เพิ่ม** `apps/web/lib/setup.ts` — read/write `data/config.json` + validate service-account JSON
- **เพิ่ม** `apps/web/app/SetupGate.tsx` — client gate ที่ redirect → /setup ถ้ายังไม่ตั้ง (ยกเว้น /setup เอง)
- **อัพเดท** `apps/web/app/layout.tsx` — wrap children ด้วย SetupGate
- **อัพเดท** `apps/web/lib/config.ts` — โหลด `data/config.json` ทับ env values
- **อัพเดท** `apps/web/package.json` — เพิ่ม `cross-env DOTENV_CONFIG_QUIET=true` ปิด dotenv ad spam
- **เพิ่ม** `apps/web/middleware.ts` — placeholder (ไม่ใช้ blocking — ทำใน SetupGate client)

### Phase 3 — Speed tuning + Photo proxy
- **เพิ่ม** `apps/web/app/api/photos/[id]/file/route.ts` — server-side proxy stream ภาพจาก Drive (private file ใช้ได้ผ่าน service account auth)
- **อัพเดท** `apps/web/app/photo/[id]/page.tsx` + `apps/web/app/page.tsx` + `apps/web/app/search/page.tsx` — ใช้ proxy URL `/api/photos/[id]/file?size=thumb` แทน `drive.google.com/uc?export=view` (ที่ใช้กับ public file เท่านั้น)
- **เพิ่ม** embed cache (SHA1-keyed Map) ใน `apps/web/lib/face.ts` — ส่ง selfie ซ้ำไม่ embed ใหม่
- **ลอง** register wasm backend (face-api ยัง fallback CPU เพราะ bundle internal — รอ Phase 5)

### Phase 4 — Distribution launcher
- **เพิ่ม** `start.bat` (Windows) + `start.command` (Mac/Linux) — ดับเบิลคลิก → ตรวจ Node → install → download models → build → start + open browser
- **เพิ่ม** `scripts/download-models.js` — cross-platform downloader (node-only, ไม่ต้อง pwsh/bash)
- **เพิ่ม** `scripts/download-models.sh` — Mac/Linux fallback
- **อัพเดท** root `package.json` script `models` → `node scripts/download-models.js`

### URL handling fix
- **อัพเดท** `apps/web/app/photo/[id]/page.tsx` + `apps/web/app/api/photos/[id]/route.ts` + `apps/web/app/api/admin/photos/[id]/route.ts` — `decodeURIComponent(params.id)` กัน `:` ใน photoId (`runId:driveFileId`)
- **อัพเดท** `apps/web/app/search/page.tsx` + `apps/web/app/page.tsx` — `encodeURIComponent(photoId)` ใน Link href

## 2026-06-28 — Redesign Phase 1: Strip Docker + Merge Worker
Goal: ทำให้ "คนทั่วไป" ใช้ได้ — ตัด infrastructure ที่ซับซ้อนออก
- **ลบ** `docker-compose.yml`, `apps/web/Dockerfile`, `apps/worker/Dockerfile`, `.dockerignore`, `systemd/`, `scripts/setup.sh`, `scripts/setup-tunnel.sh`, `scripts/download-models.sh` — Linux/Docker-only ของพวกนี้กั้นทาง Windows/Mac user
- **ลบ workspace** `apps/worker/` ทั้งหมด — รวมเข้า `apps/web` แล้ว
- **เพิ่ม** `apps/web/lib/jobs/driveSync.ts` + `apps/web/lib/jobs/faceProcess.ts` — งาน background รันใน-process
- **เขียนใหม่** `apps/web/lib/queue.ts` — เลิกใช้ BullMQ/Redis ใช้ in-process Queue class เอง (concurrency control + clearAll) + `scheduleDriveSync()`/`cancelDriveSync()` ใช้ setTimeout
- **เพิ่ม** `apps/web/lib/boot.ts` — `ensureBooted()` lazy resume active run ตอน admin request แรก (เลิกใช้ Next instrumentation hook เพราะ webpack bundle native deps พัง)
- **เพิ่ม** webpack externals สำหรับ native deps + googleapis ใน `apps/web/next.config.js`
- **เพิ่ม** `downloadThumbnail()` ใน `apps/web/lib/drive.ts` — ใช้ Drive thumbnail (~200KB) แทน full file (5-10MB) ตอน embed → เร็วขึ้น 5-10x (ดาวน์โหลด full ยังใช้ตอนผู้ใช้กดโหลดภาพ)
- **อัพเดท** `apps/web/lib/config.ts` — เปลี่ยน default paths ให้เป็น local (`./data`, `<root>/models`, `<root>/secrets`) แทน path container, เพิ่ม `face.concurrency` (CPU-1), ลบ `redis.url`
- **อัพเดท** `apps/web/lib/db.ts` — auto-mkdir data dir ถ้ายังไม่มี
- **อัพเดท** `apps/web/lib/drive.ts` — ฟังก์ชัน `downloadThumbnail`
- **เขียนใหม่** `apps/web/app/api/admin/{start,status,runs/stop,runs/sync-now,runs/retry-failed}/route.ts` — ใช้ new queue API (ไม่มี BullMQ types)
- **อัพเดท** `package.json` (root) — เหลือ `apps/web` workspace, ลบ `dev:worker`/`start:worker` scripts, ลบ `bullmq` override
- **อัพเดท** `apps/web/package.json` — ลบ `bullmq`, `ioredis` deps
- **อัพเดท** `.env` + `.env.example` — ลบ `REDIS_URL`, เปลี่ยน paths เป็น local

## 2026-06-27 (รอบ 5 — แก้ /api/search server crash)
- `apps/web/Dockerfile` + `apps/worker/Dockerfile` runtime stage — เพิ่ม `libgomp1` (OpenMP runtime) ที่ `@tensorflow/tfjs-node` ต้องใช้ใน bookworm-slim มิฉะนั้น native addon crash ตอน load → process ตาย ตอบ `ERR_EMPTY_RESPONSE`/`ERR_CONNECTION_RESET`

## 2026-06-27 (รอบ 4 — แก้ web build แตก)
- `apps/web/lib/face.ts` — ย้าย `@tensorflow/tfjs-node`, `@vladmandic/face-api`, `canvas`, `sharp` จาก top-level import เป็น dynamic import ใน `ready()`/`embedImage()` เพราะ `next build` จะ spawn worker (`isPageStatic`) โหลดทุก route module ตอน build — ถ้า route import face.ts แล้ว tfjs-node native addon load ไม่ผ่านบน bookworm-slim worker จะตายเงียบเป็น `Promise.all (index N)` rejection
- เพิ่ม `.dockerignore` ที่ root — กัน `node_modules`/`.next`/`secrets`/`*.sqlite` จาก host หลุดเข้า build context แล้วทับ deps ที่ install ใน base stage

## 2026-06-27 (รอบ 3 — bugfix)
- แก้ build error ใน `apps/worker` — เพิ่ม `overrides` ใน `package.json` บังคับให้ bullmq ใช้ ioredis เวอร์ชันเดียวกับ project เพื่อแก้ TypeScript type conflict
- แก้ `apps/worker/src/driveSync.ts` — สร้าง `driveSyncQueue()` แทนการใช้ `job.queue` ที่เป็น protected ใน BullMQ v5
- แก้ `apps/worker/Dockerfile` — ลบ COPY `apps/worker/node_modules` ออกจาก runner stage เพราะ npm workspaces hoist ทุกอย่างไว้ที่ root `node_modules`

## 2026-06-27 (รอบ 2 — ขยายหน้า Admin)
- ขยาย DB schema: เพิ่ม columns `hidden`, `pinned_at`, `failed_at`, `fail_reason` ใน `photos` + ตาราง `settings(key,value,updated_at)` — ทั้ง `apps/web/lib/db.ts` และ `apps/worker/src/db.ts`
- เพิ่ม `apps/web/lib/settings.ts` — get/set settings (appName, welcomeMessage, brandColor, publicUrl) พร้อม default จาก env
- เพิ่ม API:
  - `POST /api/admin/runs/stop` — หยุดงาน + ลบ job ที่ค้าง
  - `POST /api/admin/runs/sync-now` — บังคับ Drive sync ทันที (ลบ delayed)
  - `POST /api/admin/runs/retry-failed` — re-enqueue ภาพที่ fail
  - `GET /api/admin/photos` — list ภาพทั้งหมด (รวม hidden) สำหรับ moderation
  - `PATCH /api/admin/photos/[id]` — hide/pin
  - `DELETE /api/admin/photos/[id]` — ลบจาก DB (ไฟล์บน Drive ไม่ถูกแตะ)
  - `GET /api/admin/settings` + `PUT /api/admin/settings` — branding
  - `GET /api/admin/folders/browse?parent=` — browse sub-folder
- แตก `apps/web/app/admin/AdminPanel.tsx` เป็น 4 tabs:
  - `components/RunControl.tsx` — สถานะงาน + sync-now/retry/stop
  - `components/PhotoModeration.tsx` — grid ภาพ + hide/pin/delete + filter (all/pinned/hidden/failed)
  - `components/DriveBrowser.tsx` — ไล่ folder/sub-folder, switch active folder (มี confirm), แสดงงานที่กำลังรัน
  - `components/Branding.tsx` — form ชื่องาน/สี/ข้อความ + QR code + copy URL
- เพิ่ม dep `qrcode.react` ใน `apps/web/package.json`
- ปรับ `tailwind.config.ts` ให้ `brand` ใช้ CSS var → `apps/web/app/layout.tsx` inject `--brand` จาก settings DB ตอน render (เปลี่ยนสีได้จากหน้า admin โดยไม่ต้อง build)
- ปรับ `apps/web/app/page.tsx` (Feed) แสดง `welcomeMessage` + badge "PIN" บนภาพที่ pinned
- ปรับ `apps/web/lib/db.ts:listPhotos` — sort ด้วย `pinned_at` ก่อน, exclude `hidden` (มี opt `includeHidden`)
- ปรับ `apps/web/lib/db.ts:allEmbeddings` — exclude ภาพที่ hidden จากการค้นหา (selfie ค้นจะไม่เจอภาพที่ admin ซ่อน)
- ปรับ worker `apps/worker/src/index.ts` — บันทึก `failed_at`+`fail_reason` ลง `photos` ตอน attempt สุดท้าย fail

## 2026-06-27
- เริ่มต้นโครงสร้างโปรเจค Face Photo Search ตาม `project-plan.md`
- เพิ่ม `CHANGELOG.md` และ `ARCHITECTURE.md` ที่ root — บันทึก/แผนที่ระบบตาม global rule
- เพิ่ม `package.json` (npm workspaces) ที่ root — รวม `apps/web` + `apps/worker`
- เพิ่ม `docker-compose.yml` ที่ root — รัน web + worker + redis พร้อมกัน
- เพิ่ม `.env.example` และ `.gitignore` ที่ root
- สร้าง `apps/web/` (Next.js 14 + App Router + Tailwind + TypeScript)
  - หน้า Feed `app/page.tsx`, หน้าค้นหา `app/search/page.tsx`, หน้าดูภาพ `app/photo/[id]/page.tsx`
  - หน้า Admin `app/admin/page.tsx` + login `app/admin/login/page.tsx`
  - API: `api/photos`, `api/photos/[id]`, `api/search`, `api/admin/*`
  - Lib: `lib/db.ts` (SQLite in-memory), `lib/drive.ts` (Google Drive), `lib/face.ts` (face-api), `lib/queue.ts` (BullMQ), `lib/auth.ts` (admin auth)
- สร้าง `apps/worker/` (BullMQ worker)
  - `src/index.ts` entry, `src/driveSync.ts` poller, `src/faceProcess.ts` embedding pipeline, `src/queue.ts` worker
- เพิ่ม `scripts/setup-tunnel.sh`, `scripts/download-models.sh`, `scripts/setup.sh`
- เพิ่ม `systemd/photo-app.service` + `systemd/README.md` — auto-start เมื่อ VM boot
- เพิ่ม `README.md` ที่ root — quick start + workflow + dev mode
- ปรับ `docker-compose.yml`: เปลี่ยน volume `app-data` เป็น tmpfs — เก็บ SQLite shared ระหว่าง web/worker แต่หายเมื่อ container/VM หยุด (เทียบเท่า in-memory ตามแผน)
- ปรับ default `SQLITE_PATH=/data/db.sqlite` (จากเดิม `:memory:`) เพราะ in-memory ใช้ข้าม process ไม่ได้
- รวม FolderPicker+ProgressPanel เป็นไฟล์เดียว `apps/web/app/admin/AdminPanel.tsx` — ลดความซับซ้อน ไม่มี state ข้าม component
