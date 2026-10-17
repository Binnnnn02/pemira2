import React, { useState, useEffect } from 'react';
import { Plus, Mail, Phone, Search } from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { UserProfile, InterviewerAssignment } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/ui/EmptyState';

export const InterviewersPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [interviewers, setInterviewers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, asgList] = await Promise.all([
        dataService.getInterviewers(),
        dataService.getAssignments()
      ]);
      setInterviewers(allUsers);
      setAssignments(asgList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword) {
      warning('Data Tidak Lengkap', 'Nama, email, dan password wajib diisi.');
      return;
    }

    try {
      await dataService.createInterviewer(
        {
          name: formName.trim(),
          email: formEmail.trim(),
          avatar_url: undefined,
          is_active: true
        },
        formPassword,
        user || undefined
      );
      success('Berhasil', 'Pewawancara baru telah berhasil didaftarkan.');
      setIsModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      await loadData();
    } catch (err: any) {
      error('Gagal Menyimpan', err.message);
    }
  };

  const handleToggleActive = async (interviewer: UserProfile) => {
    try {
      await dataService.updateInterviewer(
        interviewer.id,
        { is_active: !interviewer.is_active },
        user || undefined
      );
      success(
        'Status Diperbarui',
        `Pewawancara ${interviewer.name} sekarang ${!interviewer.is_active ? 'aktif' : 'nonaktif'}.`
      );
      await loadData();
    } catch (err: any) {
      error('Gagal', err.message);
    }
  };

  const filteredInterviewers = interviewers.filter(
    (int) =>
      int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Manajemen Pewawancara</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar panelis penguji yang berhak memberikan penilaian wawancara kandidat PEMIRA.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pewawancara</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau email pewawancara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Grid of Interviewer Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-500 font-medium">
          Memuat data pewawancara...
        </div>
      ) : filteredInterviewers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8">
          <EmptyState
            title="Tidak Ada Pewawancara"
            description="Belum ada pewawancara yang terdaftar atau cocok dengan pencarian Anda."
            action={{
              label: 'Daftarkan Pewawancara',
              onClick: () => setIsModalOpen(true)
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInterviewers.map((int) => {
            const assignedCount = assignments.filter(
              (a) => a.interviewer_id === int.id && a.status === 'active'
            ).length;

            return (
              <div
                key={int.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          int.avatar_url ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                        }
                        alt={int.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{int.name}</h4>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold mt-1">
                          Panelis Penilai
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(int)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition border ${
                        int.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {int.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{int.email}</span>
                    </div>
                    {int.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{int.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Kandidat Ditugaskan:{' '}
                    <strong className="text-indigo-600 font-bold">{assignedCount} Orang</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Interviewer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Daftarkan Pewawancara Baru"
        description="Masukkan identitas panelis atau guru penguji wawancara PEMIRA."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Nama Lengkap & Gelar
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: Dra. Sri Wahyuni, M.Pd"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Alamat Email
            </label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="sri.wahyuni@pemira.sch.id"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Password Login</label>
            <input type="password" required minLength={8} autoComplete="new-password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Minimal 8 karakter" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="mt-1 text-[10px] text-slate-500">Password digunakan untuk login dan tidak disimpan dalam tabel profil.</p>
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
              Daftarkan Pewawancara
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

