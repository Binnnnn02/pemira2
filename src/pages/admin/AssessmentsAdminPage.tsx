import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Eye,
  AlertTriangle,
  History
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { Assessment, InterviewerAssignment, Period, RubricCriteria } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { AssessmentStatusBadge, RecommendationBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export const AssessmentsAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [rubrics, setRubrics] = useState<RubricCriteria[]>([]);
  const [loading, setLoading] = useState(true);

  // Unlock Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Detail View Modal
  const [viewAssessment, setViewAssessment] = useState<Assessment | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const period = await dataService.getActivePeriod();
      setActivePeriod(period);
      if (period) {
        const [asgs, rubs] = await Promise.all([
          dataService.getAssignments(period.id),
          dataService.getRubricCriteria(period.id)
        ]);
        setAssignments(asgs);
        setRubrics(rubs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openUnlockModal = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setUnlockReason('');
    setIsUnlockModalOpen(true);
  };

  const handleConfirmUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !user) return;
    if (!unlockReason.trim() || unlockReason.trim().length < 5) {
      warning('Alasan Kurang Jelas', 'Harap masukkan alasan pembukaan kunci minimal 5 karakter untuk audit.');
      return;
    }

    setUnlocking(true);
    try {
      await dataService.adminUnlockAssessment(selectedAssessment.id, unlockReason, user);
      success(
        'Penilaian Berhasil Dibuka',
        'Status penilaian kini kembali DRAFT sehingga pewawancara dapat merevisi nilai.'
      );
      setIsUnlockModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('Gagal Membuka Kunci', err.message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleOpenDetail = async (asg: InterviewerAssignment) => {
    if (!asg.assessment) return;
    const full = await dataService.getAssessment(asg.id);
    if (full) {
      setViewAssessment({
        ...full,
        candidate: asg.candidate,
        interviewer: asg.interviewer
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Status & Kunci Penilaian Wawancara
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau status draft atau final untuk periode {activePeriod?.name || 'aktif'}. Hanya Administrator yang memiliki hak membuka kunci penilaian dengan alasan tercatat.
          </p>
        </div>
      </div>

      {/* Security Rule Card */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 bg-amber-600 rounded-xl text-white shrink-0 mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div className="text-xs text-amber-950 leading-relaxed">
          <p className="font-bold">Regulasi Kunci Penilaian Final:</p>
          <p className="mt-0.5 text-amber-900">
            Nilai yang telah disubmit oleh pewawancara bersifat terkunci dan tidak dapat diubah oleh pewawancara tersebut. Pembukaan kunci hanya dapat dilakukan oleh Admin dan setiap alasan wajib dicatat pada Audit Log demi akuntabilitas hasil seleksi.
          </p>
        </div>
      </div>

      {/* Table of Assessments */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            Memuat status penilaian wawancara...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum Ada Penugasan"
              description="Belum ada kandidat dan penugasan pada periode aktif ini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-16 text-center">No.</th>
                  <th className="py-3 px-4">Kandidat</th>
                  <th className="py-3 px-4">Pewawancara</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Skor Akhir</th>
                  <th className="py-3 px-4">Waktu Submit / Kunci</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {assignments.map((asg) => {
                  const assessment = asg.assessment;
                  const isSubmitted = assessment?.status === 'submitted';

                  return (
                    <tr key={asg.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 text-center font-black text-indigo-600">
                        {asg.candidate?.candidate_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 leading-tight">
                          {asg.candidate?.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {asg.candidate?.target_position} • {asg.candidate?.class_grade}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {asg.interviewer?.name || 'Belum Ditugaskan'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <AssessmentStatusBadge status={assessment?.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center font-black">
                        {assessment?.final_score !== undefined && assessment?.final_score !== null ? (
                          <span className="text-sm text-indigo-600">
                            {assessment.final_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {assessment?.submitted_at ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              <span>{new Date(assessment.submitted_at).toLocaleDateString('id-ID')}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(assessment.submitted_at).toLocaleTimeString('id-ID')}
                            </p>
                          </div>
                        ) : assessment?.unlocked_at ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 w-fit">
                              <History className="w-3 h-3" />
                              Pernah Dibuka Kembali
                            </span>
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">
                              Alasan: {assessment.unlock_reason}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {assessment && (
                            <button
                              onClick={() => handleOpenDetail(asg)}
                              title="Lihat Rincian Nilai"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {isSubmitted ? (
                            <button
                              onClick={() => openUnlockModal(assessment)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition shadow-2xs"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Buka Kunci</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Dapat diedit</span>
                          )}
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

      {/* Admin Unlock Confirmation Modal with Mandatory Reason */}
      <Modal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        title="Buka Kembali Penilaian Terkunci"
        description="Penilaian ini akan dikembalikan ke status DRAFT sehingga pewawancara dapat merevisi nilai."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmUnlock} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Peringatan Integritas Data
            </p>
            Alasan yang Anda tuliskan akan dicatat permanen dalam riwayat <strong>Audit Log</strong> sistem bersama identitas akun Admin Anda.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Alasan Pembukaan Kunci <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="Contoh: Pembetulan nilai komunikasi kandidat karena salah entri nilai oleh pewawancara."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Minimal 5 karakter</span>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUnlockModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={unlocking || unlockReason.trim().length < 5}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{unlocking ? 'Membuka...' : 'Buka Kunci Penilaian'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Assessment View Modal */}
      <Modal
        isOpen={Boolean(viewAssessment)}
        onClose={() => setViewAssessment(null)}
        title={`Rincian Penilaian: ${viewAssessment?.candidate?.full_name}`}
        description={`Pewawancara: ${viewAssessment?.interviewer?.name} • Status: ${viewAssessment?.status === 'submitted' ? 'Disubmit & Terkunci' : 'Draft'}`}
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          {/* Summary Header */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Nilai Akhir Terhitung</span>
              <p className="text-2xl font-black text-indigo-600">
                {viewAssessment?.final_score !== null && viewAssessment?.final_score !== undefined
                  ? viewAssessment.final_score.toFixed(2)
                  : '-'}
                <span className="text-xs text-slate-400 font-normal"> / 100</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Rekomendasi
              </span>
              <RecommendationBadge recommendation={viewAssessment?.recommendation} />
            </div>
          </div>

          {/* Scores Breakdown per Criteria */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Breakdown Nilai Tiap Aspek
            </h4>
            <div className="space-y-2">
              {viewAssessment?.scores?.map((sc) => {
                const criteriaObj = rubrics.find((r) => r.id === sc.criteria_id) || sc.criteria;
                const weight = criteriaObj ? criteriaObj.weight : 20;
                const weightedVal = ((sc.score * weight) / 100).toFixed(2);

                return (
                  <div
                    key={sc.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{criteriaObj?.name || 'Aspek Penilaian'}</p>
                      <p className="text-[10px] text-slate-500">
                        Bobot {weight}% • {sc.notes || 'Tidak ada catatan khusus.'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-800">{sc.score}</span>
                      <span className="text-[10px] text-slate-400 block">+{weightedVal} poin</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Qualitative Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <p className="font-bold text-emerald-900 mb-1">Kelebihan Utama:</p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                {viewAssessment?.strengths || '-'}
              </p>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <p className="font-bold text-amber-900 mb-1">Catatan Evaluasi / Kelemahan:</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                {viewAssessment?.weaknesses || '-'}
              </p>
            </div>
          </div>

          {viewAssessment?.general_notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <p className="font-bold text-slate-800 mb-1">Catatan Umum Pewawancara:</p>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {viewAssessment.general_notes}
              </p>
            </div>
          )}

          <div className="pt-2 text-right">
            <button
              onClick={() => setViewAssessment(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

