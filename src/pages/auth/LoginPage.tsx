import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vote, Shield, UserCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { login, quickLoginAs, isDemoMode, isAuthenticated, role } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'admin' ? '/admin/dashboard' : '/interviewer/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Input Tidak Valid', 'Silakan masukkan alamat email Anda.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      success('Berhasil Masuk', 'Selamat datang di Sistem Penilaian Wawancara PEMIRA.');
    } catch (err: any) {
      error('Gagal Masuk', err.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (targetRole: 'admin' | 'interviewer') => {
    setLoading(true);
    try {
      await quickLoginAs(targetRole);
      success(
        'Login Instan Berhasil',
        `Anda sekarang masuk sebagai ${targetRole === 'admin' ? 'Admin' : 'Pewawancara'}.`
      );
      navigate(targetRole === 'admin' ? '/admin/dashboard' : '/interviewer/dashboard');
    } catch (err: any) {
      error('Gagal', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        {/* Branding Crest */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-400 text-white shadow-xl shadow-indigo-500/20 mb-4 ring-4 ring-indigo-500/20">
            <Vote className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
            PEMIRA SELEKSI WAWANCARA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            Sistem Penilaian Objektif & Akuntabel Kandidat OSIS / MPK
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          {/* Quick Demo Switcher Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Akses Cepat Pengujian (Mode Demo)</span>
            </div>
            <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
              Klik salah satu peran di bawah untuk menguji alur kerja secara langsung tanpa perlu mengetik kredensial:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Masuk Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('interviewer')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Masuk Pewawancara</span>
              </button>
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold text-slate-400 bg-white px-2">
              atau login manual
            </div>
          </div>

          {/* Manual Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Alamat Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@pemira.sch.id"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Kata Sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isDemoMode ? 'Opsional dalam mode demo' : 'Masukkan kata sandi'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <span>{loading ? 'Memproses...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* System Security Badges */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Role Based Access Control
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Audit Log Terenkripsi
            </span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Panitia Pemilihan Raya (PEMIRA) Siswa &copy; 2026/2027
        </p>
      </div>
    </div>
  );
};

