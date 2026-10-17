import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { Candidate, Period, InterviewerAssignment } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../../lib/dataService';

export const CandidatesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Detail Modal State
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);

  // Delete Modal
  const [deleteCandidateTarget, setDeleteCandidateTarget] = useState<Candidate | null>(null);

  // Form Fields
  const [formCandidateNumber, setFormCandidateNumber] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formClassGrade, setFormClassGrade] = useState('');
  const [formTargetPosition, setFormTargetPosition] = useState('Ketua OSIS');
  const [formVision, setFormVision] = useState('');
  const [formMission, setFormMission] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const period = await dataService.getActivePeriod();
      setActivePeriod(period);
      if (period) {
        const [candList, asgList] = await Promise.all([
          dataService.getCandidates(period.id),
          dataService.getAssignments(period.id)
        ]);
        setCandidates(candList);
        setAssignments(asgList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    dataService.getAppSettings().then((settings) => { setAppSettings(settings); if (settings.positions.length && !settings.positions.includes(formTargetPosition)) setFormTargetPosition(settings.positions[0]); }).catch((err) => console.error('Gagal memuat daftar jabatan', err));
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCandidate(null);
    setFormCandidateNumber(String(candidates.length + 1).padStart(2, '0'));
    setFormFullName('');
    setFormNisn('');
    setFormClassGrade('');
    setFormTargetPosition('Ketua OSIS');
    setFormVision('');
    setFormMission('');
    setFormPhotoUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (cand: Candidate) => {
    setModalMode('edit');
    setSelectedCandidate(cand);
    setFormCandidateNumber(cand.candidate_number);
    setFormFullName(cand.full_name);
    setFormNisn(cand.nisn || '');
    setFormClassGrade(cand.class_grade);
    setFormTargetPosition(cand.target_position);
    setFormVision(cand.vision || '');
    setFormMission(cand.mission || '');
    setFormPhotoUrl(cand.photo_url || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeriod) return;

    if (!formFullName.trim()) {
      warning('Data Tidak Lengkap', 'Nama lengkap kandidat wajib diisi.');
      return;
    }
    if (!formCandidateNumber.trim()) {
      warning('Data Tidak Lengkap', 'Nomor urut kandidat wajib diisi.');
      return;
    }
    if (!formClassGrade.trim()) {
      warning('Data Tidak Lengkap', 'Kelas kandidat wajib diisi.');
      return;
    }

    try {
      if (modalMode === 'create') {
        await dataService.createCandidate(
          {
            period_id: activePeriod.id,
            candidate_number: formCandidateNumber.trim(),
            full_name: formFullName.trim(),
            nisn: formNisn.trim() || undefined,
            class_grade: formClassGrade.trim(),
            target_position: formTargetPosition,
            vision: formVision.trim() || undefined,
            mission: formMission.trim() || undefined,
            photo_url: formPhotoUrl.trim() || undefined,
            status: 'active'
          },
          user || undefined
        );
        success('Berhasil', 'Kandidat baru berhasil didaftarkan.');
      } else if (selectedCandidate) {
        await dataService.updateCandidate(
          selectedCandidate.id,
          {
            candidate_number: formCandidateNumber.trim(),
            full_name: formFullName.trim(),
            nisn: formNisn.trim() || undefined,
            class_grade: formClassGrade.trim(),
            target_position: formTargetPosition,
            vision: formVision.trim() || undefined,
            mission: formMission.trim() || undefined,
            photo_url: formPhotoUrl.trim() || undefined
          },
          user || undefined
        );
        success('Berhasil', 'Data kandidat telah diperbarui.');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('Gagal Menyimpan', err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidateTarget) return;
    try {
      await dataService.deleteCandidate(deleteCandidateTarget.id, user || undefined);
      success('Dihapus', `Kandidat ${deleteCandidateTarget.full_name} berhasil dihapus.`);
      setDeleteCandidateTarget(null);
      await loadData();
    } catch (err: any) {
      error('Gagal Menghapus', err.message);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.candidate_number.includes(searchQuery) ||
      c.class_grade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = positionFilter === 'ALL' || c.target_position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Manajemen Kandidat</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil, nomor urut, visi, misi, dan target posisi calon pengurus PEMIRA.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kandidat</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor, nama lengkap, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>
        <div className="sm:w-60">
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">Semua Jabatan Target</option>
            {appSettings.positions.map((position) => <option key={position} value={position}>{position}</option>)}
          </select>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            Memuat data kandidat...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak Ada Kandidat"
              description="Belum ada data kandidat yang terdaftar atau sesuai dengan filter pencarian."
              action={{
                label: 'Tambah Kandidat Baru',
                onClick: openCreateModal
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-16 text-center">No.</th>
                  <th className="py-3 px-4">Kandidat</th>
                  <th className="py-3 px-4">Kelas & NISN</th>
                  <th className="py-3 px-4">Jabatan Target</th>
                  <th className="py-3 px-4">Pewawancara Aktif</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCandidates.map((cand) => {
                  const assignment = assignments.find(
                    (a) => a.candidate_id === cand.id && a.status === 'active'
                  );

                  return (
                    <tr key={cand.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 text-center font-black text-indigo-600">
                        {cand.candidate_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              cand.photo_url ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                            }
                            alt={cand.full_name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{cand.full_name}</p>
                            <button
                              onClick={() => setDetailModalCandidate(cand)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold mt-0.5"
                            >
                              Lihat Visi & Misi
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{cand.class_grade}</p>
                        <p className="text-[10px] text-slate-400">NISN: {cand.nisn || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {cand.target_position}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {assignment?.interviewer ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-medium truncate max-w-[150px]">
                              {assignment.interviewer.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cand)}
                            title="Edit Data"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidateTarget(cand)}
                            title="Hapus Kandidat"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Tambah Kandidat Baru' : 'Perbarui Data Kandidat'}
        description="Isi rincian data calon pengurus untuk tahap seleksi wawancara."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nomor Urut
              </label>
              <input
                type="text"
                required
                value={formCandidateNumber}
                onChange={(e) => setFormCandidateNumber(e.target.value)}
                placeholder="Contoh: 01"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Jabatan Target
              </label>
              <select
                value={formTargetPosition}
                onChange={(e) => setFormTargetPosition(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {appSettings.positions.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Nama Lengkap Kandidat
            </label>
            <input
              type="text"
              required
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              placeholder="Contoh: Muhammad Faiz Azzam"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Kelas
              </label>
              <input
                type="text"
                required
                value={formClassGrade}
                onChange={(e) => setFormClassGrade(e.target.value)}
                placeholder="Contoh: XI MIPA 1"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                NISN (Opsional)
              </label>
              <input
                type="text"
                value={formNisn}
                onChange={(e) => setFormNisn(e.target.value)}
                placeholder="10 Digit NISN"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              URL Foto Kandidat (Opsional)
            </label>
            <input
              type="url"
              value={formPhotoUrl}
              onChange={(e) => setFormPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Visi
            </label>
            <textarea
              rows={2}
              value={formVision}
              onChange={(e) => setFormVision(e.target.value)}
              placeholder="Paparkan visi utama kepengurusan..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Misi
            </label>
            <textarea
              rows={3}
              value={formMission}
              onChange={(e) => setFormMission(e.target.value)}
              placeholder="1. Poin misi pertama&#10;2. Poin misi kedua..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
            >
              {modalMode === 'create' ? 'Simpan Kandidat' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Visi Misi Modal */}
      <Modal
        isOpen={Boolean(detailModalCandidate)}
        onClose={() => setDetailModalCandidate(null)}
        title={`Visi & Misi: ${detailModalCandidate?.full_name}`}
        description={`Nomor Urut ${detailModalCandidate?.candidate_number} • ${detailModalCandidate?.class_grade} • ${detailModalCandidate?.target_position}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Visi
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 leading-relaxed">
              {detailModalCandidate?.vision || 'Belum diisi oleh kandidat.'}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Misi
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 whitespace-pre-line leading-relaxed">
              {detailModalCandidate?.mission || 'Belum diisi oleh kandidat.'}
            </div>
          </div>
          <div className="pt-2 text-right">
            <button
              onClick={() => setDetailModalCandidate(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteCandidateTarget)}
        onClose={() => setDeleteCandidateTarget(null)}
        title="Konfirmasi Hapus Kandidat"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p>
            Apakah Anda yakin ingin menghapus kandidat{' '}
            <strong className="text-slate-900">{deleteCandidateTarget?.full_name}</strong>?
          </p>
          <p className="text-rose-600 text-[11px]">
            Tindakan ini juga akan menghapus penugasan wawancara dan seluruh draft nilai terkait.
          </p>
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              onClick={() => setDeleteCandidateTarget(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

