# Changelog

## 2026-06-30 — แยก role nav ใน header: guest 2 เมนู / admin 3 เมนู + ยุบ admin tabs จาก 5 → 3
- **แก้** `apps/web/app/components/Header.tsx` — เพิ่ม `isAdminScope` (path `/admin/*` ยกเว้น `/admin/login`); render 3 modes:
  - Admin: nav 3 เมนู (Folders / ภาพ / ตั้งค่า) + badge "ADMIN" ติด brand + ปุ่ม logout icon — link ไป `?tab=` query ของ AdminPanel
  - Guest (live/event/search/photo): nav 2 เมนู (Feed / ค้นหา)
  - Welcome/default: nav 1 (Admin entry)
  - `useSearchParams()` ใช้ Suspense boundary + fallback shell
- **เขียนใหม่** `apps/web/app/admin/AdminPanel.tsx` — ตัด internal tab strip ออก; URL `?tab=folders|photos|settings` ขับ state (`useSearchParams`); ยุบเดิม 5 tabs → 3:
  - `folders` = `DriveBrowser` (Drive folder + Live/Archive + QR)
  - `photos` = `RunControl` + `PhotoModeration` รวมกัน
  - `settings` = `Branding` + `SetupTab` รวมกัน
  - เพิ่ม subtitle อธิบายแต่ละ section, header section ใหญ่ขึ้น
- **แก้** `apps/web/app/admin/page.tsx` — wrap `<AdminPanel />` ใน `<Suspense>` (Next.js requirement สำหรับ `useSearchParams`)

## 2026-06-30 — Live folder ได้ UX แบบ event scope: ซ่อน Admin + tour + auto-enable QR
- **เพิ่ม** `apps/web/lib/event.ts` — helper `ensureEventCodeForFolder(folderId)`: reuse code เดิม / สร้างใหม่แบบ public; refactor logic จาก qr/route.ts ไม่ duplicate
- **แก้** `apps/web/app/api/admin/start/route.ts` — ตอน mode=live → auto call `ensureEventCodeForFolder` ทำให้ QR เปิดเองอัตโนมัติ (admin ไม่ต้องไปกดเปิดอีกที่ QRPanel); response เพิ่ม `qrCode` + `qrCreated`
- **แก้** `apps/web/app/api/admin/folders/[folderId]/toggle-live/route.ts` — toggle Archive→Live ก็ ensure QR ด้วย (Archive→Live เปิด QR ให้, Live→Archive ไม่แตะ QR เพื่อรักษา code เดิม)
- **แก้** `apps/web/app/components/Header.tsx` — ซ่อนปุ่ม Admin ใน path `/live/*` และ `/search` (guest scope ขยายจาก event อย่างเดียว); navigation เหลือแค่ Feed + ค้นหา 2 เมนู
- **เขียนใหม่** `apps/web/app/live/page.tsx` — restyle เหมือน `/event/[code]`: LIVE badge สีเขียวเต้น, heading ใหญ่ tracking-tight, ปุ่ม "เปิดใน Google Drive" + "ค้นหาภาพตัวเอง" pill, `<FirstVisitTour />` แสดงครั้งแรก, empty state ที่สวยขึ้นเมื่อยังไม่มี Live run

## 2026-06-30 — เพิ่มปุ่ม "เปิดใน Google Drive" — guest กดไปดู/โหลดจาก Drive ต้นทางได้
- **เพิ่ม** icons `IconExternal`, `IconDrive`, `IconFolderOpen` ใน `apps/web/app/components/icons.tsx`
- **แก้** `apps/web/app/event/[code]/page.tsx` — header เพิ่มปุ่ม "เปิดใน Google Drive" (`https://drive.google.com/drive/folders/{folderId}`) ข้างปุ่มค้นหา; mobile ย่อข้อความเหลือ "Drive"
- **แก้** `apps/web/app/event/[code]/photo/[id]/page.tsx` + `apps/web/app/photo/[id]/page.tsx` — เปลี่ยน layout ปุ่มเป็น pill style + Drive link มี IconExternal นำหน้า
- **หมายเหตุ**: ปุ่มจะ work สำหรับ guest ต่อเมื่อ folder บน Drive ตั้ง share "Anyone with the link" — ถ้ายังเป็น private จะเห็น Google access denied (admin decide เอง)

## 2026-06-30 — Visual: ปรับ UI ทั้งระบบให้ดูสมัย ลดการใช้ emoji ใช้ SVG icon แทน + camera viewport ทรงวงกลม
- **เพิ่ม** `apps/web/app/components/icons.tsx` — SVG icon set (Camera, Upload, Download, Search, Check, ArrowLeft/Right, X, Refresh, User, FaceFrame, Image, Sparkles, Shield, QR, ChevronRight) — stroke style สม่ำเสมอ, ใช้ `currentColor` เข้ากับธีม
- **แก้** `apps/web/app/event/[code]/search/page.tsx` — **camera viewport เป็นวงกลม** (rounded-full, aspect-square, max 320px); มี gradient glow + ring shadow + face-frame placeholder ตอนกล้องปิด, dashed circle overlay ตอน streaming; mirror video เป็น selfie-feel; ปุ่ม Camera/Upload เป็น pill มี icon นำ; result grid: hover scale ภาพนิ่มๆ, % similarity เป็น pill black-translucent มุมขวาล่าง
- **แก้** `apps/web/app/PhotoGrid.tsx` — card style ใหม่ rounded-xl + ring transition + hover scale + checkmark icon (ไม่ใช้ "✓" ตัวอักษร), badge เป็น pill, download bar มี avatar นับเลขกลม
- **แก้** `apps/web/app/components/Header.tsx` — brand logo เป็น gradient square + sparkles icon, nav links เป็น pill มี icon, active state hilight bg-brand/10; ซ่อน text บน mobile (เหลือ icon)
- **แก้** `apps/web/app/components/FirstVisitTour.tsx` — แทน emoji ขนาดใหญ่ด้วย rounded-2xl gradient square + icon (Sparkles/Camera/Check/Download); ปุ่ม X มุมขวาบน; ปุ่ม prev/next เป็น pill + icon arrows
- **แก้** `apps/web/app/components/SearchSpinner.tsx` — แทน 🔍 ด้วย `IconSearch`, step checkmarks ใช้ `IconCheck` ไม่ใช่ "✓"
- **แก้** `apps/web/app/event/[code]/page.tsx` — heading ใหญ่ขึ้น (text-3xl tracking-tight) + Image icon นับภาพ + ปุ่ม "ค้นหาภาพตัวเอง" pill + Camera icon
- **แก้** `apps/web/app/page.tsx` (welcome) — hero icon ทรง rounded gradient + sparkles, 3 cards มี icon ตัวกลม + heading ที่ดูคลีนกว่า; ปุ่มเป็น pill มี chevron

## 2026-06-30 — UX: ย้าย Cloudflare tunnel ไว้ banner บนสุดของ Admin + QR auto-detect tunnel URL
- **เพิ่ม** `apps/web/app/admin/components/PublicAccessBanner.tsx` — banner บนสุดทุก tab; สถานะ stopped → CTA สีเหลืองเด่น "เปิด Public URL ก่อน"; สถานะ running → แถบเขียวเล็กบอก URL + คัดลอก + ปิด
- **แก้** `apps/web/app/admin/AdminPanel.tsx` — render `<PublicAccessBanner />` ก่อน tab strip
- **แก้** `apps/web/app/admin/components/QRPanel.tsx` — poll `/api/admin/tunnel` ทุก 5s; ถ้า tunnel running → ใช้ tunnel URL เป็น base ของ QR (ไม่ใช้ `window.location.origin`); ถ้ายังไม่เปิด tunnel + admin browse จาก localhost → แสดง warning amber ในการ์ด QR ชี้ให้กด banner ด้านบน; ถ้าใช้ tunnel → แสดงบรรทัดเขียวยืนยัน

## 2026-06-30 — UX: เพิ่ม first-visit tour popup สำหรับ QR-guest ครั้งแรก
- **เพิ่ม** `apps/web/app/components/FirstVisitTour.tsx` *(client)* — modal 4 ขั้น (welcome → ค้นหา selfie → เลือกหลายภาพ → ดาวน์โหลด); progress dots + ปุ่ม prev/next + ปุ่ม "ข้ามทัวร์"; เก็บ `fps_event_tour_v1` ใน localStorage → ครั้งหน้าไม่โผล่อีก (versioned key เผื่อ redesign จะ retrigger)
- **แก้** `apps/web/app/event/[code]/page.tsx` — render `<FirstVisitTour />` ตอน mount (โผล่หลัง EventGate ผ่านแล้ว → user ที่ scan QR เห็นทันที)

## 2026-06-30 — Tune face detection: เจอภาพมากขึ้น (มุมหันข้าง/แสงไม่ดี) + ปุ่มประมวลผลใหม่
- **แก้** `apps/web/lib/face.ts` — `minConfidence` 0.5 → 0.3 + `maxResults: 20`; SSD MobileNet จะจับหน้าที่หันข้าง/อยู่ไกล/แสงไม่ดี ได้มากขึ้น (แลกกับ false positive เล็กน้อย)
- **แก้** `apps/web/lib/jobs/faceProcess.ts` — Drive thumbnail 1024 → **1920px**; descriptor คุณภาพดีขึ้น → distance ระหว่างคนเดียวกันแคบลง → match threshold 0.6 จับได้มากขึ้น
- **แก้** `apps/web/.env` — `FACE_RESIZE_WIDTH` 800 → 1280; ให้ detector ทำงานบนภาพใหญ่ขึ้น
- **เพิ่ม** `apps/web/app/api/admin/runs/reprocess/route.ts` *(POST {folderId})* — ล้าง embeddings + reset processed/failed + flip status='running' + re-enqueue ทุก photo; ใช้หลังปรับ tune (ไม่กระทบ archive runs ที่ status='completed' เพราะ flip กลับให้)
- **แก้** `apps/web/app/admin/components/DriveBrowser.tsx` — เพิ่มปุ่ม "🔁 ประมวลผลใบหน้าใหม่ทั้งหมด" ใน expanded folder card (มี confirm popup); หลังกด face queue จะ re-process ทุกภาพด้วย params ใหม่


- **เพิ่ม** `apps/web/app/components/SearchSpinner.tsx` — การ์ดแสดง spinner: วงแหวนหมุน + แว่นขยาย + scan-line, indeterminate progress bar, step-list cycling 4 ขั้น (อัปโหลด → ตรวจจับใบหน้า → เปรียบเทียบ → รวบรวมผลลัพธ์) — ให้ feedback ชัดว่าระบบไม่ค้าง
- **แก้** `apps/web/tailwind.config.ts` — เพิ่ม keyframes `indeterminate` (progress bar เลื่อน) + `scanLine` (เส้นสแกนใบหน้า) และ utilities `animate-indeterminate`, `animate-scan-line`
- **แก้** `apps/web/app/search/page.tsx`, `apps/web/app/event/[code]/search/page.tsx` — render `<SearchSpinner />` เมื่อ `busy === true`

## 2026-06-30 — Fix: Archive run ค้าง pending photos หลัง server restart → ค้นหาเจอแค่ 4 จาก 29 (queue หายเพราะ in-memory)
- **เพิ่ม** `apps/web/instrumentation.ts` + เปิด `experimental.instrumentationHook` ใน `next.config.js` — เรียก `ensureBooted()` อัตโนมัติตอน server start (ไม่ต้องรอ admin hit `/api/admin/status`)
- **แก้** `apps/web/lib/boot.ts` — ฟื้นฟู archive run ที่ค้าง: (1) flip `status='completed'`→`'running'` ถ้ายังมี photos pending, (2) re-enqueue pending photos ทั้งหมดเข้า face queue, (3) resume Drive sync ของ Live run; รองรับ crash/restart mid-processing
- **แก้** `apps/web/lib/jobs/driveSync.ts` — archive sync **ไม่** mark `status='completed'` ทันทีอีกต่อไป; แค่ทำเมื่อ pending == 0 (กรณีไม่มี photo ใหม่)
- **แก้** `apps/web/lib/jobs/faceProcess.ts` — เพิ่ม `maybeCompleteArchive()` ตรวจหลัง process แต่ละภาพ (สำเร็จหรือ fail) → ถ้า archive + 0 pending → mark `status='completed'`; ตอนนี้ run "เสร็จ" หมายถึง face queue drain จริง

## 2026-06-29 — Restructure: แยก `/` (welcome) ออกจาก `/live` (Feed ของ Live folder) — guard QR-guest ไม่ให้หลุดเข้าหน้ารวม
- **ย้าย** `apps/web/app/page.tsx` (Live feed เดิม) → `apps/web/app/live/page.tsx`; update internal links `/?groups=1` → `/live?groups=1`, heading เป็น "Feed (Live)"
- **เขียนใหม่** `apps/web/app/page.tsx` = welcome page: hero + 3 การ์ดอธิบาย (QR usage / how-to / admin) + ปุ่มไป `/admin`, `/live`, `/help`; ไม่มี photo grid อีกต่อไป — guest ที่เปิด `localhost:3000` จะไม่เห็นภาพของ Live folder
- **แก้** `apps/web/app/components/Header.tsx` — Feed link เปลี่ยน `/` → `/live` (ตอนไม่อยู่ใน event); brand logo: บนหน้า event ชี้กลับ event feed, นอกนั้นชี้ `/` (welcome)
- **แก้** `apps/web/app/photo/[id]/page.tsx:18` — back link `/` → `/live`

## 2026-06-29 — Fix: match threshold 0.5 strict เกินไป → ค้นหาเจอแค่ 3-4 รูปทั้งที่ folder มีรูปคนคนเดียว
- **แก้** `apps/web/lib/config.ts`, `.env`, `.env.example` — `FACE_MATCH_THRESHOLD` 0.5 → **0.6** (ค่ามาตรฐานของ face-api.js FaceMatcher สำหรับ "คนเดียวกัน"); ค่าเดิม 0.5 ตัดภาพคนเดียวกันที่ angle/แสง/expression ต่างทิ้งหมด — ภาพที่ distance 0.5–0.6 (ยังถือเป็นคนเดียวกันได้) ถูกปฏิเสธ
- **อัพเดท** comment ใน `.env.example` อธิบาย trade-off strict/loose

## 2026-06-29 — Fix: Header nav ใน event page ไม่ scoped → กด Feed/ค้นหา เด้งออกจาก event
- **เพิ่ม** `apps/web/app/components/Header.tsx` *(client)* — header แยกเป็น component ใช้ `usePathname()` เช็คว่าอยู่ใน `/event/[code]/...` หรือไม่ → Feed link → `/event/[code]`, ค้นหา → `/event/[code]/search`, ซ่อนปุ่ม Admin (guest ไม่ควรเห็น); หน้าอื่นทุก path คง `/`, `/search`, `/admin` เดิม
- **แก้** `apps/web/app/layout.tsx` — ลบ inline header → ใช้ `<Header appName={s.appName} />`; ก่อนนี้ header hardcoded `/` `/search` `/admin` → QR-guest กดแล้วออกจาก scope event

## 2026-06-29 — Fix: Tailwind ไม่ scan lib/ → กล่อง Help Note render ไม่มี style (text มองไม่เห็น)
- **แก้** `apps/web/tailwind.config.ts` — เพิ่ม `./lib/**/*.{ts,tsx}` ใน content paths; ก่อนนี้ Tailwind JIT ไม่รู้จัก class ที่ใช้ใน `lib/help-content.tsx` → utility ไม่ generate → กล่อง `<Note>` ใน /help render เป็น default browser style (text มองไม่เห็นในภาพ user)
- **ปรับ** `apps/web/lib/help-content.tsx` Note contrast: `dark:bg-{tone}-900/50 dark:text-{tone}-50` (แทน `-950/30 / -200`) — contrast ชัดขึ้นใน dark mode ทุก environment

## 2026-06-29 — Phase 5: cleanup + polish หลัง 4 phase ใหญ่
- **ลบ** `apps/web/app/api/admin/folders/browse/` — ไม่ใช้แล้วหลัง DriveBrowser ถูก redesign (ไม่มี breadcrumb sub-folder browser อีกต่อไป)
- **ลบ** `removeFromMyDrive()` ใน `apps/web/lib/drive.ts` — dead code หลัง Phase 1 (ลบ folder ทำใน DB local ไม่แตะ Drive แล้ว)
- **เปลี่ยน** `SCOPES` ใน `lib/drive.ts`: `drive` (full) → `drive.readonly` — defense in depth: SA ถูกจำกัด API read-only ใน OAuth scope ระดับ token ไม่ว่าจะเป็น role อะไรใน Drive ก็เขียนไม่ได้
- **แก้** `apps/web/app/SetupGate.tsx` — skip redirect ถ้า path เริ่มด้วย `/event/*` — guest ที่ scan QR ไม่ควรเด้งไป `/setup` (ถ้าระบบยังไม่ setup ก็จะแสดง "invalid code" จาก event page เอง)
- **แก้** `apps/web/app/admin/components/SetupTab.tsx` WARN message ให้แม่นยำ: Live folder หลังเปลี่ยน SA → SA ใหม่ access ไม่ได้ → sync ล้มเหลวเงียบๆ ต้อง share folder นั้นให้ email ใหม่ก่อน

## 2026-06-29 — Phase 4: คู่มือในเว็บ (in-app help) — full /help page + contextual ? popups
- **เพิ่ม** `apps/web/lib/help-content.tsx` — 6 topics (setup-first-time, share-folder, reset-sa, start-work, qr-code, delete-folder); แต่ละ topic มี id/title/icon/summary + content JSX ที่ใช้ helpers `<Step n>` (numbered circle), `<Note tone>` (info/warn/ok), `<Code>` ภายในไฟล์เดียวกัน
- **เพิ่ม** `apps/web/app/help/page.tsx` — full help page: sidebar list ของ topics + content area; `?topic=` query param เลือก topic (default = topic แรก)
- **เพิ่ม** `apps/web/app/components/HelpButton.tsx` — 2 variants: `icon` (ปุ่ม ? กลม ขนาด 5×5) และ `link` (text + label); onClick เปิด modal scrollable แสดง topic content + ลิงก์ "เปิดหน้าเต็ม →" ไป /help
- **แก้** `apps/web/app/admin/AdminPanel.tsx` — เพิ่มลิงก์ "? คู่มือ" ใน header → /help
- **แก้** `apps/web/app/admin/components/DriveBrowser.tsx` — `<HelpButton>` ใน 3 จุด: SA email banner (share-folder), Folders header (start-work), ใกล้ปุ่มลบ (delete-folder, variant link)
- **แก้** `apps/web/app/admin/components/QRPanel.tsx` — `<HelpButton>` ใกล้ heading "QR สำหรับให้ผู้ใช้ค้นหา" (qr-code) ทั้ง 2 state (enabled/disabled)
- **แก้** `apps/web/app/admin/components/SetupTab.tsx` — `<HelpButton>` ใกล้ heading (reset-sa)
- **แก้** `apps/web/app/setup/page.tsx` — เพิ่มลิงก์ "? คู่มือ" header → /help?topic=setup-first-time

## 2026-06-29 — Phase 3: Reset Service Account UI — เปลี่ยน SA ผ่านหน้าเว็บ
- **เพิ่ม** `apps/web/lib/drive.ts` — `resetDriveClient()` clear `_client` + `_saEmail` cache; ครั้งหน้าที่ใช้ Drive จะอ่าน credentials path ใหม่ (ไม่ต้อง restart process)
- **แก้** `apps/web/app/api/setup/service-account/route.ts` — auth-aware: ครั้งแรก (Setup Wizard ยังไม่เสร็จ) allow ผ่าน, ครั้งหลัง (admin reset SA) require `requireAdmin()`; หลัง save call `resetDriveClient()` ทันที
- **เพิ่ม** `apps/web/app/admin/components/SetupTab.tsx` — 4 ขั้น flow: VIEW (โชว์ SA email ปัจจุบัน + ปุ่มคัดลอก + collapse "เปลี่ยนเมื่อไหร่?") → WARN (กล่อง amber 3 จุดเตือนก่อนเปลี่ยน) → UPLOAD (ขั้นตอน 5 ข้อ + file picker `.json`) → DONE (กล่อง green: email ใหม่ + ปุ่มคัดลอก + ขั้นตอนต่อไป 3 ข้อ)
- **แก้** `apps/web/app/admin/AdminPanel.tsx` — เพิ่ม tab `'setup'` ป้าย "ตั้งค่าระบบ" หลัง "ตั้งค่าหน้าเว็บ"

## 2026-06-29 — Phase 2: Event QR + scoped event pages (per-folder search)
- **เพิ่ม dep** `qrcode` (canvas render + dataURL) และ `bcryptjs` (hash password ของ event)
- **เพิ่ม** `apps/web/app/api/admin/folders/[folderId]/qr/route.ts` *(POST/DELETE)* — เปิด/อัพเดท/ปิด QR ของ folder; generate 8-char code (alphabet ตัด `OoIl01`), reuse code เดิมถ้ามีอยู่แล้ว (rotate ไม่ได้), bcrypt hash password
- **เพิ่ม** `apps/web/app/api/event/[code]/auth/route.ts` *(POST)* — verify password → set event session (cookie `fps_event`, TTL 7d); public event (no password) → auto-pass
- **เพิ่ม** `apps/web/app/api/event/[code]/info/route.ts` *(GET)* — public endpoint แสดงชื่อ folder + `hasPassword` + `authed` ก่อน login
- **เพิ่ม** `apps/web/app/api/event/[code]/photos/route.ts` *(GET)* — list ภาพ scope ที่ runId ของ folder
- **เพิ่ม** `apps/web/app/api/event/[code]/photo/[id]/file/route.ts` *(GET ?size=thumb)* — proxy stream + verify photo belongs to event
- **เพิ่ม** `apps/web/app/api/event/[code]/search/route.ts` *(POST)* — selfie → embed → match scope; ใช้ `gateEvent` guard
- **เพิ่ม** `apps/web/app/api/event/[code]/download-zip/route.ts` *(POST)* — เหมือน `/api/photos/download-zip` แต่ filter ids ที่ไม่อยู่ใน scope ทิ้งก่อน archive
- **เพิ่ม** `apps/web/lib/event.ts` — `gateEvent(code)` helper: เช็ค code valid + auth + folder มี run → คืน `{code, folderId, runId}` หรือ error; `photoBelongsToEvent(photoId, runId)` for scope check
- **เพิ่ม** `apps/web/lib/auth.ts` — `EventSession` (cookie `fps_event`, separate จาก admin), `getEventSession()`, `isEventAuthed(code)`; admin session ไม่กระทบ
- **เพิ่ม** `apps/web/app/event/[code]/{layout,page,EventGate,EventGrid}.tsx` — Feed scoped + password gate (auto-pass ถ้า public, แสดง form ถ้ามี password)
- **เพิ่ม** `apps/web/app/event/[code]/search/page.tsx` — selfie search scope (ทำเอง standalone ไม่ reuse `/search` เพราะ URL ต่าง)
- **เพิ่ม** `apps/web/app/event/[code]/photo/[id]/page.tsx` — view single photo scope; verify `photoBelongsToEvent` ก่อน render
- **refactor** `apps/web/app/PhotoGrid.tsx` — รับ prop `urls?: PhotoUrls` (thumb/download/zip/view) ที่ flexible; default = endpoint หน้าหลักเดิม; ใช้ใน `EventGrid` ที่ส่ง URL ของ event เข้ามา
- **เพิ่ม** `apps/web/app/admin/components/QRPanel.tsx` — QR canvas (220px width, errorCorrectionLevel M), toggle password, ปุ่ม copy URL/download PNG/print A4 (ชื่อ folder ด้านบน QR), เปลี่ยน password ผ่าน `<details>` collapse
- **แก้** `apps/web/app/admin/components/DriveBrowser.tsx` — แทน QR placeholder ด้วย `<QRPanel>` จริง; ส่ง `onChange={loadFolders}` ให้ refresh state หลัง toggle

## 2026-06-29 — Phase 1: Drive tab redesign — Live/Archive mode + DB persistence per folder
- **เพิ่ม** column `mode` ใน `runs` (`live` | `archive`, default `live`) + migration `ALTER TABLE runs ADD COLUMN mode` ใน `apps/web/lib/db.ts`
- **เพิ่ม** ตาราง `event_codes` (QR code → folder_id + password_hash) และ `ignored_folders` (blocklist หลังกดลบ)
- **เปลี่ยน** `activeRun()` → filter `mode='live' AND status='running'` — Live ได้ทีละ 1 เสมอ; เพิ่ม helper `latestRunForFolder`, `dropFolderData`, `addIgnored`/`removeIgnored`/`isIgnored`/`listIgnoredFolderIds`, `getEventCode`, `latestRunIdForFolder`
- **เพิ่ม** `apps/web/app/api/admin/drive/folders/route.ts` *(GET)* — aggregate folders จาก SA (Drive list) + DB (Live/Archive) + filter ignored; คืน mode/photoCount/qrEnabled/accessible/lastSyncAt ครบในก้อนเดียว
- **เพิ่ม** `apps/web/app/api/admin/folders/[folderId]/toggle-live/route.ts` *(POST)* — Live↔Archive; Live→Archive หยุด poll + mark completed; Archive→Live ต้องไม่มี Live อื่นค้าง (409 conflict)
- **เพิ่ม** `apps/web/app/api/admin/folders/[folderId]/route.ts` *(DELETE)* — ลบ folder + drop DB cascade + add ignored; refuse ถ้าเป็น Live; คืน `saEmail`+`folderName` ให้ UI แสดง popup แนะนำ unshare ขั้นตอนสุดท้าย
- **เปลี่ยน** `apps/web/app/api/admin/start/route.ts` — รับ `mode` ใน body (default `live`); ถ้า mode=`live` + มี Live อื่น → 409 (ต้องปิด Live ก่อน manual ตามคำขอ user); reuse run row เดิมของ folder ถ้ามี (ไม่ duplicate); ปลด `ignored_folders` ของ folder นั้นโดยอัตโนมัติ
- **แก้** `apps/web/lib/jobs/driveSync.ts` — ตรวจ mode ก่อน reschedule: `live` → poll ต่อ, `archive` → mark `status=completed` หลัง sync รอบแรกเสร็จ (embed ทำต่อ background)
- **เขียนใหม่** `apps/web/app/admin/components/DriveBrowser.tsx` — collapsible card design, toggle ปุ่มเขียว (`🟢 LIVE`/`⚪ Archive`), state ขยายแสดง mode/QR/ปุ่มลบ, popup unshare guidance หลังลบ (มี email + ชื่อ folder + ขั้นตอน 4 ข้อ + ปุ่มคัดลอก)
- **ลบ** `apps/web/app/api/admin/folders/[folderId]/remove-shared/` — แทนที่ด้วย DELETE endpoint ใหม่
- **ลบ** `apps/web/app/api/admin/storage/` + `apps/web/app/admin/components/StorageManager.tsx` + tab "ข้อมูล" — ไม่จำเป็นแล้ว เพราะลบ folder ทำได้จาก Drive tab โดยตรง
- **เรียงใหม่** tabs ใน AdminPanel — Drive ขึ้นมาเป็น default tab

## 2026-06-29 — ปุ่ม "ลบออกจากลิสต์" — Drive-level remove from shared with me
- **Revert** `sharedWithMe` filter (กลับเป็น query เดิม) — เปลี่ยนวิธีจัดการเป็นปุ่ม Drive-level remove
- **แก้** `apps/web/lib/drive.ts` — SCOPES `drive.readonly` → `drive` (จำเป็นสำหรับ `files.delete`/`permissions.delete`); เพิ่ม `removeFromMyDrive(fileId)` — ลอง `permissions.delete` ของ SA ก่อน (clean), fallback `files.delete` (สำหรับ "anyone with link" access) = เทียบเท่าปุ่ม Remove ใน Drive UI ตอน right-click ใน Shared with me
- **เพิ่ม** `apps/web/app/api/admin/folders/[folderId]/remove-shared/route.ts` *(POST)* — guard active run แล้วเรียก `removeFromMyDrive`
- **แก้** `apps/web/app/admin/components/DriveBrowser.tsx` — ปุ่ม **ลบออกจากลิสต์** (สีแดง border) ข้าง "เริ่มงานที่นี่", disable เมื่อ active, confirm dialog ระบุชัด: ไฟล์ต้นฉบับบน Drive ไม่ถูกแตะ, คนอื่นยังเข้าผ่านลิงก์ได้, ข้อมูลใน DB ยังอยู่ (ใช้ tab ข้อมูล ถ้าจะลบ)

## 2026-06-29 — แท็บ "ข้อมูล" — storage manager + ลบข้อมูลรายไฟล์เดอร์
- **เพิ่ม** `apps/web/app/api/admin/storage/route.ts` *(GET)* — รวบข้อมูลใน DB group by `folder_id`: จำนวน photos, embeddings, runs, latest run timestamp, isActive; เติม `folderName` สดจาก Drive (parallel `Promise.all`) + flag `accessible:false` ถ้า SA ไม่มีสิทธิ์เข้าถึงแล้ว (orphan)
- **เพิ่ม** `apps/web/app/api/admin/storage/[folderId]/route.ts` *(DELETE)* — cascade-delete embeddings → photos → runs ของ folder นั้นในธุรกรรมเดียว, refuse ถ้าตรงกับ active run, คืนจำนวนที่ลบทั้ง 3 ระดับ
- **เพิ่ม** `apps/web/app/admin/components/StorageManager.tsx` — UI แสดงสรุปรวม (folder count, total photos, total embeddings) + ลิสต์ folder แต่ละแถวพร้อม badge `active`/`orphan`, สถิติ 3 ตัว (ภาพ/embedding/run), ปุ่ม **ลบข้อมูล** สีแดง + confirm dialog แสดงตัวเลขก่อนลบ + alert แสดงผลหลังลบ
- **แก้** `apps/web/app/admin/AdminPanel.tsx` — เพิ่ม tab `'storage'` ป้าย "ข้อมูล" คั่นระหว่าง Drive และ ตั้งค่าหน้าเว็บ

## 2026-06-29 — Revert unshare feature + heal ชื่อ folder ที่เพี้ยน
- **Revert** unshare flow ทั้งหมด — ลบ `apps/web/app/api/admin/folders/unshare/`, ลบปุ่ม "ยกเลิกแชร์" + ฟังก์ชัน `unshareFolder` ใน `DriveBrowser.tsx`, ลบ helper `removeSelfPermission` จาก `lib/drive.ts`, คืน SCOPES → `drive.readonly` (user เลือกยกเลิกแชร์เองที่ Drive UI ปลอดภัยกว่า)
- **เพิ่ม** `getFolderName(folderId)` ใน `apps/web/lib/drive.ts` — ดึงชื่อ folder สดจาก Drive (`files.get` fields=name); คืน null ถ้าไม่มีสิทธิ์
- **แก้** `apps/web/app/api/admin/status/route.ts` — heal ชื่อ folder ของ active run: ถ้า `folder_name` ใน DB เป็น null หรือเพี้ยน (มี `??` ติดกัน) → ดึงชื่อสดจาก Drive แล้ว `UPDATE runs SET folder_name=...`, cache ลง `Map` in-memory เพื่อไม่ให้ status poll (ทุก 3s) ยิง Drive ซ้ำ
- **แก้** `apps/web/app/api/admin/start/route.ts` — ตอน start run ใหม่ ดึงชื่อจาก Drive โดยตรงผ่าน `getFolderName` แทนการเชื่อค่า `folderName` จาก client (กัน encoding เพี้ยนตั้งแต่ต้นทาง)

## 2026-06-29 — โชว์ Service Account email + ปุ่ม copy ใน Drive tab
- **เพิ่ม** `apps/web/app/api/admin/service-account/route.ts` *(GET)* — อ่าน `client_email` จาก `secrets/service-account.json` (ผ่าน `config.drive.credentialsPath`) → คืน `{email, path}` ใช้ใน admin tab; ไฟล์ไม่มี/อ่านพังคืน error message
- **แก้** `apps/web/app/admin/components/DriveBrowser.tsx` — เพิ่ม banner ด้านบนแสดง service account email + คำอธิบาย "แชร์ folder ให้ email นี้" + ปุ่ม **คัดลอก** (`navigator.clipboard.writeText` + toast "✓ คัดลอกแล้ว" 1.5s) เพื่อให้ user ไม่ต้องเปิดไฟล์ JSON หาเอง

## 2026-06-28 — Fix blank thumbnails in Admin / Manage Images
- **แก้** `apps/web/app/admin/components/PhotoModeration.tsx` — เปลี่ยน `<img src={p.thumbnailUrl}>` (Drive `lh3.googleusercontent.com` URL ต้องการ Google auth → browser ดึงไม่ได้ → ขึ้น 403, เห็นแค่ alt text ที่มุมบนซ้าย) → ให้ใช้ proxy `/api/photos/${id}/file?size=thumb` ที่มีอยู่แล้ว (server ดึงผ่าน service account แล้ว stream กลับ) — pattern เดียวกับ PhotoGrid และ Search ที่ทำงานปกติ

## 2026-06-28 — Fix build errors + garbled terminal text
- **แก้** `apps/web/next.config.js` — เพิ่ม `'archiver'` เข้า `NATIVE_DEPS` → webpack ไม่ bundle Node-only pkg แก้ `Default condition should be last one` error
- **แก้** `apps/web/app/api/photos/download-zip/route.ts` — revert import กลับเป็น `import { ZipArchive } from 'archiver'` + `new ZipArchive(...)` ให้ตรงกับ `@types/archiver` (ไม่มี default export)
- **แก้** `start.bat` — แปลข้อความทั้งหมดเป็น English เพื่อแก้ปัญหา garbled text ใน Windows cmd (cmd.exe ไม่รองรับ UTF-8 Thai โดย default)

## 2026-06-28 — Hybrid multi-photo download (Web Share / ZIP / FSAA)
- **เพิ่ม** `apps/web/app/api/photos/download-zip/route.ts` — POST รับ `ids[]` (JSON หรือ form) → streaming ZIP ผ่าน `archiver` (store-only, ภาพไม่ compress) → ส่งเป็น `application/zip` พร้อม `Content-Disposition: attachment`
- **เพิ่ม dep** `archiver` + `@types/archiver` ใน `apps/web/package.json`
- **แก้** `apps/web/app/PhotoGrid.tsx` — เปลี่ยน download flow เป็น hybrid 4 mode ตรวจอัตโนมัติจาก UA/capability ใน `useEffect`:
  - `mobile-share`: มือถือ + `navigator.canShare({files})` ใช้ได้ → fetch ทุกไฟล์เป็น `File[]` → `navigator.share()` → user กด "บันทึกรูปภาพ" → ลงแกลเลอรีพร้อมกันทั้งหมด
  - `mobile-zip`: มือถือไม่รองรับ Web Share → POST `/api/photos/download-zip` → ได้ ZIP 1 ไฟล์
  - `desktop-fsaa`: desktop Chromium → `showDirectoryPicker` เขียนตรงเข้า folder (เดิม)
  - `desktop-zip`: Firefox/Safari desktop → ZIP fallback
  - กรณี share หรือ FSAA พังกลางทาง → fall back เป็น ZIP อัตโนมัติ
  - เพิ่ม phase indicator (`fetching` / `sharing` / `zipping`) + hint แตกตาม mode
- **แก้** `apps/web/app/search/page.tsx` — ใช้ hybrid pattern เดียวกัน (ลบ stub `download-zip` call เดิมที่ 404 ตลอด)

## 2026-06-28 — Mobile download fix (ก้าวแรก ก่อน hybrid)
- **แก้** `apps/web/app/PhotoGrid.tsx` — ปุ่มดาวน์โหลดบนมือถือพังเพราะ Samsung Browser/Android Chrome expose `showDirectoryPicker` แต่ `getFileHandle({create:true})` ถูก platform block → error เด้ง (วิธีนี้แก้ symptom แต่ยังให้ผู้ใช้ confirm download ทีละไฟล์ → ถูกแทนที่ด้วย hybrid ด้านบน)

## 2026-06-28 — Phase 5 + Bug fix

### Bug fix
- **db**: drop `UNIQUE(drive_file_id)` → ใช้ `UNIQUE(run_id, drive_file_id)` แทน ทำให้สร้าง run ใหม่บน folder เดิมแล้วภาพเดิมโผล่ได้ (auto-migrate ถ้า DB เก่ามีอยู่)
- **secrets**: ย้าย `facefindpic-28416d203288.json` ไป `secrets/service-account.json` + update `.env` GOOGLE_APPLICATION_CREDENTIALS
- **gitignore**: เพิ่ม patterns `facefindpic-*.json`, `*-credentials.json`, `data/config.json`

### Phase 5 — Cloudflare Tunnel
- **เพิ่ม** `apps/web/lib/tunnel.ts` — spawn `cloudflared tunnel --url localhost:3000`, capture trycloudflare.com URL
- **เพิ่ม** `apps/web/app/api/admin/tunnel/route.ts` (GET status, POST start, DELETE stop)
- **อัพเดท** `apps/web/app/admin/components/Branding.tsx` — เพิ่ม section "เปิด Public URL ผ่าน Cloudflare Tunnel" + auto-populate publicUrl

### Known limits
- WASM backend สำหรับ face-api ยังใช้ไม่ได้ — face-api.node-wasm bundle มี tfjs ภายในที่ inject backend ภายนอกไม่ได้ — CPU ใช้งานได้ ~5s/photo
- Node bundle .exe — ยังเป็น launcher .bat ที่ require Node install (node-sea + Electron เป็น scope ใหญ่)

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
