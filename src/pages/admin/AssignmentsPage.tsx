import React, { useState, useEffect } from 'react';
import { ShieldAlert, UserPlus } from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { Candidate, InterviewerAssignment, UserProfile, Period } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { AssessmentStatusBadge } from '../../components/ui/Badge';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviewers, setInterviewers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const period = await dataService.getActivePeriod();
      setActivePeriod(period);
      if (period) {
        const [candList, intList, asgList] = await Promise.all([
          dataService.getCandidates(period.id),
          dataService.getInterviewers(),
          dataService.getAssignments(period.id)
        ]);
        setCandidates(candList);
        setInterviewers(intList.filter((i) => i.is_active));
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
  }, []);

  const openAssignModal = (cand: Candidate) => {
    setSelectedCandidate(cand);
    const existing = assignments.find((a) => a.candidate_id === cand.id && a.status === 'active');
    setSelectedInterviewerId(existing ? existing.interviewer_id : interviewers[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeriod || !selectedCandidate || !selectedInterviewerId) return;

    try {
      await dataService.assignInterviewer(
        activePeriod.id,
        selectedCandidate.id,
        selectedInterviewerId,
        user || undefined
      );
      success(
        'Penugasan Berhasil',
        `Pewawancara untuk kandidat ${selectedCandidate.full_name} berhasil ditetapkan.`
      );
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('Gagal Menetapkan', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Penugasan Pewawancara Kandidat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aturan: Tepat satu (1) pewawancara aktif per kandidat dalam satu periode pemilihan.
          </p>
        </div>
      </div>

      {/* Institutional Rule Notice Card */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="text-xs text-indigo-900 leading-relaxed">
          <p className="font-bold">Standar Prosedur Operasional (SOP) Penilaian:</p>
          <p className="mt-0.5 text-indigo-700">
            Sistem secara ketat menerapkan indeks unik database (RLS & Check Constraint) yang memastikan setiap kandidat hanya memiliki satu panelis pewawancara aktif. Jika dilakukan penugasan ulang, penugasan sebelumnya akan dialihkan statusnya menjadi <em>replaced</em> untuk integritas riwayat penilaian.
          </p>
        </div>
      </div>

      {/* Candidate-Interviewer Assignment Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            Memuat matriks penugasan wawancara...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-16 text-center">No.</th>
                <th className="py-3 px-4">Kandidat</th>
                <th className="py-3 px-4">Jabatan Target</th>
                <th className="py-3 px-4">Pewawancara Aktif Saat Ini</th>
                <th className="py-3 px-4 text-center">Status Penilaian</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {candidates.map((cand) => {
                const currentAssignment = assignments.find(
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
                          <p className="text-[10px] text-slate-400">{cand.class_grade}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {cand.target_position}
                    </td>
                    <td className="py-3.5 px-4">
                      {currentAssignment?.interviewer ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              currentAssignment.interviewer.avatar_url ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                            }
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {currentAssignment.interviewer.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {currentAssignment.interviewer.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Belum Ditugaskan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <AssessmentStatusBadge status={currentAssignment?.assessment?.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openAssignModal(cand)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs transition shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>
                          {currentAssignment ? 'Ganti Pewawancara' : 'Tugaskan Pewawancara'}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tetapkan Pewawancara Aktif"
        description={`Kandidat: ${selectedCandidate?.full_name} (${selectedCandidate?.target_position})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Pilih Panelis Pewawancara Aktif
            </label>
            <select
              value={selectedInterviewerId}
              onChange={(e) => setSelectedInterviewerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {interviewers.map((int) => (
                <option key={int.id} value={int.id}>
                  {int.name} ({int.email})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <strong>Catatan Wewenang:</strong> Sesuai regulasi PEMIRA, satu kandidat hanya dapat dinilai oleh 1 pewawancara aktif dalam satu periode. Penugasan baru akan otomatis menggantikan penugasan aktif sebelumnya.
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
              Simpan Penugasan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

