import type {
  UserProfile,
  Period,
  Candidate,
  RubricCriteria,
  InterviewerAssignment,
  InterviewSchedule,
  Assessment,
  AssessmentScore,
  AuditLog,
  RankingItem
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  INITIAL_PERIODS,
  INITIAL_USERS,
  INITIAL_RUBRIC,
  INITIAL_CANDIDATES,
  INITIAL_ASSIGNMENTS,
  INITIAL_SCHEDULES,
  INITIAL_ASSESSMENTS,
  INITIAL_SCORES,
  INITIAL_AUDIT_LOGS
} from './mockData';

// Local storage keys
const STORAGE_KEYS = {
  PERIODS: 'pemira_periods',
  USERS: 'pemira_users',
  RUBRIC: 'pemira_rubric',
  CANDIDATES: 'pemira_candidates',
  ASSIGNMENTS: 'pemira_assignments',
  SCHEDULES: 'pemira_schedules',
  ASSESSMENTS: 'pemira_assessments',
  SCORES: 'pemira_scores',
  AUDIT_LOGS: 'pemira_audit_logs',
  DEMO_MODE_OVERRIDE: 'pemira_force_demo_mode',
  APP_SETTINGS: 'pemira_app_settings'
};

const memoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStorage[key] ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
  memoryStorage[key] = value;
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = safeGetItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Error reading from storage key: ${key}`, err);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    safeSetItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving to storage key: ${key}`, err);
  }
}

// Saklar utama Mode Demo. Default: NONAKTIF (aplikasi memakai Supabase).
// Untuk mengaktifkan kembali mode demo, set VITE_ENABLE_DEMO_MODE=true di .env.
// Saat menjalankan test (vitest), mode demo otomatis aktif agar test memakai data lokal.
export const DEMO_MODE_ENABLED: boolean =
  import.meta.env.VITE_ENABLE_DEMO_MODE === 'true' || import.meta.env.MODE === 'test';

export function isUsingDemoMode(): boolean {
  if (!DEMO_MODE_ENABLED) return false;
  const forced = safeGetItem(STORAGE_KEYS.DEMO_MODE_OVERRIDE);
  if (forced !== null) {
    return forced === 'true';
  }
  return !isSupabaseConfigured;
}

export function setDemoModeOverride(enabled: boolean): void {
  safeSetItem(STORAGE_KEYS.DEMO_MODE_OVERRIDE, String(enabled));
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function resetMockDatabase(): void {
  safeSetItem(STORAGE_KEYS.PERIODS, JSON.stringify(INITIAL_PERIODS));
  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  safeSetItem(STORAGE_KEYS.RUBRIC, JSON.stringify(INITIAL_RUBRIC));
  safeSetItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(INITIAL_CANDIDATES));
  safeSetItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(INITIAL_ASSIGNMENTS));
  safeSetItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(INITIAL_SCHEDULES));
  safeSetItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(INITIAL_ASSESSMENTS));
  safeSetItem(STORAGE_KEYS.SCORES, JSON.stringify(INITIAL_SCORES));
  safeSetItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
}

// Initialize if empty (hanya untuk mode demo)
if (DEMO_MODE_ENABLED && !safeGetItem(STORAGE_KEYS.PERIODS)) {
  resetMockDatabase();
}

// ----------------------------------------------------------------------
// DATA SERVICE IMPLEMENTATION
// ----------------------------------------------------------------------

export interface AppSettings {
  event_name: string;
  school_name: string;
  organization_name: string;
  positions: string[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  event_name: 'Wawancara PEMIRA',
  school_name: 'Nama Sekolah',
  organization_name: 'Panitia PEMIRA',
  positions: ['Ketua OSIS', 'Wakil Ketua OSIS', 'Ketua MPK', 'Wakil Ketua MPK']
};

// ----------------------------------------------------------------------
// HELPER SUPABASE (penugasan, jadwal, penilaian)
// ----------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstOrUndef<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function normalizeAssessment(a: any): Assessment {
  return { ...a, final_score: a.final_score === null || a.final_score === undefined ? a.final_score : Number(a.final_score) } as Assessment;
}

function calcPreviewScore(rubrics: RubricCriteria[], scoresMap: Record<string, { score: number; notes?: string }>): number {
  let total = 0;
  rubrics.forEach((r) => {
    if (r.is_active && scoresMap[r.id]) total += (Number(scoresMap[r.id].score) * Number(r.weight)) / 100;
  });
  return Math.round(total * 100) / 100;
}

// Simpan draft penilaian + nilai per aspek ke Supabase. Mengembalikan baris assessments.
async function upsertRemoteDraft(
  assignment: InterviewerAssignment,
  data: Partial<Assessment>,
  scoresMap: Record<string, { score: number; notes?: string }>,
  previewScore: number
): Promise<Assessment> {
  const { data: existing, error: exErr } = await supabase
    .from('assessments')
    .select('*')
    .eq('assignment_id', assignment.id)
    .maybeSingle();
  if (exErr) throw new Error(exErr.message);
  if (existing && existing.status === 'submitted') {
    throw new Error('Penilaian ini sudah berstatus disubmit dan terkunci. Hanya Admin yang dapat membukanya kembali.');
  }

  const fields = {
    final_score: previewScore,
    strengths: data.strengths || '',
    weaknesses: data.weaknesses || '',
    general_notes: data.general_notes || '',
    recommendation: data.recommendation || null
  };

  let saved: any;
  if (existing) {
    const { data: upd, error } = await supabase.from('assessments').update(fields).eq('id', existing.id).select().single();
    if (error) throw new Error(error.message);
    saved = upd;
  } else {
    const { data: ins, error } = await supabase
      .from('assessments')
      .insert({
        assignment_id: assignment.id,
        candidate_id: assignment.candidate_id,
        interviewer_id: assignment.interviewer_id,
        period_id: assignment.period_id,
        status: 'draft',
        ...fields
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    saved = ins;
  }

  const rows = Object.entries(scoresMap)
    .filter(([, v]) => Number.isFinite(Number(v.score)) && Number(v.score) >= 1 && Number(v.score) <= 100)
    .map(([criteria_id, v]) => ({
      assessment_id: saved.id,
      criteria_id,
      score: Number(v.score),
      notes: v.notes || ''
    }));
  if (rows.length > 0) {
    const { error } = await supabase.from('assessment_scores').upsert(rows, { onConflict: 'assessment_id,criteria_id' });
    if (error) throw new Error(error.message);
  }
  return normalizeAssessment(saved);
}

async function getRemoteAssignmentById(assignmentId: string): Promise<InterviewerAssignment | null> {
  const { data, error } = await supabase.from('interviewer_assignments').select('*').eq('id', assignmentId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as InterviewerAssignment) || null;
}

// Ambil semua assessments + scores (untuk ranking): dari Supabase, atau lokal saat mode demo.
async function fetchAssessmentsAndScores(periodId: string): Promise<{ assessments: Assessment[]; scores: AssessmentScore[] }> {
  if (!isUsingDemoMode()) {
    const { data: asData, error } = await supabase.from('assessments').select('*').eq('period_id', periodId);
    if (error) throw new Error(error.message);
    const assessments = (asData || []).map(normalizeAssessment);
    const ids = assessments.map((a) => a.id);
    let scores: AssessmentScore[] = [];
    if (ids.length > 0) {
      const { data: scData, error: scErr } = await supabase.from('assessment_scores').select('*').in('assessment_id', ids);
      if (scErr) throw new Error(scErr.message);
      scores = (scData || []).map((x: any) => ({ ...x, score: Number(x.score) })) as AssessmentScore[];
    }
    return { assessments, scores };
  }
  return {
    assessments: getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS),
    scores: getStored<AssessmentScore[]>(STORAGE_KEYS.SCORES, INITIAL_SCORES)
  };
}

export const dataService = {
  async getAppSettings(): Promise<AppSettings> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('app_settings').select('settings').eq('id', 1).maybeSingle();
      if (error) throw new Error(error.message);
      if (data?.settings) return { ...DEFAULT_APP_SETTINGS, ...(data.settings as Partial<AppSettings>) };
      return DEFAULT_APP_SETTINGS;
    }
    return { ...DEFAULT_APP_SETTINGS, ...getStored<Partial<AppSettings>>(STORAGE_KEYS.APP_SETTINGS, {}) };
  },

  async saveAppSettings(settings: AppSettings, actor?: UserProfile): Promise<AppSettings> {
    const cleaned = { ...settings, event_name: settings.event_name.trim(), school_name: settings.school_name.trim(), organization_name: settings.organization_name.trim(), positions: [...new Set(settings.positions.map((p) => p.trim()).filter(Boolean))] };
    if (!cleaned.event_name || !cleaned.school_name || !cleaned.organization_name || cleaned.positions.length === 0) throw new Error('Nama kegiatan, sekolah, organisasi, dan minimal satu jabatan wajib diisi.');
    if (!isUsingDemoMode()) {
      const { error } = await supabase.from('app_settings').upsert({ id: 1, settings: cleaned, updated_at: new Date().toISOString(), updated_by: actor?.id }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    } else {
      setStored(STORAGE_KEYS.APP_SETTINGS, cleaned);
    }
    await this.logActivity('UPDATE_APP_SETTINGS', 'app_settings', '1', { event_name: cleaned.event_name, school_name: cleaned.school_name, organization_name: cleaned.organization_name, positions_count: cleaned.positions.length }, actor);
    return cleaned;
  },

  // --- AUDIT LOGS ---
  async logActivity(action: string, targetType: string, targetId: string, details: Record<string, any>, user?: UserProfile): Promise<void> {
    if (!isUsingDemoMode()) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: user?.id,
          actor_email: user?.email,
          actor_role: user?.role,
          action,
          target_type: targetType,
          target_id: targetId,
          details
        });
        return;
      } catch (err) {
        console.error('Failed to log activity to Supabase', err);
      }
    }

    const logs = getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      actor_id: user?.id || 'sys',
      actor_email: user?.email || 'system@pemira.sch.id',
      actor_role: user?.role || 'system',
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) return data as AuditLog[];
    }
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  // --- PERIODS ---
  async getPeriods(): Promise<Period[]> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data as Period[];
    }
    return getStored<Period[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
  },

  async getActivePeriod(): Promise<Period | null> {
    const periods = await this.getPeriods();
    return periods.find((p) => p.is_active) || periods[0] || null;
  },

  async createPeriod(period: Omit<Period, 'id' | 'created_at' | 'updated_at'>, actor?: UserProfile): Promise<Period> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('periods').insert(period).select().single();
      if (error) throw new Error(error.message);
      await this.logActivity('CREATE_PERIOD', 'period', data.id, { name: period.name }, actor);
      return data as Period;
    }

    const periods = getStored<Period[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
    const newPeriod: Period = {
      ...period,
      id: 'per-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (newPeriod.is_active) {
      periods.forEach((p) => (p.is_active = false));
    }

    periods.unshift(newPeriod);
    setStored(STORAGE_KEYS.PERIODS, periods);

    // Also auto-seed the default 5 rubric criteria for the new period
    const rubrics = getStored<RubricCriteria[]>(STORAGE_KEYS.RUBRIC, INITIAL_RUBRIC);
    const defaultCriteriaNames = [
      { name: 'Kepemimpinan', desc: 'Kemampuan memimpin, integritas, dan visi misi organisasi.' },
      { name: 'Komunikasi', desc: 'Artikulasi ide, kesantunan bertutur, dan persuasi gagasan.' },
      { name: 'Tanggung Jawab', desc: 'Kedisiplinan, komitmen waktu, dan rekam jejak amanah.' },
      { name: 'Pemecahan Masalah', desc: 'Pola pikir kritis, inisiatif, dan resolusi konflik.' },
      { name: 'Motivasi', desc: 'Semangat pengabdian dan ketahanan mental menghadapi tekanan.' }
    ];

    defaultCriteriaNames.forEach((item, index) => {
      rubrics.push({
        id: `rub-${Date.now()}-${index}`,
        period_id: newPeriod.id,
        name: item.name,
        description: item.desc,
        weight: 20.0,
        min_score: 1.0,
        max_score: 100.0,
        sort_order: index + 1,
        is_active: true,
        created_at: new Date().toISOString()
      });
    });
    setStored(STORAGE_KEYS.RUBRIC, rubrics);

    await this.logActivity('CREATE_PERIOD', 'period', newPeriod.id, { name: newPeriod.name }, actor);
    return newPeriod;
  },

  async updatePeriod(id: string, updates: Partial<Period>, actor?: UserProfile): Promise<Period> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('periods').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      await this.logActivity('UPDATE_PERIOD', 'period', id, updates, actor);
      return data as Period;
    }

    const periods = getStored<Period[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
    const index = periods.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Periode tidak ditemukan.');

    if (updates.is_active) {
      periods.forEach((p) => {
        if (p.id !== id) p.is_active = false;
      });
    }

    periods[index] = { ...periods[index], ...updates, updated_at: new Date().toISOString() };
    setStored(STORAGE_KEYS.PERIODS, periods);
    await this.logActivity('UPDATE_PERIOD', 'period', id, updates, actor);
    return periods[index];
  },

  // --- CANDIDATES ---
  async getCandidates(periodId?: string): Promise<Candidate[]> {
    if (!isUsingDemoMode()) {
      let query = supabase.from('candidates').select('*').order('candidate_number', { ascending: true });
      if (periodId) query = query.eq('period_id', periodId);
      const { data, error } = await query;
      if (error) throw new Error(`Gagal mengambil kandidat dari Supabase: ${error.message}`);
      return (data || []) as Candidate[];
    }

    const candidates = getStored<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    if (periodId) {
      return candidates.filter((c) => c.period_id === periodId);
    }
    return candidates;
  },

  async createCandidate(candidate: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>, actor?: UserProfile): Promise<Candidate> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('candidates').insert(candidate).select().single();
      if (error) throw new Error(error.message);
      await this.logActivity('CREATE_CANDIDATE', 'candidate', data.id, { name: candidate.full_name }, actor);
      return data as Candidate;
    }

    const candidates = getStored<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    // Validation: candidate number unique per period
    const exists = candidates.some((c) => c.period_id === candidate.period_id && c.candidate_number === candidate.candidate_number);
    if (exists) {
      throw new Error(`Nomor urut kandidat ${candidate.candidate_number} sudah digunakan pada periode ini.`);
    }

    const newCandidate: Candidate = {
      ...candidate,
      id: 'cand-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    candidates.push(newCandidate);
    setStored(STORAGE_KEYS.CANDIDATES, candidates);
    await this.logActivity('CREATE_CANDIDATE', 'candidate', newCandidate.id, { name: newCandidate.full_name, position: newCandidate.target_position }, actor);
    return newCandidate;
  },

  async updateCandidate(id: string, updates: Partial<Candidate>, actor?: UserProfile): Promise<Candidate> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('candidates').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      await this.logActivity('UPDATE_CANDIDATE', 'candidate', id, updates, actor);
      return data as Candidate;
    }

    const candidates = getStored<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    const index = candidates.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Kandidat tidak ditemukan.');

    // If changing candidate_number, check duplicate
    if (updates.candidate_number && updates.candidate_number !== candidates[index].candidate_number) {
      const pId = updates.period_id || candidates[index].period_id;
      const exists = candidates.some((c) => c.id !== id && c.period_id === pId && c.candidate_number === updates.candidate_number);
      if (exists) throw new Error(`Nomor urut kandidat ${updates.candidate_number} sudah digunakan.`);
    }

    candidates[index] = { ...candidates[index], ...updates, updated_at: new Date().toISOString() };
    setStored(STORAGE_KEYS.CANDIDATES, candidates);
    await this.logActivity('UPDATE_CANDIDATE', 'candidate', id, updates, actor);
    return candidates[index];
  },

  async deleteCandidate(id: string, actor?: UserProfile): Promise<void> {
    if (!isUsingDemoMode()) {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await this.logActivity('DELETE_CANDIDATE', 'candidate', id, {}, actor);
      return;
    }

    let candidates = getStored<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    const candidate = candidates.find((c) => c.id === id);
    candidates = candidates.filter((c) => c.id !== id);
    setStored(STORAGE_KEYS.CANDIDATES, candidates);
    await this.logActivity('DELETE_CANDIDATE', 'candidate', id, { name: candidate?.full_name }, actor);
  },

  // --- USERS / INTERVIEWERS ---
  async getUsers(): Promise<UserProfile[]> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('profiles').select('*').order('name', { ascending: true });
      if (error) throw new Error(`Gagal mengambil profil pengguna dari Supabase: ${error.message}`);
      return (data || []) as UserProfile[];
    }
    return getStored<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  async getInterviewers(): Promise<UserProfile[]> {
    const users = await this.getUsers();
    return users.filter((u) => u.role === 'interviewer');
  },

  async createInterviewer(userData: Omit<UserProfile, 'id' | 'role' | 'created_at' | 'updated_at'>, password: string, actor?: UserProfile): Promise<UserProfile> {
    if (!password || password.length < 8) throw new Error('Password minimal 8 karakter.');
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.functions.invoke('create-interviewer', { body: { name: userData.name, email: userData.email, password } });
      if (error) throw new Error(error.message || 'Gagal membuat akun. Pastikan Edge Function create-interviewer sudah di-deploy.');
      if (data?.error) throw new Error(data.error);
      const created = data?.profile as UserProfile | undefined;
      if (!created) throw new Error('Akun dibuat tetapi profil tidak dikembalikan oleh server.');
      await this.logActivity('CREATE_INTERVIEWER', 'interviewer', created.id, { name: created.name, email: created.email }, actor);
      return created;
    }

    const users = getStored<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error(`Email ${userData.email} sudah terdaftar.`);
    }

    const newUser: UserProfile = {
      ...userData,
      id: 'usr-int-' + Date.now(),
      role: 'interviewer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);
    await this.logActivity('CREATE_INTERVIEWER', 'interviewer', newUser.id, { name: newUser.name, email: newUser.email }, actor);
    return newUser;
  },

  async updateInterviewer(id: string, updates: Partial<UserProfile>, actor?: UserProfile): Promise<UserProfile> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      await this.logActivity('UPDATE_INTERVIEWER', 'interviewer', id, updates, actor);
      return data as UserProfile;
    }

    const users = getStored<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Pengguna tidak ditemukan.');

    users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
    setStored(STORAGE_KEYS.USERS, users);
    await this.logActivity('UPDATE_INTERVIEWER', 'interviewer', id, updates, actor);
    return users[index];
  },

  // --- RUBRIC CRITERIA & WEIGHT VALIDATION ---
  async getRubricCriteria(periodId: string): Promise<RubricCriteria[]> {
    if (!isUsingDemoMode()) {
      const { data, error } = await supabase
        .from('rubric_criteria')
        .select('*')
        .eq('period_id', periodId)
        .order('sort_order', { ascending: true });
      if (!error && data) return data as RubricCriteria[];
    }

    const rubrics = getStored<RubricCriteria[]>(STORAGE_KEYS.RUBRIC, INITIAL_RUBRIC);
    return rubrics
      .filter((r) => r.period_id === periodId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async saveRubricCriteria(periodId: string, criteriaList: RubricCriteria[], actor?: UserProfile): Promise<RubricCriteria[]> {
    // RULE VALIDATION: Sum of active weights MUST strictly equal 100%
    const activeCriteria = criteriaList.filter((c) => c.is_active);
    const totalWeight = activeCriteria.reduce((sum, c) => sum + Number(c.weight), 0);

    // Rounding check for floating precision
    const roundedTotal = Math.round(totalWeight * 100) / 100;
    if (roundedTotal !== 100.0) {
      throw new Error(`Total bobot seluruh aspek aktif harus tepat 100%. Saat ini: ${roundedTotal}% (selisih: ${Math.round((100 - roundedTotal) * 100) / 100}%).`);
    }

    if (!isUsingDemoMode()) {
      // Upsert into Supabase
      const { data, error } = await supabase.from('rubric_criteria').upsert(criteriaList).select();
      if (error) throw new Error(error.message);
      await this.logActivity('UPDATE_RUBRIC', 'rubric', periodId, { totalWeight: roundedTotal, criteriaCount: criteriaList.length }, actor);
      return data as RubricCriteria[];
    }

    let allRubrics = getStored<RubricCriteria[]>(STORAGE_KEYS.RUBRIC, INITIAL_RUBRIC);
    // Replace all criteria for this period
    allRubrics = allRubrics.filter((r) => r.period_id !== periodId).concat(criteriaList);
    setStored(STORAGE_KEYS.RUBRIC, allRubrics);
    await this.logActivity('UPDATE_RUBRIC', 'rubric', periodId, { totalWeight: roundedTotal, criteriaCount: criteriaList.length }, actor);
    return criteriaList;
  },

  // --- ASSIGNMENTS & RULES ---
  // RULE: Exactly one active interviewer per candidate in one period!
  async getAssignments(periodId?: string, interviewerId?: string): Promise<InterviewerAssignment[]> {
    const assignments = getStored<InterviewerAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const candidates = await this.getCandidates();
    const users = await this.getUsers();
    const schedules = getStored<InterviewSchedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const assessments = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
    let filtered = assignments;
    if (periodId) filtered = filtered.filter((a) => a.period_id === periodId);
    if (interviewerId) filtered = filtered.filter((a) => a.interviewer_id === interviewerId);
    return filtered.map((a) => ({
      ...a,
      candidate: candidates.find((c) => c.id === a.candidate_id),
      interviewer: users.find((u) => u.id === a.interviewer_id),
      schedule: schedules.find((s) => s.assignment_id === a.id),
      assessment: assessments.find((ass) => ass.assignment_id === a.id)
    }));
  },

  async assignInterviewer(
    periodId: string,
    candidateId: string,
    interviewerId: string,
    actor?: UserProfile
  ): Promise<InterviewerAssignment> {
    const assignments = getStored<InterviewerAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const candidates = await this.getCandidates(periodId);
    const users = await this.getUsers();
    const candidate = candidates.find((c) => c.id === candidateId);
    const interviewer = users.find((u) => u.id === interviewerId);
    if (!candidate) throw new Error('Kandidat tidak ditemukan.');
    if (!interviewer) throw new Error('Pewawancara tidak ditemukan atau tidak dapat diakses.');

    if (!isUsingDemoMode()) {
      const { data: existing, error: readError } = await supabase
        .from('interviewer_assignments').select('*')
        .eq('period_id', periodId).eq('candidate_id', candidateId).eq('status', 'active').maybeSingle();
      if (readError) throw new Error(`Gagal memeriksa penugasan lama: ${readError.message}`);
      if (existing?.interviewer_id === interviewerId) {
        return { ...(existing as InterviewerAssignment), candidate, interviewer };
      }
      if (existing) {
        const { error: updateError } = await supabase.from('interviewer_assignments')
          .update({ status: 'replaced' }).eq('id', existing.id);
        if (updateError) throw new Error(`Gagal memperbarui penugasan lama: ${updateError.message}`);
      }
      const { data, error } = await supabase.from('interviewer_assignments').insert({
        period_id: periodId, candidate_id: candidateId, interviewer_id: interviewerId, status: 'active'
      }).select('*').single();
      if (error) throw new Error(`Gagal menyimpan penugasan: ${error.message}`);
      const assignment = { ...(data as InterviewerAssignment), candidate, interviewer };
      await this.logActivity('ASSIGN_INTERVIEWER', 'assignment', assignment.id,
        { candidate: candidate.full_name, interviewer: interviewer.name }, actor);
      return assignment;
    }

    const existingActiveIndex = assignments.findIndex((a) => a.period_id === periodId && a.candidate_id === candidateId && a.status === 'active');
    if (existingActiveIndex !== -1) {
      if (assignments[existingActiveIndex].interviewer_id === interviewerId) return assignments[existingActiveIndex];
      assignments[existingActiveIndex].status = 'replaced';
    }
    const assignment: InterviewerAssignment = {
      id: 'asg-' + Date.now(), period_id: periodId, candidate_id: candidateId, interviewer_id: interviewerId,
      status: 'active', assigned_at: new Date().toISOString(), created_at: new Date().toISOString(), candidate, interviewer
    };
    assignments.push(assignment);
    setStored(STORAGE_KEYS.ASSIGNMENTS, assignments);
    await this.logActivity('ASSIGN_INTERVIEWER', 'assignment', assignment.id,
      { candidate: candidate.full_name, interviewer: interviewer.name }, actor);
    return assignment;
  },

  // --- SCHEDULES ---
  async getSchedules(periodId?: string, interviewerId?: string): Promise<InterviewSchedule[]> {
    const assignments = await this.getAssignments(periodId, interviewerId);
    const assignmentIds = assignments.map((assignment) => assignment.id);
    if (assignmentIds.length === 0) return [];

    if (!isUsingDemoMode()) {
      const { data, error } = await supabase
        .from('interview_schedules')
        .select('*')
        .in('assignment_id', assignmentIds)
        .order('scheduled_at', { ascending: true });
      if (error) throw new Error(`Gagal mengambil jadwal wawancara: ${error.message}`);
      return (data ?? []) as InterviewSchedule[];
    }

    const schedules = getStored<InterviewSchedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const allowedIds = new Set(assignmentIds);
    return schedules
      .filter((schedule) => allowedIds.has(schedule.assignment_id))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  },

  async saveSchedule(
    schedule: Omit<InterviewSchedule, 'id' | 'created_at' | 'updated_at'>,
    actor?: UserProfile
  ): Promise<InterviewSchedule> {
    if (!schedule.assignment_id || !schedule.scheduled_at || !schedule.location?.trim()) {
      throw new Error('Penugasan, tanggal, jam, dan lokasi wajib diisi.');
    }

    let result: InterviewSchedule;

    if (!isUsingDemoMode()) {
      const { data: existing, error: readError } = await supabase
        .from('interview_schedules')
        .select('id')
        .eq('assignment_id', schedule.assignment_id)
        .limit(1)
        .maybeSingle();

      if (readError) throw new Error(`Gagal memeriksa jadwal lama: ${readError.message}`);

      if (existing) {
        const { data, error } = await supabase
          .from('interview_schedules')
          .update({ ...schedule, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (error) throw new Error(`Gagal memperbarui jadwal: ${error.message}`);
        result = data as InterviewSchedule;
      } else {
        const { data, error } = await supabase
          .from('interview_schedules')
          .insert(schedule)
          .select('*')
          .single();
        if (error) throw new Error(`Gagal menyimpan jadwal: ${error.message}`);
        result = data as InterviewSchedule;
      }
    } else {
      const schedules = getStored<InterviewSchedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
      const existingIndex = schedules.findIndex(
        (item) => item.assignment_id === schedule.assignment_id
      );

      if (existingIndex !== -1) {
        result = {
          ...schedules[existingIndex],
          ...schedule,
          updated_at: new Date().toISOString()
        };
        schedules[existingIndex] = result;
      } else {
        result = {
          ...schedule,
          id: `sch-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        schedules.push(result);
      }
      setStored(STORAGE_KEYS.SCHEDULES, schedules);
    }

    await this.logActivity(
      'SAVE_SCHEDULE',
      'schedule',
      result.id,
      { location: result.location, time: result.scheduled_at },
      actor
    );
    return result;
  },

  // --- ASSESSMENTS & SCORES ---
  async getAssessment(assignmentId: string): Promise<Assessment | null> {
    if (!isUsingDemoMode()) {
      const { data: a, error } = await supabase.from('assessments').select('*').eq('assignment_id', assignmentId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!a) return null;
      const { data: sc, error: scErr } = await supabase
        .from('assessment_scores')
        .select('*, criteria:rubric_criteria(*)')
        .eq('assessment_id', a.id);
      if (scErr) throw new Error(scErr.message);
      const scores = (sc || []).map((x: any) => ({
        ...x,
        score: Number(x.score),
        criteria: firstOrUndef(x.criteria)
      })) as AssessmentScore[];
      return { ...normalizeAssessment(a), scores };
    }

    const assessments = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
    const assessment = assessments.find((a) => a.assignment_id === assignmentId);
    if (!assessment) return null;

    const scores = getStored<AssessmentScore[]>(STORAGE_KEYS.SCORES, INITIAL_SCORES);
    const rubrics = getStored<RubricCriteria[]>(STORAGE_KEYS.RUBRIC, INITIAL_RUBRIC);

    const assessmentScores = scores
      .filter((s) => s.assessment_id === assessment.id)
      .map((s) => ({
        ...s,
        criteria: rubrics.find((r) => r.id === s.criteria_id)
      }));

    return {
      ...assessment,
      scores: assessmentScores
    };
  },

  async saveAssessmentDraft(
    assignmentId: string,
    data: Partial<Assessment>,
    scoresMap: Record<string, { score: number; notes?: string }>,
    actor?: UserProfile
  ): Promise<Assessment> {
    if (!isUsingDemoMode()) {
      const remoteAssignment = await getRemoteAssignmentById(assignmentId);
      if (!remoteAssignment) throw new Error('Penugasan wawancara tidak ditemukan.');
      const remoteRubrics = await this.getRubricCriteria(remoteAssignment.period_id);
      const preview = calcPreviewScore(remoteRubrics, scoresMap);
      const saved = await upsertRemoteDraft(remoteAssignment, data, scoresMap, preview);
      await this.logActivity('SAVE_DRAFT_ASSESSMENT', 'assessment', saved.id, { previewScore: preview }, actor);
      return saved;
    }

    const assignments = getStored<InterviewerAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) throw new Error('Penugasan wawancara tidak ditemukan.');

    const assessments = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
    const existingIndex = assessments.findIndex((a) => a.assignment_id === assignmentId);

    if (existingIndex !== -1 && assessments[existingIndex].status === 'submitted') {
      throw new Error('Penilaian ini sudah berstatus disubmit dan terkunci. Hanya Admin yang dapat membukanya kembali.');
    }

    let assessmentId = existingIndex !== -1 ? assessments[existingIndex].id : 'ass-' + Date.now();

    // Calculate current preview score
    const rubrics = await this.getRubricCriteria(assignment.period_id);
    let previewScore = 0;
    rubrics.forEach((r) => {
      if (r.is_active && scoresMap[r.id]) {
        previewScore += (scoresMap[r.id].score * r.weight) / 100;
      }
    });

    const updatedAssessment: Assessment = {
      ...(existingIndex !== -1 ? assessments[existingIndex] : {}),
      id: assessmentId,
      assignment_id: assignmentId,
      candidate_id: assignment.candidate_id,
      interviewer_id: assignment.interviewer_id,
      period_id: assignment.period_id,
      status: 'draft',
      final_score: Math.round(previewScore * 100) / 100,
      strengths: data.strengths || '',
      weaknesses: data.weaknesses || '',
      general_notes: data.general_notes || '',
      recommendation: data.recommendation || null,
      updated_at: new Date().toISOString(),
      created_at: existingIndex !== -1 ? assessments[existingIndex].created_at : new Date().toISOString()
    };

    if (existingIndex !== -1) {
      assessments[existingIndex] = updatedAssessment;
    } else {
      assessments.push(updatedAssessment);
    }
    setStored(STORAGE_KEYS.ASSESSMENTS, assessments);

    // Save individual scores
    let allScores = getStored<AssessmentScore[]>(STORAGE_KEYS.SCORES, INITIAL_SCORES);
    allScores = allScores.filter((s) => s.assessment_id !== assessmentId);

    Object.entries(scoresMap).forEach(([criteriaId, val], idx) => {
      allScores.push({
        id: `sc-${Date.now()}-${idx}`,
        assessment_id: assessmentId,
        criteria_id: criteriaId,
        score: val.score,
        notes: val.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
    setStored(STORAGE_KEYS.SCORES, allScores);

    await this.logActivity('SAVE_DRAFT_ASSESSMENT', 'assessment', assessmentId, { previewScore }, actor);
    return updatedAssessment;
  },

  async submitAssessmentFinal(
    assignmentId: string,
    data: Partial<Assessment>,
    scoresMap: Record<string, { score: number; notes?: string }>,
    actor?: UserProfile
  ): Promise<Assessment> {
    if (!isUsingDemoMode()) {
      const remoteAssignment = await getRemoteAssignmentById(assignmentId);
      if (!remoteAssignment) throw new Error('Penugasan wawancara tidak ditemukan.');

      const remoteRubrics = (await this.getRubricCriteria(remoteAssignment.period_id)).filter((r) => r.is_active);
      const remoteTotalWeight = remoteRubrics.reduce((acc, r) => acc + Number(r.weight), 0);
      if (Math.round(remoteTotalWeight) !== 100) {
        throw new Error(`Total bobot rubrik belum 100% (saat ini ${remoteTotalWeight}%). Hubungi admin untuk meluruskan rubrik.`);
      }
      for (const criterion of remoteRubrics) {
        const entry = scoresMap[criterion.id];
        if (!entry || entry.score === undefined || isNaN(entry.score)) {
          throw new Error(`Aspek "${criterion.name}" belum dinilai.`);
        }
        if (entry.score < 1 || entry.score > 100) {
          throw new Error(`Nilai untuk aspek "${criterion.name}" harus berada pada rentang 1 hingga 100.`);
        }
      }

      const preview = calcPreviewScore(remoteRubrics, scoresMap);
      const draft = await upsertRemoteDraft(remoteAssignment, data, scoresMap, preview);

      // Hitung nilai akhir, kunci, dan catat audit dilakukan atomik di database
      const { error: rpcErr } = await supabase.rpc('submit_assessment', { p_assessment_id: draft.id });
      if (rpcErr) throw new Error(rpcErr.message);

      const { data: finalRow, error: finalErr } = await supabase.from('assessments').select('*').eq('id', draft.id).single();
      if (finalErr) throw new Error(finalErr.message);
      return normalizeAssessment(finalRow);
    }

    const assignments = getStored<InterviewerAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) throw new Error('Penugasan wawancara tidak ditemukan.');

    const rubrics = await this.getRubricCriteria(assignment.period_id);
    const activeRubrics = rubrics.filter((r) => r.is_active);

    // 1. Validate Rubric Total Weight = 100%
    const totalWeight = activeRubrics.reduce((acc, r) => acc + Number(r.weight), 0);
    if (Math.round(totalWeight) !== 100) {
      throw new Error(`Total bobot rubrik belum 100% (saat ini ${totalWeight}%). Hubungi admin untuk meluruskan rubrik.`);
    }

    // 2. Validate all active criteria are scored between 1 and 100
    for (const criterion of activeRubrics) {
      const entry = scoresMap[criterion.id];
      if (!entry || entry.score === undefined || isNaN(entry.score)) {
        throw new Error(`Aspek "${criterion.name}" belum dinilai.`);
      }
      if (entry.score < 1 || entry.score > 100) {
        throw new Error(`Nilai untuk aspek "${criterion.name}" harus berada pada rentang 1 hingga 100.`);
      }
    }

    // 3. Calculate weighted final score
    let calculatedFinalScore = 0;
    activeRubrics.forEach((r) => {
      calculatedFinalScore += (scoresMap[r.id].score * Number(r.weight)) / 100;
    });
    calculatedFinalScore = Math.round(calculatedFinalScore * 100) / 100;

    // 4. Save and Lock Assessment
    const assessments = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
    const existingIndex = assessments.findIndex((a) => a.assignment_id === assignmentId);
    const assessmentId = existingIndex !== -1 ? assessments[existingIndex].id : 'ass-' + Date.now();

    const finalAssessment: Assessment = {
      ...(existingIndex !== -1 ? assessments[existingIndex] : {}),
      id: assessmentId,
      assignment_id: assignmentId,
      candidate_id: assignment.candidate_id,
      interviewer_id: assignment.interviewer_id,
      period_id: assignment.period_id,
      status: 'submitted', // LOCKED!
      final_score: calculatedFinalScore,
      strengths: data.strengths || '',
      weaknesses: data.weaknesses || '',
      general_notes: data.general_notes || '',
      recommendation: data.recommendation || null,
      submitted_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: existingIndex !== -1 ? assessments[existingIndex].created_at : new Date().toISOString()
    };

    if (existingIndex !== -1) {
      assessments[existingIndex] = finalAssessment;
    } else {
      assessments.push(finalAssessment);
    }
    setStored(STORAGE_KEYS.ASSESSMENTS, assessments);

    // Save final scores
    let allScores = getStored<AssessmentScore[]>(STORAGE_KEYS.SCORES, INITIAL_SCORES);
    allScores = allScores.filter((s) => s.assessment_id !== assessmentId);
    Object.entries(scoresMap).forEach(([criteriaId, val], idx) => {
      allScores.push({
        id: `sc-${Date.now()}-${idx}`,
        assessment_id: assessmentId,
        criteria_id: criteriaId,
        score: val.score,
        notes: val.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
    setStored(STORAGE_KEYS.SCORES, allScores);

    // Update interview schedule status to completed
    const schedules = getStored<InterviewSchedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const scheduleIndex = schedules.findIndex((s) => s.assignment_id === assignmentId);
    if (scheduleIndex !== -1) {
      schedules[scheduleIndex].status = 'completed';
      setStored(STORAGE_KEYS.SCHEDULES, schedules);
    }

    await this.logActivity(
      'SUBMIT_ASSESSMENT',
      'assessment',
      assessmentId,
      { candidate_id: assignment.candidate_id, final_score: calculatedFinalScore },
      actor
    );

    return finalAssessment;
  },

  // RULE: Only admin can unlock submitted assessment with recorded reason
  async adminUnlockAssessment(assessmentId: string, reason: string, adminUser: UserProfile): Promise<Assessment> {
    if (adminUser.role !== 'admin') {
      throw new Error('Hanya Admin yang berwenang membuka kunci penilaian.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('Alasan pembukaan kunci wajib diisi minimal 5 karakter untuk keperluan audit.');
    }

    if (!isUsingDemoMode()) {
      const { error: rpcErr } = await supabase.rpc('unlock_assessment', { p_assessment_id: assessmentId, p_reason: reason.trim() });
      if (rpcErr) throw new Error(rpcErr.message);
      const { data: row, error: rowErr } = await supabase.from('assessments').select('*').eq('id', assessmentId).single();
      if (rowErr) throw new Error(rowErr.message);
      return normalizeAssessment(row);
    }

    const assessments = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
    const index = assessments.findIndex((a) => a.id === assessmentId);
    if (index === -1) throw new Error('Penilaian tidak ditemukan.');

    const current = assessments[index];
    if (current.status !== 'submitted') {
      throw new Error('Penilaian ini belum disubmit atau sudah berstatus draft.');
    }

    const updatedAssessment: Assessment = {
      ...current,
      status: 'draft',
      unlocked_at: new Date().toISOString(),
      unlocked_by: adminUser.id,
      unlock_reason: reason.trim(),
      updated_at: new Date().toISOString()
    };

    assessments[index] = updatedAssessment;
    setStored(STORAGE_KEYS.ASSESSMENTS, assessments);

    await this.logActivity(
      'UNLOCK_ASSESSMENT',
      'assessment',
      assessmentId,
      {
        candidate_id: current.candidate_id,
        reason: reason.trim(),
        previous_final_score: current.final_score
      },
      adminUser
    );

    return updatedAssessment;
  },

  // --- SINKRONISASI DATA LOKAL -> SERVER ---
  // Data penugasan/jadwal/penilaian yang sebelumnya hanya tersimpan di browser (localStorage)
  // dikirim sekali ke Supabase agar terlihat oleh akun pewawancara. Data lokal TIDAK dihapus.
  getLocalSyncSummary(): { assignments: number; schedules: number; assessments: number } {
    if (isUsingDemoMode()) return { assignments: 0, schedules: 0, assessments: 0 };
    const asg = getStored<InterviewerAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []).filter(
      (a) => a.status === 'active' && UUID_RE.test(a.candidate_id) && UUID_RE.test(a.interviewer_id) && UUID_RE.test(a.period_id)
    );
    const ids = new Set(asg.map((a) => a.id));
    const sch = getStored<InterviewSchedule[]>(STORAGE_KEYS.SCHEDULES, []).filter((x) => ids.has(x.assignment_id));
    const ass = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []).filter((x) => ids.has(x.assignment_id));
    return { assignments: asg.length, schedules: sch.length, assessments: ass.length };
  },

  async migrateLocalDataToServer(actor?: UserProfile): Promise<{ assignments: number; schedules: number; assessments: number; skipped: number; errors: string[] }> {
    if (isUsingDemoMode()) throw new Error('Sinkronisasi hanya tersedia saat memakai Supabase.');
    const result = { assignments: 0, schedules: 0, assessments: 0, skipped: 0, errors: [] as string[] };

    const localAssignments = getStored<InterviewerAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []).filter(
      (a) => a.status === 'active' && UUID_RE.test(a.candidate_id) && UUID_RE.test(a.interviewer_id) && UUID_RE.test(a.period_id)
    );
    if (localAssignments.length === 0) return result;

    const [{ data: cands }, { data: profs }, { data: remoteAsg }, { data: remoteSch }, { data: remoteAss }, { data: remoteRub }] = await Promise.all([
      supabase.from('candidates').select('id'),
      supabase.from('profiles').select('id'),
      supabase.from('interviewer_assignments').select('id,candidate_id,period_id,status'),
      supabase.from('interview_schedules').select('assignment_id'),
      supabase.from('assessments').select('assignment_id'),
      supabase.from('rubric_criteria').select('id')
    ]);
    const candIds = new Set((cands || []).map((c: any) => c.id));
    const profIds = new Set((profs || []).map((c: any) => c.id));
    const rubIds = new Set((remoteRub || []).map((c: any) => c.id));
    const haveSchedule = new Set((remoteSch || []).map((x: any) => x.assignment_id));
    const haveAssessment = new Set((remoteAss || []).map((x: any) => x.assignment_id));

    // local assignment id -> remote assignment id
    const idMap = new Map<string, string>();

    for (const a of localAssignments) {
      const existing = (remoteAsg || []).find(
        (r: any) => r.candidate_id === a.candidate_id && r.period_id === a.period_id && r.status === 'active'
      );
      if (existing) {
        idMap.set(a.id, existing.id);
        result.skipped++;
        continue;
      }
      if (!candIds.has(a.candidate_id) || !profIds.has(a.interviewer_id)) {
        result.errors.push(`Penugasan dilewati: kandidat atau pewawancara tidak ada di server (${a.id}).`);
        continue;
      }
      const { data, error } = await supabase
        .from('interviewer_assignments')
        .insert({ period_id: a.period_id, candidate_id: a.candidate_id, interviewer_id: a.interviewer_id, status: 'active', assigned_at: a.assigned_at })
        .select('id')
        .single();
      if (error) {
        result.errors.push(`Penugasan gagal: ${error.message}`);
        continue;
      }
      idMap.set(a.id, data.id);
      result.assignments++;
    }

    const localSchedules = getStored<InterviewSchedule[]>(STORAGE_KEYS.SCHEDULES, []);
    for (const sc of localSchedules) {
      const remoteId = idMap.get(sc.assignment_id);
      if (!remoteId || haveSchedule.has(remoteId)) continue;
      const { error } = await supabase.from('interview_schedules').insert({
        assignment_id: remoteId,
        scheduled_at: sc.scheduled_at,
        duration_minutes: sc.duration_minutes,
        location: sc.location,
        notes: sc.notes || null,
        status: sc.status
      });
      if (error) result.errors.push(`Jadwal gagal: ${error.message}`);
      else {
        haveSchedule.add(remoteId);
        result.schedules++;
      }
    }

    const localAssessments = getStored<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []);
    const localScores = getStored<AssessmentScore[]>(STORAGE_KEYS.SCORES, []);
    for (const as of localAssessments) {
      const remoteId = idMap.get(as.assignment_id);
      if (!remoteId || haveAssessment.has(remoteId)) continue;
      const src = localAssignments.find((a) => a.id === as.assignment_id)!;
      const { data: created, error } = await supabase
        .from('assessments')
        .insert({
          assignment_id: remoteId,
          candidate_id: src.candidate_id,
          interviewer_id: src.interviewer_id,
          period_id: src.period_id,
          status: 'draft',
          final_score: as.final_score ?? null,
          strengths: as.strengths || '',
          weaknesses: as.weaknesses || '',
          general_notes: as.general_notes || '',
          recommendation: as.recommendation || null
        })
        .select('id')
        .single();
      if (error) {
        result.errors.push(`Penilaian gagal: ${error.message}`);
        continue;
      }
      const rows = localScores
        .filter((x) => x.assessment_id === as.id && rubIds.has(x.criteria_id) && x.score >= 1 && x.score <= 100)
        .map((x) => ({ assessment_id: created.id, criteria_id: x.criteria_id, score: x.score, notes: x.notes || '' }));
      if (rows.length > 0) {
        const { error: scErr } = await supabase.from('assessment_scores').insert(rows);
        if (scErr) result.errors.push(`Nilai aspek gagal: ${scErr.message}`);
      }
      if (as.status === 'submitted') {
        const { error: lockErr } = await supabase
          .from('assessments')
          .update({ status: 'submitted', final_score: as.final_score ?? null, submitted_at: as.submitted_at || new Date().toISOString(), locked_at: as.locked_at || new Date().toISOString() })
          .eq('id', created.id);
        if (lockErr) result.errors.push(`Kunci penilaian gagal: ${lockErr.message}`);
      }
      haveAssessment.add(remoteId);
      result.assessments++;
    }

    await this.logActivity('MIGRATE_LOCAL_DATA', 'system', 'local', { ...result, errors: result.errors.length }, actor);
    return result;
  },

  // --- RANKINGS & RESULTS ---
  // RULE: Ranking only uses submitted/final scores and applies per period
  async getRankings(periodId: string): Promise<RankingItem[]> {
    const candidates = await this.getCandidates(periodId);
    const assignments = await this.getAssignments(periodId);
    const { assessments, scores } = await fetchAssessmentsAndScores(periodId);
    const rubrics = await this.getRubricCriteria(periodId);

    // Only candidates with submitted status
    const submittedAssessments = assessments.filter(
      (ass) => ass.period_id === periodId && ass.status === 'submitted' && ass.final_score !== null && ass.final_score !== undefined
    );

    const items: RankingItem[] = [];

    submittedAssessments.forEach((ass) => {
      const candidate = candidates.find((c) => c.id === ass.candidate_id);
      const assignment = assignments.find((a) => a.id === ass.assignment_id);
      if (!candidate) return;

      const criteriaBreakdown = rubrics.map((r) => {
        const sc = scores.find((s) => s.assessment_id === ass.id && s.criteria_id === r.id);
        const scoreVal = sc ? sc.score : 0;
        return {
          criteria_name: r.name,
          score: scoreVal,
          weight: r.weight,
          weighted_value: Math.round(((scoreVal * r.weight) / 100) * 100) / 100
        };
      });

      items.push({
        rank: 0, // calculated below
        candidate,
        final_score: Number(ass.final_score),
        interviewer_name: assignment?.interviewer?.name || 'Pewawancara',
        recommendation: ass.recommendation,
        submitted_at: ass.submitted_at || ass.updated_at || '',
        criteria_scores: criteriaBreakdown
      });
    });

    // Sort descending by final score
    items.sort((a, b) => b.final_score - a.final_score);

    // Assign ranking numbers
    items.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return items;
  },

  // --- CSV EXPORT ---
  async exportRankingsToCSV(periodId: string): Promise<string> {
    const period = (await this.getPeriods()).find((p) => p.id === periodId);
    const rankings = await this.getRankings(periodId);
    const rubrics = await this.getRubricCriteria(periodId);

    // Header row
    const headers = [
      'Peringkat',
      'No. Urut',
      'Nama Kandidat',
      'Kelas',
      'Jabatan Target',
      'Nilai Akhir',
      'Rekomendasi',
      'Pewawancara',
      'Waktu Submit',
      ...rubrics.map((r) => `Nilai: ${r.name} (${r.weight}%)`)
    ];

    const rows = rankings.map((item) => {
      const criteriaCells = rubrics.map((r) => {
        const match = item.criteria_scores.find((cs) => cs.criteria_name === r.name);
        return match ? match.score.toFixed(2) : '0';
      });

      return [
        item.rank.toString(),
        `"${item.candidate.candidate_number}"`,
        `"${item.candidate.full_name}"`,
        `"${item.candidate.class_grade}"`,
        `"${item.candidate.target_position}"`,
        item.final_score.toFixed(2),
        `"${item.recommendation || 'Belum Ditentukan'}"`,
        `"${item.interviewer_name}"`,
        `"${item.submitted_at ? new Date(item.submitted_at).toLocaleString('id-ID') : '-'}"`,
        ...criteriaCells
      ];
    });

    // BOM for Indonesian Excel UTF-8 display; prepend period metadata row
    const periodMeta = period
      ? `"Periode: ${period.name} (${new Date(period.start_date).toLocaleDateString('id-ID')} \u2013 ${new Date(period.end_date).toLocaleDateString('id-ID')})"\r\n`
      : '';
    const csvContent = '\uFEFF' + periodMeta + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return csvContent;
  }
};
