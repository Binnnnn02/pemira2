import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Lock,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';
import type {
  InterviewerAssignment,
  RubricCriteria,
  Assessment,
  RecommendationType
} from '../../types';
import { Modal } from '../../components/ui/Modal';
import { AssessmentStatusBadge } from '../../components/ui/Badge';

export const AssessmentWorkspacePage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<InterviewerAssignment | null>(null);
  const [rubrics, setRubrics] = useState<RubricCriteria[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [scoresMap, setScoresMap] = useState<Record<string, { score: number; notes: string }>>({});
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [recommendation, setRecommendation] = useState<RecommendationType | ''>('');

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vision Mission modal
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!assignmentId || !user) return;
      setLoading(true);
      try {
        const assignments = await dataService.getAssignments();
        const found = assignments.find((a) => a.id === assignmentId);

        if (!found) {
          error('Tidak Ditemukan', 'Penugasan wawancara tidak ditemukan.');
          navigate('/interviewer/candidates');
          return;
        }

        // Security check: interviewer only accesses own assignment (unless admin)
        if (user.role !== 'admin' && found.interviewer_id !== user.id) {
          error('Akses Ditolak', 'Anda hanya memiliki wewenang untuk menilai kandidat yang ditugaskan kepada Anda.');
          navigate('/interviewer/candidates');
          return;
        }

        setAssignment(found);

        const [rubList, currentAss] = await Promise.all([
          dataService.getRubricCriteria(found.period_id),
          dataService.getAssessment(assignmentId)
        ]);

        setRubrics(rubList);
        setAssessment(currentAss);

        // Prepopulate form fields if assessment exists
        const initialScores: Record<string, { score: number; notes: string }> = {};
        rubList.forEach((r) => {
          const existingScore = currentAss?.scores?.find((s) => s.criteria_id === r.id);
          initialScores[r.id] = {
            score: existingScore ? Number(existingScore.score) : 75, // default reasonable baseline
            notes: existingScore?.notes || ''
          };
        });
        setScoresMap(initialScores);

        if (currentAss) {
          setStrengths(currentAss.strengths || '');
          setWeaknesses(currentAss.weaknesses || '');
          setGeneralNotes(currentAss.general_notes || '');
          setRecommendation((currentAss.recommendation as RecommendationType) || '');
        }
      } catch (err: any) {
        error('Error', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [assignmentId, user, navigate]);

  const isLocked = assessment?.status === 'submitted';

  // Real-time calculation of weighted final score
  const activeRubrics = rubrics.filter((r) => r.is_active);
  let liveFinalScore = 0;
  activeRubrics.forEach((r) => {
    const scoreVal = scoresMap[r.id]?.score ?? 0;
    liveFinalScore += (scoreVal * Number(r.weight)) / 100;
  });
  liveFinalScore = Math.round(liveFinalScore * 100) / 100;

  const handleScoreChange = (criteriaId: string, value: number) => {
    if (isLocked) return;
    const bounded = Math.max(1, Math.min(100, isNaN(value) ? 1 : value));
    setScoresMap((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        score: bounded
      }
    }));
  };

  const handleNotesChange = (criteriaId: string, notes: string) => {
    if (isLocked) return;
    setScoresMap((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        notes
      }
    }));
  };

  const handleSaveDraft = async () => {
    if (!assignment || isLocked) return;
    try {
      await dataService.saveAssessmentDraft(
        assignment.id,
        {
          strengths,
          weaknesses,
          general_notes: generalNotes,
          recommendation: recommendation || null
        },
        scoresMap,
        user || undefined
      );
      success('Draft Disimpan', 'Penilaian tersimpan sebagai draft. Anda dapat melanjutkannya nanti.');
      // Refresh assessment state
      const updated = await dataService.getAssessment(assignment.id);
      setAssessment(updated);
    } catch (err: any) {
      error('Gagal Menyimpan Draft', err.message);
    }
  };

  const handleConfirmFinalSubmit = async () => {
    if (!assignment || isLocked) return;
    setIsSubmitting(true);
    try {
      await dataService.submitAssessmentFinal(
        assignment.id,
        {
          strengths,
          weaknesses,
          general_notes: generalNotes,
          recommendation: recommendation || null
        },
        scoresMap,
        user || undefined
      );
      success(
        'Penilaian Berhasil Disubmit',
        `Nilai final ${liveFinalScore.toFixed(2)} telah dikunci dan masuk ke dalam kalkulasi peringkat resmi.`
      );
      setIsSubmitModalOpen(false);
      // Reload updated status
      const updated = await dataService.getAssessment(assignment.id);
      setAssessment(updated);
    } catch (err: any) {
      error('Gagal Submit', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQualitativeTier = (score: number) => {
    if (score >= 85) return { label: 'Sangat Baik (85-100)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 70) return { label: 'Baik (70-84)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (score >= 50) return { label: 'Cukup (50-69)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Perlu Pembinaan (1-49)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-medium">
        Memuat lembar penilaian wawancara...
      </div>
    );
  }

  const candidate = assignment?.candidate;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(user?.role === 'admin' ? '/admin/assessments' : '/interviewer/candidates')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Kandidat</span>
        </button>

        <div className="flex items-center gap-2">
          <AssessmentStatusBadge status={assessment?.status} />
        </div>
      </div>

      {/* Candidate Sticky Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={
                candidate?.photo_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
              }
              alt={candidate?.full_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                  {candidate?.candidate_number}
                </span>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {candidate?.full_name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {candidate?.class_grade} • Calon{' '}
                <strong className="text-indigo-600 font-bold">{candidate?.target_position}</strong>
              </p>
              <button
                onClick={() => setIsVisionModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Visi & Misi Kandidat</span>
              </button>
            </div>
          </div>

          {/* Live Weighted Score Display Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between sm:justify-end gap-6 shadow-lg shadow-slate-950/20">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                {isLocked ? 'Skor Akhir Terkunci' : 'Kalkulasi Skor Live'}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Weighted sum: Σ (Nilai × Bobot%)
              </p>
            </div>
            <div className="text-right pl-4 border-l border-slate-800">
              <span className="text-3xl font-black text-emerald-400 leading-none">
                {liveFinalScore.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-normal block mt-1">/ 100.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Locked Status Banner (If Submitted) */}
      {isLocked && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 text-emerald-950 shadow-xs">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold leading-tight">
              Penilaian Telah Disubmit & Terkunci Permanen
            </h3>
            <p className="text-xs mt-1 text-emerald-800 leading-relaxed">
              Penilaian untuk kandidat ini telah difinalisasi pada{' '}
              <strong>
                {assessment?.submitted_at ? new Date(assessment.submitted_at).toLocaleString('id-ID') : '-'}
              </strong>
              . Sesuai regulasi PEMIRA, seluruh form penilaian terkunci dari perubahan untuk menjaga netralitas dan objektivitas. Hanya <strong>Administrator</strong> yang memiliki wewenang membuka kunci jika ada revisi sah.
            </p>
          </div>
        </div>
      )}

      {/* Rubric Criteria Evaluation Engine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Rubrik Penilaian Objektif (Rentang 1 – 100)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Total Bobot: <strong className="text-slate-900">100%</strong>
          </span>
        </div>

        {activeRubrics.map((criterion, idx) => {
          const currentVal = scoresMap[criterion.id]?.score ?? 75;
          const currentNotes = scoresMap[criterion.id]?.notes ?? '';
          const tier = getQualitativeTier(currentVal);
          const contribution = ((currentVal * Number(criterion.weight)) / 100).toFixed(2);

          return (
            <div
              key={criterion.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {criterion.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Bobot {criterion.weight}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {criterion.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-start">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${tier.color}`}>
                    {tier.label}
                  </span>
                </div>
              </div>

              {/* Slider + Number Input sync */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1.5">
                    <span>1 (Sangat Kurang)</span>
                    <span>50 (Cukup)</span>
                    <span>100 (Sempurna)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    disabled={isLocked}
                    value={currentVal}
                    onChange={(e) => handleScoreChange(criterion.id, Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Nilai:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      disabled={isLocked}
                      value={currentVal}
                      onChange={(e) => handleScoreChange(criterion.id, Number(e.target.value))}
                      className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-center font-black text-sm text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                  </div>
                  <div className="text-right border-l border-slate-200 pl-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Kontribusi
                    </span>
                    <span className="text-xs font-black text-slate-800">+{contribution}</span>
                  </div>
                </div>
              </div>

              {/* Notes per aspect */}
              <div>
                <input
                  type="text"
                  disabled={isLocked}
                  value={currentNotes}
                  onChange={(e) => handleNotesChange(criterion.id, e.target.value)}
                  placeholder={`Catatan pengamatan untuk aspek ${criterion.name}...`}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Qualitative Feedback & Overall Recommendation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Evaluasi Kualitatif & Rekomendasi Panelis
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Kelebihan Utama Siswa
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Catat potensi kepemimpinan, karakter menonjol, dan daya tarik kandidat..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Catatan Evaluasi / Kelemahan
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              placeholder="Catat aspek yang perlu pembinaan intensif atau risiko kepengurusan..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 leading-relaxed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Catatan Keseluruhan (Opsional)
          </label>
          <textarea
            rows={2}
            disabled={isLocked}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Catatan tambahan untuk tim formatur atau pembina OSIS..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Rekomendasi Panelis Wawancara
          </label>
          <select
            disabled={isLocked}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as RecommendationType)}
            className="w-full sm:w-80 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50"
          >
            <option value="">Pilih Rekomendasi Kepengurusan...</option>
            <option value="highly_recommended">Sangat Direkomendasikan (Highly Recommended)</option>
            <option value="recommended">Direkomendasikan (Recommended)</option>
            <option value="considered">Dipertimbangkan (Considered)</option>
            <option value="not_recommended">Tidak Direkomendasikan (Not Recommended)</option>
          </select>
        </div>
      </div>

      {/* Action Buttons Bar */}
      {!isLocked && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="text-xs text-slate-500">
            Nilai Akhir Terhitung:{' '}
            <strong className="text-indigo-600 font-black text-sm">{liveFinalScore.toFixed(2)}</strong>{' '}
            / 100
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Simpan Sebagai Draft</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Submit Nilai Final</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Final Submit */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Konfirmasi Submit Nilai Final"
        description="Harap pastikan seluruh nilai telah diisi secara cermat."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-500">Nilai Akhir Terhitung</span>
            <p className="text-3xl font-black text-indigo-700 mt-0.5">
              {liveFinalScore.toFixed(2)}
            </p>
            <p className="text-xs text-indigo-900/80 mt-1">
              Kandidat: <strong>{candidate?.full_name}</strong>
            </p>
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              Perhatian: Penilaian Akan Terkunci
            </p>
            Setelah Anda menekan tombol <strong>Kunci & Submit Final</strong>, nilai tidak dapat diubah kembali oleh Anda dan langsung masuk ke klasemen resmi. Hanya Admin yang dapat membuka kunci jika terdapat alasan sah.
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal & Periksa Lagi
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmFinalSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Memproses...' : 'Kunci & Submit Final'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Candidate Vision Mission Modal */}
      <Modal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        title={`Visi & Misi: ${candidate?.full_name}`}
        description={`Kandidat #${candidate?.candidate_number} • ${candidate?.class_grade} • ${candidate?.target_position}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Visi
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
              {candidate?.vision || 'Belum diisi.'}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Misi
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed">
              {candidate?.mission || 'Belum diisi.'}
            </div>
          </div>
          <div className="pt-2 text-right">
            <button
              onClick={() => setIsVisionModalOpen(false)}
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

