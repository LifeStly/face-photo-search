import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { Role } from './auth';

export type UserRow = {
  id: string;
  tenant_id: string | null;
  role: Role;
  username: string;
  password_hash: string;
  created_at: number;
  last_login_at: number | null;
};

const BCRYPT_ROUNDS = 10;

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function findUserByUsername(username: string): UserRow | undefined {
  return db()
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;
}

export function listUsersByTenant(tenantId: string): UserRow[] {
  return db()
    .prepare(`SELECT * FROM users WHERE tenant_id = ? ORDER BY created_at ASC`)
    .all(tenantId) as UserRow[];
}

export function listSuperAdmins(): UserRow[] {
  return db()
    .prepare(`SELECT * FROM users WHERE role = 'super' ORDER BY created_at ASC`)
    .all() as UserRow[];
}

export function createUser(args: {
  username: string;
  password: string;
  role: Role;
  tenantId: string | null;
}): UserRow {
  const id = newId(args.role === 'super' ? 'sup' : 'usr');
  const hash = bcrypt.hashSync(args.password, BCRYPT_ROUNDS);
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO users (id, tenant_id, role, username, password_hash, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`
    )
    .run(id, args.tenantId, args.role, args.username, hash, now);
  return findUserById(id)!;
}

export function updatePassword(userId: string, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  db().prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, userId);
}

export function deleteUser(userId: string) {
  db().prepare(`DELETE FROM users WHERE id = ?`).run(userId);
}

export function touchLogin(userId: string) {
  db().prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(Date.now(), userId);
}

/**
 * verify username + password — คืน user ถ้าผ่าน, undefined ถ้าไม่
 * ใช้ bcrypt compare (constant-time)
 */
export function verifyLogin(username: string, password: string): UserRow | undefined {
  const u = findUserByUsername(username);
  if (!u) return undefined;
  if (!bcrypt.compareSync(password, u.password_hash)) return undefined;
  return u;
}

export function hasAnySuperAdmin(): boolean {
  const row = db().prepare(`SELECT 1 FROM users WHERE role = 'super' LIMIT 1`).get();
  return !!row;
}
