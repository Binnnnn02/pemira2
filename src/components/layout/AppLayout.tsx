import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  Sliders,
  Award,
  History,
  Lock,
  LogOut,
  Menu,
  X,
  Vote,
  ChevronDown,
  RefreshCw,
  Database,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService, resetMockDatabase } from '../../lib/dataService';
import type { Period } from '../../types';
import { RoleBadge } from '../ui/Badge';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../../lib/dataService';

export const AppLayout: React.FC = () => {
  const { user, role, logout, quickLoginAs, isDemoMode } = useAuth();
  const { info, success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  useEffect(() => {
    dataService.getAppSettings().then(setAppSettings).catch((err) => console.error('Gagal memuat identitas aplikasi', err));
  }, []);

  useEffect(() => {
    const fetchPeriods = async () => {
      const data = await dataService.getPeriods();
      setPeriods(data);
      const active = data.find((p) => p.is_active) || data[0] || null;
      setActivePeriod(active);
    };
    fetchPeriods();
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    info('Sesi Berakhir', 'Anda telah berhasil keluar dari sistem.');
    navigate('/login');
  };

  const handleResetDemo = () => {
    if (confirm('Apakah Anda yakin ingin mereset seluruh data simulasi ke data awal?')) {
      resetMockDatabase();
      success('Data Direset', 'Database demo telah dipulihkan ke data awal.');
      window.location.reload();
    }
  };

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Kandidat', path: '/admin/candidates', icon: Users },
    { label: 'Pewawancara', path: '/admin/interviewers', icon: UserCheck },
    { label: 'Penugasan', path: '/admin/assignments', icon: UserCheck },
    { label: 'Jadwal', path: '/admin/schedules', icon: Calendar },
    { label: 'Rubrik & Bobot', path: '/admin/rubric', icon: Sliders },
    { label: 'Status Penilaian', path: '/admin/assessments', icon: Lock },
    { label: 'Hasil & Ranking', path: '/admin/results', icon: Award },
    { label: 'Audit Log', path: '/admin/audit-logs', icon: History },
    { label: 'Pengaturan', path: '/admin/settings', icon: Settings }
  ];

  const interviewerNavItems = [
    { label: 'Dashboard', path: '/interviewer/dashboard', icon: LayoutDashboard },
    { label: 'Kandidat Ditugaskan', path: '/interviewer/candidates', icon: Users },
    { label: 'Jadwal Wawancara', path: '/interviewer/schedules', icon: Calendar }
  ];

  const currentNavItems = role === 'admin' ? adminNavItems : interviewerNavItems;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Demo Mode Announcement Header */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>
              <strong>Mode Demo Aktif:</strong> Data tersimpan secara aman & interaktif di browser Anda.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-100 hidden sm:inline">Uji Peran Cepat:</span>
            <button
              onClick={() => {
                quickLoginAs('admin');
                navigate('/admin/dashboard');
              }}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                role === 'admin'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'bg-amber-700/60 hover:bg-white hover:text-amber-800 text-white'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => {
                quickLoginAs('interviewer');
                navigate('/interviewer/dashboard');
              }}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                role === 'interviewer'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'bg-amber-700/60 hover:bg-white hover:text-amber-800 text-white'
              }`}
            >
              Pewawancara
            </button>
            <button
              onClick={handleResetDemo}
              title="Reset data demo ke awal"
              className="ml-2 p-1 hover:bg-amber-700/60 rounded-md transition text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-900/30">
              <Vote className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
                {appSettings.event_name.toUpperCase()}
              </h1>
              <p className="text-[11px] text-indigo-400 font-medium truncate">{appSettings.school_name}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{appSettings.organization_name}</p>
            </div>
          </div>

          {/* Period Selector Card */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <button
                onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition"
              >
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Periode Aktif
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate block">
                    {activePeriod ? activePeriod.name : 'Memuat Periode...'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </button>

              {isPeriodMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  {periods.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActivePeriod(p);
                        setIsPeriodMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-700/70 transition ${
                        activePeriod?.id === p.id ? 'text-indigo-400 font-bold bg-slate-700/40' : 'text-slate-300'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.is_active && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold ml-1">
                          Aktif
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu {role === 'admin' ? 'Administrator' : 'Pewawancara'}
            </div>
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                alt={user?.name || 'User'}
                className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">{user?.name}</p>
                <div className="mt-0.5">
                  <RoleBadge role={user?.role || 'interviewer'} />
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header & Sidebar */}
        <div className="lg:hidden flex flex-col w-full shrink-0">
          {/* Mobile Top Navbar */}
          <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xs font-bold leading-tight">{appSettings.event_name.toUpperCase()}</h1>
                <p className="text-[10px] text-slate-400">{activePeriod?.name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </header>

          {/* Mobile Drawer Menu */}
          {isMobileMenuOpen && (
            <div className="bg-slate-900 text-slate-200 border-b border-slate-800 p-4 space-y-1">
              <div className="pb-3 mb-2 border-b border-slate-800 flex items-center gap-3">
                <img
                  src={user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                  alt={user?.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-bold text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>

              {currentNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                        isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <div className="pt-3 mt-3 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:bg-rose-950/20 rounded-xl text-sm font-semibold transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 flex flex-col">
          {/* Top Sub-Header Bar (Desktop) */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">
                Sistem Penilaian Wawancara Kandidat PEMIRA
              </h2>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-medium text-slate-500">
                {activePeriod?.name} ({activePeriod?.academic_year})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isDemoMode ? 'Database Lokal (Demo)' : 'Supabase Production'}</span>
              </div>
            </div>
          </div>

          {/* Page Body Container */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

