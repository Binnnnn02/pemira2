import type {
  UserProfile,
  Period,
  Candidate,
  RubricCriteria,
  InterviewerAssignment,
  InterviewSchedule,
  Assessment,
  AssessmentScore,
  AuditLog
} from '../types';

export const INITIAL_PERIODS: Period[] = [
  {
    id: 'per-2026-01',
    name: 'PEMIRA KEPENGURUSAN BK 2026/2027',
    academic_year: '2026/2027',
    description: 'Tahap Seleksi Wawancara Calon Pengurus BK 2026/2027 - SMP Permata Bunda',
    is_active: true,
    start_date: '2026-10-01',
    end_date: '2026-11-30',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'per-2025-01',
    name: 'PEMIRA OSIS & MPK 2025/2026',
    academic_year: '2025/2026',
    description: 'Arsip Pemilihan Tahun Lalu',
    is_active: false,
    start_date: '2025-10-01',
    end_date: '2025-11-20',
    created_at: '2025-10-01T08:00:00Z',
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@pemira.sch.id',
    name: 'Drs. Bambang Sutrisno, M.Pd',
    role: 'admin',
    phone: '081234567890',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    is_active: true,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'usr-interviewer-01',
    email: 'dewi.lestari@pemira.sch.id',
    name: 'Dewi Lestari, S.Pd',
    role: 'interviewer',
    phone: '081398765432',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    is_active: true,
    created_at: '2026-10-02T08:00:00Z'
  },
  {
    id: 'usr-interviewer-02',
    email: 'farhan.alumni@pemira.sch.id',
    name: 'Farhan Maulana (Ketua Demisioner)',
    role: 'interviewer',
    phone: '081512348765',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    is_active: true,
    created_at: '2026-10-02T08:30:00Z'
  }
];

export const INITIAL_RUBRIC: RubricCriteria[] = [
  {
    id: 'rub-01',
    period_id: 'per-2026-01',
    name: 'Kepemimpinan',
    description: 'Visi organisasi, ketegasan, integritas moral, kemampuan menggerakkan tim, dan pengambilan keputusan.',
    weight: 20.0,
    min_score: 1.0,
    max_score: 100.0,
    sort_order: 1,
    is_active: true,
    created_at: '2026-10-01T09:00:00Z'
  },
  {
    id: 'rub-02',
    period_id: 'per-2026-01',
    name: 'Komunikasi',
    description: 'Kemampuan artikulasi ide, tata bahasa santun, mendengarkan aktif, dan kecakapan berdiplomasi.',
    weight: 20.0,
    min_score: 1.0,
    max_score: 100.0,
    sort_order: 2,
    is_active: true,
    created_at: '2026-10-01T09:00:00Z'
  },
  {
    id: 'rub-03',
    period_id: 'per-2026-01',
    name: 'Tanggung Jawab',
    description: 'Komitmen waktu, loyalitas almamater, kedisiplinan diri, dan rekam jejak penyelesaian tugas.',
    weight: 20.0,
    min_score: 1.0,
    max_score: 100.0,
    sort_order: 3,
    is_active: true,
    created_at: '2026-10-01T09:00:00Z'
  },
  {
    id: 'rub-04',
    period_id: 'per-2026-01',
    name: 'Pemecahan Masalah',
    description: 'Analisis kritis terhadap isu sekolah, inovasi program kerja, inisiatif, dan manajemen konflik antarsiswa.',
    weight: 20.0,
    min_score: 1.0,
    max_score: 100.0,
    sort_order: 4,
    is_active: true,
    created_at: '2026-10-01T09:00:00Z'
  },
  {
    id: 'rub-05',
    period_id: 'per-2026-01',
    name: 'Motivasi',
    description: 'Ketulusan pengabdian bagi warga sekolah, daya juang menghadapi tekanan, dan motivasi internal berprestasi.',
    weight: 20.0,
    min_score: 1.0,
    max_score: 100.0,
    sort_order: 5,
    is_active: true,
    created_at: '2026-10-01T09:00:00Z'
  }
];

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'cand-01',
    period_id: 'per-2026-01',
    candidate_number: '01',
    full_name: 'Muhammad Faiz Azzam',
    nisn: '0061234567',
    class_grade: 'XI MIPA 1',
    target_position: 'Ketua OSIS',
    vision: 'Mewujudkan OSIS SMA yang sinergis, berakhlak mulia, berprestasi global, dan inklusif bagi seluruh minat bakat siswa.',
    mission: '1. Mengoptimalkan wadah aspirasi digital siswa.\n2. Mengadakan pekan kolaborasi sains, seni, dan kepemimpinan.\n3. Menumbuhkan budaya disiplin dan kepedulian lingkungan.',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    status: 'active',
    created_at: '2026-10-03T10:00:00Z'
  },
  {
    id: 'cand-02',
    period_id: 'per-2026-01',
    candidate_number: '02',
    full_name: 'Nayla Citra Kirana',
    nisn: '0069876543',
    class_grade: 'XI IPS 2',
    target_position: 'Ketua OSIS',
    vision: 'Terciptanya ekosistem sekolah yang adaptif, berkarakter gotong royong, dan aktif dalam aksi sosial nyata di masyarakat.',
    mission: '1. Program pengabdian masyarakat bulanan OSIS Mengabdi.\n2. Transformasi digital mading dan buletin sekolah.\n3. Forum dialog terbuka berkala dengan pihak manajemen sekolah.',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    status: 'active',
    created_at: '2026-10-03T10:30:00Z'
  },
  {
    id: 'cand-03',
    period_id: 'per-2026-01',
    candidate_number: '03',
    full_name: 'Rayhan Putra Pratama',
    nisn: '0071122334',
    class_grade: 'XI MIPA 3',
    target_position: 'Wakil Ketua OSIS',
    vision: 'Menjadi mitra strategis Ketua OSIS dalam penguatan kedisiplinan dan pengembangan organisasi ekstrakurikuler sekolah.',
    mission: '1. Standardisasi pembinaan organisasi ekstrakurikuler.\n2. Pembentukan sistem mentoring antartingkat kelas.\n3. Manajemen inventaris kegiatan yang transparan.',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    status: 'active',
    created_at: '2026-10-03T11:00:00Z'
  },
  {
    id: 'cand-04',
    period_id: 'per-2026-01',
    candidate_number: '04',
    full_name: 'Amanda Zahra Salsabila',
    nisn: '0075566778',
    class_grade: 'XI Bahasa 1',
    target_position: 'Ketua MPK',
    vision: 'Mewujudkan MPK yang kritis, independen, aspiratif, dan mengawal tegaknya peraturan serta kinerja OSIS secara transparan.',
    mission: '1. Penyerapan aspirasi berbasis kelas berkala tiap bulan.\n2. Evaluasi kinerja program kerja OSIS secara terbuka.\n3. Sosialisasi hak dan kewajiban peserta didik.',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    status: 'active',
    created_at: '2026-10-03T11:30:00Z'
  }
];

export const INITIAL_ASSIGNMENTS: InterviewerAssignment[] = [
  {
    id: 'asg-01',
    period_id: 'per-2026-01',
    candidate_id: 'cand-01',
    interviewer_id: 'usr-interviewer-01', // Bu Dewi Lestari
    status: 'active',
    assigned_at: '2026-10-05T08:00:00Z',
    created_at: '2026-10-05T08:00:00Z'
  },
  {
    id: 'asg-02',
    period_id: 'per-2026-01',
    candidate_id: 'cand-02',
    interviewer_id: 'usr-interviewer-01', // Bu Dewi Lestari
    status: 'active',
    assigned_at: '2026-10-05T08:15:00Z',
    created_at: '2026-10-05T08:15:00Z'
  },
  {
    id: 'asg-03',
    period_id: 'per-2026-01',
    candidate_id: 'cand-03',
    interviewer_id: 'usr-interviewer-02', // Kak Farhan
    status: 'active',
    assigned_at: '2026-10-05T08:30:00Z',
    created_at: '2026-10-05T08:30:00Z'
  },
  {
    id: 'asg-04',
    period_id: 'per-2026-01',
    candidate_id: 'cand-04',
    interviewer_id: 'usr-interviewer-02', // Kak Farhan
    status: 'active',
    assigned_at: '2026-10-05T08:45:00Z',
    created_at: '2026-10-05T08:45:00Z'
  }
];

export const INITIAL_SCHEDULES: InterviewSchedule[] = [
  {
    id: 'sch-01',
    assignment_id: 'asg-01',
    scheduled_at: '2026-10-18T09:00:00+07:00',
    duration_minutes: 45,
    location: 'Ruang Multimedia 1',
    notes: 'Kandidat membawa portofolio rekam jejak organisasi',
    status: 'completed',
    created_at: '2026-10-05T09:00:00Z'
  },
  {
    id: 'sch-02',
    assignment_id: 'asg-02',
    scheduled_at: '2026-10-18T10:00:00+07:00',
    duration_minutes: 45,
    location: 'Ruang Rapat OSIS',
    notes: 'Sesi wawancara visi misi & studi kasus kepemimpinan',
    status: 'in_progress',
    created_at: '2026-10-05T09:15:00Z'
  },
  {
    id: 'sch-03',
    assignment_id: 'asg-03',
    scheduled_at: '2026-10-19T13:30:00+07:00',
    duration_minutes: 45,
    location: 'Ruang Multimedia 1',
    notes: 'Fokus pada kesiapan manajerial & problem solving',
    status: 'scheduled',
    created_at: '2026-10-05T09:30:00Z'
  },
  {
    id: 'sch-04',
    assignment_id: 'asg-04',
    scheduled_at: '2026-10-19T14:30:00+07:00',
    duration_minutes: 45,
    location: 'Ruang Multimedia 2',
    notes: 'Fokus pada independensi fungsi legislasi MPK',
    status: 'scheduled',
    created_at: '2026-10-05T09:45:00Z'
  }
];

export const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 'ass-01',
    assignment_id: 'asg-01',
    candidate_id: 'cand-01',
    interviewer_id: 'usr-interviewer-01',
    period_id: 'per-2026-01',
    status: 'submitted',
    final_score: 91.0,
    strengths: 'Karakter kepemimpinan sangat matang, artikulasi ide tenang dan meyakinkan, serta memiliki visi yang sangat realistis untuk sekolah.',
    weaknesses: 'Perlu meningkatkan pembagian delegasi tugas agar tidak membebani diri sendiri.',
    general_notes: 'Kandidat unggulan dengan rekam jejak OSIS yang terbukti sangat baik dan dihormati oleh rekan-rekannya.',
    recommendation: 'highly_recommended',
    submitted_at: '2026-10-18T10:00:00Z',
    locked_at: '2026-10-18T10:00:00Z',
    created_at: '2026-10-18T09:00:00Z',
    updated_at: '2026-10-18T10:00:00Z'
  },
  {
    id: 'ass-02',
    assignment_id: 'asg-02',
    candidate_id: 'cand-02',
    interviewer_id: 'usr-interviewer-01',
    period_id: 'per-2026-01',
    status: 'draft',
    final_score: 87.0,
    strengths: 'Kemampuan public speaking sangat mengalir, pendekatan humanis dan empati sosial tinggi.',
    weaknesses: 'Rencana program kerja masih perlu diperinci dari segi anggaran dan linimasa.',
    general_notes: 'Sedang dalam pengisian evaluasi awal.',
    recommendation: 'recommended',
    created_at: '2026-10-18T10:15:00Z',
    updated_at: '2026-10-18T10:30:00Z'
  }
];

export const INITIAL_SCORES: AssessmentScore[] = [
  // For Candidate 01 (Faiz Azzam) - Submitted
  {
    id: 'sc-01',
    assessment_id: 'ass-01',
    criteria_id: 'rub-01', // Kepemimpinan (20%)
    score: 95.0,
    notes: 'Pemahaman organisasi luar biasa, ketegasan memukau.',
    created_at: '2026-10-18T09:15:00Z'
  },
  {
    id: 'sc-02',
    assessment_id: 'ass-01',
    criteria_id: 'rub-02', // Komunikasi (20%)
    score: 92.0,
    notes: 'Artikulasi jelas, bahasa tubuh sangat meyakinkan.',
    created_at: '2026-10-18T09:25:00Z'
  },
  {
    id: 'sc-03',
    assessment_id: 'ass-01',
    criteria_id: 'rub-03', // Tanggung Jawab (20%)
    score: 90.0,
    notes: 'Komitmen waktu dan integritas telah teruji.',
    created_at: '2026-10-18T09:35:00Z'
  },
  {
    id: 'sc-04',
    assessment_id: 'ass-01',
    criteria_id: 'rub-04', // Pemecahan Masalah (20%)
    score: 88.0,
    notes: 'Solusi masalah praktis dan solutif.',
    created_at: '2026-10-18T09:45:00Z'
  },
  {
    id: 'sc-05',
    assessment_id: 'ass-01',
    criteria_id: 'rub-05', // Motivasi (20%)
    score: 90.0,
    notes: 'Semangat melayani siswa sangat murni.',
    created_at: '2026-10-18T09:55:00Z'
  },

  // For Candidate 02 (Nayla Citra Kirana) - Draft
  {
    id: 'sc-06',
    assessment_id: 'ass-02',
    criteria_id: 'rub-01',
    score: 85.0,
    notes: 'Memiliki karisma memimpin yang hangat.',
    created_at: '2026-10-18T10:20:00Z'
  },
  {
    id: 'sc-07',
    assessment_id: 'ass-02',
    criteria_id: 'rub-02',
    score: 94.0,
    notes: 'Sangat komunikatif dan ekspresif.',
    created_at: '2026-10-18T10:22:00Z'
  },
  {
    id: 'sc-08',
    assessment_id: 'ass-02',
    criteria_id: 'rub-03',
    score: 88.0,
    notes: 'Disiplin dan bertanggung jawab.',
    created_at: '2026-10-18T10:25:00Z'
  },
  {
    id: 'sc-09',
    assessment_id: 'ass-02',
    criteria_id: 'rub-04',
    score: 82.0,
    notes: 'Perlu penguatan pada manajemen risiko program.',
    created_at: '2026-10-18T10:27:00Z'
  },
  {
    id: 'sc-10',
    assessment_id: 'ass-02',
    criteria_id: 'rub-05',
    score: 86.0,
    notes: 'Dedikasi tinggi terhadap almamater.',
    created_at: '2026-10-18T10:29:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    actor_id: 'usr-admin-01',
    actor_email: 'admin@pemira.sch.id',
    actor_role: 'admin',
    action: 'CREATE_PERIOD',
    target_type: 'period',
    target_id: 'per-2026-01',
    details: { name: 'PEMIRA OSIS & MPK 2026/2027', academic_year: '2026/2027' },
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'log-02',
    actor_id: 'usr-admin-01',
    actor_email: 'admin@pemira.sch.id',
    actor_role: 'admin',
    action: 'ASSIGN_INTERVIEWER',
    target_type: 'assignment',
    target_id: 'asg-01',
    details: { candidate: 'Muhammad Faiz Azzam', interviewer: 'Dewi Lestari, S.Pd' },
    created_at: '2026-10-05T08:00:00Z'
  },
  {
    id: 'log-03',
    actor_id: 'usr-interviewer-01',
    actor_email: 'dewi.lestari@pemira.sch.id',
    actor_role: 'interviewer',
    action: 'SUBMIT_ASSESSMENT',
    target_type: 'assessment',
    target_id: 'ass-01',
    details: { candidate: 'Muhammad Faiz Azzam', final_score: 91.0, status: 'submitted' },
    created_at: '2026-10-18T10:00:00Z'
  }
];

