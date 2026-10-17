import React, { useState, useEffect } from 'react';
import {
  Download,
  Eye,
  Trophy
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import type { Period, RankingItem, RubricCriteria } from '../../types';
import { RecommendationBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../../components/ui/EmptyState';

export const ResultsRankingPage: React.FC = () => {
  const { success, error } = useToast();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [rubrics, setRubrics] = useState<RubricCriteria[]>([]);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedRankItem, setSelectedRankItem] = useState<RankingItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const periodList = await dataService.getPeriods();
      setPeriods(periodList);

      const active = periodList.find((p) => p.is_active) || periodList[0];
      const pId = selectedPeriodId || active?.id;
      if (pId) {
        setSelectedPeriodId(pId);
        const [rubList, rankList] = await Promise.all([
          dataService.getRubricCriteria(pId),
          dataService.getRankings(pId)
        ]);
        setRubrics(rubList);
        setRankings(rankList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriodId]);

  const handleExportCSV = async () => {
    if (!selectedPeriodId) return;
    try {
      const csvData = await dataService.exportRankingsToCSV(selectedPeriodId);
      const periodName = periods.find((p) => p.id === selectedPeriodId)?.academic_year || 'PEMIRA';
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Hasil_Wawancara_PEMIRA_${periodName.replace('/', '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Ekspor Berhasil', 'File laporan CSV hasil penilaian wawancara berhasil diunduh.');
    } catch (err: any) {
      error('Gagal Mengekspor', err.message);
    }
  };

  const filteredRankings = rankings.filter((item) => {
    if (positionFilter === 'ALL') return true;
    return item.candidate.target_position === positionFilter;
  });

  const top1 = filteredRankings[0];
  const top2 = filteredRankings[1];
  const top3 = filteredRankings[2];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Klasemen Hasil & Ranking Wawancara
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Peringkat resmi dihitung secara otomatis dari bobot kriteria 100% dan hanya memproses penilaian final yang disubmit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={rankings.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Target Position Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['ALL', 'Ketua OSIS', 'Wakil Ketua OSIS', 'Ketua MPK'].map((pos) => (
          <button
            key={pos}
            onClick={() => setPositionFilter(pos)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              positionFilter === pos
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {pos === 'ALL' ? 'Semua Posisi' : pos}
          </button>
        ))}
      </div>

      {/* Podium Top 3 (Render only when at least 1 ranking exists) */}
      {filteredRankings.length > 0 && (
        <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="text-center mb-6">
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold block">
              Peringkat Teratas
            </span>
            <h3 className="text-lg font-black tracking-tight mt-0.5">
              Kandidat Terbaik Seleksi Wawancara
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-3xl mx-auto pt-4">
            {/* 2nd Place */}
            {top2 ? (
              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 text-center flex flex-col items-center order-2 md:order-1">
                <div className="relative mb-3">
                  <img
                    src={top2.candidate.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={top2.candidate.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-400"
                  />
                  <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-slate-400 text-slate-900 font-black text-xs flex items-center justify-center shadow-md">
                    2
                  </div>
                </div>
                <h4 className="font-bold text-sm truncate max-w-full">{top2.candidate.full_name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{top2.candidate.target_position}</p>
                <div className="mt-3 py-1 px-3 rounded-full bg-slate-700 text-slate-200 font-black text-base">
                  {top2.final_score.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="hidden md:block order-2 md:order-1" />
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="bg-gradient-to-b from-amber-500/20 to-slate-800/90 rounded-2xl p-6 border-2 border-amber-400/60 text-center flex flex-col items-center order-1 md:order-2 shadow-xl shadow-amber-500/10">
                <div className="relative mb-3">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <img
                    src={top1.candidate.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={top1.candidate.full_name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 ring-4 ring-amber-400/20"
                  />
                  <div className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center shadow-lg">
                    1
                  </div>
                </div>
                <h4 className="font-black text-base truncate max-w-full text-amber-200">
                  {top1.candidate.full_name}
                </h4>
                <p className="text-xs text-amber-100/70 mt-0.5">{top1.candidate.target_position}</p>
                <div className="mt-3 py-1.5 px-4 rounded-full bg-amber-400 text-amber-950 font-black text-xl shadow-sm">
                  {top1.final_score.toFixed(2)}
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 ? (
              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 text-center flex flex-col items-center order-3">
                <div className="relative mb-3">
                  <img
                    src={top3.candidate.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={top3.candidate.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-700"
                  />
                  <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                    3
                  </div>
                </div>
                <h4 className="font-bold text-sm truncate max-w-full">{top3.candidate.full_name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{top3.candidate.target_position}</p>
                <div className="mt-3 py-1 px-3 rounded-full bg-slate-700 text-slate-200 font-black text-base">
                  {top3.final_score.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="hidden md:block order-3" />
            )}
          </div>
        </div>
      )}

      {/* Complete Rankings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            Memuat data klasemen & ranking wawancara...
          </div>
        ) : filteredRankings.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Belum Ada Hasil Penilaian Final"
              description="Sistem hanya meranking kandidat yang penilaiannya telah berstatus disubmit dan terkunci oleh pewawancara."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4 w-16 text-center">No.</th>
                  <th className="py-3 px-4">Kandidat</th>
                  <th className="py-3 px-4">Jabatan Target</th>
                  <th className="py-3 px-4">Pewawancara</th>
                  {/* Dynamic criteria headers */}
                  {rubrics.map((r) => (
                    <th key={r.id} className="py-3 px-3 text-center">
                      <span className="block truncate max-w-[80px]" title={r.name}>
                        {r.name}
                      </span>
                      <span className="text-[9px] font-normal text-slate-400">({r.weight}%)</span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">Nilai Akhir</th>
                  <th className="py-3 px-4 text-center">Rekomendasi</th>
                  <th className="py-3 px-4 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRankings.map((item) => (
                  <tr key={item.candidate.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 text-center font-black">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          item.rank === 1
                            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-200 text-slate-700'
                            : item.rank === 3
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-indigo-600">
                      {item.candidate.candidate_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            item.candidate.photo_url ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                          }
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {item.candidate.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{item.candidate.class_grade}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {item.candidate.target_position}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {item.interviewer_name}
                    </td>
                    {/* Scores per criteria */}
                    {rubrics.map((r) => {
                      const match = item.criteria_scores.find((cs) => cs.criteria_name === r.name);
                      return (
                        <td key={r.id} className="py-3.5 px-3 text-center">
                          <span className="font-semibold text-slate-800">
                            {match ? match.score.toFixed(0) : '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-base font-black text-indigo-600">
                        {item.final_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RecommendationBadge recommendation={item.recommendation} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedRankItem(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Score Breakdown Modal */}
      <Modal
        isOpen={Boolean(selectedRankItem)}
        onClose={() => setSelectedRankItem(null)}
        title={`Rincian Penilaian: ${selectedRankItem?.candidate.full_name}`}
        description={`Peringkat #${selectedRankItem?.rank} • Nilai Akhir: ${selectedRankItem?.final_score.toFixed(2)}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Nilai Akhir</span>
              <p className="text-2xl font-black text-indigo-600">
                {selectedRankItem?.final_score.toFixed(2)}
              </p>
            </div>
            <div>
              <RecommendationBadge recommendation={selectedRankItem?.recommendation} />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px]">Rincian Aspek Rubrik</h4>
            {selectedRankItem?.criteria_scores.map((cs, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900">{cs.criteria_name}</p>
                  <p className="text-[10px] text-slate-500">Bobot: {cs.weight}%</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-800">{cs.score}</span>
                  <span className="text-[10px] text-indigo-600 block">
                    Kontribusi: +{cs.weighted_value.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={() => setSelectedRankItem(null)}
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

