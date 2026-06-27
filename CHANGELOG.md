# Changelog

## 2026-06-27 (รอบ 3 — bugfix)
- แก้ build error ใน `apps/worker` — เพิ่ม `overrides` ใน `package.json` บังคับให้ bullmq ใช้ ioredis เวอร์ชันเดียวกับ project เพื่อแก้ TypeScript type conflict

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
