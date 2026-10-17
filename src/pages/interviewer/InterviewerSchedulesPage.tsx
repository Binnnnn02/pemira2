import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, FileEdit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import type { InterviewSchedule, InterviewerAssignment } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';

export const InterviewerSchedulesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<InterviewSchedule[]>([]);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const period = await dataService.getActivePeriod();
        if (period) {
          const [asgs, schs] = await Promise.all([
            dataService.getAssignments(period.id, user.id),
            dataService.getSchedules(period.id, user.id)
          ]);
          setAssignments(asgs);
          setSchedules(schs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Jadwal Wawancara Anda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar sesi wawancara yang telah diagendakan oleh administrator untuk Anda.
          </p>
        </div>
      </div>

      {/* Schedules Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-500 font-medium">
          Memuat agenda wawancara...
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8">
          <EmptyState
            title="Belum Ada Jadwal Sesi"
            description="Administrator belum menetapkan jadwal tanggal dan ruangan untuk kandidat yang Anda ampu."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((sch) => {
            const asg = assignments.find((a) => a.id === sch.assignment_id);
            const cand = asg?.candidate;

            return (
              <div
                key={sch.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 shrink-0 mt-0.5">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {cand?.candidate_number}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{cand?.full_name}</h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        {cand?.target_position}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(sch.scheduled_at).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}{' '}
                          • {new Date(sch.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{' '}
                          ({sch.duration_minutes} Menit)
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 font-semibold text-indigo-600">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{sch.location}</span>
                      </span>
                    </div>

                    {sch.notes && (
                      <p className="text-[11px] text-slate-500 mt-1.5 italic">
                        Catatan: &ldquo;{sch.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {asg && (
                    <button
                      onClick={() => navigate(`/interviewer/assessments/${asg.id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Buka Form Penilaian</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

