import React, { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { AuditLog } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.actor_email && l.actor_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.target_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Audit Log Aktivitas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekam jejak transaksional seluruh aksi krusial: submit final, pembukaan kunci oleh admin, penugasan, dan perubahan rubrik.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aksi (SUBMIT, UNLOCK), email aktor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            Memuat catatan audit...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak Ada Catatan Audit"
              description="Belum ada aktivitas yang terekam atau sesuai dengan kata kunci pencarian."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Aktor / Pengguna</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">Tindakan / Action</th>
                  <th className="py-3 px-4">Tipe Target</th>
                  <th className="py-3 px-4">Rincian Singkat</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const isUnlock = log.action.includes('UNLOCK');
                  const isSubmit = log.action.includes('SUBMIT');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{log.actor_email || 'Sistem'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.actor_role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {log.actor_role || 'system'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold font-mono text-[11px] px-2 py-0.5 rounded-md ${
                            isUnlock
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isSubmit
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600 uppercase text-[10px]">
                        {log.target_type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* JSON Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Rincian Audit Log"
        description={`ID: ${selectedLog?.id} • Waktu: ${selectedLog ? new Date(selectedLog.created_at).toLocaleString('id-ID') : ''}`}
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Aktor</p>
              <p className="font-bold text-slate-900">{selectedLog?.actor_email}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Aksi</p>
              <p className="font-mono font-bold text-indigo-600">{selectedLog?.action}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Payload Rincian (JSON Details)
            </h4>
            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
              {JSON.stringify(selectedLog?.details, null, 2)}
            </pre>
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={() => setSelectedLog(null)}
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

