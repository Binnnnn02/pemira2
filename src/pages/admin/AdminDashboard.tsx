import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CheckCircle2,
  Award,
  Plus,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { RecommendationBadge } from '../../components/ui/Badge';
import { dataService } from '../../lib/dataService';
import type { Candidate, InterviewerAssignment, Period, RankingItem, AuditLog } from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const period = await dataService.getActivePeriod();
        setActivePeriod(period);

        if (period) {
          const [cands, asgs, ranks, logs] = await Promise.all([
            dataService.getCandidates(period.id),
            dataService.getAssignments(period.id),
            dataService.getRankings(period.id),
            dataService.getAuditLogs()
          ]);
          setCandidates(cands);
          setAssignments(asgs);
          setRankings(ranks);
          setRecentLogs(logs.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const totalCandidates = candidates.length;
  const assignedCount = assignments.filter((a) => a.status === 'active').length;
  const submittedAssessments = assignments.filter((a) => a.assessment?.status === 'submitted').length;
  const completionPercentage = totalCandidates > 0 ? Math.round((submittedAssessments / totalCandidates) * 100) : 0;

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-medium">
        Memuat data dashboard admin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Panel Pengawas Utama
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Selamat Datang di Portal Admin PEMIRA
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-2 leading-relaxed">
            Kelola data kandidat, penugasan satu pewawancara aktif per kandidat, rubrik bobot 100%, serta pantau hasil peringkat wawancara secara real-time.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/admin/candidates')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kelola Kandidat</span>
            </button>
            <button
              onClick={() => navigate('/admin/rubric')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 text-white text-xs font-bold transition border border-indigo-400/30"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Atur Rubrik (100%)</span>
            </button>
            <button
              onClick={() => navigate('/admin/results')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 text-white text-xs font-bold transition border border-indigo-400/30"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Lihat Ranking Final</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Kandidat"
          value={totalCandidates}
          subtitle={`Periode ${activePeriod?.academic_year || 'Aktif'}`}
          icon={<Users className="w-6 h-6" />}
          colorScheme="indigo"
        />
        <StatCard
          title="Penugasan Pewawancara"
          value={`${assignedCount} / ${totalCandidates}`}
          subtitle="1 Pewawancara per Kandidat"
          icon={<UserCheck className="w-6 h-6" />}
          colorScheme="purple"
        />
        <StatCard
          title="Penilaian Disubmit"
          value={`${submittedAssessments} Kandidat`}
          subtitle={`${completionPercentage}% Telah Selesai`}
          icon={<CheckCircle2 className="w-6 h-6" />}
          colorScheme="emerald"
        />
        <StatCard
          title="Top Skor Sementara"
          value={rankings.length > 0 ? `${rankings[0].final_score.toFixed(1)} / 100` : '-'}
          subtitle={rankings.length > 0 ? rankings[0].candidate.full_name : 'Belum ada penilaian final'}
          icon={<Award className="w-6 h-6" />}
          colorScheme="amber"
        />
      </div>

      {/* Progress & Quick Stats Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Progres Penyelesaian Wawancara Periode Ini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target kelengkapan penilaian final terkunci sebelum rapat pleno penetapan
            </p>
          </div>
          <span className="text-xl font-black text-indigo-600 sm:text-right">
            {completionPercentage}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{submittedAssessments} dari {totalCandidates} penilaian telah difinalisasi dan terkunci</span>
          <span className="font-semibold text-slate-700">
            {totalCandidates - submittedAssessments} kandidat masih dalam proses
          </span>
        </div>
      </div>

      {/* Split Section: Top Ranking Preview & Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Ranking Preview (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Klasemen Nilai Final (Top 5)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hanya menghitung penilaian yang sudah disubmit</p>
            </div>
            <button
              onClick={() => navigate('/admin/results')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Selengkapnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {rankings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada penilaian final yang disubmit oleh pewawancara.
              </div>
            ) : (
              rankings.slice(0, 5).map((item) => (
                <div key={item.candidate.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        item.rank === 1
                          ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                          : item.rank === 2
                          ? 'bg-slate-200 text-slate-700'
                          : item.rank === 3
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.rank}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.candidate.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        No. {item.candidate.candidate_number} • {item.candidate.class_grade} • {item.candidate.target_position}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-indigo-600">
                      {item.final_score.toFixed(2)}
                    </span>
                    <div className="mt-0.5">
                      <RecommendationBadge recommendation={item.recommendation} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Logs (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Aktivitas Audit</h3>
              <p className="text-xs text-slate-500 mt-0.5">Log aktivitas terkini</p>
            </div>
            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Belum ada aktivitas tercatat.</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="text-xs pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{log.actor_email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

