import { describe, it, expect, beforeEach } from 'vitest';
import { dataService, resetMockDatabase } from '../lib/dataService';
import { INITIAL_USERS } from '../lib/mockData';
import type { UserProfile } from '../types';

describe('Sistem Penilaian Wawancara PEMIRA - Business Logic Tests', () => {
  const adminUser: UserProfile = INITIAL_USERS[0];
  const interviewerUser: UserProfile = INITIAL_USERS[1];

  beforeEach(() => {
    resetMockDatabase();
  });

  it('1. Memiliki 5 aspek awal dengan bobot masing-masing 20% dan total tepat 100%', async () => {
    const period = await dataService.getActivePeriod();
    expect(period).not.toBeNull();

    const rubrics = await dataService.getRubricCriteria(period!.id);
    expect(rubrics.length).toBeGreaterThanOrEqual(5);

    const activeRubrics = rubrics.filter((r) => r.is_active);
    const totalWeight = activeRubrics.reduce((sum, r) => sum + Number(r.weight), 0);
    expect(Math.round(totalWeight)).toBe(100);

    const aspectNames = activeRubrics.map((r) => r.name);
    expect(aspectNames).toContain('Kepemimpinan');
    expect(aspectNames).toContain('Komunikasi');
    expect(aspectNames).toContain('Tanggung Jawab');
    expect(aspectNames).toContain('Pemecahan Masalah');
    expect(aspectNames).toContain('Motivasi');
  });

  it('2. Menolak penyimpanan rubrik jika total bobot tidak sama dengan 100%', async () => {
    const period = await dataService.getActivePeriod();
    const rubrics = await dataService.getRubricCriteria(period!.id);

    // Modify weights so total = 90%
    const invalidRubrics = rubrics.map((r) => ({ ...r, weight: 18 })); // 18 * 5 = 90%

    await expect(
      dataService.saveRubricCriteria(period!.id, invalidRubrics, adminUser)
    ).rejects.toThrow('Total bobot seluruh aspek aktif harus tepat 100%');
  });

  it('3. Menghitung nilai akhir secara proporsional sesuai bobot rubrik saat submit final', async () => {
    const period = await dataService.getActivePeriod();
    const rubrics = await dataService.getRubricCriteria(period!.id);
    const assignments = await dataService.getAssignments(period!.id);

    // Pick an assignment
    const targetAssignment = assignments[1]; // Candidate 02 (Draft)
    expect(targetAssignment).toBeDefined();

    // Prepare scores: 80, 90, 85, 75, 95 each 20%
    // Expected: 80*0.2 + 90*0.2 + 85*0.2 + 75*0.2 + 95*0.2 = 16 + 18 + 17 + 15 + 19 = 85.0
    const scoresMap: Record<string, { score: number; notes: string }> = {};
    const testScores = [80, 90, 85, 75, 95];
    rubrics.forEach((r, idx) => {
      scoresMap[r.id] = { score: testScores[idx], notes: 'Uji nilai' };
    });

    const submitted = await dataService.submitAssessmentFinal(
      targetAssignment.id,
      {
        strengths: 'Komunikasi sangat bagus',
        weaknesses: 'Perlu peningkatan manajemen waktu'
      },
      scoresMap,
      interviewerUser
    );

    expect(submitted.status).toBe('submitted');
    expect(submitted.final_score).toBe(85.0);
    expect(submitted.locked_at).toBeDefined();
  });

  it('4. Mengunci penilaian yang sudah disubmit dan menolak edit draft', async () => {
    const period = await dataService.getActivePeriod();
    const rubrics = await dataService.getRubricCriteria(period!.id);
    const assignments = await dataService.getAssignments(period!.id);

    // Candidate 01 is already submitted in initial data
    const submittedAsg = assignments[0];
    const scoresMap: Record<string, { score: number; notes: string }> = {};
    rubrics.forEach((r) => {
      scoresMap[r.id] = { score: 90, notes: '' };
    });

    await expect(
      dataService.saveAssessmentDraft(submittedAsg.id, {}, scoresMap, interviewerUser)
    ).rejects.toThrow('sudah berstatus disubmit dan terkunci');
  });

  it('5. Membuka kunci penilaian HANYA oleh admin dan wajib mencatat alasan minimal 5 karakter', async () => {
    const assignments = await dataService.getAssignments();
    const submittedAsg = assignments[0];
    const assessment = submittedAsg.assessment;
    expect(assessment?.status).toBe('submitted');

    // Reject non-admin
    await expect(
      dataService.adminUnlockAssessment(assessment!.id, 'Alasan revisi nilai komunikasi', interviewerUser)
    ).rejects.toThrow('Hanya Admin yang berwenang');

    // Reject reason < 5 chars
    await expect(
      dataService.adminUnlockAssessment(assessment!.id, 'test', adminUser)
    ).rejects.toThrow('Alasan pembukaan kunci wajib diisi minimal 5 karakter');

    // Admin unlocks with valid reason
    const unlocked = await dataService.adminUnlockAssessment(
      assessment!.id,
      'Permohonan koreksi nilai wawancara dari pewawancara',
      adminUser
    );

    expect(unlocked.status).toBe('draft');
    expect(unlocked.unlock_reason).toBe('Permohonan koreksi nilai wawancara dari pewawancara');
    expect(unlocked.unlocked_by).toBe(adminUser.id);

    // Verify audit log has the entry
    const logs = await dataService.getAuditLogs();
    const unlockLog = logs.find((l) => l.action === 'UNLOCK_ASSESSMENT');
    expect(unlockLog).toBeDefined();
    expect(unlockLog?.actor_role).toBe('admin');
  });

  it('6. Menerapkan aturan: tepat satu (1) pewawancara aktif per kandidat dalam satu periode', async () => {
    const period = await dataService.getActivePeriod();
    const candidates = await dataService.getCandidates(period!.id);
    const targetCandidate = candidates[0];

    // Reassign candidate to Kak Farhan (usr-interviewer-02)
    await dataService.assignInterviewer(
      period!.id,
      targetCandidate.id,
      'usr-interviewer-02',
      adminUser
    );

    const allAssignments = await dataService.getAssignments(period!.id);
    const activeAssignments = allAssignments.filter(
      (a) => a.candidate_id === targetCandidate.id && a.status === 'active'
    );

    // Must be exactly 1 active interviewer
    expect(activeAssignments.length).toBe(1);
    expect(activeAssignments[0].interviewer_id).toBe('usr-interviewer-02');
  });

  it('7. Klasemen ranking hanya memproses penilaian final (submitted) per periode dan diurutkan descending', async () => {
    const period = await dataService.getActivePeriod();
    const rankings = await dataService.getRankings(period!.id);

    // Initial data has only 1 submitted assessment (Cand-01: score 91.0)
    expect(rankings.length).toBeGreaterThanOrEqual(1);
    expect(rankings[0].candidate.id).toBe('cand-01');
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].final_score).toBe(91.0);

    // Verify all criteria breakdown exist
    expect(rankings[0].criteria_scores.length).toBe(5);
  });

  it('8. Ekspor CSV menghasilkan format laporan terstruktur dengan BOM UTF-8', async () => {
    const period = await dataService.getActivePeriod();
    const csv = await dataService.exportRankingsToCSV(period!.id);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Peringkat,No. Urut,Nama Kandidat,Kelas,Jabatan Target,Nilai Akhir');
    expect(csv).toContain('Muhammad Faiz Azzam');
  });
});

