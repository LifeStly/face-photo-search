'use client';
import { useEffect, useState } from 'react';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'expired';
  expires_at: number | null;
  created_at: number;
};

type Quota = {
  tenant_id: string;
  monthly_photo_limit: number | null;
  monthly_search_limit: number | null;
  storage_byte_limit: number | null;
} | null;

type Usage = {
  tenant_id: string;
  period_yyyymm: number;
  photos_processed: number;
  searches: number;
  storage_bytes: number;
};

type AuditEntry = {
  id: number;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  target: string | null;
  meta_json: string | null;
  created_at: number;
};

function fmtDate(ms: number | null): string {
  if (!ms) return '—';
  return new Date(ms).toISOString().slice(0, 10);
}
function fmtDateTime(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export default function SuperPanel() {
  const [tab, setTab] = useState<'tenants' | 'audit'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);

  async function loadTenants() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/super/tenants');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'load failed');
      setTenants(d.tenants ?? []);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  useEffect(() => { loadTenants(); }, []);

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  return (
    <section className="max-w-5xl mx-auto py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Super Admin</h1>
          <p className="text-sm text-neutral-500">จัดการ tenant ทั้งหมดของระบบ</p>
        </div>
        <button onClick={logout} className="text-sm px-3 py-1.5 rounded border">Logout</button>
      </header>

      <nav className="flex gap-1 mb-4 border-b">
        <TabBtn active={tab === 'tenants'} onClick={() => setTab('tenants')}>Tenants ({tenants.length})</TabBtn>
        <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')}>Audit Log</TabBtn>
      </nav>

      {tab === 'tenants' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">รายการ Tenant</h2>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded bg-brand text-white text-sm">+ สร้าง Tenant</button>
          </div>
          {busy && <div className="text-sm text-neutral-500">กำลังโหลด...</div>}
          <div className="space-y-2">
            {tenants.map((t) => (
              <TenantRow key={t.id} t={t} onEdit={() => setEditing(t)} onChanged={loadTenants} />
            ))}
            {tenants.length === 0 && !busy && (
              <div className="text-sm text-neutral-500 py-8 text-center border-2 border-dashed rounded">
                ยังไม่มี tenant — กด "สร้าง Tenant" เพื่อเริ่ม
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && <AuditTab />}

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadTenants(); }}
        />
      )}
      {editing && (
        <EditTenantModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadTenants(); }}
        />
      )}

      {error && <div className="fixed bottom-4 right-4 max-w-md p-3 rounded bg-red-100 text-red-800 text-sm shadow-lg">{error}</div>}
    </section>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px ${active ? 'border-brand text-brand font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
    >{children}</button>
  );
}

function TenantRow({ t, onEdit, onChanged }: { t: Tenant; onEdit: () => void; onChanged: () => void }) {
  const [quota, setQuota] = useState<Quota>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function loadDetails() {
    const [q, u] = await Promise.all([
      fetch(`/api/super/tenants/${t.id}/quota`).then(r => r.json()),
      fetch(`/api/super/tenants/${t.id}/usage`).then(r => r.json()),
    ]);
    setQuota(q.quota ?? null);
    setUsage(u.usage ?? null);
  }

  useEffect(() => { if (expanded) loadDetails(); }, [expanded, t.id]);

  async function del() {
    if (!confirm(`ลบ tenant "${t.name}" และข้อมูลทั้งหมด? ทำซ้ำไม่ได้`)) return;
    const r = await fetch(`/api/super/tenants/${t.id}`, { method: 'DELETE' });
    if (r.ok) onChanged();
    else alert((await r.json()).error || 'ลบไม่สำเร็จ');
  }

  const expired = t.expires_at != null && t.expires_at < Date.now();
  const statusColor =
    t.status === 'suspended' ? 'bg-amber-100 text-amber-800' :
    t.status === 'expired' || expired ? 'bg-red-100 text-red-800' :
    'bg-green-100 text-green-800';

  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => setExpanded((p) => !p)} className="flex-1 text-left">
          <div className="font-medium">{t.name}</div>
          <div className="text-xs text-neutral-500">
            slug: <span className="font-mono">{t.slug}</span> · expires: {fmtDate(t.expires_at)} · id: <span className="font-mono">{t.id}</span>
          </div>
        </button>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
          {expired && t.status === 'active' ? 'expired (auto)' : t.status}
        </span>
        <button onClick={onEdit} className="text-xs px-2 py-1 rounded border">แก้</button>
        <button onClick={del} className="text-xs px-2 py-1 rounded border text-red-600">ลบ</button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t bg-neutral-50 dark:bg-neutral-900 text-sm grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-1 text-xs uppercase text-neutral-500">Quota</h4>
            {quota ? (
              <ul className="text-xs space-y-0.5">
                <li>ภาพ/เดือน: <span className="font-mono">{quota.monthly_photo_limit ?? '∞'}</span></li>
                <li>ค้นหา/เดือน: <span className="font-mono">{quota.monthly_search_limit ?? '∞'}</span></li>
                <li>Storage: <span className="font-mono">{quota.storage_byte_limit ? fmtBytes(quota.storage_byte_limit) : '∞'}</span></li>
              </ul>
            ) : <div className="text-xs text-neutral-500">ยังไม่ตั้ง (∞ ทุกอย่าง)</div>}
          </div>
          <div>
            <h4 className="font-medium mb-1 text-xs uppercase text-neutral-500">Usage (เดือนนี้)</h4>
            {usage ? (
              <ul className="text-xs space-y-0.5">
                <li>ภาพประมวล: <span className="font-mono">{usage.photos_processed}</span></li>
                <li>ค้นหา: <span className="font-mono">{usage.searches}</span></li>
                <li>Storage: <span className="font-mono">{fmtBytes(usage.storage_bytes)}</span></li>
              </ul>
            ) : <div className="text-xs text-neutral-500">—</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [photoLimit, setPhotoLimit] = useState('');
  const [searchLimit, setSearchLimit] = useState('');
  const [storageGB, setStorageGB] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/super/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
          adminUsername, adminPassword,
          quota: {
            photo: photoLimit ? Number(photoLimit) : null,
            search: searchLimit ? Number(searchLimit) : null,
            storageGB: storageGB ? Number(storageGB) : null,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'create failed');
      onCreated();
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose} title="สร้าง Tenant ใหม่">
      <div className="space-y-3">
        <Field label="ชื่อ tenant"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Photographer Co." /></Field>
        <Field label="Slug (a-z, 0-9, dash)"><input className="input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="photographer-co" /></Field>
        <Field label="วันหมดอายุ (เว้นว่าง = ไม่หมด)"><input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
        <div className="pt-2 border-t mt-3">
          <div className="text-xs uppercase text-neutral-500 mb-2">บัญชี Tenant-admin คนแรก</div>
          <Field label="Username"><input className="input" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} autoComplete="off" /></Field>
          <Field label="Password (≥ 8 ตัว)"><input type="password" className="input" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="new-password" /></Field>
        </div>
        <div className="pt-2 border-t mt-3">
          <div className="text-xs uppercase text-neutral-500 mb-2">Quota (เว้นว่าง = ไม่จำกัด)</div>
          <Field label="ภาพ/เดือน"><input type="number" className="input" value={photoLimit} onChange={(e) => setPhotoLimit(e.target.value)} placeholder="10000" /></Field>
          <Field label="ค้นหา/เดือน"><input type="number" className="input" value={searchLimit} onChange={(e) => setSearchLimit(e.target.value)} placeholder="50000" /></Field>
          <Field label="Storage (GB)"><input type="number" className="input" value={storageGB} onChange={(e) => setStorageGB(e.target.value)} placeholder="50" /></Field>
        </div>
        {err && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{err}</div>}
        <div className="flex gap-2 pt-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded border">ยกเลิก</button>
          <button onClick={submit} disabled={busy || !name || !slug || !adminUsername || adminPassword.length < 8} className="flex-1 px-4 py-2 rounded bg-brand text-white disabled:opacity-50">
            {busy ? 'สร้าง...' : 'สร้าง'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditTenantModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tenant.name);
  const [status, setStatus] = useState(tenant.status);
  const [expiresAt, setExpiresAt] = useState(tenant.expires_at ? new Date(tenant.expires_at).toISOString().slice(0, 10) : '');
  const [photoLimit, setPhotoLimit] = useState('');
  const [searchLimit, setSearchLimit] = useState('');
  const [storageGB, setStorageGB] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/super/tenants/${tenant.id}/quota`).then(r => r.json()).then((d) => {
      if (d.quota) {
        setPhotoLimit(d.quota.monthly_photo_limit?.toString() ?? '');
        setSearchLimit(d.quota.monthly_search_limit?.toString() ?? '');
        if (d.quota.storage_byte_limit) {
          setStorageGB((d.quota.storage_byte_limit / 1024 ** 3).toString());
        }
      }
    });
  }, [tenant.id]);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r1 = await fetch(`/api/super/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, status,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        }),
      });
      if (!r1.ok) throw new Error((await r1.json()).error || 'update failed');
      const r2 = await fetch(`/api/super/tenants/${tenant.id}/quota`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyPhotoLimit: photoLimit ? Number(photoLimit) : null,
          monthlySearchLimit: searchLimit ? Number(searchLimit) : null,
          storageByteLimit: storageGB ? Math.round(Number(storageGB) * 1024 ** 3) : null,
        }),
      });
      if (!r2.ok) throw new Error((await r2.json()).error || 'quota update failed');
      onSaved();
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose} title={`แก้ไข: ${tenant.name}`}>
      <div className="space-y-3">
        <Field label="ชื่อ tenant"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="สถานะ">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="expired">expired</option>
          </select>
        </Field>
        <Field label="วันหมดอายุ"><input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></Field>
        <div className="pt-2 border-t mt-3">
          <div className="text-xs uppercase text-neutral-500 mb-2">Quota (เว้นว่าง = ไม่จำกัด)</div>
          <Field label="ภาพ/เดือน"><input type="number" className="input" value={photoLimit} onChange={(e) => setPhotoLimit(e.target.value)} /></Field>
          <Field label="ค้นหา/เดือน"><input type="number" className="input" value={searchLimit} onChange={(e) => setSearchLimit(e.target.value)} /></Field>
          <Field label="Storage (GB)"><input type="number" className="input" value={storageGB} onChange={(e) => setStorageGB(e.target.value)} /></Field>
        </div>
        {err && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{err}</div>}
        <div className="flex gap-2 pt-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded border">ยกเลิก</button>
          <button onClick={submit} disabled={busy} className="flex-1 px-4 py-2 rounded bg-brand text-white disabled:opacity-50">
            {busy ? 'บันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusy(true);
    fetch('/api/super/audit?limit=200').then(r => r.json()).then((d) => {
      setEntries(d.entries ?? []);
      setBusy(false);
    });
  }, []);

  return (
    <div>
      <h2 className="font-semibold mb-3">Audit Log ({entries.length})</h2>
      {busy && <div className="text-sm text-neutral-500">กำลังโหลด...</div>}
      <div className="space-y-1 font-mono text-xs">
        {entries.map((e) => (
          <div key={e.id} className="p-2 rounded border border-neutral-200 dark:border-neutral-800 flex gap-3">
            <span className="text-neutral-500">{fmtDateTime(e.created_at)}</span>
            <span className="font-semibold">{e.action}</span>
            {e.tenant_id && <span className="text-neutral-500">[{e.tenant_id}]</span>}
            {e.user_id && <span className="text-neutral-500">{e.user_id}</span>}
            {e.target && <span className="text-neutral-400">→ {e.target}</span>}
            {e.meta_json && <span className="text-neutral-400 truncate" title={e.meta_json}>{e.meta_json}</span>}
          </div>
        ))}
        {entries.length === 0 && !busy && <div className="text-sm text-neutral-500 py-4 text-center">ยังไม่มี audit log</div>}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
