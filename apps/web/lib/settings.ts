import { db } from './db';

export type Settings = {
  appName: string;
  welcomeMessage: string;
  brandColor: string;
  publicUrl: string;
};

const DEFAULTS: Settings = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Face Photo Search',
  welcomeMessage: 'ถ่าย selfie แล้วเจอภาพตัวเองจากงานได้ทันที',
  brandColor: process.env.NEXT_PUBLIC_BRAND_COLOR || '#0ea5e9',
  publicUrl: '',
};

const KEYS = ['appName', 'welcomeMessage', 'brandColor', 'publicUrl'] as const;
type Key = (typeof KEYS)[number];

export function getSettings(): Settings {
  const rows = db().prepare(`SELECT key, value FROM settings`).all() as Array<{ key: string; value: string | null }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULTS };
  for (const k of KEYS) {
    const v = map.get(k);
    if (v != null && v !== '') (out as any)[k] = v;
  }
  return out;
}

export function setSettings(patch: Partial<Settings>) {
  const stmt = db().prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `);
  const now = Date.now();
  const tx = db().transaction((entries: Array<[Key, string]>) => {
    for (const [k, v] of entries) stmt.run(k, v, now);
  });
  const entries = Object.entries(patch).filter(([k, v]) => KEYS.includes(k as Key) && v != null) as Array<[Key, string]>;
  tx(entries);
}
