import React, { useEffect, useState } from 'react';
import { Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { dataService, DEFAULT_APP_SETTINGS, type AppSettings } from '../../lib/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [newPosition, setNewPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { dataService.getAppSettings().then(setSettings).catch((e) => error('Gagal memuat pengaturan', e.message)).finally(() => setLoading(false)); }, []);
  const update = (key: 'event_name' | 'school_name' | 'organization_name', value: string) => setSettings((old) => ({ ...old, [key]: value }));
  const save = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); try { const saved = await dataService.saveAppSettings(settings, user || undefined); setSettings(saved); success('Pengaturan disimpan', 'Identitas kegiatan dan daftar jabatan berhasil diperbarui.'); } catch (e) { error('Gagal menyimpan', e instanceof Error ? e.message : 'Terjadi kesalahan.'); } finally { setSaving(false); } };
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-3 text-indigo-700"><Settings2 className="h-5 w-5" /></div><div><h2 className="text-xl font-black tracking-tight text-slate-900">Pengaturan Aplikasi</h2><p className="mt-1 text-sm text-slate-500">Atur identitas kegiatan dan jabatan kandidat.</p></div></div></div>
    {loading ? <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">Memuat pengaturan...</div> : <form onSubmit={save} className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Identitas kegiatan</h3>
      {[['event_name','Nama kegiatan','Contoh: Wawancara PEMIRA 2026'],['school_name','Nama sekolah','Contoh: SMK Negeri 17 Jakarta'],['organization_name','Nama organisasi / penyelenggara','Contoh: OSIS dan MPK']].map(([key,label,placeholder]) => <div key={key}><label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label><input required value={settings[key as keyof Pick<AppSettings,'event_name'|'school_name'|'organization_name'>]} onChange={(e) => update(key as 'event_name'|'school_name'|'organization_name', e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div>)}
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="font-bold text-slate-900">Jabatan kandidat</h3><p className="mt-1 text-xs text-slate-500">Jabatan ini dapat dipilih saat membuat kandidat. Jabatan yang sudah digunakan tidak dihapus dari data kandidat lama.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row"><input value={newPosition} onChange={(e) => setNewPosition(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = newPosition.trim(); if (v && !settings.positions.some((p) => p.toLowerCase() === v.toLowerCase())) setSettings((old) => ({ ...old, positions: [...old.positions, v] })); setNewPosition(''); } }} placeholder="Tambah jabatan baru" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500" /><button type="button" onClick={() => { const v = newPosition.trim(); if (v && !settings.positions.some((p) => p.toLowerCase() === v.toLowerCase())) setSettings((old) => ({ ...old, positions: [...old.positions, v] })); setNewPosition(''); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4"/>Tambah</button></div>
      <div className="space-y-2">{settings.positions.map((position) => <div key={position} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3"><span className="text-sm font-medium text-slate-800">{position}</span><button type="button" onClick={() => setSettings((old) => ({ ...old, positions: old.positions.filter((p) => p !== position) }))} disabled={settings.positions.length <= 1} title="Hapus jabatan" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div>)}</div>
      </section>
      <div className="flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"><Save className="h-4 w-4"/>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button></div>
    </form>}
  </div>;
};
