import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Save
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { RubricCriteria, Period } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';

export const RubricPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [criteria, setCriteria] = useState<RubricCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Criterion Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWeight, setNewWeight] = useState(20);

  const loadRubric = async () => {
    setLoading(true);
    try {
      const period = await dataService.getActivePeriod();
      setActivePeriod(period);
      if (period) {
        const data = await dataService.getRubricCriteria(period.id);
        setCriteria(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRubric();
  }, []);

  // Calculate sum of active weights
  const activeCriteria = criteria.filter((c) => c.is_active);
  const totalWeight = Math.round(activeCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0) * 100) / 100;
  const isWeightValid = totalWeight === 100.0;

  const handleWeightChange = (id: string, weightValue: number) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight: Math.max(1, Math.min(100, weightValue)) } : c))
    );
  };

  const handleToggleActive = (id: string) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
  };

  const handleDeleteCriterion = (id: string) => {
    if (criteria.length <= 1) {
      warning('Peringatan', 'Minimal harus ada 1 aspek penilaian dalam rubrik.');
      return;
    }
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleResetToStandard = () => {
    if (!activePeriod) return;
    const standardCriteria = [
      { name: 'Kepemimpinan', desc: 'Kemampuan memimpin, integritas, dan visi misi organisasi.' },
      { name: 'Komunikasi', desc: 'Artikulasi ide, kesantunan bertutur, dan persuasi gagasan.' },
      { name: 'Tanggung Jawab', desc: 'Kedisiplinan, komitmen waktu, dan rekam jejak amanah.' },
      { name: 'Pemecahan Masalah', desc: 'Pola pikir kritis, inisiatif, dan resolusi konflik.' },
      { name: 'Motivasi', desc: 'Semangat pengabdian dan ketahanan mental menghadapi tekanan.' }
    ];

    const resetList: RubricCriteria[] = standardCriteria.map((item, idx) => ({
      id: `rub-std-${Date.now()}-${idx}`,
      period_id: activePeriod.id,
      name: item.name,
      description: item.desc,
      weight: 20.0,
      min_score: 1.0,
      max_score: 100.0,
      sort_order: idx + 1,
      is_active: true
    }));

    setCriteria(resetList);
    success('Direset ke Standar', 'Rubrik dikembalikan ke 5 aspek awal masing-masing 20%.');
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeriod) return;
    if (!newName.trim()) {
      warning('Data Kurang', 'Nama aspek penilaian wajib diisi.');
      return;
    }

    const newCriterion: RubricCriteria = {
      id: 'rub-custom-' + Date.now(),
      period_id: activePeriod.id,
      name: newName.trim(),
      description: newDescription.trim() || 'Deskripsi indikator penilaian.',
      weight: Number(newWeight),
      min_score: 1.0,
      max_score: 100.0,
      sort_order: criteria.length + 1,
      is_active: true
    };

    setCriteria([...criteria, newCriterion]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewDescription('');
    setNewWeight(10);
    success('Ditambahkan', 'Aspek baru telah ditambahkan ke daftar rubrik.');
  };

  const handleSaveAll = async () => {
    if (!activePeriod) return;
    if (!isWeightValid) {
      error(
        'Validasi Bobot Gagal',
        `Total bobot aspek aktif harus tepat 100%. Saat ini ${totalWeight}% (selisih: ${Math.round((100 - totalWeight) * 100) / 100}%).`
      );
      return;
    }

    setSaving(true);
    try {
      await dataService.saveRubricCriteria(activePeriod.id, criteria, user || undefined);
      success('Tersimpan', 'Pengaturan rubrik dan pembobotan berhasil disimpan secara permanen.');
      await loadRubric();
    } catch (err: any) {
      error('Gagal Menyimpan', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Rubrik Penilaian & Bobot Aspek
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            5 aspek awal (20% masing-masing). Nilai 1–100 per aspek. Total bobot seluruh aspek aktif wajib tepat 100%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToStandard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset 5 Aspek (20%)</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Aspek</span>
          </button>
        </div>
      </div>

      {/* Dynamic Weight Validator Meter Card */}
      <div
        className={`rounded-2xl p-5 border transition-all duration-300 shadow-xs ${
          isWeightValid
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/80 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                isWeightValid ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {isWeightValid ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {isWeightValid
                  ? 'Total Bobot Rubrik Valid: Tepat 100.00%'
                  : `Total Bobot Tidak Valid: ${totalWeight}% (Wajib 100.00%)`}
              </h3>
              <p className="text-xs mt-0.5 opacity-80 leading-relaxed">
                {isWeightValid
                  ? 'Kalkulasi nilai akhir kandidat siap dijalankan dengan bobot proporsional.'
                  : `Sesuaikan kembali persentase bobot tiap aspek di bawah hingga totalnya tepat 100% (selisih: ${Math.round((100 - totalWeight) * 100) / 100}%).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-black">{totalWeight}%</span>
              <span className="text-[10px] block opacity-75">/ 100%</span>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={!isWeightValid || saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm ${
                isWeightValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Rubrik'}</span>
            </button>
          </div>
        </div>

        {/* Visual Progress Meter */}
        <div className="mt-4 w-full bg-white/70 h-3 rounded-full overflow-hidden border border-black/5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isWeightValid
                ? 'bg-emerald-500'
                : totalWeight > 100
                ? 'bg-rose-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, totalWeight)}%` }}
          />
        </div>
      </div>

      {/* Rubric Criteria Cards List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-500 font-medium">
          Memuat data rubrik penilaian...
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((item, index) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border p-5 transition shadow-xs ${
              item.is_active ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/60 opacity-60'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700 shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                      Skala 1 - 100
                    </span>
                    {!item.is_active && (
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-semibold">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>

              {/* Slider & Input Controls */}
              <div className="flex items-center gap-4 shrink-0 pl-11 md:pl-0">
                <div className="w-32 sm:w-44">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={item.weight}
                    onChange={(e) => handleWeightChange(item.id, Number(e.target.value))}
                    disabled={!item.is_active}
                    className="w-full accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-24">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={item.weight}
                    onChange={(e) => handleWeightChange(item.id, Number(e.target.value))}
                    disabled={!item.is_active}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-center text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(item.id)}
                    title={item.is_active ? 'Nonaktifkan aspek ini' : 'Aktifkan aspek ini'}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                      item.is_active
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {item.is_active ? 'Matikan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDeleteCriterion(item.id)}
                    title="Hapus aspek penilaian"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add Criterion Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Aspek Penilaian Rubrik"
        description="Tambahkan kriteria baru untuk penilaian wawancara PEMIRA."
      >
        <form onSubmit={handleAddCriterion} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Nama Aspek Penilaian
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Integritas & Karakter Siswa"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Deskripsi & Indikator Penilaian
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Jelaskan hal-hal yang dinilai pada aspek ini..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Bobot Awal (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={newWeight}
              onChange={(e) => setNewWeight(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
            >
              Tambahkan ke Rubrik
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

