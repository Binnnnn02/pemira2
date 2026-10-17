import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Edit2, UserCheck } from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { InterviewSchedule, InterviewerAssignment, Period } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/ui/EmptyState';

export const SchedulesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [schedules, setSchedules] = useState<InterviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState(45);
  const [formLocation, setFormLocation] = useState('Ruang Rapat OSIS');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<any>('scheduled');

  const loadData = async () => {
    setLoading(true);
    try {
      const period = await dataService.getActivePeriod();
      setActivePeriod(period);
      if (period) {
        const [asgs, schs] = await Promise.all([
          dataService.getAssignments(period.id),
          dataService.getSchedules(period.id)
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

  useEffect(() => {
    loadData();
  }, []);

  const openScheduleModal = (asg: InterviewerAssignment) => {
    setSelectedAssignmentId(asg.id);
    const existing = schedules.find((s) => s.assignment_id === asg.id);
    if (existing) {
      const dt = new Date(existing.scheduled_at);
      setFormDate(dt.toISOString().split('T')[0]);
      setFormTime(dt.toTimeString().substring(0, 5));
      setFormDuration(existing.duration_minutes);
      setFormLocation(existing.location);
      setFormNotes(existing.notes || '');
      setFormStatus(existing.status);
    } else {
      setFormDate('2026-10-20');
      setFormTime('09:00');
      setFormDuration(45);
      setFormLocation('Ruang Rapat OSIS');
      setFormNotes('');
      setFormStatus('scheduled');
    }
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId || !formDate || !formTime) {
      warning('Data Kurang', 'Silakan pilih tanggal dan jam wawancara.');
      return;
    }

    try {
      const scheduledDateTime = new Date(`${formDate}T${formTime}:00`).toISOString();
      await dataService.saveSchedule(
        {
          assignment_id: selectedAssignmentId,
          scheduled_at: scheduledDateTime,
          duration_minutes: Number(formDuration),
          location: formLocation.trim(),
          notes: formNotes.trim() || undefined,
          status: formStatus
        },
        user || undefined
      );
      success('Jadwal Disimpan', 'Jadwal wawancara berhasil ditetapkan.');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('Gagal Menyimpan', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Jadwal Sesi Wawancara Kandidat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur waktu, durasi, dan ruang wawancara untuk periode {activePeriod?.name || 'aktif'}.
          </p>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            Memuat jadwal wawancara...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum Ada Penugasan"
              description="Daftarkan kandidat dan tetapkan pewawancara terlebih dahulu untuk mengatur jadwal wawancara."
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
                  <th className="py-3 px-4">Waktu & Tanggal</th>
                  <th className="py-3 px-4">Lokasi / Ruang</th>
                  <th className="py-3 px-4 text-center">Status Sesi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {assignments.map((asg) => {
                  const schedule = schedules.find((s) => s.assignment_id === asg.id);

                  return (
                    <tr key={asg.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 text-center font-black text-indigo-600">
                        {asg.candidate?.candidate_number || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 leading-tight">
                          {asg.candidate?.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {asg.candidate?.target_position} • {asg.candidate?.class_grade}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{asg.interviewer?.name || 'Belum Ditugaskan'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {schedule ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">
                              {new Date(schedule.scheduled_at).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {new Date(schedule.scheduled_at).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}{' '}
                                ({schedule.duration_minutes} Menit)
                              </span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                            Belum Terjadwal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {schedule ? (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{schedule.location}</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {schedule?.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Selesai
                          </span>
                        ) : schedule?.status === 'in_progress' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Berlangsung
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Dijadwalkan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openScheduleModal(asg)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs transition shadow-2xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{schedule ? 'Ubah Jadwal' : 'Atur Jadwal'}</span>
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

      {/* Schedule Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Atur Jadwal Sesi Wawancara"
        description="Tentukan waktu pelaksanaan dan ruangan wawancara."
      >
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Tanggal Sesi
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Waktu Mulai
              </label>
              <input
                type="time"
                required
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Durasi (Menit)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                value={formDuration}
                onChange={(e) => setFormDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Status Sesi
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="scheduled">Dijadwalkan (Scheduled)</option>
                <option value="in_progress">Sedang Berlangsung (In Progress)</option>
                <option value="completed">Selesai (Completed)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Ruang / Tempat Wawancara
            </label>
            <input
              type="text"
              required
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="Contoh: Ruang Rapat OSIS / Lab Komputer 1"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Catatan Khusus Sesi (Opsional)
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Contoh: Kandidat dimohon hadir 10 menit lebih awal dengan portofolio."
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
              Simpan Jadwal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

