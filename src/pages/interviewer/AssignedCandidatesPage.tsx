import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, Lock, Calendar, MapPin, Search, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import type { InterviewerAssignment, Period, Candidate } from '../../types';
import { AssessmentStatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';

export const AssignedCandidatesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const period = await dataService.getActivePeriod();
        setActivePeriod(period);
        if (period) {
          const asgs = await dataService.getAssignments(period.id, user.id);
          setAssignments(asgs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const filtered = assignments.filter((a) => {
    const cand = a.candidate;
    if (!cand) return false;
    return (
      cand.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.candidate_number.includes(searchQuery) ||
      cand.class_grade.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Kandidat Tugas Wawancara Anda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar siswa periode {activePeriod?.name || 'aktif'} yang ditugaskan khusus kepada Anda. Klik tombol nilai untuk membuka lembar evaluasi.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kandidat berdasarkan nomor atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Grid of Candidate Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-500 font-medium">
          Memuat daftar kandidat tugas wawancara...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8">
          <EmptyState
            title="Tidak Ada Kandidat Ditugaskan"
            description="Tidak ada data kandidat yang cocok dengan pencarian Anda atau belum ada penugasan dari Admin."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((asg) => {
            const cand = asg.candidate;
            const assessment = asg.assessment;
            const isSubmitted = assessment?.status === 'submitted';
            const schedule = asg.schedule;

            if (!cand) return null;

            return (
              <div
                key={asg.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          cand.photo_url ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                        }
                        alt={cand.full_name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                            {cand.candidate_number}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {cand.full_name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {cand.class_grade} • <strong className="text-indigo-600 font-semibold">{cand.target_position}</strong>
                        </p>
                      </div>
                    </div>
                    <AssessmentStatusBadge status={assessment?.status} />
                  </div>

                  {/* Visi Misi Preview link */}
                  <div className="mt-3.5 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setViewCandidate(cand)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Visi & Misi Siswa</span>
                    </button>
                    {assessment?.final_score !== null && assessment?.final_score !== undefined && (
                      <span className="text-xs font-bold text-slate-700">
                        Skor: <strong className="text-indigo-600 font-black text-sm">{assessment.final_score.toFixed(1)}</strong>
                      </span>
                    )}
                  </div>

                  {/* Schedule Snippet */}
                  {schedule && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(schedule.scheduled_at).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}{' '}
                          • {new Date(schedule.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>{schedule.location}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {isSubmitted ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Nilai telah disubmit & terkunci
                      </span>
                    ) : assessment?.status === 'draft' ? (
                      <span className="text-amber-700 font-semibold">
                        Draft tersimpan, dapat diedit
                      </span>
                    ) : (
                      'Belum dilakukan penilaian'
                    )}
                  </span>

                  <button
                    onClick={() => navigate(`/interviewer/assessments/${asg.id}`)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                      isSubmitted
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isSubmitted ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Buka Lembar Penilaian</span>
                      </>
                    ) : (
                      <>
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>{assessment ? 'Lanjutkan Penilaian' : 'Isi Penilaian'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Profile / Vision Mission Modal */}
      <Modal
        isOpen={Boolean(viewCandidate)}
        onClose={() => setViewCandidate(null)}
        title={`Profil & Visi Misi: ${viewCandidate?.full_name}`}
        description={`Kandidat #${viewCandidate?.candidate_number} • ${viewCandidate?.class_grade} • ${viewCandidate?.target_position}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Visi Kandidat
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
              {viewCandidate?.vision || 'Belum diisi.'}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Misi Kandidat
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed">
              {viewCandidate?.mission || 'Belum diisi.'}
            </div>
          </div>
          <div className="pt-2 text-right">
            <button
              onClick={() => setViewCandidate(null)}
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

