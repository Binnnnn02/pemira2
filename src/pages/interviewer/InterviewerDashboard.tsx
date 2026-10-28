import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileEdit,
  Calendar,
  Lock,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import type { InterviewerAssignment, InterviewSchedule, Period } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { AssessmentStatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export const InterviewerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [myAssignments, setMyAssignments] = useState<InterviewerAssignment[]>([]);
  const [mySchedules, setMySchedules] = useState<InterviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const period = await dataService.getActivePeriod();
        setActivePeriod(period);
        if (period) {
          const [asgs, schs] = await Promise.all([
            dataService.getAssignments(period.id, user.id),
            dataService.getSchedules(period.id, user.id)
          ]);
          setMyAssignments(asgs);
          setMySchedules(schs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const totalAssigned = myAssignments.length;
  const submittedCount = myAssignments.filter((a) => a.assessment?.status === 'submitted').length;
  const draftCount = myAssignments.filter((a) => a.assessment?.status === 'draft').length;
  const pendingCount = totalAssigned - submittedCount - draftCount;

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-medium">
        Memuat dashboard pewawancara...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Panel Wawancara Resmi PEMIRA
          </span>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight break-words">
            Halo, {user?.name}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-2 leading-relaxed">
            Anda ditugaskan sebagai panelis pewawancara untuk {totalAssigned} kandidat pada {activePeriod?.name}. Silakan isi skor rubrik objektif dan simpan draft atau submit penilaian final.
          </p>

          <div className="mt-6">
            <button
              onClick={() => navigate('/interviewer/candidates')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold transition shadow-sm"
            >
              <span>Mulai Menilai Kandidat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Kandidat Ditugaskan"
          value={`${totalAssigned} Siswa`}
          subtitle="Tugas Wawancara Anda"
          icon={<Users className="w-6 h-6" />}
          colorScheme="indigo"
        />
        <StatCard
          title="Telah Disubmit (Terkunci)"
          value={`${submittedCount} Siswa`}
          subtitle="Nilai Telah Difinalisasi"
          icon={<CheckCircle2 className="w-6 h-6" />}
          colorScheme="emerald"
        />
        <StatCard
          title="Draft Tersimpan"
          value={`${draftCount} Siswa`}
          subtitle="Dapat Diubah Kapan Saja"
          icon={<FileEdit className="w-6 h-6" />}
          colorScheme="amber"
        />
        <StatCard
          title="Belum Dinilai"
          value={`${pendingCount} Siswa`}
          subtitle="Menunggu Sesi Wawancara"
          icon={<Clock className="w-6 h-6" />}
          colorScheme="purple"
        />
      </div>

      {/* Main Grid: My Assigned Candidates & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Candidates List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Kandidat Tugas Anda</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih kandidat untuk mengisi form penilaian terstandar
              </p>
            </div>
            <button
              onClick={() => navigate('/interviewer/candidates')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Lihat Semua
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {myAssignments.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="Belum Ada Penugasan"
                  description="Admin belum menetapkan kandidat untuk Anda wawancarai pada periode aktif ini."
                />
              </div>
            ) : (
              myAssignments.map((asg) => {
                const assessment = asg.assessment;
                const isSubmitted = assessment?.status === 'submitted';

                return (
                  <div key={asg.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0">
                        {asg.candidate?.candidate_number}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {asg.candidate?.full_name}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {asg.candidate?.target_position} • {asg.candidate?.class_grade}
                        </p>
                        <div className="mt-1">
                          <AssessmentStatusBadge status={assessment?.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {assessment?.final_score !== null && assessment?.final_score !== undefined && (
                        <div className="text-right hidden sm:block">
                          <span className="text-xs font-black text-indigo-600">
                            {assessment.final_score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">/ 100</span>
                        </div>
                      )}

                      <button
                        onClick={() => navigate(`/interviewer/assessments/${asg.id}`)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                          isSubmitted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isSubmitted ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Lihat Nilai</span>
                          </>
                        ) : (
                          <>
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>{assessment ? 'Lanjutkan Nilai' : 'Mulai Nilai'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Schedule Sidebar (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Jadwal Sesi Anda</h3>
              <p className="text-xs text-slate-500 mt-0.5">Agenda wawancara mendatang</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {mySchedules.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada jadwal sesi yang ditentukan oleh administrator.
              </div>
            ) : (
              mySchedules.map((sch) => {
                const asg = myAssignments.find((a) => a.id === sch.assignment_id);

                return (
                  <div
                    key={sch.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{asg?.candidate?.full_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {sch.duration_minutes} Mnt
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(sch.scheduled_at).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}{' '}
                        • {new Date(sch.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sch.location}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

