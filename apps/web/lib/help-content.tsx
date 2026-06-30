import type { ReactNode } from 'react';

export type HelpTopic = {
  id: string;
  title: string;
  icon: string;
  summary: string;
  content: ReactNode;
};

// ---------- helpers ----------
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">{n}</div>
      <div className="flex-1 pt-0.5">{children}</div>
    </div>
  );
}
function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'ok'; children: ReactNode }) {
  const styles = {
    info: 'border-blue-400 bg-blue-50 text-blue-900 dark:bg-blue-900/50 dark:text-blue-50',
    warn: 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-900/50 dark:text-amber-50',
    ok: 'border-green-400 bg-green-50 text-green-900 dark:bg-green-900/50 dark:text-green-50',
  }[tone];
  return <div className={`border-l-4 ${styles} p-3 rounded-r text-sm`}>{children}</div>;
}
function Code({ children }: { children: ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs">{children}</code>;
}

// ---------- topics ----------
export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'setup-first-time',
    title: 'ติดตั้งครั้งแรก',
    icon: '🎬',
    summary: 'ตั้งค่าระบบครั้งแรก — Service Account + รหัสผ่าน admin + folder งานแรก',
    content: (
      <div className="space-y-4">
        <p>ระบบจะพาผ่าน Setup Wizard 4 ขั้นทันทีที่เปิดแอปครั้งแรก</p>

        <Step n={1}>
          <div className="font-medium mb-1">เตรียม Service Account ของ Google</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ดูคู่มือ &ldquo;แชร์ folder ให้ Service Account&rdquo; เพื่อสร้าง SA และดาวน์โหลดไฟล์ <Code>service-account.json</Code>
          </p>
        </Step>

        <Step n={2}>
          <div className="font-medium mb-1">อัพโหลดไฟล์ .json</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ลากไฟล์มาวาง หรือกดเลือกไฟล์ — ระบบจะตรวจสอบและบันทึกใน <Code>secrets/</Code> โดยอัตโนมัติ
          </p>
        </Step>

        <Step n={3}>
          <div className="font-medium mb-1">ตั้งรหัสผ่าน admin</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            รหัสผ่านสำหรับเข้าหน้า <Code>/admin</Code> — ใช้รหัสผ่านที่เดาไม่ออก เก็บไว้ดีๆ
          </p>
        </Step>

        <Step n={4}>
          <div className="font-medium mb-1">แชร์ folder งานแรก (ทำใน Google Drive)</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            ก๊อปปี้ email ของ SA จากหน้า Wizard → ไปที่ Google Drive → คลิกขวา folder งาน → Share → วาง email → Viewer → Send
          </p>
        </Step>

        <Note tone="ok">
          เสร็จแล้วระบบจะพาเข้าหน้า admin โดยอัตโนมัติ
        </Note>
      </div>
    ),
  },
  {
    id: 'share-folder',
    title: 'แชร์ folder ให้ Service Account',
    icon: '📤',
    summary: 'สร้าง Service Account ที่ Google Cloud + วิธีแชร์ folder งานให้ SA เห็น',
    content: (
      <div className="space-y-4">
        <div>
          <div className="font-medium mb-2">สร้าง Service Account ครั้งแรก</div>
          <div className="space-y-2.5">
            <Step n={1}>
              เปิด{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand underline">
                console.cloud.google.com
              </a>{' '}
              → เลือกหรือสร้าง project ใหม่
            </Step>
            <Step n={2}>
              เมนูบนสุดกด search → พิมพ์ <Code>Service Accounts</Code> → กดเข้า
            </Step>
            <Step n={3}>
              กด <strong>+ CREATE SERVICE ACCOUNT</strong> → ตั้งชื่อเช่น <Code>face-photo-reader</Code> → CREATE AND CONTINUE → SKIP ทั้ง 2 ขั้น → DONE
            </Step>
            <Step n={4}>
              คลิก SA ที่สร้างใหม่ → tab <strong>KEYS</strong> → ADD KEY → Create new key → <strong>JSON</strong> → CREATE
            </Step>
            <Step n={5}>
              browser จะดาวน์โหลดไฟล์ <Code>*.json</Code> — เก็บไว้ปลอดภัย ห้ามแชร์ใคร
            </Step>
            <Step n={6}>
              <strong>เปิด Drive API:</strong> ที่ search bar พิมพ์ <Code>Google Drive API</Code> → กด <strong>ENABLE</strong>
            </Step>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">แชร์ folder งานให้ SA</div>
          <div className="space-y-2.5">
            <Step n={1}>
              คัดลอก email ของ SA จาก tab <strong>Drive</strong> ในหน้า admin (มีปุ่มคัดลอกเตรียมไว้)
            </Step>
            <Step n={2}>
              เปิด Google Drive → คลิกขวา folder งาน → <strong>Share</strong>
            </Step>
            <Step n={3}>
              วาง email SA ลงในช่อง &ldquo;Add people&rdquo; → ตั้งสิทธิ์ <strong>Viewer</strong> → Send
            </Step>
            <Step n={4}>
              กลับมาที่ tab Drive → กดปุ่ม &ldquo;รีเฟรช&rdquo; → folder จะโผล่ในลิสต์
            </Step>
          </div>
        </div>

        <Note tone="info">
          <strong>ไม่ต้องตั้ง Editor</strong> — Viewer พอ (อ่านอย่างเดียว) — SA จะไม่สามารถลบหรือแก้ไขใน Drive ของคุณได้
        </Note>
      </div>
    ),
  },
  {
    id: 'reset-sa',
    title: 'รีเซ็ต Service Account',
    icon: '🔄',
    summary: 'เปลี่ยน SA เพื่อล้าง folder ค้างใน "Shared with me" ของ SA เก่า',
    content: (
      <div className="space-y-4">
        <Note tone="info">
          <strong>ทำเมื่อไหร่?</strong> ใช้นานๆ จะมี folder ค้างใน Shared with me ของ SA — กดลบใน app
          จะลบใน DB และซ่อนจากลิสต์เท่านั้น (ไม่ได้ลบฝั่ง Google) → สะสมไปนานๆ list ช้าลง → รีเซ็ตทั้งใบเริ่มต้นใหม่
        </Note>

        <div>
          <div className="font-medium mb-2">ขั้นตอน</div>
          <div className="space-y-2.5">
            <Step n={1}>
              เปิด{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand underline">
                Google Cloud Console
              </a>{' '}
              → เลือก project เดิม → IAM &amp; Admin → Service Accounts
            </Step>
            <Step n={2}>
              ลบ SA เก่าทิ้ง (กดที่ SA → DELETE) — Google จะจอง email เก่า 30 วัน ไม่ใช้ซ้ำได้
            </Step>
            <Step n={3}>
              สร้าง SA ใหม่ — ใช้ชื่อต่าง เช่น <Code>face-photo-reader-v2</Code>
            </Step>
            <Step n={4}>
              tab KEYS → ADD KEY → JSON → ดาวน์โหลดไฟล์ใหม่
            </Step>
            <Step n={5}>
              ที่ admin → tab <strong>ตั้งค่าระบบ</strong> → &ldquo;เปลี่ยน Service Account&rdquo; → อ่าน warning → upload ไฟล์ใหม่
            </Step>
            <Step n={6}>
              <strong>แชร์ folder งานทั้งหมดให้ email ใหม่</strong> — ของเก่าใช้ไม่ได้ในแอปแล้ว
            </Step>
          </div>
        </div>

        <Note tone="warn">
          ข้อมูลใน DB (photos, embeddings, QR codes ของงานเก่า) <strong>ไม่ถูกลบ</strong> — folder ที่เคย sync แล้วยังค้นภาพได้ผ่าน QR เดิม
        </Note>
      </div>
    ),
  },
  {
    id: 'start-work',
    title: 'เริ่มงาน — Live vs Archive',
    icon: '🚀',
    summary: 'เริ่ม sync ภาพจาก folder — เลือก Live (sync ต่อเนื่อง) หรือ Archive (sync ครั้งเดียว)',
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border-2 border-green-400 bg-green-50 dark:bg-green-950/30 p-3">
            <div className="font-semibold text-green-900 dark:text-green-200 mb-1">🟢 LIVE</div>
            <ul className="text-sm text-green-900 dark:text-green-100 space-y-1 list-disc list-inside">
              <li>sync ภาพใหม่จาก Drive อัตโนมัติ ทุก ~20 วินาที</li>
              <li>ใช้สำหรับงานที่กำลังถ่ายอยู่</li>
              <li>แสดงในหน้าหลักของเว็บ (<Code>/</Code>)</li>
              <li>มีได้ทีละ <strong>1 folder</strong> เท่านั้น</li>
            </ul>
          </div>
          <div className="rounded-lg border-2 border-neutral-300 dark:border-neutral-700 p-3">
            <div className="font-semibold mb-1">⚪ Archive</div>
            <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1 list-disc list-inside">
              <li>sync ครั้งเดียว แล้วหยุด</li>
              <li>ใช้สำหรับงานที่ถ่ายเสร็จแล้ว</li>
              <li>ไม่แสดงในหน้าหลัก — ค้นผ่าน QR ของ folder นั้น</li>
              <li>มีได้ไม่จำกัด</li>
            </ul>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">เริ่มงานครั้งแรก</div>
          <div className="space-y-2.5">
            <Step n={1}>tab <strong>Drive</strong> → คลิกที่ folder เพื่อขยาย</Step>
            <Step n={2}>กดปุ่ม <strong>🚀 เริ่มงาน + LIVE</strong> หรือ <strong>📦 sync เก็บเป็น Archive</strong></Step>
            <Step n={3}>รอสักครู่ ภาพจะค่อยๆ ขึ้นในหน้าหลัก</Step>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">สลับ Live ↔ Archive</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            กดปุ่ม toggle ในแถบที่ขยาย — ปุ่มเขียว = LIVE, ปุ่มเทา = Archive
          </p>
          <Note tone="warn">
            <strong>ถ้าจะตั้ง folder อื่นเป็น Live</strong> — ต้องปิด Live ปัจจุบันก่อน (ป้องกันปิดโดยไม่ตั้งใจ)
          </Note>
        </div>
      </div>
    ),
  },
  {
    id: 'qr-code',
    title: 'สร้าง QR ให้ผู้ใช้ค้นรูป',
    icon: '📱',
    summary: 'เปิด QR ของ folder + ตั้งรหัสผ่าน + พิมพ์/ดาวน์โหลด QR ส่งให้ผู้ใช้',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          QR ใช้สำหรับให้แขกในงาน (ผู้มาถ่ายภาพ) สแกนแล้วค้นภาพตัวเองได้ —
          จะค้นได้เฉพาะภาพใน folder ของ QR นั้นเท่านั้น ไม่เห็นงานอื่น
        </p>

        <div>
          <div className="font-medium mb-2">เปิด QR</div>
          <div className="space-y-2.5">
            <Step n={1}>tab Drive → ขยาย folder ที่ต้องการ</Step>
            <Step n={2}>เลื่อนลงไปที่ส่วน <strong>QR สำหรับให้ผู้ใช้ค้นหา</strong></Step>
            <Step n={3}>
              ติ๊ก <Code>ใช้รหัสผ่าน</Code> ถ้าต้องการล็อค (ใส่รหัสที่จะแจ้งให้แขก) — หรือไม่ติ๊กก็ได้ (สาธารณะ ใครมี URL ก็เข้าได้)
            </Step>
            <Step n={4}>กด <strong>เปิด QR</strong> — QR จะปรากฏทันที</Step>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">นำ QR ไปใช้</div>
          <ul className="text-sm space-y-1 list-disc list-inside text-neutral-700 dark:text-neutral-300">
            <li><strong>คัดลอก URL</strong> — แชร์ใน Line/Facebook/email ได้</li>
            <li><strong>⬇️ PNG</strong> — ดาวน์โหลด QR เป็นรูป → แชร์เป็นรูปภาพ</li>
            <li><strong>🖨️ พิมพ์</strong> — เปิดหน้า print พร้อมชื่องาน + QR ขนาด A4 → ติดที่หน้างาน</li>
          </ul>
        </div>

        <Note tone="info">
          <strong>เปลี่ยนรหัสผ่าน:</strong> กด &ldquo;เปลี่ยนรหัสผ่าน / ตั้งค่าใหม่&rdquo; ใต้ QR — URL/QR เดิมยังใช้ได้ แค่รหัสเปลี่ยน
        </Note>

        <Note tone="warn">
          <strong>ปิด QR</strong> = code นั้นใช้ไม่ได้อีก — คนที่มี URL/QR เก่าจะเข้าไม่ได้แล้ว
        </Note>
      </div>
    ),
  },
  {
    id: 'delete-folder',
    title: 'ลบ folder + เลิกแชร์',
    icon: '🗑️',
    summary: 'ลบข้อมูลของ folder ออกจากระบบ + วิธี unshare ใน Google Drive',
    content: (
      <div className="space-y-4">
        <Note tone="warn">
          <strong>ลบไม่ย้อนกลับ</strong> — photos, embeddings, QR ของ folder จะหายเหมือนไม่เคยมี
        </Note>

        <div>
          <div className="font-medium mb-2">ลบ folder (ใน app)</div>
          <div className="space-y-2.5">
            <Step n={1}>tab Drive → ขยาย folder ที่ต้องการลบ</Step>
            <Step n={2}>
              ถ้าเป็น Live อยู่ → <strong>ต้องปิด Live ก่อน</strong> (กด toggle เขียวให้เป็นเทา)
            </Step>
            <Step n={3}>กด <strong>🗑️ ลบ folder นี้</strong> → confirm</Step>
            <Step n={4}>folder หายจากลิสต์ทันที + popup จะแสดงขั้นตอนต่อ</Step>
          </div>
        </div>

        <div>
          <div className="font-medium mb-2">เลิกแชร์ใน Google Drive (สำคัญ!)</div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            หลังลบในแอป folder จะยังอยู่ใน &ldquo;Shared with me&rdquo; ของ SA เพราะเจ้าของ folder
            (คุณ) เป็นคนเดียวที่ลบ permission ของ SA ได้:
          </p>
          <div className="space-y-2.5 mt-2">
            <Step n={1}>เปิด Google Drive → คลิกขวา folder ที่เพิ่งลบ → <strong>Share</strong></Step>
            <Step n={2}>หา email ของ SA ในรายชื่อที่แชร์อยู่ (popup ในแอปมีปุ่มคัดลอก)</Step>
            <Step n={3}>คลิก ❌ ข้าง email นั้น → กด <strong>Save</strong></Step>
          </div>
          <Note tone="info">
            <strong>ถ้าไม่ทำ</strong> ก็ไม่เป็นไร — แอปใส่ folder นั้นใน blocklist แล้ว ไม่แสดงในลิสต์อยู่แล้ว
            แต่ถ้ามี folder ลบไว้เยอะมาก list ของ Google Drive จะช้า → แนะนำให้ unshare ทุกครั้งหรือ
            ใช้ <strong>รีเซ็ต Service Account</strong> รวบครั้งเดียว
          </Note>
        </div>

        <div>
          <div className="font-medium mb-2">เอา folder กลับมา</div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            ถ้าเคยลบไปแล้วอยากเอากลับ — แชร์ folder เดิมให้ SA ใหม่ใน Google Drive → folder จะโผล่กลับในลิสต์
            (ระบบจะปลด blocklist อัตโนมัติตอนกดเริ่มงาน)
          </p>
        </div>
      </div>
    ),
  },
];

export function getHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id);
}
